const configuredOrigin = process.env.NEXT_PUBLIC_ASSET_ORIGIN?.replace(/\/$/, "");

export const assetOrigin = configuredOrigin || "";

export function assetUrl(pathname: string) {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${assetOrigin}/assets${normalized}`;
}

export const brandAssets = {
  mark: assetUrl("/brand/v1/mark.svg"),
  wordmark: assetUrl("/brand/v1/wordmark.svg"),
  wordmarkInverse: assetUrl("/brand/v1/wordmark-inverse.svg"),
  appIcon: assetUrl("/brand/v1/app-icon.svg"),
  gardenStateEngraving: assetUrl("/editorial/v1/garden-state-engraving.png"),
} as const;

export const podcastAssets = {
  twoDudesInWheelsPlaceholderLogo: assetUrl(
    "/podcasts/two-dudes-in-wheels/v1/logo-placeholder.png",
  ),
  twoDudesInWheelsDemoTimeline: assetUrl(
    "/podcasts/two-dudes-in-wheels/demo/motiondeck-demo.njmotion",
  ),
} as const;
