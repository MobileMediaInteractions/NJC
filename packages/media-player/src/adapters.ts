import type { MediaDataAdapter, MediaPresentation, PlayerProgressEvent, TimelineSegment } from "./types.js";

type HeaderFactory = HeadersInit | (() => HeadersInit | Promise<HeadersInit>);

export type HttpMediaAdapterOptions = {
  baseUrl?: string;
  fetch?: typeof fetch;
  headers?: HeaderFactory;
  credentials?: RequestCredentials;
  routes?: {
    presentation?: (idOrSlug: string) => string;
    progress?: string;
    timeline?: (contentId: string) => string;
  };
  parsePresentation?: (payload: unknown) => MediaPresentation;
  parseTimeline?: (payload: unknown) => TimelineSegment[];
  transformProgress?: (event: PlayerProgressEvent) => unknown;
};

export type NjcSessionMediaAdapterOptions = {
  baseUrl?: string;
  fetch?: typeof fetch;
  devicePlatform?: "web" | "ios" | "android" | "tvos" | "roku" | "other";
};

export class MediaAdapterError extends Error {
  constructor(message: string, public readonly status?: number, public readonly code?: string) {
    super(message);
    this.name = "MediaAdapterError";
  }
}

function url(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

async function request(fetcher: typeof fetch, target: string, init: RequestInit) {
  const response = await fetcher(target, init);
  const payload = await response.json().catch(() => null) as { error?: { code?: string; message?: string } } | null;
  if (!response.ok) throw new MediaAdapterError(payload?.error?.message || `Media request failed (${response.status})`, response.status, payload?.error?.code);
  return payload;
}

async function resolveHeaders(headers?: HeaderFactory) {
  return typeof headers === "function" ? headers() : headers;
}

function defaultPresentation(payload: unknown): MediaPresentation {
  const envelope = payload as { data?: Record<string, unknown> };
  const data = envelope?.data;
  if (!data || typeof data.id !== "string" || typeof data.title !== "string" || (data.kind !== "video" && data.kind !== "audio") || typeof data.mediaUrl !== "string") {
    throw new MediaAdapterError("The presentation response did not match the media contract.");
  }
  return {
    id: data.id,
    kind: data.kind,
    title: data.title,
    src: data.mediaUrl,
    poster: typeof data.imageUrl === "string" ? data.imageUrl : null,
    captionsUrl: typeof data.captionsUrl === "string" ? data.captionsUrl : null,
    timelineSegments: Array.isArray(data.timelineSegments) ? data.timelineSegments as TimelineSegment[] : [],
    platformIntro: data.platformIntro as MediaPresentation["platformIntro"],
    metadata: data,
  };
}

function defaultTimeline(payload: unknown): TimelineSegment[] {
  const data = (payload as { data?: unknown })?.data;
  const segments = Array.isArray(data) ? data : (data as { segments?: unknown } | null)?.segments;
  if (!Array.isArray(segments)) throw new MediaAdapterError("The timeline response did not contain a segment list.");
  return segments as TimelineSegment[];
}

export function createHttpMediaAdapter(options: HttpMediaAdapterOptions): MediaDataAdapter {
  const fetcher = options.fetch ?? fetch;
  const baseUrl = options.baseUrl ?? "";
  const credentials = options.credentials ?? "same-origin";
  const headers = async () => {
    const resolved = new Headers(await resolveHeaders(options.headers));
    if (!resolved.has("Content-Type")) resolved.set("Content-Type", "application/json");
    return resolved;
  };
  const adapter: MediaDataAdapter = {};

  if (options.routes?.presentation) adapter.loadPresentation = async (idOrSlug) => {
    const payload = await request(fetcher, url(baseUrl, options.routes!.presentation!(idOrSlug)), { headers: await headers(), credentials });
    return options.parsePresentation?.(payload) ?? defaultPresentation(payload);
  };
  if (options.routes?.progress) adapter.saveProgress = async (event) => { await request(fetcher, url(baseUrl, options.routes!.progress!), { method: "PUT", headers: await headers(), credentials, body: JSON.stringify(options.transformProgress?.(event) ?? event) }); };
  if (options.routes?.timeline) {
    adapter.loadTimeline = async (contentId) => {
      const payload = await request(fetcher, url(baseUrl, options.routes!.timeline!(contentId)), { headers: await headers(), credentials });
      return options.parseTimeline?.(payload) ?? defaultTimeline(payload);
    };
    adapter.saveTimeline = async (contentId, segments) => {
      const payload = await request(fetcher, url(baseUrl, options.routes!.timeline!(contentId)), { method: "PUT", headers: await headers(), credentials, body: JSON.stringify({ segments }) });
      return options.parseTimeline?.(payload) ?? defaultTimeline(payload);
    };
  }
  return adapter;
}

export function createNjcSessionMediaAdapter(options: NjcSessionMediaAdapterOptions = {}): MediaDataAdapter {
  const fetcher = options.fetch ?? fetch;
  const baseUrl = options.baseUrl ?? "";
  const devicePlatform = options.devicePlatform ?? "web";
  return createHttpMediaAdapter({
    baseUrl,
    fetch: fetcher,
    credentials: "include",
    routes: {
      presentation: (slug) => `/api/v1/plus/content/${encodeURIComponent(slug)}`,
      progress: "/api/v1/plus/progress",
      timeline: (contentId) => `/api/v1/studio/njc-plus/content/${encodeURIComponent(contentId)}/timeline`,
    },
    parsePresentation: defaultPresentation,
    parseTimeline: defaultTimeline,
    transformProgress: (event) => ({ ...event, devicePlatform }),
  });
}
