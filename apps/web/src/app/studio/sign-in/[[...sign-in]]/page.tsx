import { SignIn } from "@clerk/nextjs";
import { BrandMark } from "@/components/brand-mark";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isClerkConfigured } from "@/lib/auth";

export default function StudioSignInPage() {
  const configured = isClerkConfigured();
  return (
    <div className="dark grid min-h-screen place-items-center bg-[#061f31] p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center"><BrandMark inverse /></div>
        {configured ? (
          <SignIn routing="path" path="/studio/sign-in" forceRedirectUrl="/studio" />
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
