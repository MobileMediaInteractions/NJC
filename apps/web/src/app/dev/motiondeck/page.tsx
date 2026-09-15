import type { Metadata } from "next";
import { MotionDeckDemo } from "@/components/dev/motiondeck-demo";

export const metadata: Metadata = {
  title: "Courier MotionDeck Workbench",
  description: "A synthetic, non-editorial demonstration of the NJMotion timeline format and synchronized podcast player.",
  robots: { index: false, follow: false },
};

export default function MotionDeckWorkbenchPage() {
  return <MotionDeckDemo />;
}
