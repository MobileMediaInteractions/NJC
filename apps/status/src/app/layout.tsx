import type { Metadata, Viewport } from "next";
import "./styles.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://status.thejerseycourier.com"),
  title: { default: "NJC System Status", template: "%s | NJC System Status" },
  description: "Live availability and 90-day service history for The New Jersey Courier's publication, newsroom, APIs, products, delivery systems, and reserved entry points.",
  alternates: { canonical: "/" },
  icons: { icon: "/brand-mark.svg" },
  openGraph: {
    title: "NJC System Status",
    description: "Current availability and service history for The New Jersey Courier.",
    url: "https://status.thejerseycourier.com",
    siteName: "The New Jersey Courier",
    type: "website",
  },
};

export const viewport: Viewport = { colorScheme: "light dark", themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f5f1e8" }, { media: "(prefers-color-scheme: dark)", color: "#101713" }] };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
