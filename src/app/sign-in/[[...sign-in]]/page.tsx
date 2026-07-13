import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { isClerkConfigured } from "@/lib/auth";
export default function SignInPage() { return <main className="grid min-h-screen place-items-center bg-brand-navy p-6"><div className="w-full max-w-md space-y-8"><Link href="/"><BrandMark inverse /></Link>{isClerkConfigured() ? <SignIn path="/sign-in" signUpUrl="/sign-up" forceRedirectUrl="/developers" /> : <div className="rounded-lg border border-white/15 bg-white p-6"><h1 className="text-xl font-bold text-brand-navy">Account identity is ready to connect</h1><p className="mt-2 text-sm text-muted-foreground">Install Clerk in the Vercel project and add its publishable and secret keys to enable reader and developer accounts.</p></div>}</div></main>; }
