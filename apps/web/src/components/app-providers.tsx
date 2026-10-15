"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AudienceTracker } from "@/components/audience-tracker";
import { CookieConsent } from "@/components/cookie-consent";
import { SitePushReconciler } from "@/components/site-push-reconciler";
import { ThemeProvider } from "@/components/theme-provider";
import { ACCOUNT_CONTINUE_PATH } from "@/lib/account-sign-in";

export function AppProviders({
  children,
  clerkEnabled,
}: {
  children: React.ReactNode;
  clerkEnabled: boolean;
}) {
  const content = (
    <ThemeProvider>
      <TooltipProvider>
        {children}
        <AudienceTracker />
        <SitePushReconciler clerkEnabled={clerkEnabled} />
        <CookieConsent />
      </TooltipProvider>
    </ThemeProvider>
  );
  return clerkEnabled ? <ClerkProvider signInFallbackRedirectUrl={ACCOUNT_CONTINUE_PATH} signUpFallbackRedirectUrl={ACCOUNT_CONTINUE_PATH}>{content}</ClerkProvider> : content;
}
