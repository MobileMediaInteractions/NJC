import type { Metadata } from "next";
import { MediaPlayerShowcase } from "@/components/dev/media-player-showcase";

export const metadata: Metadata = {
  title: "Harborline Media SDK Workbench",
  description: "A safe visual workbench for the portable player and timeline package.",
  robots: { index: false, follow: false },
};

export default function MediaPlayerWorkbenchPage() {
  return <MediaPlayerShowcase />;
}
