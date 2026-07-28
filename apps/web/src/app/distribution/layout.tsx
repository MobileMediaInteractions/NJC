import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, LibraryBig, LockKeyhole } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import "./distribution.css";
import "./distribution-content.css";

export const metadata: Metadata = {
  title: "NJC Distribution",
  robots: { index: false, follow: false, nocache: true },
};

export default function DistributionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="distribution-root">
      <header className="distribution-header">
        <Link href="/distribution" className="distribution-brand">
          <BrandMark inverse />
          <span>Distribution</span>
        </Link>
        <nav aria-label="Distribution navigation">
          <Link href="/distribution">
            <LibraryBig /> Library
          </Link>
          <Link href="/">
            <ArrowLeft /> Courier
          </Link>
          <span>
            <LockKeyhole /> Private access
          </span>
        </nav>
      </header>
      {children}
    </div>
  );
}
