import { assetUrl } from "@/lib/assets";

export const njcPlusAssets = {
  primaryDark: assetUrl("/njc-plus/v1/njc-plus-primary-dark.svg"),
  primaryLight: assetUrl("/njc-plus/v1/njc-plus-primary-light.svg"),
  icon: assetUrl("/njc-plus/v1/njc-plus-icon.svg"),
  signalField: assetUrl("/njc-plus/v1/signal-field.png"),
} as const;
