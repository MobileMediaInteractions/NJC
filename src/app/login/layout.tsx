import { BrandMark } from "@/components/brand-mark";

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,#0a4b78_0,#072f4d_46%,#041d30_100%)] text-white">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-7">
        <BrandMark inverse />
        <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-white/70">
          Secure device sign-in
        </span>
      </header>
      {children}
    </main>
  );
}
