"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  AppWindow,
  Archive,
  BarChart3,
  CheckCircle2,
  CircleAlert,
  Compass,
  Download,
  Eye,
  FileChartColumn,
  Gauge,
  Loader2,
  Monitor,
  Newspaper,
  ShieldCheck,
  Search,
  Smartphone,
  Tv,
  Users,
} from "lucide-react";
import type {
  AudienceApplicationVersionMetric,
  AudiencePlatform,
  AudienceSummary,
} from "@harborline/contracts";
import type {
  AnalyticsArchive,
  AnalyticsPeriod,
  StoryTrafficMetric,
  TrafficAnalyticsSummary,
  TrafficDeviceMetric,
  TrafficSourceMetric,
} from "@/lib/traffic-analytics";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type View =
  | "overview"
  | "content"
  | "acquisition"
  | "platforms"
  | "versions"
  | "archives"
  | "audit";
type AnalyticsTimeRange = "7d" | "30d" | "all";

const views: Array<{ id: View; label: string; icon: typeof Gauge }> = [
  { id: "overview", label: "Overview", icon: Gauge },
  { id: "content", label: "Content", icon: Newspaper },
  { id: "acquisition", label: "Acquisition", icon: Compass },
  { id: "platforms", label: "Platforms", icon: Users },
  { id: "versions", label: "Versions", icon: AppWindow },
  { id: "archives", label: "Archives", icon: Archive },
  { id: "audit", label: "Audit", icon: ShieldCheck },
];

const number = new Intl.NumberFormat("en-US");
const compact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const chartColors = [
  "#d5a13b",
  "#4f8cae",
  "#71b79f",
  "#c97171",
  "#9077c5",
  "#637083",
];
const platformIcons: Record<AudiencePlatform, typeof Monitor> = {
  web: Monitor,
  ios: Smartphone,
  android: Smartphone,
  tvos: Tv,
  androidtv: Tv,
  roku: Tv,
  api: Monitor,
};

export function AnalyticsWorkbench({
  traffic,
  audience,
  canExport,
}: {
  traffic: TrafficAnalyticsSummary;
  audience: AudienceSummary;
  canExport: boolean;
}) {
  const [view, setView] = useState<View>("overview");
  const [range, setRange] = useState<AnalyticsTimeRange>("30d");
  const provisional =
    traffic.dataQuality.status === "provisional" ||
    audience.dataQuality.status === "provisional";

  return (
    <section className="space-y-4" aria-labelledby="analytics-title">
      <div className="grid min-h-[42rem] grid-rows-[auto_auto_minmax(0,1fr)] gap-3 xl:h-[calc(100dvh-8.75rem)]">
        <header className="flex min-w-0 items-center justify-between gap-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 id="analytics-title" className="truncate text-2xl font-bold tracking-tight">
                Audience intelligence
              </h1>
              <Badge
                variant={provisional ? "outline" : "secondary"}
                className={cn(
                  "shrink-0",
                  provisional && "border-amber-500/45 text-amber-700 dark:text-amber-300",
                )}
              >
                {provisional ? "Provisional" : "Verified v2"}
              </Badge>
            </div>
            <p className="truncate text-xs text-muted-foreground">
              People, installations, application versions and readership are
              separate measurements.
            </p>
          </div>
          <p className="shrink-0 text-right text-[0.68rem] text-muted-foreground">
            Updated{" "}
            {new Date(traffic.generatedAt).toLocaleString("en-US", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </header>

        <div className="flex items-center gap-2">
        <nav className="grid min-w-0 flex-1 grid-cols-2 gap-1 rounded-xl border bg-card p-1 sm:grid-cols-4 xl:grid-cols-7" aria-label="Analytics views">
          {views.map((item) => {
            const Icon = item.icon;
            const active = item.id === view;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setView(item.id)}
                className={cn(
                  "flex h-9 items-center justify-center gap-2 rounded-lg px-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                aria-pressed={active}
              >
                <Icon className="size-3.5" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
        {(["content", "acquisition", "platforms"] as View[]).includes(view) ? (
          <div className="flex shrink-0 items-center gap-1 rounded-xl border bg-card p-1" aria-label="Shared analytics time range">
            {(["7d", "30d", "all"] as const).map((item) => (
              <Button key={item} size="sm" variant={range === item ? "default" : "ghost"} onClick={() => setRange(item)} aria-pressed={range === item}>
                {item === "all" ? "All" : item}
              </Button>
            ))}
            <Button size="sm" variant="outline" onClick={() => setRange("30d")} disabled={range === "30d"}>Reset</Button>
          </div>
        ) : null}
        </div>

        <div className="min-h-0">
          {view === "overview" ? (
            <Overview traffic={traffic} audience={audience} />
          ) : null}
          {view === "content" ? <Content key={range} traffic={traffic} range={range} /> : null}
          {view === "acquisition" ? (
            <Acquisition sources={traffic.sources} devices={traffic.devices} range={range} />
          ) : null}
          {view === "platforms" ? <Platforms audience={audience} range={range} /> : null}
          {view === "versions" ? <Versions rows={audience.versions} canInspect={canExport} /> : null}
          {view === "archives" ? <Archives traffic={traffic} /> : null}
          {view === "audit" ? (
            <Audit traffic={traffic} audience={audience} canExport={canExport} />
          ) : null}
        </div>
      </div>
    </section>
  );
}

function Overview({
  traffic,
  audience,
}: {
  traffic: TrafficAnalyticsSummary;
  audience: AudienceSummary;
}) {
  const nonStoryViews = Math.max(
    0,
    traffic.totals.siteViews - traffic.totals.storyViews,
  );
  return (
    <div className="grid min-h-0 gap-3 xl:h-full xl:grid-rows-[6.25rem_minmax(0,1fr)]">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Metric label="Verified site views" value={traffic.totals.siteViews} icon={Eye} />
        <Metric label="Story views" value={traffic.totals.storyViews} icon={Newspaper} />
        <Metric label="Other page views" value={nonStoryViews} icon={FileChartColumn} />
        <Metric
          label="Known accounts"
          value={audience.identity.knownAccounts}
          icon={Users}
        />
        <Metric
          label="Verified installations"
          value={audience.totals.trackedInstallations}
          icon={Activity}
        />
      </div>
      <div className="grid min-h-0 gap-3 xl:grid-cols-[1.45fr_0.75fr]">
        <Panel title="30-day verified traffic" icon={BarChart3}>
          <DailyChart rows={traffic.daily} />
        </Panel>
        <Panel
          title={
            traffic.dataQuality.status === "verified"
              ? "Measurement healthy"
              : "Measurement needs attention"
          }
          icon={
            traffic.dataQuality.status === "verified"
              ? CheckCircle2
              : CircleAlert
          }
        >
          <div className="grid h-full grid-rows-[auto_1fr_auto] gap-3">
            <div className="grid grid-cols-2 gap-2">
              <CompactFact
                label="Verified events"
                value={traffic.dataQuality.verifiedEvents}
              />
              <CompactFact
                label="Legacy views excluded"
                value={traffic.dataQuality.legacyViews}
              />
            </div>
            <p className="self-center text-sm leading-6 text-muted-foreground">
              {traffic.dataQuality.notes[0] ??
                "All displayed traffic is backed by event IDs and calculation version 2."}
            </p>
            <p className="text-[0.68rem] text-muted-foreground">
              Duplicate protection: stable event ID · Timezone: America/New_York
            </p>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function metricForRange(row: { views: number; views7d: number; views30d: number }, range: AnalyticsTimeRange) {
  return range === "7d" ? row.views7d : range === "30d" ? row.views30d : row.views;
}

function Content({ traffic, range }: { traffic: TrafficAnalyticsSummary; range: AnalyticsTimeRange }) {
  const [page, setPage] = useState(0);
  const pageSize = 6;
  const ordered = useMemo(() => [...traffic.stories].sort((a, b) => metricForRange(b, range) - metricForRange(a, range)), [traffic.stories, range]);
  const total = ordered.reduce((sum, story) => sum + metricForRange(story, range), 0);
  const rows = ordered.slice(page * pageSize, (page + 1) * pageSize);
  const pages = Math.max(1, Math.ceil(traffic.stories.length / pageSize));
  return (
    <div className="grid min-h-0 gap-3 xl:h-full xl:grid-cols-[0.72fr_1.28fr]">
      <Panel title="Readership distribution" icon={Gauge}>
        <StoryWheel stories={ordered} total={total} range={range} />
      </Panel>
      <Panel title="Every published story" icon={Newspaper}>
        <div className="grid h-full min-h-0 grid-rows-[1fr_auto]">
          <div className="grid content-start">
            <DataHeader
              columns={["Story", "Views", "Share"]}
              template="minmax(0,1fr) 6rem 5rem"
            />
            {rows.map((story) => (
              <StoryRow
                key={story.slug}
                story={story}
                total={total}
                range={range}
              />
            ))}
            {!rows.length ? <Empty label="No published stories are available." /> : null}
          </div>
          <Pager page={page} pages={pages} onPage={setPage} />
        </div>
      </Panel>
    </div>
  );
}

function Acquisition({
  sources,
  devices,
  range,
}: {
  sources: TrafficSourceMetric[];
  devices: TrafficDeviceMetric[];
  range: AnalyticsTimeRange;
}) {
  const sourceEntries = (row: TrafficSourceMetric) => range === "7d" ? row.entries7d : range === "30d" ? row.entries30d : row.entries;
  const sourceViews = (row: TrafficSourceMetric) => range === "7d" ? row.views7d : range === "30d" ? row.views30d : row.views;
  const deviceViews = (row: TrafficDeviceMetric) => range === "7d" ? row.views7d : range === "30d" ? row.views30d : row.views;
  const deviceEntries = (row: TrafficDeviceMetric) => range === "7d" ? row.entries7d : range === "30d" ? row.entries30d : row.entries;
  const totalSourceEntries = sources.reduce((sum, row) => sum + sourceEntries(row), 0);
  const totalDeviceViews = devices.reduce((sum, row) => sum + deviceViews(row), 0);
  return (
    <div className="grid min-h-0 gap-3 lg:h-full lg:grid-cols-2">
      <Panel title="Session first-touch acquisition" icon={Compass}>
        <RankedBars
          rows={sources
            .filter((row) => sourceEntries(row) > 0)
            .sort((a, b) => sourceEntries(b) - sourceEntries(a))
            .slice(0, 7)
            .map((row) => ({
              key: row.source,
              label: row.label,
              value: sourceEntries(row),
              detail: `${totalSourceEntries ? ((sourceEntries(row) / totalSourceEntries) * 100).toFixed(1) : "0.0"}% · ${number.format(sourceViews(row))} views`,
            }))}
          empty="No verified session entries yet."
        />
      </Panel>
      <Panel title="Web page-view device class" icon={Monitor}>
        <RankedBars
          rows={devices
            .filter((row) => deviceViews(row) > 0)
            .sort((a, b) => deviceViews(b) - deviceViews(a))
            .slice(0, 7)
            .map((row) => ({
              key: row.platform,
              label: row.label,
              value: deviceViews(row),
              detail: `${totalDeviceViews ? ((deviceViews(row) / totalDeviceViews) * 100).toFixed(1) : "0.0"}% · ${number.format(deviceEntries(row))} entries`,
            }))}
          empty="No verified device-class traffic yet."
        />
      </Panel>
    </div>
  );
}

function Platforms({ audience, range }: { audience: AudienceSummary; range: AnalyticsTimeRange }) {
  return (
    <div className="grid min-h-0 gap-3 xl:h-full xl:grid-rows-[6.25rem_minmax(0,1fr)]">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Metric
          label="Known people/accounts"
          value={audience.identity.knownAccounts}
          icon={Users}
        />
        <Metric
          label="Anonymous installations"
          value={audience.identity.anonymousInstallations}
          icon={Activity}
        />
        <Metric
          label="Active 24 hours"
          value={audience.totals.active24h}
          icon={Gauge}
        />
        <Metric label="Active 7 days" value={audience.totals.active7d} icon={BarChart3} />
        <Metric
          label="Legacy excluded"
          value={audience.legacy.installations}
          icon={CircleAlert}
        />
      </div>
      <Panel title="Verified installations by platform" icon={Users}>
        <div className="grid h-full grid-cols-2 gap-2 lg:grid-cols-4">
          {audience.platforms.map((item) => (
            <PlatformCard key={item.platform} item={item} range={range} />
          ))}
        </div>
      </Panel>
    </div>
  );
}

function Versions({ rows, canInspect }: { rows: AudienceApplicationVersionMetric[]; canInspect: boolean }) {
  const [page, setPage] = useState(0);
  const pageSize = 7;
  const ordered = useMemo(
    () =>
      [...rows].sort(
        (left, right) =>
          Number(right.qualityStatus === "verified") -
            Number(left.qualityStatus === "verified") ||
          Date.parse(right.lastSeenAt) - Date.parse(left.lastSeenAt),
      ),
    [rows],
  );
  const visible = ordered.slice(page * pageSize, (page + 1) * pageSize);
  const pages = Math.max(1, Math.ceil(ordered.length / pageSize));
  return (
    <Panel title="Application version ledger" icon={AppWindow} className="h-full">
      <div className="grid h-full min-h-0 grid-rows-[1fr_auto]">
        <div className="grid content-start">
          <DataHeader
            columns={[
              "Platform / product",
              "Channel / scope",
              "Version",
              "Build",
              "Installs",
              "Active 30d",
              "Last seen",
              "Evidence",
            ]}
            template="minmax(0,1.2fr) 6rem 6rem 6rem 5rem 6rem 7.5rem 6rem"
          />
          {visible.map((row) => (
            <VersionRow key={`${row.platform}-${row.product}-${row.releaseChannel}-${row.environment}-${row.appVersion}-${row.buildNumber}`} row={row} canInspect={canInspect} />
          ))}
          {!visible.length ? (
            <Empty label="Version reporting begins when updated applications check in." />
          ) : null}
        </div>
        <Pager page={page} pages={pages} onPage={setPage} />
      </div>
    </Panel>
  );
}

function Archives({ traffic }: { traffic: TrafficAnalyticsSummary }) {
  const [period, setPeriod] = useState<AnalyticsPeriod>("week");
  const [page, setPage] = useState(0);
  const pageSize = 6;
  const allRows = traffic.archives[period];
  const rows = allRows.slice(page * pageSize, (page + 1) * pageSize);
  const pages = Math.max(1, Math.ceil(allRows.length / pageSize));
  function changePeriod(next: AnalyticsPeriod) {
    setPeriod(next);
    setPage(0);
  }
  return (
    <Panel title="Versioned reporting archives" icon={Archive} className="h-full">
      <div className="grid h-full min-h-0 grid-rows-[auto_1fr_auto] gap-2">
        <div className="flex gap-1">
          {(["week", "month", "year"] as const).map((item) => (
            <Button
              key={item}
              size="sm"
              variant={period === item ? "default" : "outline"}
              onClick={() => changePeriod(item)}
              className="capitalize"
            >
              {item === "week" ? "Weekly" : item === "month" ? "Monthly" : "Yearly"}
            </Button>
          ))}
        </div>
        <div className="grid content-start">
          <DataHeader
            columns={[
              "Reporting period",
              "Site views",
              "Story views",
              "Most read",
              "Revision",
              "Quality",
            ]}
            template="10rem 6rem 6rem minmax(0,1fr) 5rem 6rem"
          />
          {rows.map((row) => <ArchiveRow key={row.id} row={row} />)}
          {!rows.length ? (
            <Empty label={`No verified ${period} archive has closed yet.`} />
          ) : null}
        </div>
        <Pager page={page} pages={pages} onPage={setPage} />
      </div>
    </Panel>
  );
}

function Audit({
  traffic,
  audience,
  canExport,
}: {
  traffic: TrafficAnalyticsSummary;
  audience: AudienceSummary;
  canExport: boolean;
}) {
  const notes = [...traffic.dataQuality.notes, ...audience.dataQuality.notes];
  const [running, setRunning] = useState(false);
  const [auditError, setAuditError] = useState("");
  const [audit, setAudit] = useState<{ generatedAt: string; reconciliation: { verifiedPageEvents: number; verifiedAggregateViews: number; difference: number; status: "matched" | "mismatch" }; installationGroups: unknown[]; versionGroups: unknown[]; pageEventGroups: unknown[]; presenceEventGroups: unknown[] } | null>(null);
  async function runAudit() {
    setRunning(true);
    setAuditError("");
    try {
      const response = await fetch("/api/v1/studio/analytics/audit", { cache: "no-store" });
      const body = await response.json() as typeof audit & { error?: { message?: string } };
      if (!response.ok || !body?.reconciliation) throw new Error(body?.error?.message ?? "Production reconciliation could not run.");
      setAudit(body);
    } catch (error) {
      setAuditError(error instanceof Error ? error.message : "Production reconciliation could not run.");
    } finally {
      setRunning(false);
    }
  }
  return (
    <div className="grid min-h-0 gap-3 xl:h-full xl:grid-cols-[0.9fr_1.1fr]">
      <Panel title="Data-quality control" icon={ShieldCheck}>
        <div className="grid h-full grid-rows-[auto_auto_1fr] gap-3">
          <div className="grid grid-cols-3 gap-2">
            <CompactFact label="Calculation" value={`v${traffic.dataQuality.calculationVersion}`} />
            <CompactFact label="Verified events" value={traffic.dataQuality.verifiedEvents} />
            <CompactFact
              label="Legacy records"
              value={traffic.dataQuality.legacyViews + audience.legacy.installations}
            />
          </div>
          <div className="rounded-lg border border-amber-500/25 bg-amber-500/8 p-3 text-xs leading-5">
            {notes[0] ??
              "No known data-quality exceptions are affecting authoritative totals."}
          </div>
          <div className="grid content-start gap-2 text-xs text-muted-foreground">
            <AuditRule label="Person" value="One distinct authenticated account; never inferred from a cookie." />
            <AuditRule label="Installation" value="One consented browser profile or persisted application installation." />
            <AuditRule label="Version" value="Application version plus build and release channel for an installation." />
            <AuditRule label="View" value="One production event ID accepted once; retries do not increment totals." />
            <AuditRule label="Legacy" value="Pre-v2 aggregates retained for evidence but excluded from authoritative totals." />
          </div>
        </div>
      </Panel>
      <Panel title="Permission-controlled evidence" icon={Download}>
        {canExport ? (
          <div className="grid h-full grid-cols-2 content-center gap-3">
            <button type="button" onClick={runAudit} disabled={running} className="col-span-2 flex min-h-20 items-center justify-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 text-xs font-semibold transition-colors hover:bg-primary/10 disabled:opacity-60">
              {running ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4 text-primary" />}
              {running ? "Reconciling production evidence…" : "Run production reconciliation"}
            </button>
            {audit ? <div className={cn("col-span-2 grid grid-cols-4 gap-2 rounded-xl border p-3", audit.reconciliation.status === "matched" ? "border-emerald-500/30 bg-emerald-500/5" : "border-destructive/30 bg-destructive/5")}>
              <CompactFact label="Status" value={audit.reconciliation.status} />
              <CompactFact label="Events" value={audit.reconciliation.verifiedPageEvents} />
              <CompactFact label="Aggregates" value={audit.reconciliation.verifiedAggregateViews} />
              <CompactFact label="Difference" value={audit.reconciliation.difference} />
              <p className="col-span-4 text-[0.62rem] text-muted-foreground">{audit.installationGroups.length} installation groups · {audit.versionGroups.length} version groups · {audit.pageEventGroups.length} page-event groups · {audit.presenceEventGroups.length} presence groups · {new Date(audit.generatedAt).toLocaleString()}</p>
            </div> : null}
            {auditError ? <p className="col-span-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">{auditError}</p> : null}
            <ExportLink dataset="page-events" label="Page-event ledger" />
            <ExportLink dataset="presence-events" label="Presence-event ledger" />
            <ExportLink dataset="installations" label="Installation register" />
            <ExportLink dataset="versions" label="Version history" />
            <ExportLink dataset="archives" label="Archive revisions" />
            <a
              href="https://github.com/MobileMediaInteractions/NJC/tree/main/docs/analytics"
              target="_blank"
              rel="noreferrer"
              className="grid min-h-20 place-content-center rounded-xl border border-dashed p-3 text-center text-xs font-semibold text-muted-foreground"
            >
              Measurement documentation is versioned in the repository
            </a>
          </div>
        ) : (
          <Empty label="Raw evidence export requires an administrator or editor." />
        )}
      </Panel>
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon: typeof Gauge;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("min-h-0 overflow-hidden", className)}>
      <CardHeader className="shrink-0 border-b px-4 py-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon className="size-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[calc(100%-2.9rem)] min-h-0 overflow-x-auto p-4">
        {children}
      </CardContent>
    </Card>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Gauge;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="flex h-full items-center justify-between gap-2 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-[0.68rem] font-semibold text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 text-2xl font-bold">{number.format(value)}</p>
        </div>
        <span className="rounded-lg bg-primary/10 p-2 text-primary">
          <Icon className="size-4" />
        </span>
      </CardContent>
    </Card>
  );
}

function CompactFact({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-lg border bg-muted/20 px-3 py-2">
      <p className="text-[0.62rem] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-mono text-lg font-bold">
        {typeof value === "number" ? number.format(value) : value}
      </p>
    </div>
  );
}

function DailyChart({ rows }: { rows: Array<{ day: string; views: number }> }) {
  const max = Math.max(1, ...rows.map((row) => row.views));
  return (
    <div className="grid h-full grid-rows-[1fr_auto]">
      <div
        className="flex min-h-0 items-end gap-1 border-b border-l px-2 pt-2"
        role="img"
        aria-label="Verified daily site views for the last 30 days"
      >
        {rows.map((row) => (
          <div key={row.day} className="group relative flex h-full min-w-0 flex-1 items-end">
            <div
              className="w-full rounded-t-sm bg-primary/75"
              style={{
                height: row.views
                  ? `${Math.max(4, (row.views / max) * 100)}%`
                  : "2px",
              }}
            >
              <span className="sr-only">
                {formatDay(row.day)}: {row.views} views
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between pt-2 text-[0.62rem] text-muted-foreground">
        <span>{formatDay(rows[0]?.day)}</span>
        <span>{formatDay(rows[Math.floor(rows.length / 2)]?.day)}</span>
        <span>{formatDay(rows.at(-1)?.day)}</span>
      </div>
    </div>
  );
}

function StoryWheel({
  stories,
  total,
  range,
}: {
  stories: StoryTrafficMetric[];
  total: number;
  range: AnalyticsTimeRange;
}) {
  const leading = stories.filter((story) => metricForRange(story, range) > 0).slice(0, 5);
  const leadingTotal = leading.reduce((sum, story) => sum + metricForRange(story, range), 0);
  const slices = [
    ...leading.map((story) => ({ label: story.headline, views: metricForRange(story, range) })),
    ...(total > leadingTotal
      ? [{ label: "All other stories", views: total - leadingTotal }]
      : []),
  ];
  let offset = 0;
  return (
    <div className="grid h-full grid-rows-[minmax(0,1fr)_auto] gap-3">
      <div className="relative mx-auto aspect-square h-full max-h-64">
        <svg
          viewBox="0 0 120 120"
          className="size-full -rotate-90"
          role="img"
          aria-label="Story traffic distribution"
        >
          <circle
            cx="60"
            cy="60"
            r="44"
            fill="none"
            stroke="currentColor"
            strokeWidth="17"
            className="text-muted/40"
          />
          {slices.map((slice, index) => {
            const percentage = total ? (slice.views / total) * 100 : 0;
            const currentOffset = offset;
            offset += percentage;
            return (
              <circle
                key={`${slice.label}-${index}`}
                cx="60"
                cy="60"
                r="44"
                pathLength="100"
                fill="none"
                stroke={chartColors[index]}
                strokeWidth="17"
                strokeDasharray={`${percentage} ${100 - percentage}`}
                strokeDashoffset={-currentOffset}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 grid place-content-center text-center">
          <strong className="text-3xl">{compact.format(total)}</strong>
          <span className="text-[0.6rem] font-bold uppercase tracking-wider text-muted-foreground">
            story views
          </span>
        </div>
      </div>
      <div className="grid gap-1.5">
        {slices.slice(0, 5).map((slice, index) => (
          <div
            key={slice.label}
            className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 text-[0.68rem]"
          >
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: chartColors[index] }}
            />
            <span className="truncate">{slice.label}</span>
            <span className="font-mono text-muted-foreground">
              {number.format(slice.views)}
            </span>
          </div>
        ))}
        {!slices.length ? <Empty label="No verified story views yet." /> : null}
      </div>
    </div>
  );
}

function RankedBars({
  rows,
  empty,
}: {
  rows: Array<{ key: string; label: string; value: number; detail: string }>;
  empty: string;
}) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  if (!rows.length) return <Empty label={empty} />;
  return (
    <div className="grid h-full content-center gap-3">
      {rows.map((row) => (
        <div key={row.key}>
          <div className="mb-1 flex items-center justify-between gap-3 text-xs">
            <span className="truncate font-semibold">{row.label}</span>
            <span className="font-mono">{number.format(row.value)}</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.max(2, (row.value / max) * 100)}%` }}
            />
          </div>
          <p className="mt-1 text-right text-[0.6rem] text-muted-foreground">
            {row.detail}
          </p>
        </div>
      ))}
    </div>
  );
}

function PlatformCard({
  item,
  range,
}: {
  item: AudienceSummary["platforms"][number];
  range: AnalyticsTimeRange;
}) {
  const Icon = platformIcons[item.platform];
  const active = range === "7d" ? item.active7d : range === "30d" ? item.active30d : item.allTime;
  return (
    <div className="grid min-h-0 content-center rounded-xl border bg-muted/15 p-3">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-primary" />
        <p className="truncate text-xs font-bold">{item.label}</p>
      </div>
      <p className="mt-3 text-2xl font-bold">{number.format(active)}</p>
      <p className="text-[0.62rem] text-muted-foreground">
        {range === "all" ? `total ${item.measurement}` : `active ${range}`}
      </p>
      <p className="mt-2 text-[0.62rem] text-muted-foreground">
        {number.format(item.knownAccounts)} linked account
        {item.knownAccounts === 1 ? "" : "s"}
      </p>
    </div>
  );
}

function DataHeader({
  columns,
  template,
}: {
  columns: string[];
  template: string;
}) {
  return (
    <div
      className="grid items-center gap-3 border-b px-2 pb-2 text-[0.6rem] font-bold uppercase tracking-wide text-muted-foreground"
      style={{ gridTemplateColumns: template }}
    >
      {columns.map((column, index) => (
        <span key={column} className={index ? "text-right" : undefined}>
          {column}
        </span>
      ))}
    </div>
  );
}

function StoryRow({
  story,
  total,
  range,
}: {
  story: StoryTrafficMetric;
  total: number;
  range: AnalyticsTimeRange;
}) {
  const views = metricForRange(story, range);
  return (
    <div
      className="grid h-12 items-center gap-3 border-b px-2 text-xs"
      style={{
        gridTemplateColumns: "minmax(0,1fr) 6rem 5rem",
      }}
    >
      <a
        href={`/story/${story.slug}`}
        className="truncate font-semibold hover:text-primary"
        title={story.headline}
      >
        {story.headline}
      </a>
      <Cell value={views} />
      <span className="text-right font-mono">
        {total ? `${((views / total) * 100).toFixed(1)}%` : "0%"}
      </span>
    </div>
  );
}

type VersionEvidence = {
  installation: string;
  account: { pseudonym: string; displayName: string; role: string } | null;
  deviceClass: string;
  osVersion: string;
  eventCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  qualityStatus: string;
};

function VersionRow({ row, canInspect }: { row: AudienceApplicationVersionMetric; canInspect: boolean }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [evidence, setEvidence] = useState<VersionEvidence[]>([]);
  const [evidencePage, setEvidencePage] = useState(0);
  async function inspect() {
    setOpen(true);
    if (evidence.length || loading) return;
    setLoading(true);
    setError("");
    const query = new URLSearchParams({ platform: row.platform, product: row.product, releaseChannel: row.releaseChannel, environment: row.environment, appVersion: row.appVersion, buildNumber: row.buildNumber });
    try {
      const response = await fetch(`/api/v1/studio/analytics/version-evidence?${query}`, { cache: "no-store" });
      const body = await response.json() as { evidence?: VersionEvidence[]; error?: { message?: string } };
      if (!response.ok || !body.evidence) throw new Error(body.error?.message ?? "Version evidence could not be loaded.");
      setEvidence(body.evidence);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Version evidence could not be loaded.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <>
    <div
      className="grid h-12 items-center gap-3 border-b px-2 text-xs"
      style={{
        gridTemplateColumns:
          "minmax(0,1.2fr) 6rem 6rem 6rem 5rem 6rem 7.5rem 6rem",
      }}
    >
      <div className="min-w-0">
        <p className="truncate font-semibold">{row.platformLabel}</p>
        <p className="truncate text-[0.6rem] text-muted-foreground">{row.product}</p>
      </div>
      <span
        className="truncate text-right capitalize"
        title={`${row.releaseChannel} channel · ${row.environment} evidence`}
      >
        {row.releaseChannel}
        <span className="block text-[0.55rem] text-muted-foreground">
          {row.environment}
        </span>
      </span>
      <span className="truncate text-right font-mono">{row.appVersion}</span>
      <span className="truncate text-right font-mono">{row.buildNumber}</span>
      <Cell value={row.installations} />
      <Cell value={row.active30d} />
      <span className="text-right text-[0.68rem] text-muted-foreground">
        {new Date(row.lastSeenAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "2-digit",
        })}
      </span>
      {canInspect ? <Button size="sm" variant="outline" onClick={inspect}><Search className="size-3" /> Inspect</Button> : <Badge variant={row.qualityStatus === "verified" ? "secondary" : "outline"} className="justify-self-end text-[0.58rem] capitalize">{row.qualityStatus}</Badge>}
    </div>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{row.platformLabel} {row.appVersion} ({row.buildNumber}) evidence</DialogTitle>
          <DialogDescription>One-way pseudonyms connect this grouped row to installation and linked-account evidence without exposing raw identifiers.</DialogDescription>
        </DialogHeader>
        {loading ? <div className="grid min-h-52 place-items-center"><Loader2 className="size-6 animate-spin" aria-label="Loading evidence" /></div> : error ? <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div> : (
          <div className="grid min-h-[24rem] grid-rows-[1fr_auto] gap-2">
            <div className="grid content-start gap-2">
            {evidence.slice(evidencePage * 6, (evidencePage + 1) * 6).map((item) => <div key={item.installation} className="grid grid-cols-[8rem_minmax(0,1fr)_7rem_7rem] items-center gap-3 rounded-lg border p-3 text-xs">
              <span className="font-mono" title="Pseudonymized installation identifier">{item.installation}</span>
              <span className="truncate">{item.account ? `${item.account.displayName} · ${item.account.role} · ${item.account.pseudonym}` : "Anonymous installation"}</span>
              <span className="truncate text-muted-foreground">{item.deviceClass}<br />{item.osVersion}</span>
              <span className="text-right font-mono">{number.format(item.eventCount)} events</span>
            </div>)}
            {!evidence.length ? <Empty label="No installation evidence remains for this version group." /> : null}
            </div>
            {evidence.length ? <Pager page={evidencePage} pages={Math.max(1, Math.ceil(evidence.length / 6))} onPage={setEvidencePage} /> : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}

function ArchiveRow({ row }: { row: AnalyticsArchive }) {
  const storyViews = row.storyViews.reduce((sum, story) => sum + story.views, 0);
  return (
    <div
      className="grid h-12 items-center gap-3 border-b px-2 text-xs"
      style={{
        gridTemplateColumns: "10rem 6rem 6rem minmax(0,1fr) 5rem 6rem",
      }}
    >
      <span className="font-semibold">
        {formatDay(row.periodStart)} – {formatDay(row.periodEnd)}
      </span>
      <Cell value={row.totalViews} />
      <Cell value={storyViews} />
      <span className="truncate text-right" title={row.storyViews[0]?.headline}>
        {row.storyViews[0]?.headline ?? "No story traffic"}
      </span>
      <span className="text-right font-mono">r{row.revision}</span>
      <Badge variant="secondary" className="justify-self-end text-[0.58rem] capitalize">
        {row.qualityStatus}
      </Badge>
    </div>
  );
}

function Cell({ value }: { value: number }) {
  return <span className="text-right font-mono">{number.format(value)}</span>;
}

function Pager({
  page,
  pages,
  onPage,
}: {
  page: number;
  pages: number;
  onPage: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-between border-t pt-2">
      <p className="text-[0.65rem] text-muted-foreground">
        Page {page + 1} of {pages}
      </p>
      <div className="flex gap-1">
        <Button
          size="sm"
          variant="outline"
          disabled={page === 0}
          onClick={() => onPage(Math.max(0, page - 1))}
        >
          Previous
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={page >= pages - 1}
          onClick={() => onPage(Math.min(pages - 1, page + 1))}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

function AuditRule({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[6rem_1fr] gap-3 border-b pb-2">
      <strong className="text-foreground">{label}</strong>
      <span>{value}</span>
    </div>
  );
}

function ExportLink({ dataset, label }: { dataset: string; label: string }) {
  return (
    <a
      href={`/api/v1/studio/analytics/export?dataset=${dataset}&days=30`}
      className="flex min-h-20 items-center gap-3 rounded-xl border p-4 text-xs font-semibold transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Download className="size-4 text-primary" />
      <span>
        {label}
        <small className="mt-1 block font-normal text-muted-foreground">
          CSV · last 30 days
        </small>
      </span>
    </a>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="grid h-full min-h-24 place-items-center text-center text-xs text-muted-foreground">
      {label}
    </div>
  );
}

function formatDay(value?: string) {
  if (!value) return "—";
  const date = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
