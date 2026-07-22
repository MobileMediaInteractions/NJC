"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, ExternalLink, Loader2, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatNavigation, parseNavigation, type AdPlacementName, type SiteConfiguration } from "@/lib/site-settings";

type SaveState = "idle" | "saving" | "saved" | "error";

const placements: Array<{ key: AdPlacementName; label: string; description: string }> = [
  { key: "homepageLeaderboard", label: "Homepage leaderboard", description: "Wide placement above the homepage’s top-stories package." },
  { key: "articleInline", label: "Article inline", description: "Responsive unit after the article body and before tags." },
  { key: "sectionInline", label: "Section inline", description: "Responsive unit between the leading section package and story grid." },
];

export function SiteSettingsForm({
  initialConfiguration,
  canManage,
  updatedAt,
}: {
  initialConfiguration: SiteConfiguration;
  canManage: boolean;
  updatedAt: string | null;
}) {
  const [configuration, setConfiguration] = useState(initialConfiguration);
  const [navigationText, setNavigationText] = useState(formatNavigation(initialConfiguration.navigation));
  const [state, setState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");

  function updatePublication(key: keyof SiteConfiguration["publication"], value: string) {
    setConfiguration((current) => ({ ...current, publication: { ...current.publication, [key]: value } }));
  }

  function updateFeature(key: keyof SiteConfiguration["features"], value: boolean) {
    setConfiguration((current) => ({ ...current, features: { ...current.features, [key]: value } }));
  }

  function updateAdvertising<Key extends keyof SiteConfiguration["advertising"]>(key: Key, value: SiteConfiguration["advertising"][Key]) {
    setConfiguration((current) => ({ ...current, advertising: { ...current.advertising, [key]: value } }));
  }

  function updatePlacement(name: AdPlacementName, key: "enabled" | "slotId", value: boolean | string) {
    setConfiguration((current) => ({
      ...current,
      advertising: {
        ...current.advertising,
        placements: {
          ...current.advertising.placements,
          [name]: { ...current.advertising.placements[name], [key]: value },
        },
      },
    }));
  }

  async function save() {
    if (!canManage || state === "saving") return;
    setState("saving");
    setMessage("");
    const payload = { ...configuration, navigation: parseNavigation(navigationText) };
    try {
      const response = await fetch("/api/v1/studio/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json() as { data?: SiteConfiguration; error?: { message?: string; details?: { formErrors?: string[]; fieldErrors?: Record<string, string[]> } } };
      if (!response.ok || !result.data) {
        const detail = result.error?.details?.formErrors?.[0] ?? Object.values(result.error?.details?.fieldErrors ?? {}).flat()[0];
        throw new Error(detail ?? result.error?.message ?? "The configuration could not be saved");
      }
      setConfiguration(result.data);
      setNavigationText(formatNavigation(result.data.navigation));
      setState("saved");
      setMessage("Production configuration saved. Public pages will use the new values on their next request.");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "The configuration could not be saved");
    }
  }

  const adsReady = configuration.advertising.enabled &&
    Boolean(configuration.advertising.publisherId) &&
    configuration.advertising.privacyMessageConfigured;

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Site configuration</h1>
          <p className="mt-1 text-sm text-muted-foreground">Control publication identity, navigation, reader features and advertising from one audited workspace.</p>
        </div>
        <div className="flex items-center gap-3">
          {updatedAt ? <p className="text-xs text-muted-foreground">Last saved {new Date(updatedAt).toLocaleString()}</p> : null}
          <Button onClick={save} disabled={!canManage || state === "saving"}>
            {state === "saving" ? <Loader2 className="animate-spin" /> : state === "saved" ? <CheckCircle2 /> : null}
            Save configuration
          </Button>
        </div>
      </div>

      {!canManage ? <div className="mt-6 flex gap-3 rounded-lg border border-amber-400/40 bg-amber-400/10 p-4 text-sm"><ShieldAlert className="mt-0.5 size-5 shrink-0" /><p>You can review these values, but only an administrator can change production site configuration.</p></div> : null}
      {message ? <p role="status" className={`mt-5 rounded-lg border p-4 text-sm ${state === "error" ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-primary/30 bg-primary/10"}`}>{message}</p> : null}

      <Tabs defaultValue="publication" className="mt-7">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="publication" className="px-3 py-2">Publication</TabsTrigger>
          <TabsTrigger value="features" className="px-3 py-2">Features</TabsTrigger>
          <TabsTrigger value="advertising" className="px-3 py-2">Google AdSense</TabsTrigger>
        </TabsList>

        <TabsContent value="publication" className="space-y-6 pt-4">
          <Card><CardHeader><CardTitle>Brand and coverage</CardTitle><CardDescription>These values feed the public masthead, footer, metadata, feeds and public configuration API.</CardDescription></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2">
            <TextField label="Publication name" value={configuration.publication.name} onChange={(value) => updatePublication("name", value)} disabled={!canManage} />
            <TextField label="Short name" value={configuration.publication.shortName} onChange={(value) => updatePublication("shortName", value)} disabled={!canManage} />
            <TextField label="Tagline" value={configuration.publication.tagline} onChange={(value) => updatePublication("tagline", value)} disabled={!canManage} className="sm:col-span-2" />
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="site-description">Search and social description</Label><Textarea id="site-description" value={configuration.publication.description} disabled={!canManage} onChange={(event) => updatePublication("description", event.target.value)} className="min-h-24" /></div>
            <TextField label="Coverage region" value={configuration.publication.region} onChange={(value) => updatePublication("region", value)} disabled={!canManage} />
            <TextField label="Primary city" value={configuration.publication.city} onChange={(value) => updatePublication("city", value)} disabled={!canManage} />
            <TextField label="State" value={configuration.publication.state} onChange={(value) => updatePublication("state", value)} disabled={!canManage} />
            <TextField label="Newsroom desk" value={configuration.publication.station} onChange={(value) => updatePublication("station", value)} disabled={!canManage} />
            <TextField label="IANA timezone" value={configuration.publication.timezone} onChange={(value) => updatePublication("timezone", value)} disabled={!canManage} placeholder="America/New_York" className="sm:col-span-2" />
          </CardContent></Card>

          <Card><CardHeader><CardTitle>Primary navigation</CardTitle><CardDescription>One item per line in the format <code>Label | /local-path</code>. External and script URLs are rejected.</CardDescription></CardHeader><CardContent><Label htmlFor="site-navigation">Menu items</Label><Textarea id="site-navigation" value={navigationText} disabled={!canManage} onChange={(event) => setNavigationText(event.target.value)} className="mt-2 min-h-56 font-mono text-xs" /></CardContent></Card>
        </TabsContent>

        <TabsContent value="features" className="pt-4">
          <Card><CardHeader><CardTitle>Reader and commercial features</CardTitle><CardDescription>These flags are published through the shared configuration API so web, mobile and television clients can converge on the same availability.</CardDescription></CardHeader><CardContent className="space-y-5">
            <Toggle label="Comments" description="Reader discussion endpoints and future story controls." checked={configuration.features.comments} disabled={!canManage} onCheckedChange={(value) => updateFeature("comments", value)} />
            <Toggle label="Newsletters" description="Newsletter signup surfaces and API availability." checked={configuration.features.newsletters} disabled={!canManage} onCheckedChange={(value) => updateFeature("newsletters", value)} />
            <Toggle label="Breaking-news alerts" description="Alert enrollment and delivery surfaces." checked={configuration.features.alerts} disabled={!canManage} onCheckedChange={(value) => updateFeature("alerts", value)} />
            <Toggle label="Live video" description="Live-stream navigation and playback availability." checked={configuration.features.liveVideo} disabled={!canManage} onCheckedChange={(value) => updateFeature("liveVideo", value)} />
            <Toggle label="Weather" description="National Weather Service pages and navigation." checked={configuration.features.weather} disabled={!canManage} onCheckedChange={(value) => updateFeature("weather", value)} />
            <Toggle label="Membership" description="Reserved membership surfaces for a future provider." checked={configuration.features.membership} disabled={!canManage} onCheckedChange={(value) => updateFeature("membership", value)} />
            <Toggle label="Donations" description="Reserved reader-support surfaces for a future provider." checked={configuration.features.donations} disabled={!canManage} onCheckedChange={(value) => updateFeature("donations", value)} />
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="advertising" className="space-y-6 pt-4">
          <Card><CardHeader><div className="flex flex-wrap items-start justify-between gap-4"><div><CardTitle>Google AdSense</CardTitle><CardDescription>Global delivery controls. No ad code loads while advertising is disabled or Preview mode is on.</CardDescription></div><Badge variant={adsReady ? "secondary" : "outline"}>{adsReady ? configuration.advertising.previewMode ? "Preview only" : "Ready for live delivery" : "Not ready"}</Badge></div></CardHeader><CardContent className="space-y-5">
            <Toggle label="Enable advertising" description="Makes configured ad placements eligible to render." checked={configuration.advertising.enabled} disabled={!canManage} onCheckedChange={(value) => updateAdvertising("enabled", value)} />
            <Toggle label="Preview mode" description="Shows clearly labeled placeholders without loading Google or generating impressions. Keep this on during newsroom testing." checked={configuration.advertising.previewMode} disabled={!canManage} onCheckedChange={(value) => updateAdvertising("previewMode", value)} />
            <Toggle label="Auto ads" description="Loads the global AdSense code so placement optimization can be controlled from the AdSense account." checked={configuration.advertising.autoAds} disabled={!canManage} onCheckedChange={(value) => updateAdvertising("autoAds", value)} />
            <TextField label="AdSense publisher ID" value={configuration.advertising.publisherId} onChange={(value) => updateAdvertising("publisherId", value)} disabled={!canManage} placeholder="pub-1234567890123456" />
            <Toggle label="Publish ads.txt authorization" description="Serves Google’s DIRECT authorization record at /ads.txt when a publisher ID is present." checked={configuration.advertising.adsTxtEnabled} disabled={!canManage} onCheckedChange={(value) => updateAdvertising("adsTxtEnabled", value)} />
            <Toggle label="Google-certified privacy messaging is configured" description="Required before ads can be enabled. Configure Google Privacy & messaging or another certified CMP in the AdSense account." checked={configuration.advertising.privacyMessageConfigured} disabled={!canManage} onCheckedChange={(value) => updateAdvertising("privacyMessageConfigured", value)} />
            <div className="rounded-lg border bg-muted/30 p-4 text-xs leading-5 text-muted-foreground">Studio cannot verify external AdSense approval, site review or consent-message status. Confirm those in AdSense before turning off Preview mode. <Link href="https://support.google.com/adsense/answer/13554116" target="_blank" rel="noreferrer" className="font-semibold text-primary underline">Consent requirements <ExternalLink className="inline size-3" /></Link></div>
          </CardContent></Card>

          <Card><CardHeader><CardTitle>Manual placements</CardTitle><CardDescription>Use the 10-digit ad unit IDs created in AdSense. Placements remain visually separated and labeled “Advertisement.”</CardDescription></CardHeader><CardContent className="space-y-6">{placements.map((placement) => {
            const value = configuration.advertising.placements[placement.key];
            return <div key={placement.key} className="grid gap-4 border-b pb-6 last:border-0 last:pb-0 sm:grid-cols-[1fr_14rem] sm:items-end"><Toggle label={placement.label} description={placement.description} checked={value.enabled} disabled={!canManage} onCheckedChange={(checked) => updatePlacement(placement.key, "enabled", checked)} /><TextField id={`ad-slot-${placement.key}`} label="Ad unit ID" value={value.slotId} onChange={(slotId) => updatePlacement(placement.key, "slotId", slotId)} disabled={!canManage || !value.enabled} placeholder="1234567890" /></div>;
          })}</CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TextField({ id: explicitId, label, value, onChange, disabled, placeholder, className }: { id?: string; label: string; value: string; onChange: (value: string) => void; disabled: boolean; placeholder?: string; className?: string }) {
  const id = explicitId ?? `setting-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return <div className={`space-y-2 ${className ?? ""}`}><Label htmlFor={id}>{label}</Label><Input id={id} value={value} disabled={disabled} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></div>;
}

function Toggle({ label, description, checked, disabled, onCheckedChange }: { label: string; description: string; checked: boolean; disabled: boolean; onCheckedChange: (checked: boolean) => void }) {
  return <div className="flex items-start justify-between gap-5"><div><p className="text-sm font-medium">{label}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p></div><Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} aria-label={label} /></div>;
}
