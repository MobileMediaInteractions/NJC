"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AudienceTracker } from "@/components/audience-tracker";
import { CookieConsent } from "@/components/cookie-consent";
import { ThemeProvider } from "@/components/theme-provider";

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
        <CookieConsent />
      </TooltipProvider>
    </ThemeProvider>
  );
  return clerkEnabled ? <ClerkProvider>{content}</ClerkProvider> : content;
}
