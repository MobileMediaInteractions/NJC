import { SignUp } from "@clerk/nextjs";
import { BrandMark } from "@/components/brand-mark";
import { isClerkConfigured } from "@/lib/auth";
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
          <div className="rounded-lg bg-white p-6 text-sm text-muted-foreground">
            Connect Clerk before creating reader or developer accounts.
          </div>
        )}
      </div>
    </main>
  );
}
