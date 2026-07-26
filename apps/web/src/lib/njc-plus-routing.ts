import { redirect } from "next/navigation";
import { getSiteOrigin } from "@/lib/origin";

export function getNjcPlusFallbackUrl() {
  return getSiteOrigin();
}

export function redirectUnavailableNjcPlus(): never {
  redirect(getNjcPlusFallbackUrl());
}
