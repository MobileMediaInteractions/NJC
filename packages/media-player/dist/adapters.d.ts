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
export declare class MediaAdapterError extends Error {
    readonly status?: number | undefined;
    readonly code?: string | undefined;
    constructor(message: string, status?: number | undefined, code?: string | undefined);
}
export declare function createHttpMediaAdapter(options: HttpMediaAdapterOptions): MediaDataAdapter;
export declare function createNjcSessionMediaAdapter(options?: NjcSessionMediaAdapterOptions): MediaDataAdapter;
export {};
//# sourceMappingURL=adapters.d.ts.map