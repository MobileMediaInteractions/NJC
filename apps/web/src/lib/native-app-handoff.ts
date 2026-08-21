export type ReaderNativePlatform = "ios" | "android";

export function detectReaderNativePlatform(userAgent: string): ReaderNativePlatform | null {
  if (/android/i.test(userAgent)) return "android";
  if (/iphone|ipad|ipod/i.test(userAgent)) return "ios";
  if (/macintosh/i.test(userAgent) && /mobile/i.test(userAgent)) return "ios";
  return null;
}

export function readerNativePath(pathname: string) {
  if (/^\/story\/[A-Za-z0-9_-]+\/?$/.test(pathname)) return pathname;
  if (/^\/(latest|weather|watch)\/?$/.test(pathname)) return pathname;
  return "/";
}

export function readerNativeDeepLink(pathname: string, search = "") {
  const path = readerNativePath(pathname).replace(/^\//, "");
  const query = search.startsWith("?") ? search : "";
  return path ? `njcourier://${path}${query}` : "njcourier://";
}
