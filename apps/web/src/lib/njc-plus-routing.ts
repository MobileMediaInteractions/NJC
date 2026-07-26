import { redirect } from "next/navigation";
import { siteConfig } from "@/lib/site";

export function getNjcPlusFallbackUrl() {
  return `https://${siteConfig.domain}`;
}

export function redirectUnavailableNjcPlus(): never {
  redirect(getNjcPlusFallbackUrl());
}
