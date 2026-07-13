"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { TooltipProvider } from "@/components/ui/tooltip";

export function AppProviders({
  children,
  clerkEnabled,
}: {
  children: React.ReactNode;
  clerkEnabled: boolean;
}) {
  const content = <TooltipProvider>{children}</TooltipProvider>;
  return clerkEnabled ? <ClerkProvider>{content}</ClerkProvider> : content;
}
