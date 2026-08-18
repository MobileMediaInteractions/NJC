import "server-only";

import { headers } from "next/headers";
import { getNjcPlusFlag } from "@/lib/feature-flags";
import { resolveCourierCutDistributionMode } from "@/lib/courier-cut-contract";

export const courierCutHostname =
  process.env.NEXT_PUBLIC_COURIER_CUT_HOST ?? "cut.thejerseycourier.com";

export const courierCutOrigin = `https://${courierCutHostname}`;

export const njcPlusOrigin = `https://${
  process.env.NEXT_PUBLIC_PLUS_HOST ?? "plus.thejerseycourier.com"
}`;

export async function getCourierCutDistributionMode() {
  const flag = await getNjcPlusFlag("njc_plus_preview_club");
  return resolveCourierCutDistributionMode(flag.configuration);
}

export async function isCourierCutSubdomainContentEnabled() {
  const flag = await getNjcPlusFlag("njc_plus_preview_club");
  return (
    flag.effective &&
    resolveCourierCutDistributionMode(flag.configuration) ===
      "njc_plus_and_subdomain"
  );
}

export async function isCourierCutHostRequest() {
  const hostname = (await headers()).get("host")?.split(":")[0]?.toLowerCase();
  return hostname === courierCutHostname.toLowerCase();
}

