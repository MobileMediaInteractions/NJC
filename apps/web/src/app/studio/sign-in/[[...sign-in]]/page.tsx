import { SignIn } from "@clerk/nextjs";
import { headers } from "next/headers";
import { BrandMark } from "@/components/brand-mark";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isClerkConfigured } from "@/lib/auth";
import { resolveStudioAuthRouting } from "@/lib/studio-auth-routing";

export default async function StudioSignInPage() {
  const configured = isClerkConfigured();
  const requestHeaders = await headers();
  const routing = resolveStudioAuthRouting(
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"),
  );
  return (
    <div className="dark grid min-h-screen place-items-center bg-[#061f31] p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center"><BrandMark inverse /></div>
        {configured ? (
          <SignIn
            routing="path"
            path={routing.signInPath}
            forceRedirectUrl={routing.afterSignInUrl}
          />
        ) : (
          <Card>
            <CardHeader><CardTitle>Authentication isn’t connected yet</CardTitle></CardHeader>
            <CardContent className="text-sm leading-6 text-muted-foreground">
              Install Clerk from the Vercel Marketplace and pull the project environment variables. Studio will activate automatically.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
