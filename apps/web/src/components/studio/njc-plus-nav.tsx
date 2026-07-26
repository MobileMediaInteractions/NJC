import {
  Activity,
  BarChart3,
  Coins,
  FileVideo2,
  Flag,
  Home,
  KeyRound,
  Layers3,
  MessageSquareWarning,
  ScrollText,
} from "lucide-react";

export const njcPlusStudioSections = [
  { href: "/studio/njc-plus", label: "Overview", icon: Activity },
  { href: "/studio/njc-plus/content", label: "Content", icon: FileVideo2 },
  { href: "/studio/njc-plus/homepage", label: "Homepage", icon: Home },
  { href: "/studio/njc-plus/commerce", label: "Tiers & offers", icon: Layers3 },
  { href: "/studio/njc-plus/access", label: "Access", icon: KeyRound },
  { href: "/studio/njc-plus/credits", label: "Credits", icon: Coins },
  { href: "/studio/njc-plus/comments", label: "Comments", icon: MessageSquareWarning },
  { href: "/studio/njc-plus/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/studio/njc-plus/audit", label: "Audit log", icon: ScrollText },
  { href: "/studio/njc-plus/flags", label: "Feature flags", icon: Flag },
] as const;

export function NjcPlusStudioHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="mb-7"><p className="text-xs font-black uppercase tracking-[0.18em] text-primary">{eyebrow}</p><h1 className="mt-1 text-3xl font-bold tracking-tight">{title}</h1><p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p></div>;
}
