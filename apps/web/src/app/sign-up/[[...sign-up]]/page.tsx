import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";
import { BrandMark } from "@/components/brand-mark";
import { isClerkConfigured } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Create account",
  robots: { index: false, follow: false },
};
export default function SignUpPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-brand-navy p-6">
      <div className="w-full max-w-md space-y-8">
        <BrandMark inverse />
        {isClerkConfigured() ? (
          <SignUp
            path="/sign-up"
            signInUrl="/sign-in"
            forceRedirectUrl="/developers"
          />
        ) : (
          <div className="rounded-lg bg-card p-6 text-sm text-muted-foreground">
            Connect Clerk before creating reader or developer accounts.
          </div>
        )}
      </div>
    </main>
  );
}
