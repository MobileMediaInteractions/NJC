import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = { title: "Platform Animation Playground", description: "Compile and inspect deterministic Platform animation packages." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
