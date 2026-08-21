"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Activity,
  BadgeDollarSign,
  BellRing,
  Bot,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  ExternalLink,
  FileText,
  LayoutGrid,
  Loader2,
  Navigation,
  Palette,
  Plus,
  Settings2,
  ShieldAlert,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Trash2,
  Zap,
  DatabaseZap,
} from "lucide-react";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ConfigurationRegistryPanel, type ConfigurationHistoryRow } from "@/components/studio/configuration-registry-panel";
import { CourierEasterEggReveal } from "@/components/courier-easter-egg";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { EditableList } from "@/components/studio/editable-list";
import {
  type AdPlacementName,
  crossesV2ProductionBoundary,
  type SiteConfiguration,
  type StudioModuleKey,
  type V2HomepageModuleKey,
} from "@/lib/site-settings";
import { configurationImpact } from "@/lib/platform-feature-registry";

type SaveState = "idle" | "saving" | "saved" | "error";

const placements: Array<{ key: AdPlacementName; label: string; description: string }> = [
  { key: "homepageLeaderboard", label: "Homepage leaderboard", description: "Wide placement above the homepage’s top-stories package." },
  { key: "articleInline", label: "Article inline", description: "Responsive unit after the article body and before tags." },
  { key: "sectionInline", label: "Section inline", description: "Responsive unit between the leading section package and story grid." },
];

const v2ModuleLabels: Record<V2HomepageModuleKey, { label: string; description: string }> = {
  live: { label: "Live and breaking", description: "Promote an active Live Desk above the lead package." },
  lead: { label: "Primary lead", description: "One dominant image-and-headline package." },
  secondary: { label: "Secondary leads", description: "Two deliberate follow-up stories after the lead." },
  latest: { label: "Latest rail", description: "A fast, text-first chronological briefing." },
  sections: { label: "Section packages", description: "Topic-led reporting with varied editorial rhythm." },
  newsletter: { label: "Newsletter", description: "The restrained Middlesex Morning signup surface." },
};

const studioModules: Array<{
  key: StudioModuleKey;
  label: string;
  description: string;
  group: "Newsroom" | "Operations" | "Business";
}> = [
  { key: "commandReference", label: "Commands and shortcuts", description: "Searchable help for navigation and guarded actions.", group: "Operations" },
  { key: "stories", label: "Stories", description: "Draft, review, schedule and publish journalism.", group: "Newsroom" },
  { key: "media", label: "Media library", description: "Upload and reuse newsroom images.", group: "Newsroom" },
  { key: "tips", label: "News tips", description: "Review sensitive reader submissions.", group: "Newsroom" },
  { key: "twentyUnderTwenty", label: "20 Under 20", description: "Program and nomination controls.", group: "Newsroom" },
  { key: "distributionManager", label: "Secure distribution", description: "Pre-publication package delivery.", group: "Operations" },
  { key: "pressReleases", label: "Press releases", description: "Release authoring and PDF generation.", group: "Operations" },
  { key: "pressRequests", label: "Press requests", description: "Media-request intake and fulfillment.", group: "Operations" },
  { key: "exports", label: "Portable exports", description: "Migration-ready newsroom backups.", group: "Operations" },
  { key: "chat", label: "Team chat", description: "Internal channels and direct collaboration.", group: "Operations" },
  { key: "team", label: "Team and roles", description: "Identity, access and staff management.", group: "Operations" },
  { key: "notifications", label: "Site notifications", description: "Permission-aware reader push campaigns.", group: "Operations" },
  { key: "linkInBio", label: "Link in Bio", description: "Curate the social profile landing page and article redirects.", group: "Operations" },
  { key: "njcPlusOverview", label: "NJC+ overview", description: "Premium network launch status.", group: "Business" },
  { key: "njcPlusContent", label: "NJC+ content", description: "Premium editorial, audio and video.", group: "Business" },
  { key: "njcPlusHomepage", label: "NJC+ homepage", description: "Premium landing-page curation.", group: "Business" },
  { key: "njcPlusCommerce", label: "NJC+ tiers and offers", description: "Products, prices and offers.", group: "Business" },
  { key: "njcPlusAccess", label: "NJC+ access", description: "Entitlements and invited beta testers.", group: "Business" },
  { key: "njcPlusCredits", label: "NJC+ credits", description: "Access-credit grants and balances.", group: "Business" },
  { key: "njcPlusComments", label: "NJC+ comments", description: "Premium discussion moderation.", group: "Business" },
  { key: "njcPlusAnalytics", label: "NJC+ analytics", description: "Premium audience reporting.", group: "Business" },
  { key: "njcPlusAudit", label: "NJC+ audit log", description: "Premium privileged-action history.", group: "Business" },
  { key: "njcPlusFlags", label: "NJC+ feature flags", description: "Premium beta capability controls.", group: "Business" },
  { key: "financeOverview", label: "Finance overview", description: "Revenue, liabilities and reserves.", group: "Business" },
  { key: "financeLedger", label: "General ledger", description: "Double-entry financial records.", group: "Business" },
  { key: "financeReconciliation", label: "Finance reconciliation", description: "Processor reconciliation and period close.", group: "Business" },
  { key: "financeSettings", label: "Finance policy", description: "Reserve and tax planning assumptions.", group: "Business" },
  { key: "analytics", label: "Analytics", description: "Audience and platform reporting.", group: "Business" },
  { key: "legal", label: "Legal publishing", description: "High-verification legal document controls.", group: "Business" },
];

export function SiteSettingsForm({
  initialConfiguration,
  canManage,
  updatedAt,
  initialRevision,
  history,
  operationalHealth,
  environmentDesignOverride,
}: {
  initialConfiguration: SiteConfiguration;
  canManage: boolean;
  updatedAt: string | null;
  initialRevision: number;
  history: ConfigurationHistoryRow[];
  operationalHealth: { database: boolean; identity: boolean; scheduler: boolean; aiImages: boolean };
  environmentDesignOverride: "legacy" | "v2" | null;
}) {
  const [configuration, setConfiguration] = useState(initialConfiguration);
  const [lastSavedConfiguration, setLastSavedConfiguration] = useState(initialConfiguration);
  const [state, setState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");
  const [easterEggPreviewOpen, setEasterEggPreviewOpen] = useState(false);
  const [revision, setRevision] = useState(initialRevision);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [changeReason, setChangeReason] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const dirty = JSON.stringify(configuration) !== JSON.stringify(lastSavedConfiguration);
  const impact = configurationImpact(lastSavedConfiguration, configuration);
  const productionDesignTransition = crossesV2ProductionBoundary(
    lastSavedConfiguration.presentation.designMode,
    configuration.presentation.designMode,
  );
  const highImpact = productionDesignTransition ||
    impact.some((entry) => /pseudonym|scheduling|authorization|audit/.test(entry.key));

  function updatePublication(key: keyof SiteConfiguration["publication"], value: string) {
    setConfiguration((current) => ({ ...current, publication: { ...current.publication, [key]: value } }));
  }

  function updateFeature(key: keyof SiteConfiguration["features"], value: boolean) {
    setConfiguration((current) => ({ ...current, features: { ...current.features, [key]: value } }));
  }

  function updateEasterEgg<Key extends keyof SiteConfiguration["easterEgg"]>(
    key: Key,
    value: SiteConfiguration["easterEgg"][Key],
  ) {
    setConfiguration((current) => ({
      ...current,
      easterEgg: { ...current.easterEgg, [key]: value },
    }));
  }

  function updateGoogleAnalytics<Key extends keyof SiteConfiguration["measurement"]["googleAnalytics"]>(
    key: Key,
    value: SiteConfiguration["measurement"]["googleAnalytics"][Key],
  ) {
    setConfiguration((current) => ({
      ...current,
      measurement: {
        ...current.measurement,
        googleAnalytics: {
          ...current.measurement.googleAnalytics,
          [key]: value,
        },
      },
    }));
  }

  function updateNativeApps<Key extends keyof SiteConfiguration["nativeApps"]>(
    key: Key,
    value: SiteConfiguration["nativeApps"][Key],
  ) {
    setConfiguration((current) => ({
      ...current,
      nativeApps: { ...current.nativeApps, [key]: value },
    }));
  }

  function updatePresentation<Key extends keyof SiteConfiguration["presentation"]>(
    key: Key,
    value: SiteConfiguration["presentation"][Key],
  ) {
    setConfiguration((current) => ({
      ...current,
      presentation: { ...current.presentation, [key]: value },
    }));
  }

  function updateV2Presentation<Key extends keyof SiteConfiguration["presentation"]["v2"]>(
    key: Key,
    value: SiteConfiguration["presentation"]["v2"][Key],
  ) {
    updatePresentation("v2", { ...configuration.presentation.v2, [key]: value });
  }

  function moveV2Module(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= configuration.presentation.v2.homepageModules.length) return;
    const modules = [...configuration.presentation.v2.homepageModules];
    [modules[index], modules[nextIndex]] = [modules[nextIndex], modules[index]];
    updateV2Presentation("homepageModules", modules);
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

  function updateStudioModule(key: StudioModuleKey, value: boolean) {
    setConfiguration((current) => ({
      ...current,
      studio: {
        ...current.studio,
        modules: { ...current.studio.modules, [key]: value },
      },
    }));
  }

  function updateStudioGroup<
    Group extends
      | "experience"
      | "notifications"
      | "editorialWorkflow"
      | "automations",
    Key extends keyof SiteConfiguration["studio"][Group],
  >(
    group: Group,
    key: Key,
    value: SiteConfiguration["studio"][Group][Key],
  ) {
    setConfiguration((current) => ({
      ...current,
      studio: {
        ...current.studio,
        [group]: { ...current.studio[group], [key]: value },
      },
    }));
  }

  function toggleWorkflowRole(
    key: "pseudonymEligibleRoles" | "schedulingEligibleRoles",
    role: "admin" | "editor" | "producer" | "reporter" | "contributor",
    enabled: boolean,
  ) {
    const current = configuration.studio.editorialWorkflow[key] as string[];
    updateStudioGroup("editorialWorkflow", key, (enabled ? [...new Set([...current, role])] : current.filter((value) => value !== role)) as never);
  }

  async function save() {
    if (!canManage || state === "saving") return;
    setState("saving");
    setMessage("");
    try {
      const response = await fetch("/api/v1/studio/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configuration, expectedRevision: revision, reason: changeReason, confirmation }),
      });
      const result = await response.json() as { data?: SiteConfiguration; meta?: { revision?: number }; error?: { message?: string; details?: { formErrors?: string[]; fieldErrors?: Record<string, string[]> } } };
      if (!response.ok || !result.data) {
        const detail = result.error?.details?.formErrors?.[0] ?? Object.values(result.error?.details?.fieldErrors ?? {}).flat()[0];
        throw new Error(detail ?? result.error?.message ?? "The configuration could not be saved");
      }
      setConfiguration(result.data);
      setLastSavedConfiguration(result.data);
      setRevision(result.meta?.revision ?? revision + 1);
      setReviewOpen(false);
      setChangeReason("");
      setConfirmation("");
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
  const googleAnalyticsReady = configuration.measurement.googleAnalytics.enabled &&
    Boolean(configuration.measurement.googleAnalytics.measurementId);
  const enabledFeatureCount = Object.values(configuration.features).filter(Boolean).length;
  const totalFeatureCount = Object.keys(configuration.features).length;
  const enabledStudioModuleCount = Object.values(configuration.studio.modules).filter(Boolean).length;

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Platform operations</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Configuration control room</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Prepare publication, editorial, feature and advertising changes from one focused workspace. Existing server validation remains the release boundary.</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Badge variant={dirty ? "default" : "secondary"}>{dirty ? "Unsaved changes" : "Production saved"}</Badge>
          <Button onClick={() => setReviewOpen(true)} disabled={!canManage || state === "saving" || !dirty}>
            {state === "saving" ? <Loader2 className="animate-spin" /> : state === "saved" && !dirty ? <CheckCircle2 /> : null}
            Save configuration
          </Button>
        </div>
      </div>

      {!canManage ? <div className="mt-6 flex gap-3 rounded-lg border border-amber-400/40 bg-amber-400/10 p-4 text-sm"><ShieldAlert className="mt-0.5 size-5 shrink-0" /><p>You can review these values, but only an administrator can change production site configuration.</p></div> : null}
      {message ? <p role="status" className={`mt-5 rounded-lg border p-4 text-sm ${state === "error" ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-primary/30 bg-primary/10"}`}>{message}</p> : null}
      <AlertDialog open={reviewOpen} onOpenChange={setReviewOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Review production changes</AlertDialogTitle><AlertDialogDescription>This atomic save expects revision {revision}. If another administrator saves first, Studio rejects this request instead of overwriting their work.</AlertDialogDescription></AlertDialogHeader><div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border p-3">{impact.length ? impact.map((entry) => <div key={entry.key} className="text-sm"><strong>{entry.name}</strong><p className="text-xs text-muted-foreground">Affects {entry.platforms.join(", ")} · {entry.rollout} rollout · {entry.dependencies.length ? `depends on ${entry.dependencies.join(", ")}` : "no registered dependencies"}</p></div>) : <p className="text-sm text-muted-foreground">Publication text, navigation, or provider configuration changed.</p>}</div><div className="space-y-2"><Label htmlFor="configuration-change-reason">Required change reason</Label><Input id="configuration-change-reason" value={changeReason} onChange={(event) => setChangeReason(event.target.value)} placeholder="Choose and explain the production outcome" /></div>{highImpact ? <div className="space-y-2"><Label htmlFor="configuration-confirmation">Type APPLY PRODUCTION CHANGE</Label><Input id="configuration-confirmation" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></div> : null}<AlertDialogFooter><AlertDialogCancel>Continue editing</AlertDialogCancel><Button onClick={() => void save()} disabled={state === "saving" || changeReason.trim().length < 8 || (highImpact && confirmation !== "APPLY PRODUCTION CHANGE")}>{state === "saving" ? <Loader2 className="animate-spin" /> : null}Apply revision {revision + 1}</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>

      <section className="mt-7 overflow-hidden rounded-2xl bg-[#102f25] text-white ring-1 ring-black/10">
        <div className="grid sm:grid-cols-2 xl:grid-cols-5">
          <ControlStatus label="Release state" value={canManage ? "Administrator" : "Read only"} detail={canManage ? "Validated save access" : "Review access only"} />
          <ControlStatus label="Studio" value={`${enabledStudioModuleCount} of ${studioModules.length} workspaces`} detail="Permission checks still apply" />
          <ControlStatus label="Runtime features" value={`${enabledFeatureCount} of ${totalFeatureCount} on`} detail="Shared availability flags" />
          <ControlStatus label="Measurement" value={configuration.measurement.googleAnalytics.enabled ? "GA4 requested" : "First-party only"} detail={googleAnalyticsReady ? "Consent-gated ID present" : "External analytics off"} />
          <ControlStatus label="Advertising" value={configuration.advertising.enabled ? configuration.advertising.previewMode ? "Preview" : "Live requested" : "Off"} detail={adsReady ? "Required fields present" : "Setup incomplete"} />
        </div>
        <div className="border-t border-white/10 px-5 py-3 text-[0.68rem] text-white/48 sm:px-6">
          {updatedAt ? `Last production save ${new Date(updatedAt).toLocaleString()}` : "No production save timestamp is available."}
        </div>
      </section>

      <Tabs defaultValue="publication" orientation="vertical" className="mt-7 gap-6 lg:grid lg:grid-cols-[14rem_minmax(0,1fr)]">
        <aside className="min-w-0">
          <div className="lg:sticky lg:top-24">
            <p className="mb-2 px-2 text-[0.65rem] font-black uppercase tracking-[0.16em] text-muted-foreground">Control areas</p>
            <TabsList className="h-auto w-full max-w-full justify-start gap-1 overflow-x-auto bg-transparent p-0 lg:flex-col lg:items-stretch">
              <TabsTrigger value="publication" className="h-10 shrink-0 justify-start px-3 lg:w-full"><Navigation /> Publication</TabsTrigger>
              <TabsTrigger value="design" className="h-10 shrink-0 justify-start px-3 lg:w-full"><Palette /> Site design</TabsTrigger>
              <TabsTrigger value="editorial" className="h-10 shrink-0 justify-start px-3 lg:w-full"><FileText /> Editorial</TabsTrigger>
              <TabsTrigger value="features" className="h-10 shrink-0 justify-start px-3 lg:w-full"><SlidersHorizontal /> Features</TabsTrigger>
              <TabsTrigger value="easter-egg" className="h-10 shrink-0 justify-start px-3 lg:w-full"><Sparkles /> Easter egg</TabsTrigger>
              <TabsTrigger value="studio" className="h-10 shrink-0 justify-start px-3 lg:w-full"><LayoutGrid /> Studio</TabsTrigger>
              <TabsTrigger value="notifications" className="h-10 shrink-0 justify-start px-3 lg:w-full"><BellRing /> Notifications</TabsTrigger>
              <TabsTrigger value="automations" className="h-10 shrink-0 justify-start px-3 lg:w-full"><Bot /> Automations</TabsTrigger>
              <TabsTrigger value="measurement" className="h-10 shrink-0 justify-start px-3 lg:w-full"><Activity /> Measurement</TabsTrigger>
              <TabsTrigger value="advertising" className="h-10 shrink-0 justify-start px-3 lg:w-full"><BadgeDollarSign /> Advertising</TabsTrigger>
              <TabsTrigger value="registry" className="h-10 shrink-0 justify-start px-3 lg:w-full"><DatabaseZap /> Registry & history</TabsTrigger>
            </TabsList>
            <div className="mt-4 hidden rounded-lg border bg-muted/25 p-3 text-xs leading-5 text-muted-foreground lg:block">
              <Settings2 className="mb-2 size-4 text-primary" />
              Changes stay local until the production save completes successfully.
            </div>
          </div>
        </aside>

        <div className="min-w-0">
        <TabsContent value="design" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Public presentation version</CardTitle><CardDescription>Content, URLs, accounts and analytics stay shared. Administrators control the production rendering system; other approved Studio roles retain signed preview access.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              {environmentDesignOverride ? (
                <div className="flex gap-3 rounded-lg border border-amber-400/50 bg-amber-400/10 p-4 text-sm" role="status">
                  <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-300" />
                  <p><strong>Environment override active: {environmentDesignOverride === "v2" ? "V2" : "Legacy"}.</strong> Ordinary public requests use this renderer regardless of the saved release state until <code>SITE_DESIGN_OVERRIDE</code> is removed. Signed staff preview links can still compare either renderer.</p>
                </div>
              ) : null}
              {([
                ["legacy", "Legacy", "Keep the original Courier interface in production."],
                ["v2-preview", "V2 Preview", "Keep Legacy public while staff compare the new editorial system."],
                ["v2-production", "V2 Production", "Make the new editorial system the production default."],
              ] as const).map(([value, label, description]) => (
                <button key={value} type="button" disabled={!canManage} onClick={() => updatePresentation("designMode", value)} className={`flex w-full items-start gap-4 rounded-xl border p-4 text-left transition ${configuration.presentation.designMode === value ? "border-primary bg-primary/8 ring-2 ring-primary/20" : "bg-muted/10 hover:bg-muted/30"}`} aria-pressed={configuration.presentation.designMode === value}>
                  <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border ${configuration.presentation.designMode === value ? "border-primary" : "border-muted-foreground/40"}`}>{configuration.presentation.designMode === value ? <span className="size-2.5 rounded-full bg-primary" /> : null}</span>
                  <span><strong className="block text-sm">{label}</strong><span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span></span>
                </button>
              ))}
              <div className="flex flex-wrap gap-2 border-t pt-4">
                <Button asChild variant="outline"><a href="/api/v1/studio/settings/design-preview?design=v2&returnTo=/" target="_blank" rel="noopener noreferrer"><ExternalLink /> Preview V2</a></Button>
                <Button asChild variant="outline"><a href="/api/v1/studio/settings/design-preview?design=legacy&returnTo=/" target="_blank" rel="noopener noreferrer"><ExternalLink /> Preview Legacy</a></Button>
                <Button asChild variant="ghost"><a href="/api/v1/studio/settings/design-preview?design=production&returnTo=/" target="_blank" rel="noopener noreferrer">Use production default</a></Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>V2 homepage composition</CardTitle><CardDescription>Administrators select approved modules and their order. The renderer owns typography, spacing and responsive recomposition.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-3 rounded-lg border border-amber-400/50 bg-amber-400/10 p-4 text-xs leading-5">
                <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-300" />
                <p><strong>No one-to-one Legacy composition exists.</strong> Legacy keeps its fixed homepage hierarchy while sharing the same published stories and Live Desk state. Reordering or suppressing these modules affects V2 only; compare both signed previews before release.</p>
              </div>
              {configuration.presentation.v2.homepageModules.map((module, index) => {
                const copy = v2ModuleLabels[module];
                return <div key={module} className="flex items-center gap-3 rounded-xl border bg-muted/10 p-3"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-xs font-black tabular-nums">{String(index + 1).padStart(2, "0")}</span><span className="min-w-0 flex-1"><strong className="block text-sm">{copy.label}</strong><span className="block text-xs text-muted-foreground">{copy.description}</span></span><div className="flex gap-1"><Button type="button" variant="ghost" size="icon" disabled={!canManage || index === 0} onClick={() => moveV2Module(index, -1)} aria-label={`Move ${copy.label} earlier`}><ChevronUp /></Button><Button type="button" variant="ghost" size="icon" disabled={!canManage || index === configuration.presentation.v2.homepageModules.length - 1} onClick={() => moveV2Module(index, 1)} aria-label={`Move ${copy.label} later`}><ChevronDown /></Button><Button type="button" variant="ghost" size="icon" disabled={!canManage || configuration.presentation.v2.homepageModules.length === 1} onClick={() => updateV2Presentation("homepageModules", configuration.presentation.v2.homepageModules.filter((item) => item !== module))} aria-label={`Disable ${copy.label}`}><Trash2 /></Button></div></div>;
              })}
              {Object.entries(v2ModuleLabels).filter(([module]) => !configuration.presentation.v2.homepageModules.includes(module as V2HomepageModuleKey)).map(([module, copy]) => <Button key={module} type="button" variant="outline" disabled={!canManage} onClick={() => updateV2Presentation("homepageModules", [...configuration.presentation.v2.homepageModules, module as V2HomepageModuleKey])}><Plus /> Add {copy.label}</Button>)}
            </CardContent>
          </Card>

          <Card><CardHeader><CardTitle>V2 behavior</CardTitle><CardDescription>Quiet interface features that remain subordinate to the reporting.</CardDescription></CardHeader><CardContent className="space-y-3">
            <Toggle label="Article trust panel" description="Show structured publication, update, source and correction context." checked={configuration.presentation.v2.showArticleTrustPanel} onCheckedChange={(value) => updateV2Presentation("showArticleTrustPanel", value)} disabled={!canManage} />
            <Toggle label="Reading progress" description="Show a restrained two-pixel progress line only after reading begins." checked={configuration.presentation.v2.showReadingProgress} onCheckedChange={(value) => updateV2Presentation("showReadingProgress", value)} disabled={!canManage} />
            <Toggle label="Translucent header material" description="Use the restrained blur treatment for the global interface layer." checked={configuration.presentation.v2.useTranslucentHeader} onCheckedChange={(value) => updateV2Presentation("useTranslucentHeader", value)} disabled={!canManage} />
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="publication" className="space-y-6">
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

          <Card><CardHeader><CardTitle>Primary navigation</CardTitle><CardDescription>Add a label and local destination for each menu item. Studio handles the data structure; external and script URLs remain rejected.</CardDescription></CardHeader><CardContent className="space-y-3">
            {configuration.navigation.map((item, index) => (
              <div key={index} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end">
                <TextField label={`Item ${index + 1} label`} value={item.label} onChange={(label) => setConfiguration((current) => ({ ...current, navigation: current.navigation.map((entry, entryIndex) => entryIndex === index ? { ...entry, label, href: entry.href === "/" || entry.href === localPath(entry.label) ? localPath(label) : entry.href } : entry) }))} disabled={!canManage} />
                <TextField label="Local path" value={item.href} onChange={(href) => setConfiguration((current) => ({ ...current, navigation: current.navigation.map((entry, entryIndex) => entryIndex === index ? { ...entry, href } : entry) }))} disabled={!canManage} placeholder="/local-news" />
                <Button type="button" variant="ghost" size="icon" disabled={!canManage || configuration.navigation.length <= 1} onClick={() => setConfiguration((current) => ({ ...current, navigation: current.navigation.filter((_, entryIndex) => entryIndex !== index) }))} aria-label={`Remove ${item.label || `item ${index + 1}`}`}><Trash2 /></Button>
              </div>
            ))}
            <Button type="button" variant="outline" disabled={!canManage || configuration.navigation.length >= 12} onClick={() => setConfiguration((current) => ({ ...current, navigation: [...current.navigation, { label: "", href: "/" }] }))}><Plus /> Add menu item</Button>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="editorial">
          <div className="space-y-6"><Card>
            <CardHeader>
              <CardTitle>Story datelines</CardTitle>
              <CardDescription>
                One dateline per line. These become the approved choices in the
                story editor; the first entry is the default for new stories.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Label>Approved datelines</Label>
              <div className="mt-2">
                <EditableList
                  values={configuration.editorial.datelines}
                  onChange={(datelines) => setConfiguration((current) => ({ ...current, editorial: { ...current.editorial, datelines } }))}
                  placeholder="Add a city, county, or state desk"
                  addLabel="Add dateline"
                  disabled={!canManage}
                  maxItems={50}
                />
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Use recognizable geographic names. Changing this list does not
                rewrite datelines on already published stories.
              </p>
            </CardContent>
          </Card><Card><CardHeader><CardTitle>Editorial role eligibility</CardTitle><CardDescription>Feature availability and eligible newsroom roles are separate controls. Mandatory independent approval cannot be disabled.</CardDescription></CardHeader><CardContent className="space-y-5"><div><p className="text-sm font-medium">Pseudonym eligibility</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{(["admin", "editor", "producer", "reporter", "contributor"] as const).map((role) => <Toggle key={role} label={role} description={`Allow ${role}s to select their own verified pseudonym.`} checked={configuration.studio.editorialWorkflow.pseudonymEligibleRoles.includes(role)} disabled={!canManage || (configuration.studio.editorialWorkflow.pseudonymEligibleRoles.length === 1 && configuration.studio.editorialWorkflow.pseudonymEligibleRoles.includes(role))} onCheckedChange={(enabled) => toggleWorkflowRole("pseudonymEligibleRoles", role, enabled)} />)}</div></div><div><p className="text-sm font-medium">Scheduling eligibility</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{(["admin", "editor", "producer"] as const).map((role) => <Toggle key={role} label={role} description={`Allow ${role}s to schedule an independently approved story.`} checked={configuration.studio.editorialWorkflow.schedulingEligibleRoles.includes(role)} disabled={!canManage || (configuration.studio.editorialWorkflow.schedulingEligibleRoles.length === 1 && configuration.studio.editorialWorkflow.schedulingEligibleRoles.includes(role))} onCheckedChange={(enabled) => toggleWorkflowRole("schedulingEligibleRoles", role, enabled)} />)}</div></div><div className="rounded-lg border bg-muted/30 p-4 text-xs text-muted-foreground">Operational readiness is reported separately in Registry &amp; history. Authentication, authorization, audit integrity, hash-bound approval and backup protections remain visible and immutable.</div></CardContent></Card></div>
        </TabsContent>

        <TabsContent value="features">
          <div className="space-y-6"><Card><CardHeader><CardTitle>Reader and commercial features</CardTitle><CardDescription>These flags are published through the shared configuration API so web, mobile and television clients can converge on the same availability.</CardDescription></CardHeader><CardContent className="space-y-5">
            <Toggle label="Pseudonymous bylines" description="Allows eligible Studio authors to choose an approved saved pseudonym for a story while preserving internal accountability." checked={configuration.features.pseudonyms} disabled={!canManage} onCheckedChange={(value) => updateFeature("pseudonyms", value)} />
            <Toggle label="Secure distribution" description="Makes the authorized pre-publication distribution workspace available to supported clients." checked={configuration.features.distribution} disabled={!canManage} onCheckedChange={(value) => updateFeature("distribution", value)} />
            <Toggle label="Press & Media request portal" description="Enables public AI-assisted intake and policy evaluation on the dedicated Press hostname. Studio review and historical audit records remain available when disabled." checked={configuration.features.pressPortal} disabled={!canManage} onCheckedChange={(value) => updateFeature("pressPortal", value)} />
            <Toggle label="Link in Bio" description="Publishes the curated social article landing page on links.thejerseycourier.com. Existing entries remain in Studio when disabled." checked={configuration.features.linkInBio} disabled={!canManage} onCheckedChange={(value) => updateFeature("linkInBio", value)} />
            <Toggle label="Comments" description="Reader discussion endpoints and future story controls." checked={configuration.features.comments} disabled={!canManage} onCheckedChange={(value) => updateFeature("comments", value)} />
            <Toggle label="Newsletters" description="Newsletter signup surfaces and API availability." checked={configuration.features.newsletters} disabled={!canManage} onCheckedChange={(value) => updateFeature("newsletters", value)} />
            <Toggle label="Breaking-news alerts" description="Alert enrollment and delivery surfaces." checked={configuration.features.alerts} disabled={!canManage} onCheckedChange={(value) => updateFeature("alerts", value)} />
            <Toggle label="Live video" description="Live-stream navigation and playback availability." checked={configuration.features.liveVideo} disabled={!canManage} onCheckedChange={(value) => updateFeature("liveVideo", value)} />
            <Toggle label="Weather" description="National Weather Service pages and navigation." checked={configuration.features.weather} disabled={!canManage} onCheckedChange={(value) => updateFeature("weather", value)} />
            <Toggle label="Membership" description="Reserved membership surfaces for a future provider." checked={configuration.features.membership} disabled={!canManage} onCheckedChange={(value) => updateFeature("membership", value)} />
            <Toggle label="Donations" description="Reserved reader-support surfaces for a future provider." checked={configuration.features.donations} disabled={!canManage} onCheckedChange={(value) => updateFeature("donations", value)} />
          </CardContent></Card>
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><Smartphone className="size-5" /> Native reader-app handoff</CardTitle><CardDescription>Controls the non-blocking mobile-web panel that can open the current page in the reader app. Store links remain blank until real listings exist.</CardDescription></CardHeader><CardContent className="space-y-5">
            <Toggle label="Offer the native app on mobile web" description="Shows iOS and Android readers a bottom panel after privacy choices are settled. Continue on site always remains available." checked={configuration.nativeApps.handoffPromptEnabled} disabled={!canManage} onCheckedChange={(value) => updateNativeApps("handoffPromptEnabled", value)} />
            <div className="grid gap-4 lg:grid-cols-2">
              <TextField label="Apple App Store URL" value={configuration.nativeApps.iosStoreUrl} onChange={(value) => updateNativeApps("iosStoreUrl", value)} disabled={!canManage} placeholder="Leave blank until the listing is live" />
              <TextField label="Google Play URL" value={configuration.nativeApps.androidStoreUrl} onChange={(value) => updateNativeApps("androidStoreUrl", value)} disabled={!canManage} placeholder="Leave blank until the listing is live" />
            </div>
            <div className="rounded-lg border bg-muted/30 p-4 text-xs leading-5 text-muted-foreground">Browsers do not expose a universal installed-app lookup. Android may report a verified Play installation; iOS confirms only after the reader chooses Open app and Safari moves to the installed app. The panel never claims installation before the platform proves it.</div>
          </CardContent></Card></div>
        </TabsContent>

        <TabsContent value="easter-egg" className="space-y-6">
          <Card className="overflow-hidden border-[#c49545]/35">
            <CardHeader className="bg-[#102f25] text-white">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[0.62rem] font-black uppercase tracking-[0.2em] text-[#d9ad62]">
                    Classified circulation
                  </p>
                  <CardTitle className="mt-2 text-white">The Night Courier</CardTitle>
                  <CardDescription className="text-white/60">
                    An intentionally unreasonable secret with no authorization,
                    account, payment, or data effect.
                  </CardDescription>
                </div>
                <Badge variant={configuration.easterEgg.enabled ? "secondary" : "outline"}>
                  {configuration.easterEgg.enabled ? "Hidden and live" : "Disabled"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <Toggle
                label="Enable the public easter egg"
                description="Mounts the local-only interaction on public pages. The trigger is never included in public configuration APIs or navigation."
                checked={configuration.easterEgg.enabled}
                disabled={!canManage}
                onCheckedChange={(value) => updateEasterEgg("enabled", value)}
              />

              <div className="grid gap-4 rounded-xl border bg-muted/25 p-5">
                <div>
                  <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-primary">Exact location</p>
                  <p className="mt-1 text-sm font-semibold">Public footer → the newsroom desk and city line</p>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-lg border bg-background p-4">
                    <p className="text-xs font-black uppercase tracking-[0.12em]">Desktop ritual</p>
                    <ol className="mt-3 list-decimal space-y-2 pl-4 text-xs leading-5 text-muted-foreground">
                      <li>With no text field focused, type <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">exit nine keeps the presses awake</code>.</li>
                      <li>Within 12 seconds, press <strong className="text-foreground">Option/Alt + Shift + 9</strong>.</li>
                      <li>Within five seconds, select the footer desk line exactly five times.</li>
                    </ol>
                  </div>
                  <div className="rounded-lg border bg-background p-4">
                    <p className="text-xs font-black uppercase tracking-[0.12em]">Touch ritual</p>
                    <ol className="mt-3 list-decimal space-y-2 pl-4 text-xs leading-5 text-muted-foreground">
                      <li>Press the footer desk line for between 0.8 and 1.3 seconds.</li>
                      <li>Release, then tap the same line nine times within six seconds.</li>
                    </ol>
                  </div>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <TextField
                  label="Reveal title"
                  value={configuration.easterEgg.title}
                  onChange={(value) => updateEasterEgg("title", value)}
                  disabled={!canManage}
                />
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="easter-egg-message">Reveal message</Label>
                  <Textarea
                    id="easter-egg-message"
                    value={configuration.easterEgg.message}
                    disabled={!canManage}
                    maxLength={240}
                    onChange={(event) => updateEasterEgg("message", event.target.value)}
                    className="min-h-24"
                  />
                  <p className="text-right text-xs text-muted-foreground">
                    {configuration.easterEgg.message.length}/240
                  </p>
                </div>
              </div>

              <Button type="button" variant="outline" onClick={() => setEasterEggPreviewOpen(true)}>
                <Sparkles /> Preview the reveal
              </Button>
            </CardContent>
          </Card>
          <CourierEasterEggReveal
            configuration={configuration.easterEgg}
            open={easterEggPreviewOpen}
            onOpenChange={setEasterEggPreviewOpen}
            preview
          />
        </TabsContent>

        <TabsContent value="studio" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Studio experience</CardTitle>
              <CardDescription>
                Keep common work one shortcut away while allowing each newsroom
                to simplify the interface without changing authorization.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <Toggle label="Command center" description="Enables the searchable ⌘K / Ctrl+K launcher for every permitted workspace and common creation action." checked={configuration.studio.experience.commandPalette} disabled={!canManage} onCheckedChange={(value) => updateStudioGroup("experience", "commandPalette", value)} />
              <Toggle label="Contextual quick actions" description="Shows the most useful creation action for the current workspace and inside the command center." checked={configuration.studio.experience.contextualQuickActions} disabled={!canManage} onCheckedChange={(value) => updateStudioGroup("experience", "contextualQuickActions", value)} />
              <Toggle label="Compact navigation" description="Uses the reduced-density workspace rail and keeps secondary destinations visible only for the current workspace." checked={configuration.studio.experience.compactNavigation} disabled={!canManage} onCheckedChange={(value) => updateStudioGroup("experience", "compactNavigation", value)} />
              <Toggle label="Operational status" description="Shows readiness and production-state summaries in supported Studio workspaces." checked={configuration.studio.experience.showOperationalStatus} disabled={!canManage} onCheckedChange={(value) => updateStudioGroup("experience", "showOperationalStatus", value)} />
              <Toggle label="Visual story editor" description="Lets story owners switch between a full rich-text editor, a simultaneous reader preview and the portable plain-copy fallback." checked={configuration.studio.experience.richStoryEditor} disabled={!canManage} onCheckedChange={(value) => updateStudioGroup("experience", "richStoryEditor", value)} />
              <Toggle label="AI image placeholders" description="Lets editors generate temporary story-aware illustrations through the configured free Workers AI provider. Generated placeholders are labeled and cannot pass publication approval until replaced with editorial media." checked={configuration.studio.experience.aiImagePlaceholders} disabled={!canManage} onCheckedChange={(value) => updateStudioGroup("experience", "aiImagePlaceholders", value)} />
              <div className="rounded-lg border p-4">
                <p className="text-sm font-medium">Default story workspace</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Editors can change modes per story. This chooses the first view opened for new and existing articles.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(["write", "split", "preview"] as const).map((mode) => (
                    <Button
                      key={mode}
                      type="button"
                      size="sm"
                      variant={configuration.studio.experience.richStoryEditorDefaultMode === mode ? "secondary" : "outline"}
                      aria-pressed={configuration.studio.experience.richStoryEditorDefaultMode === mode}
                      disabled={!canManage || !configuration.studio.experience.richStoryEditor}
                      onClick={() => updateStudioGroup("experience", "richStoryEditorDefaultMode", mode)}
                      className="capitalize"
                    >
                      {mode}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Editorial revision policy</CardTitle>
              <CardDescription>
                Control whether selected published stories may continue through
                the verified update lane.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <Toggle
                label="Active-story revisions"
                description="Lets publishers mark a story active at publication so later edits can be proposed without changing the live article before approval."
                checked={configuration.studio.editorialWorkflow.activeStoryRevisions}
                disabled={!canManage}
                onCheckedChange={(value) =>
                  updateStudioGroup(
                    "editorialWorkflow",
                    "activeStoryRevisions",
                    value,
                  )
                }
              />
              <Toggle
                label="Independent revision approval"
                description="Locked on: a different publisher must approve or reject every live-story update."
                checked={
                  configuration.studio.editorialWorkflow
                    .requireIndependentRevisionApproval
                }
                disabled
                onCheckedChange={() => undefined}
              />
              <Toggle
                label="Finalization confirmation"
                description="Locked on: closing an active story requires the exact CLOSE STORY phrase."
                checked={
                  configuration.studio.editorialWorkflow
                    .requireFinalizationConfirmation
                }
                disabled
                onCheckedChange={() => undefined}
              />
            </CardContent>
          </Card>

          {(["Newsroom", "Operations", "Business"] as const).map((group) => (
            <Card key={group}>
              <CardHeader>
                <CardTitle>{group} workspaces</CardTitle>
                <CardDescription>
                  Disabled workspaces leave the Studio navigation. Existing
                  role and capability checks remain the security boundary.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5 lg:grid-cols-2">
                {studioModules.filter((module) => module.group === group).map((module) => (
                  <Toggle
                    key={module.key}
                    label={module.label}
                    description={module.description}
                    checked={configuration.studio.modules[module.key]}
                    disabled={!canManage}
                    onCheckedChange={(value) => updateStudioModule(module.key, value)}
                  />
                ))}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign policy</CardTitle>
              <CardDescription>
                These controls govern Studio campaign composition. Public reader
                enrollment remains controlled by Breaking-news alerts under Features.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <Toggle label="Allow campaign delivery" description="Enables verified staff to send browser push campaigns when VAPID and Postgres are ready." checked={configuration.studio.notifications.deliveryEnabled} disabled={!canManage} onCheckedChange={(value) => updateStudioGroup("notifications", "deliveryEnabled", value)} />
              <Toggle label="Sitewide audience" description="Allows campaigns to every active browser subscription." checked={configuration.studio.notifications.allowSitewideAudience} disabled={!canManage} onCheckedChange={(value) => updateStudioGroup("notifications", "allowSitewideAudience", value)} />
              <Toggle label="Selected accounts" description="Allows administrators to build a recipient list with account search instead of IDs." checked={configuration.studio.notifications.allowAccountAudience} disabled={!canManage} onCheckedChange={(value) => updateStudioGroup("notifications", "allowAccountAudience", value)} />
              <Toggle label="Newsroom roles" description="Allows a campaign to resolve current active staff by selected role." checked={configuration.studio.notifications.allowRoleAudience} disabled={!canManage} onCheckedChange={(value) => updateStudioGroup("notifications", "allowRoleAudience", value)} />
              <Toggle label="NJC+ access groups" description="Allows separate member, trial, complimentary and invited-beta audiences." checked={configuration.studio.notifications.allowNjcPlusAudience} disabled={!canManage} onCheckedChange={(value) => updateStudioGroup("notifications", "allowNjcPlusAudience", value)} />
              <Toggle label="Typed confirmation for broad sends" description="Requires SEND after audience preflight for sitewide, role, NJC+ or multi-account campaigns." checked={configuration.studio.notifications.requireTypedConfirmationForBroadAudience} disabled={!canManage} onCheckedChange={(value) => updateStudioGroup("notifications", "requireTypedConfirmationForBroadAudience", value)} />
              <Toggle label="Campaign history" description="Shows recent provider acceptance and failure totals inside Studio." checked={configuration.studio.notifications.retainCampaignHistory} disabled={!canManage} onCheckedChange={(value) => updateStudioGroup("notifications", "retainCampaignHistory", value)} />
              <Toggle label="Audience preflight" description="Locked on: Studio resolves and shows recipients and device subscriptions before any send can be confirmed." checked={configuration.studio.notifications.requireAudiencePreflight} disabled onCheckedChange={() => undefined} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automations" className="space-y-6">
          <Card className="border-amber-500/40">
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-full bg-amber-500/12 text-amber-600"><Zap /></div>
                <div>
                  <CardTitle>Guarded newsroom automations</CardTitle>
                  <CardDescription>
                    These switches control existing background work only.
                    Automation never approves editorial or public-facing changes.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <Toggle label="Scheduled publishing" description="Publishes a story only after an authorized editor approved the schedule and its due time arrives." checked={configuration.studio.automations.scheduledPublishing} disabled={!canManage} onCheckedChange={(value) => updateStudioGroup("automations", "scheduledPublishing", value)} />
              <Toggle label="Analytics archives" description="Creates weekly, monthly and yearly reporting snapshots during maintenance." checked={configuration.studio.automations.analyticsArchives} disabled={!canManage} onCheckedChange={(value) => updateStudioGroup("automations", "analyticsArchives", value)} />
              <Toggle label="Access-credit expiration" description="Expires time-limited NJC+ access credits after their reviewed end date." checked={configuration.studio.automations.accessCreditExpiration} disabled={!canManage} onCheckedChange={(value) => updateStudioGroup("automations", "accessCreditExpiration", value)} />
              <Toggle label="Stale push cleanup" description="Deactivates browser subscriptions only after the push provider reports them expired or gone." checked={configuration.studio.automations.stalePushSubscriptionCleanup} disabled={!canManage} onCheckedChange={(value) => updateStudioGroup("automations", "stalePushSubscriptionCleanup", value)} />
              <Toggle label="Manual verification boundary" description="Locked on: publication, broad notifications, access grants, legal changes and destructive actions retain explicit human confirmation." checked={configuration.studio.automations.manualVerificationRequired} disabled onCheckedChange={() => undefined} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="measurement">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <CardTitle>Google Analytics 4</CardTitle>
                  <CardDescription>
                    Optional external measurement for public site pages. The
                    existing first-party newsroom analytics remains independent.
                  </CardDescription>
                </div>
                <Badge variant={googleAnalyticsReady ? "secondary" : "outline"}>
                  {googleAnalyticsReady ? "Consent gated" : "Off"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <Toggle
                label="Enable Google Analytics"
                description="Loads GA4 only on public pages and only after the reader allows analytics. Studio and employee surfaces are not measured."
                checked={configuration.measurement.googleAnalytics.enabled}
                disabled={!canManage}
                onCheckedChange={(value) => updateGoogleAnalytics("enabled", value)}
              />
              <TextField
                label="GA4 measurement ID"
                value={configuration.measurement.googleAnalytics.measurementId}
                onChange={(value) => updateGoogleAnalytics("measurementId", value.trim().toUpperCase())}
                disabled={!canManage}
                placeholder="G-AB12CD34EF"
              />
              <div className="rounded-lg border bg-muted/30 p-4 text-xs leading-5 text-muted-foreground">
                Keep this disabled until the GA4 property, data-retention
                settings, internal-traffic exclusions and public privacy
                disclosures have been reviewed. Saving an ID does not enable
                measurement by itself.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advertising" className="space-y-6">
          <Card><CardHeader><div className="flex flex-wrap items-start justify-between gap-4"><div><CardTitle>Google AdSense</CardTitle><CardDescription>Global delivery controls. No ad code loads while advertising is disabled or Preview mode is on.</CardDescription></div><Badge variant={adsReady ? "secondary" : "outline"}>{adsReady ? configuration.advertising.previewMode ? "Preview only" : "Ready for live delivery" : "Not ready"}</Badge></div></CardHeader><CardContent className="space-y-5">
            <Toggle label="Enable advertising" description="Makes configured ad placements eligible to render." checked={configuration.advertising.enabled} disabled={!canManage} onCheckedChange={(value) => updateAdvertising("enabled", value)} />
            <Toggle label="Preview mode" description="Shows clearly labeled placeholders without loading Google or generating impressions. Keep this on during newsroom testing." checked={configuration.advertising.previewMode} disabled={!canManage} onCheckedChange={(value) => updateAdvertising("previewMode", value)} />
            <Toggle label="Auto ads" description="Loads the global AdSense code so placement optimization can be controlled from the AdSense account." checked={configuration.advertising.autoAds} disabled={!canManage} onCheckedChange={(value) => updateAdvertising("autoAds", value)} />
            <TextField label="AdSense publisher ID" value={configuration.advertising.publisherId} onChange={(value) => updateAdvertising("publisherId", value)} disabled={!canManage} placeholder="pub-1234567890123456" />
            <Toggle label="Publish ads.txt authorization" description="Serves Google’s DIRECT authorization record at /ads.txt when a publisher ID is present." checked={configuration.advertising.adsTxtEnabled} disabled={!canManage} onCheckedChange={(value) => updateAdvertising("adsTxtEnabled", value)} />
            <Toggle label="Google-certified privacy messaging is configured" description="Required before ads can be enabled. Configure Google Privacy & messaging or another certified CMP in the AdSense account." checked={configuration.advertising.privacyMessageConfigured} disabled={!canManage} onCheckedChange={(value) => updateAdvertising("privacyMessageConfigured", value)} />
            <Toggle label="Non-blocking ad-filter notice" description="Detects likely ad filtering and asks readers to support the publication without hiding or locking any journalism." checked={configuration.advertising.adBlockNoticeEnabled} disabled={!canManage} onCheckedChange={(value) => updateAdvertising("adBlockNoticeEnabled", value)} />
            <div className="rounded-lg border bg-muted/30 p-4 text-xs leading-5 text-muted-foreground">Studio cannot verify external AdSense approval, site review or consent-message status. Confirm those in AdSense before turning off Preview mode. <Link href="https://support.google.com/adsense/answer/13554116" target="_blank" rel="noreferrer" className="font-semibold text-primary underline">Consent requirements <ExternalLink className="inline size-3" /></Link></div>
          </CardContent></Card>

          <Card><CardHeader><CardTitle>Manual placements</CardTitle><CardDescription>Use the 10-digit ad unit IDs created in AdSense. Placements remain visually separated and labeled “Advertisement.”</CardDescription></CardHeader><CardContent className="space-y-6">{placements.map((placement) => {
            const value = configuration.advertising.placements[placement.key];
            return <div key={placement.key} className="grid gap-4 border-b pb-6 last:border-0 last:pb-0 sm:grid-cols-[1fr_14rem] sm:items-end"><Toggle label={placement.label} description={placement.description} checked={value.enabled} disabled={!canManage} onCheckedChange={(checked) => updatePlacement(placement.key, "enabled", checked)} /><TextField id={`ad-slot-${placement.key}`} label="Ad unit ID" value={value.slotId} onChange={(slotId) => updatePlacement(placement.key, "slotId", slotId)} disabled={!canManage || !value.enabled} placeholder="1234567890" /></div>;
          })}</CardContent></Card>

          <Card><CardHeader><CardTitle>NJC+ ad-free controls</CardTitle><CardDescription>The benefit and its promotion are independent switches. Both remain disabled until NJC+ is ready to promise an ad-free experience.</CardDescription></CardHeader><CardContent className="space-y-5">
            <Toggle label="Remove site ads for NJC+ access" description="Suppresses site advertising for active paid members, trials and complimentary NJC+ access. Invited beta access alone does not qualify." checked={configuration.advertising.adFreeNjcPlusEnabled} disabled={!canManage} onCheckedChange={(value) => updateAdvertising("adFreeNjcPlusEnabled", value)} />
            <Toggle label="Promote ad-free NJC+" description="Shows the configured NJC+ message inside the non-blocking ad-filter notice. Keep this off until the benefit and destination are public." checked={configuration.advertising.adFreePromoEnabled} disabled={!canManage || !configuration.advertising.adFreeNjcPlusEnabled} onCheckedChange={(value) => updateAdvertising("adFreePromoEnabled", value)} />
            <TextField label="Promotion message" value={configuration.advertising.adFreePromoText} onChange={(value) => updateAdvertising("adFreePromoText", value)} disabled={!canManage || !configuration.advertising.adFreePromoEnabled} />
            <TextField label="Promotion destination" value={configuration.advertising.adFreePromoHref} onChange={(value) => updateAdvertising("adFreePromoHref", value)} disabled={!canManage || !configuration.advertising.adFreePromoEnabled} placeholder="/plus" />
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="registry"><ConfigurationRegistryPanel configuration={configuration} revision={revision} history={history} operationalHealth={operationalHealth} canManage={canManage} /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function ControlStatus({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="border-b border-white/10 px-5 py-5 last:border-b-0 sm:border-r xl:border-b-0 xl:last:border-r-0"><p className="text-[0.68rem] font-semibold text-white/48">{label}</p><p className="mt-1 text-lg font-bold">{value}</p><p className="mt-1 text-[0.66rem] text-white/38">{detail}</p></div>;
}

function TextField({ id: explicitId, label, value, onChange, disabled, placeholder, className }: { id?: string; label: string; value: string; onChange: (value: string) => void; disabled: boolean; placeholder?: string; className?: string }) {
  const id = explicitId ?? `setting-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return <div className={`space-y-2 ${className ?? ""}`}><Label htmlFor={id}>{label}</Label><Input id={id} value={value} disabled={disabled} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></div>;
}

function Toggle({ label, description, checked, disabled, onCheckedChange }: { label: string; description: string; checked: boolean; disabled: boolean; onCheckedChange: (checked: boolean) => void }) {
  return <div className="flex items-start justify-between gap-5"><div><p className="text-sm font-medium">{label}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p></div><Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} aria-label={label} /></div>;
}

function localPath(label: string) {
  const slug = label.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return slug ? `/${slug}` : "/";
}
