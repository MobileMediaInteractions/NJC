import type { Metadata } from "next";
import "./studio-adminlte.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { default: "Newsroom Studio", template: "%s | Courier Studio" },
  robots: { index: false, follow: false, noarchive: true },
};

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return children;
}
