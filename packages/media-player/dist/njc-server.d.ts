export type NjcDeveloperNewsClientOptions = {
    baseUrl: string;
    apiKey: string;
    fetch?: typeof fetch;
};
export declare function createNjcDeveloperNewsClient(options: NjcDeveloperNewsClientOptions): {
    listStories<T = unknown>(query?: Record<string, string | number | boolean | undefined>): Promise<T>;
};
//# sourceMappingURL=njc-server.d.ts.map