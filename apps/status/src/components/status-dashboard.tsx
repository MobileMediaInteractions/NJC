"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { HistoryPoint, ServiceSnapshot, ServiceState, StatusPayload } from "@/lib/status-types";

const stateLabels: Record<ServiceState, string> = {
  operational: "Operational",
  degraded: "Degraded",
  outage: "Unavailable",
  protected: "Protected by design",
  unknown: "No data",
};

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "America/New_York",
    timeZoneName: "short",
  }).format(new Date(value));
}

function historyLabel(point: HistoryPoint) {
  if (!point.samples) return `${point.date}: no measurements recorded`;
  return `${point.date}: ${point.uptimePercent?.toFixed(3)}% operational, ${point.samples} measurements${point.averageLatencyMs === null ? "" : `, ${point.averageLatencyMs} ms average`}`;
}

export function StatusDashboard({ initialStatus }: { initialStatus: StatusPayload }) {
  const [status, setStatus] = useState(initialStatus);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [theme, setTheme] = useState<"system" | "light" | "dark">(() => {
    if (typeof window === "undefined") return "system";
    const saved = window.localStorage.getItem("njc-status-theme");
    return saved === "light" || saved === "dark" || saved === "system" ? saved : "system";
  });

  const groups = useMemo(() => {
    const ordered = new Map<string, ServiceSnapshot[]>();
    for (const service of status.services) ordered.set(service.group, [...(ordered.get(service.group) ?? []), service]);
    return [...ordered.entries()];
  }, [status.services]);

  const activeIssues = status.services.filter((service) => service.state === "degraded" || service.state === "outage");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("njc-status-theme", theme);
  }, [theme]);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      setRefreshing(true);
      try {
        const response = await fetch("/api/status", { cache: "no-store" });
        if (!response.ok) throw new Error("Status refresh failed");
        const next = await response.json() as StatusPayload;
        if (!cancelled) {
          setStatus(next);
          setRefreshError(null);
        }
      } catch {
        if (!cancelled) setRefreshError("Live refresh failed. The last complete snapshot remains on screen.");
      } finally {
        if (!cancelled) setRefreshing(false);
      }
    }
    const timer = window.setInterval(() => void refresh(), 60_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, []);

  function cycleTheme() {
    setTheme((current) => current === "system" ? "light" : current === "light" ? "dark" : "system");
  }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="https://www.thejerseycourier.com" aria-label="The New Jersey Courier front page">
          <Image src="/brand-mark.svg" alt="" width={52} height={52} priority />
          <span><strong>The New Jersey Courier</strong><small>System status</small></span>
        </a>
        <div className="header-actions">
          <span className="live-pulse"><i aria-hidden="true" /> {refreshing ? "Checking" : "Live"}</span>
          <button className="theme-button" type="button" onClick={cycleTheme} aria-label={`Theme is ${theme}. Change theme.`} suppressHydrationWarning>Theme: {theme}</button>
        </div>
      </header>

      <section className={`overall-banner state-${status.overall}`} aria-labelledby="overall-title">
        <div className="overall-icon" aria-hidden="true">{status.overall === "operational" ? "✓" : "!"}</div>
        <div>
          <p className="eyebrow">Current network state</p>
          <h1 id="overall-title">{status.overallLabel}</h1>
          <p>Independent checks cover the publication, Studio, APIs, NJC+, Press, Distribution, asset delivery, permanent hosting origin, reserved entry points, and protected infrastructure.</p>
        </div>
        <div className="snapshot-time">
          <span>Last complete check</span>
          <strong>{formatTimestamp(status.generatedAt)}</strong>
        </div>
      </section>

      {refreshError ? <p className="notice" role="status">{refreshError}</p> : null}

      <section className="summary-grid" aria-label="Service totals">
        <SummaryMetric value={status.counts.operational} label="Operational" state="operational" />
        <SummaryMetric value={status.counts.degraded} label="Degraded" state="degraded" />
        <SummaryMetric value={status.counts.outage} label="Unavailable" state="outage" />
        <SummaryMetric value={status.counts.protected} label="Intentionally protected" state="protected" />
      </section>

      <div className="status-layout">
        <section className="services" aria-labelledby="services-heading">
          <div className="section-heading">
            <div><p className="eyebrow">Every managed hostname</p><h2 id="services-heading">Services and 90-day history</h2></div>
            <div className="history-key" aria-label="History legend"><span className="dot operational" />Operational <span className="dot degraded" />Degraded <span className="dot outage" />Unavailable <span className="dot unknown" />No sample</div>
          </div>
          {!status.historyAvailable ? <p className="notice">Historical storage is not configured yet. Live checks are authoritative; gray ticks honestly represent days without recorded measurements.</p> : null}
          {groups.map(([group, services]) => (
            <section className="service-group" key={group} aria-labelledby={`group-${group.replaceAll(" ", "-").toLowerCase()}`}>
              <h3 id={`group-${group.replaceAll(" ", "-").toLowerCase()}`}>{group}</h3>
              {services.map((service) => <ServiceRow service={service} key={service.id} />)}
            </section>
          ))}
        </section>

        <aside className="status-aside" aria-label="Incident and measurement detail">
          <section className="side-card">
            <p className="eyebrow">Live incidents</p>
            <h2>{activeIssues.length ? `${activeIssues.length} active ${activeIssues.length === 1 ? "issue" : "issues"}` : "No active incidents"}</h2>
            {activeIssues.length ? <ul className="issue-list">{activeIssues.map((service) => <li key={service.id}><span className={`dot ${service.state}`} /><div><strong>{service.title}</strong><p>{service.detail}</p></div></li>)}</ul> : <p>Every publicly monitored endpoint currently matches its documented response contract.</p>}
          </section>
          <section className="side-card">
            <p className="eyebrow">How checks work</p>
            <h2>Contract-aware monitoring</h2>
            <p>A protected sign-in response can be healthy. A deliberate canonical redirect can be healthy. The monitor evaluates each hostname against its own expected behavior instead of requiring every service to return the same status code.</p>
            <a href="/api/status">Open machine-readable status JSON <span aria-hidden="true">↗</span></a>
            <a href="/api/health">Open status-service health check <span aria-hidden="true">↗</span></a>
          </section>
          <section className="side-card">
            <p className="eyebrow">Reporting scope</p>
            <h2>Public signals only</h2>
            <p>This page reports availability, response-contract compliance, latency, and published incidents. It does not expose provider credentials, private storage paths, internal topology, customer data, or the connection-gated internal hostname.</p>
          </section>
        </aside>
      </div>

      <footer>
        <p>Times are shown in Eastern Time. A gray history tick means no measurement was retained—not proven uptime.</p>
        <nav aria-label="Status footer"><a href="https://www.thejerseycourier.com">Courier home</a><a href="https://www.thejerseycourier.com/tips">Report a problem</a><a href="https://www.thejerseycourier.com/legal">Legal</a></nav>
      </footer>
    </main>
  );
}

function SummaryMetric({ value, label, state }: { value: number; label: string; state: ServiceState }) {
  return <article className="summary-card"><span className={`dot ${state}`} aria-hidden="true" /><strong>{value}</strong><p>{label}</p></article>;
}

function ServiceRow({ service }: { service: ServiceSnapshot }) {
  return (
    <article className="service-row">
      <div className="service-summary">
        <div>
          <h4>{service.title}</h4>
          <p className="hostname">{service.hostname}</p>
          <p>{service.description}</p>
        </div>
        <div className="service-current">
          <span className={`state-pill state-${service.state}`}><i aria-hidden="true" />{stateLabels[service.state]}</span>
          <span>{service.latencyMs === null ? "Not publicly probed" : `${service.latencyMs} ms`}</span>
          <span>{service.uptime90Days === null ? "90-day uptime pending" : `${service.uptime90Days.toFixed(3)}% over 90 days`}</span>
        </div>
      </div>
      <div className="contract"><strong>Expected:</strong> {service.expectedBehavior}. <strong>Latest:</strong> {service.detail}.</div>
      <div className="history-line" aria-label={`${service.title} 90-day measurement history`}>
        {service.history.map((point) => <span key={point.date} className={`history-tick ${point.state}`} title={historyLabel(point)} aria-label={historyLabel(point)} />)}
      </div>
      <div className="history-dates"><span>90 days ago</span><span>Today</span></div>
    </article>
  );
}
