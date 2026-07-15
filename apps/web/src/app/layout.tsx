import type { Metadata } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import { AppProviders } from "@/components/app-providers";
import { themeBootstrapScript } from "@/lib/theme";
import { siteConfig } from "@/lib/site";
import { brandAssets } from "@/lib/assets";
import { getSiteOrigin } from "@/lib/origin";
import { isSearchIndexingEnabled } from "@/lib/seo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  display: "swap",
});

const indexingEnabled = isSearchIndexingEnabled();

export const metadata: Metadata = {
  metadataBase: new URL(getSiteOrigin()),
  title: {
    default: `${siteConfig.name} | Middlesex County & New Jersey News`,
    template: `%s | ${siteConfig.shortName}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  creator: siteConfig.name,
  publisher: siteConfig.name,
  referrer: "origin-when-cross-origin",
  formatDetection: { telephone: false, address: false, email: false },
  alternates: {
    types: { "application/rss+xml": "/feed.xml" },
  },
  keywords: [
    "local news",
    "Middlesex County news",
    "New Jersey news",
    "New Brunswick",
    "NJ high school sports",
    "Statehouse",
    "local government",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: siteConfig.name,
    title: `${siteConfig.name} | ${siteConfig.tagline}`,
    description: siteConfig.description,
    url: getSiteOrigin(),
    images: [
      {
        url: brandAssets.gardenStateEngraving,
        width: 1731,
        height: 909,
        alt: "The New Jersey Courier — The Authoritative Voice of the Garden State",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    images: [brandAssets.gardenStateEngraving],
  },
  robots: {
    index: indexingEnabled,
    follow: indexingEnabled,
    googleBot: {
      index: indexingEnabled,
      follow: indexingEnabled,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    other: process.env.BING_SITE_VERIFICATION
      ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION }
      : undefined,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <AppProviders
          clerkEnabled={Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)}
        >
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
