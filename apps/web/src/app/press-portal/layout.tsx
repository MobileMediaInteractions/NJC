import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { brandAssets } from "@/lib/assets";

const pressOrigin = process.env.NEXT_PUBLIC_PRESS_URL?.replace(/\/$/, "") ?? "https://press.thejerseycourier.com";
const canonicalPressUrl = process.env.PRESS_SUBDOMAIN_ENABLED === "true"
  ? pressOrigin
  : "https://www.thejerseycourier.com/press-portal";

export const metadata: Metadata = {
  metadataBase: new URL(canonicalPressUrl),
  title: { default: "Press & Media | The New Jersey Courier", template: "%s | NJ Courier Press & Media" },
  description: "Request authorized New Jersey Courier press materials through a policy-aware media portal.",
  alternates: { canonical: canonicalPressUrl },
  robots: { index: true, follow: true },
  openGraph: { title: "The New Jersey Courier Press & Media", description: "Official press materials, request-specific authorization, and secure delivery.", url: canonicalPressUrl, type: "website" },
};

export default function PressPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f4f0e7] text-[#11281f]">
      <header className="border-b border-[#173e32]/15 bg-[#102e25] text-white">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-6 px-5 py-4 sm:px-8 lg:px-12">
          <Link href="/" className="flex items-center gap-3" aria-label="NJ Courier Press and Media home">
            <Image src={brandAssets.mark} width={42} height={42} alt="" className="size-10" />
            <span><strong className="block text-sm tracking-tight">THE NEW JERSEY COURIER</strong><span className="block text-[10px] font-semibold uppercase tracking-[0.22em] text-white/55">Press &amp; Media</span></span>
          </Link>
          <nav className="flex items-center gap-5 text-xs font-semibold uppercase tracking-[0.12em] text-white/70">
            <a href="https://www.thejerseycourier.com/press" className="hover:text-white">Legacy press kit</a>
            <a href="https://www.thejerseycourier.com" className="hidden hover:text-white sm:block">Courier home</a>
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-[#173e32]/15 px-5 py-8 text-center text-xs text-[#173e32]/65">
        Official Press &amp; Media portal of The New Jersey Courier. Request data is used to evaluate and fulfill media-material requests.
      </footer>
    </div>
  );
}
