"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AudienceTracker } from "@/components/audience-tracker";
import { CookieConsent } from "@/components/cookie-consent";

export function AppProviders({
  children,
  clerkEnabled,
}: {
  children: React.ReactNode;
  clerkEnabled: boolean;
}) {
  const content = <TooltipProvider>{children}<AudienceTracker /><CookieConsent /></TooltipProvider>;
  return clerkEnabled ? <ClerkProvider>{content}</ClerkProvider> : content;
}
