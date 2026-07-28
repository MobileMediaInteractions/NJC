"use client";

import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StudioAccountPicker, type GuidedOption } from "@/components/studio/guided-selectors";
import { NjcPlusAccessConsole } from "@/components/studio/njc-plus-access-console";
import { NjcPlusBetaAccess } from "@/components/studio/njc-plus-beta-access";
import type { StudioAccountSummary } from "@/lib/studio-account-types";

export type NjcPlusAccessData = {
  entitlements: Array<{
    id: string;
    scopeType: string;
    scopeId: string;
    sourceType: string;
    status: string;
    startsAt: string;
    endsAt: string | null;
  }>;
  betaGrants: Array<{
    id: string;
    status: string;
    featureKeys: string[];
    premiumContentIncluded: boolean;
    contentIds: string[];
    showMemberBranding: boolean;
    startsAt: string;
    endsAt: string;
    reason: string;
  }>;
  ledger: Array<{
    id: string;
    amount: number;
    transactionType: string;
    reason: string;
    createdAt: string;
  }>;
  balance: number | null;
  betaCapacity: { used: number; limit: number };
};

export function NjcPlusAccessWorkspace({
  mode,
  tierOptions = [],
  contentOptions = [],
}: {
  mode: "access" | "credits";
  tierOptions?: GuidedOption[];
  contentOptions?: GuidedOption[];
}) {
  const [account, setAccount] = useState<StudioAccountSummary | null>(null);
  const [data, setData] = useState<NjcPlusAccessData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!account) {
      setData(null);
      setError("");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/v1/studio/njc-plus/access?userClerkId=${encodeURIComponent(account.id)}`,
        { cache: "no-store" },
      );
      const payload = await response.json() as {
        data?: NjcPlusAccessData;
        error?: { message?: string };
      };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "NJC+ account history could not be loaded");
      }
      setData(payload.data);
    } catch (loadError) {
      setData(null);
      setError(loadError instanceof Error ? loadError.message : "NJC+ account history could not be loaded");
    } finally {
      setLoading(false);
    }
  }, [account]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <div className="mt-7 space-y-6">
      <Card>
        <CardHeader>
          <Search className="text-primary" />
          <CardTitle>Choose an account</CardTitle>
          <CardDescription>
            Search by username, name, or email. Exact Clerk IDs remain available as an advanced lookup, but Studio stores the canonical ID automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StudioAccountPicker
            value={account}
            onChange={(nextAccount) => {
              setAccount(nextAccount);
              setData(null);
              setError("");
            }}
          />
          {loading ? <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground" role="status"><LoaderCircle className="animate-spin" /> Loading account history…</p> : null}
          {error ? <p className="mt-3 rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert">{error}</p> : null}
        </CardContent>
      </Card>

      {!account ? (
        <div className="grid min-h-48 place-items-center rounded-lg border border-dashed px-6 text-center">
          <div>
            <Search className="mx-auto text-muted-foreground" />
            <p className="mt-3 font-semibold">Select an account to continue</p>
            <p className="mt-1 text-sm text-muted-foreground">No account IDs need to be copied or entered manually.</p>
          </div>
        </div>
      ) : (
        <>
          <NjcPlusAccessConsole
            mode={mode}
            account={account}
            data={data}
            loading={loading}
            reload={load}
            tierOptions={tierOptions}
            contentOptions={contentOptions}
          />
          {mode === "access" ? (
            <NjcPlusBetaAccess
              account={account}
              data={data}
              loading={loading}
              reload={load}
              contentOptions={contentOptions}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
