import { StudioGate } from "@/components/studio/studio-gate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { siteConfig } from "@/lib/site";

export default function SettingsPage() {
  return <StudioGate><div className="max-w-3xl"><h1 className="text-3xl font-bold tracking-tight">Settings</h1><p className="mt-1 text-sm text-muted-foreground">Current publication configuration. Repository-managed values are read-only in this release.</p><Card className="mt-7"><CardHeader><CardTitle>Brand & region</CardTitle><CardDescription>These production values are centralized in src/lib/site.ts and deployed through source control.</CardDescription></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2"><Field label="Publication name" value={siteConfig.name} /><Field label="Primary city" value={siteConfig.city} /><Field label="Region" value={siteConfig.region} /><Field label="Desk" value={siteConfig.station} /></CardContent></Card><Card className="mt-6"><CardHeader><CardTitle>Commercial modules</CardTitle><CardDescription>Availability reflects the committed production configuration.</CardDescription></CardHeader><CardContent className="space-y-5"><Toggle label="Advertising placements" enabled={siteConfig.monetization.adsEnabled} /><Toggle label="Membership" enabled={siteConfig.monetization.membershipEnabled} /><Toggle label="Donations" enabled={siteConfig.monetization.donationsEnabled} /></CardContent></Card></div></StudioGate>;
}

function Field({ label, value }: { label: string; value: string }) {
  return <div className="space-y-2"><Label>{label}</Label><Input value={value} readOnly aria-readonly="true" /></div>;
}

function Toggle({ label, enabled }: { label: string; enabled: boolean }) {
  return <div className="flex items-center justify-between"><div><p className="text-sm font-medium">{label}</p><p className="text-xs text-muted-foreground">{enabled ? "Enabled in production configuration" : "Not enabled"}</p></div><Switch checked={enabled} disabled aria-label={label} /></div>;
}
