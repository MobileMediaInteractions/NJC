import Link from "next/link";
import { KeyRound, LockKeyhole } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { StudioShell } from "@/components/studio/studio-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getStudioUser, isClerkConfigured } from "@/lib/auth";

export async function StudioGate({ children }: { children: React.ReactNode }) {
  const viewer = await getStudioUser();
  if (viewer) return <StudioShell viewer={viewer}>{children}</StudioShell>;
  const configured = isClerkConfigured();
  return (
    <div className="dark grid min-h-screen place-items-center bg-[#061f31] p-6 text-foreground">
      <Card className="w-full max-w-md border-white/10 bg-card shadow-2xl">
        <CardHeader><div className="mb-8"><BrandMark inverse /></div><div className="grid size-11 place-items-center rounded-full bg-primary/15 text-primary">{configured ? <LockKeyhole /> : <KeyRound />}</div><CardTitle className="mt-4 text-2xl">{configured ? "Newsroom access required" : "Connect newsroom identity"}</CardTitle><CardDescription>{configured ? "Sign in with an approved Courier staff account to continue." : "The CMS is locked until Clerk is connected through the Vercel Marketplace. This prevents an unconfigured production deployment from exposing editorial tools."}</CardDescription></CardHeader>
        <CardContent>{configured ? <Button asChild className="w-full"><Link href="/studio/sign-in">Sign in to Studio</Link></Button> : <div className="space-y-3 text-xs text-muted-foreground"><p>Required Vercel environment variables:</p><code className="block rounded bg-muted p-3 leading-6">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY<br />CLERK_SECRET_KEY</code><p>Studio does not provide a demo bypass. Connect Clerk before newsroom access is available.</p></div>}</CardContent>
      </Card>
    </div>
  );
}
