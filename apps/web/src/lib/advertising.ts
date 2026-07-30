import "server-only";

import { cache } from "react";
import { getOptionalAccountId } from "@/lib/auth";
import { getNjcPlusIdentityState } from "@/lib/njc-plus-beta";
import { getSiteConfiguration } from "@/lib/site-settings";

export const hasAdFreeNjcPlusAccess = cache(async function hasAdFreeNjcPlusAccess() {
  const configuration = await getSiteConfiguration();
  if (!configuration.advertising.adFreeNjcPlusEnabled) return false;

  const accountId = await getOptionalAccountId();
  if (!accountId) return false;

  const identity = await getNjcPlusIdentityState(accountId);
  return identity.paidMember || identity.trial || identity.complimentary;
});
