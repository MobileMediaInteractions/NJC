"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { reconcileExistingPushSubscription } from "@/components/site-notification-control";

function ReconcileOnMount({ identity }: { identity: string }) {
  useEffect(() => {
    void reconcileExistingPushSubscription().catch((error) => {
      console.error("Existing site notification subscription could not be reconciled", error);
    });
  }, [identity]);
  return null;
}

function AuthenticatedPushReconciler() {
  const { isLoaded, user } = useUser();
  if (!isLoaded) return null;
  return <ReconcileOnMount identity={user?.id ?? "anonymous"} />;
}

export function SitePushReconciler({
  clerkEnabled,
}: {
  clerkEnabled: boolean;
}) {
  return clerkEnabled ? (
    <AuthenticatedPushReconciler />
  ) : (
    <ReconcileOnMount identity="anonymous" />
  );
}
