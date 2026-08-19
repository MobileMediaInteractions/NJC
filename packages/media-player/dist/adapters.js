export class MediaAdapterError extends Error {
    status;
    code;
    constructor(message, status, code) {
        super(message);
        this.status = status;
        this.code = code;
        this.name = "MediaAdapterError";
    }
}
function url(baseUrl, path) {
    return `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}
async function request(fetcher, target, init) {
    const response = await fetcher(target, init);
    const payload = await response.json().catch(() => null);
    if (!response.ok)
        throw new MediaAdapterError(payload?.error?.message || `Media request failed (${response.status})`, response.status, payload?.error?.code);
    return payload;
}
async function resolveHeaders(headers) {
    return typeof headers === "function" ? headers() : headers;
}
function defaultPresentation(payload) {
    const envelope = payload;
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
        timelineSegments: Array.isArray(data.timelineSegments) ? data.timelineSegments : [],
        platformIntro: data.platformIntro,
        metadata: data,
    };
}
function defaultTimeline(payload) {
    const data = payload?.data;
    const segments = Array.isArray(data) ? data : data?.segments;
    if (!Array.isArray(segments))
        throw new MediaAdapterError("The timeline response did not contain a segment list.");
    return segments;
}
export function createHttpMediaAdapter(options) {
    const fetcher = options.fetch ?? fetch;
    const baseUrl = options.baseUrl ?? "";
    const credentials = options.credentials ?? "same-origin";
    const headers = async () => {
        const resolved = new Headers(await resolveHeaders(options.headers));
        if (!resolved.has("Content-Type"))
            resolved.set("Content-Type", "application/json");
        return resolved;
    };
    const adapter = {};
    if (options.routes?.presentation)
        adapter.loadPresentation = async (idOrSlug) => {
            const payload = await request(fetcher, url(baseUrl, options.routes.presentation(idOrSlug)), { headers: await headers(), credentials });
            return options.parsePresentation?.(payload) ?? defaultPresentation(payload);
        };
    if (options.routes?.progress)
        adapter.saveProgress = async (event) => { await request(fetcher, url(baseUrl, options.routes.progress), { method: "PUT", headers: await headers(), credentials, body: JSON.stringify(options.transformProgress?.(event) ?? event) }); };
    if (options.routes?.timeline) {
        adapter.loadTimeline = async (contentId) => {
            const payload = await request(fetcher, url(baseUrl, options.routes.timeline(contentId)), { headers: await headers(), credentials });
            return options.parseTimeline?.(payload) ?? defaultTimeline(payload);
        };
        adapter.saveTimeline = async (contentId, segments) => {
            const payload = await request(fetcher, url(baseUrl, options.routes.timeline(contentId)), { method: "PUT", headers: await headers(), credentials, body: JSON.stringify({ segments }) });
            return options.parseTimeline?.(payload) ?? defaultTimeline(payload);
        };
    }
    return adapter;
}
export function createNjcSessionMediaAdapter(options = {}) {
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
//# sourceMappingURL=adapters.js.map