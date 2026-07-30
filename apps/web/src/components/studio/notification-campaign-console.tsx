"use client";

import { useCallback, useMemo, useState } from "react";
import {
  BellRing,
  CheckCircle2,
  CircleAlert,
  Copy,
  LoaderCircle,
  Megaphone,
  Plus,
  Send,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import {
  StudioAccountPicker,
  type GuidedOption,
  GuidedEntityPicker,
} from "@/components/studio/guided-selectors";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { StudioAccountSummary } from "@/lib/studio-account-types";
import type { StaffRole } from "@/lib/types";

type AudienceType =
  | "sitewide"
  | "accounts"
  | "staff_roles"
  | "njc_plus_segment";
type NjcPlusSegment =
  | "member"
  | "trial"
  | "complimentary"
  | "invited_beta_tester";

type Campaign = {
  id: string;
  title: string;
  body: string;
  destination: string;
  audienceType: string;
  audienceSpec: {
    userClerkIds?: string[];
    roles?: string[];
    segment?: string;
  };
  status: string;
  recipientCount: number;
  subscriptionCount: number;
  deliveredCount?: number;
  acceptedCount?: number;
  failedCount: number;
  openedCount: number;
  createdAt: string;
  completedAt: string | null;
};

type NotificationPolicy = {
  deliveryEnabled: boolean;
  allowSitewideAudience: boolean;
  allowAccountAudience: boolean;
  allowRoleAudience: boolean;
  allowNjcPlusAudience: boolean;
  requireAudiencePreflight: true;
  requireTypedConfirmationForBroadAudience: boolean;
  retainCampaignHistory: boolean;
};

type NotificationReadiness = {
  database: boolean;
  vapid: boolean;
  readerEnrollment: boolean;
  studioDelivery: boolean;
  ready: boolean;
  activeSubscriptions: number;
  totalCampaigns: number;
  lastCampaignAt: string | null;
};

type Preflight = {
  recipients: number;
  subscriptions: number;
  destination: string;
  ready: boolean;
  fingerprint: string;
};

const audienceOptions: GuidedOption[] = [
  {
    value: "sitewide",
    label: "Every subscribed reader",
    description: "Includes anonymous and signed-in browser subscriptions.",
  },
  {
    value: "accounts",
    label: "Selected accounts",
    description: "Choose one reader or build a reviewable list.",
  },
  {
    value: "staff_roles",
    label: "Newsroom roles",
    description: "Select one or more current staff roles.",
  },
  {
    value: "njc_plus_segment",
    label: "NJC+ access group",
    description: "Member, trial, complimentary, and beta remain separate.",
  },
];

const destinationOptions: GuidedOption[] = [
  { value: "/", label: "Front page", description: "Open the Courier homepage." },
  { value: "/latest", label: "Latest news", description: "Open the latest coverage feed." },
  { value: "/newsletter", label: "Newsletters & alerts", description: "Open notification and email choices." },
  { value: "/plus", label: "NJC+", description: "Open the NJC+ landing page." },
  { value: "custom", label: "Story or another local page", description: "Enter a local path only when needed." },
];

const staffRoles = [
  "admin",
  "editor",
  "producer",
  "reporter",
  "contributor",
] as const satisfies readonly StaffRole[];

const segmentLabels: Record<NjcPlusSegment, string> = {
  member: "NJC+ Member",
  trial: "NJC+ Trial",
  complimentary: "Complimentary NJC+",
  invited_beta_tester: "Invited Beta Tester",
};

export function NotificationCampaignConsole({
  publicAlertsEnabled,
  canSearchAccounts,
  policy,
  readiness,
  initialHistory,
  showOperationalStatus,
}: {
  publicAlertsEnabled: boolean;
  canSearchAccounts: boolean;
  policy: NotificationPolicy;
  readiness: NotificationReadiness;
  initialHistory: Campaign[];
  showOperationalStatus: boolean;
}) {
  const allowedAudienceOptions = audienceOptions.filter((option) => {
    if (option.value === "sitewide") return policy.allowSitewideAudience;
    if (option.value === "accounts") return policy.allowAccountAudience;
    if (option.value === "staff_roles") return policy.allowRoleAudience;
    return policy.allowNjcPlusAudience;
  });
  const [history, setHistory] = useState<Campaign[]>(initialHistory);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audienceType, setAudienceType] =
    useState<AudienceType>(
      (allowedAudienceOptions[0]?.value as AudienceType | undefined) ??
        "sitewide",
    );
  const [accountCandidate, setAccountCandidate] =
    useState<StudioAccountSummary | null>(null);
  const [accounts, setAccounts] = useState<StudioAccountSummary[]>([]);
  const [roles, setRoles] = useState<StaffRole[]>([]);
  const [segment, setSegment] = useState<NjcPlusSegment>("member");
  const [destinationChoice, setDestinationChoice] = useState("/");
  const [customDestination, setCustomDestination] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [preflight, setPreflight] = useState<Preflight | null>(null);
  const [preflighting, setPreflighting] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const response = await fetch("/api/v1/studio/notifications", {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        data?: Campaign[];
        error?: { message?: string };
      };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Campaign history is unavailable");
      }
      setHistory(payload.data ?? []);
    } catch (historyError) {
      setError(
        historyError instanceof Error
          ? historyError.message
          : "Campaign history is unavailable",
      );
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  function addAccount() {
    if (!accountCandidate) return;
    setAccounts((current) =>
      current.some((account) => account.id === accountCandidate.id)
        ? current
        : [...current, accountCandidate],
    );
    setAccountCandidate(null);
  }

  function toggleRole(role: StaffRole) {
    setRoles((current) =>
      current.includes(role)
        ? current.filter((item) => item !== role)
        : [...current, role],
    );
  }

  const destination =
    destinationChoice === "custom" ? customDestination.trim() : destinationChoice;
  const audienceValid =
    audienceType === "sitewide" ||
    (audienceType === "accounts" && accounts.length > 0) ||
    (audienceType === "staff_roles" && roles.length > 0) ||
    audienceType === "njc_plus_segment";
  const formValid =
    readiness.ready &&
    title.trim().length >= 3 &&
    body.trim().length >= 3 &&
    destination.startsWith("/") &&
    !destination.startsWith("//") &&
    audienceValid;
  const broadAudience = audienceType !== "accounts" || accounts.length > 1;
  const typedConfirmationRequired =
    broadAudience && policy.requireTypedConfirmationForBroadAudience;
  const audienceDescription = useMemo(() => {
    if (audienceType === "sitewide") return "Every active browser subscription";
    if (audienceType === "accounts") {
      return `${accounts.length} selected account${accounts.length === 1 ? "" : "s"}`;
    }
    if (audienceType === "staff_roles") {
      return roles.map((role) => role[0]!.toUpperCase() + role.slice(1)).join(", ");
    }
    return segmentLabels[segment];
  }, [accounts.length, audienceType, roles, segment]);

  function currentAudience() {
    return audienceType === "sitewide"
      ? { type: "sitewide" as const }
      : audienceType === "accounts"
        ? {
            type: "accounts" as const,
            userClerkIds: accounts.map((account) => account.id),
          }
        : audienceType === "staff_roles"
          ? { type: "staff_roles" as const, roles }
          : {
              type: "njc_plus_segment" as const,
              segment,
            };
  }

  function campaignDraft() {
    return {
      title: title.trim(),
      body: body.trim(),
      destination,
      audience: currentAudience(),
    };
  }

  const campaignFingerprint = JSON.stringify(campaignDraft());
  const verifiedPreflight =
    preflight?.fingerprint === campaignFingerprint ? preflight : null;

  async function reviewCampaign() {
    if (!formValid || preflighting) return;
    setPreflighting(true);
    setError("");
    try {
      const response = await fetch("/api/v1/studio/notifications/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(campaignDraft()),
      });
      const payload = (await response.json()) as {
        data?: Omit<Preflight, "fingerprint">;
        error?: { message?: string };
      };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Audience preflight failed");
      }
      setPreflight({ ...payload.data, fingerprint: campaignFingerprint });
      setConfirmation("");
      setReviewOpen(true);
    } catch (reviewError) {
      setError(
        reviewError instanceof Error
          ? reviewError.message
          : "Audience preflight failed",
      );
    } finally {
      setPreflighting(false);
    }
  }

  async function sendCampaign() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/v1/studio/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...campaignDraft(),
          confirmed: true,
        }),
      });
      const payload = (await response.json()) as {
        data?: {
          summary?: {
            recipients: number;
            subscriptions: number;
            accepted: number;
            failed: number;
          };
        };
        error?: { message?: string };
      };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "The notification could not be sent");
      }
      const summary = payload.data?.summary;
      setNotice(
        summary
          ? `${summary.accepted} browser notification${summary.accepted === 1 ? "" : "s"} accepted for ${summary.recipients} recipient${summary.recipients === 1 ? "" : "s"}; ${summary.failed} failed.`
          : "The notification campaign was accepted.",
      );
      setReviewOpen(false);
      setConfirmation("");
      setTitle("");
      setBody("");
      setAccounts([]);
      setRoles([]);
      setPreflight(null);
      await loadHistory();
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "The notification could not be sent",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
            Audience communications
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            Site notifications
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Compose one concise alert, choose a server-verified audience, and
            review the destination before sending. Provider acceptance does not
            guarantee that a reader saw a notification.
          </p>
        </div>
        <Badge variant={readiness.ready ? "secondary" : "destructive"}>
          {readiness.ready ? "Delivery ready" : "Setup needs attention"}
        </Badge>
      </div>

      {!publicAlertsEnabled || !policy.deliveryEnabled ? (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardHeader>
            <ShieldAlert className="size-6 text-amber-600" />
            <CardTitle>Public alerts are disabled</CardTitle>
            <CardDescription>
              Enable both Breaking-news alerts and Studio campaign delivery in
              Configuration before a campaign can be sent. The API enforces
              both boundaries.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {showOperationalStatus ? (
        <section className="grid overflow-hidden rounded-xl border bg-card sm:grid-cols-2 xl:grid-cols-4">
          <ReadinessMetric label="Database" ready={readiness.database} detail={readiness.database ? "Campaign storage connected" : "Postgres is unavailable"} />
          <ReadinessMetric label="Web Push keys" ready={readiness.vapid} detail={readiness.vapid ? "VAPID delivery configured" : "Add the three VAPID environment values"} />
          <ReadinessMetric label="Reader enrollment" ready={readiness.readerEnrollment} detail={readiness.readerEnrollment ? `${readiness.activeSubscriptions} active subscription${readiness.activeSubscriptions === 1 ? "" : "s"}` : "Public enrollment is disabled"} />
          <ReadinessMetric label="Studio delivery" ready={readiness.studioDelivery} detail={readiness.studioDelivery ? `${readiness.totalCampaigns} recorded campaign${readiness.totalCampaigns === 1 ? "" : "s"}` : "Campaign delivery is disabled"} />
        </section>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,.85fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="size-5" /> Compose notification
            </CardTitle>
            <CardDescription>
              Keep lock-screen copy factual and avoid confidential or sensitive details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="notification-title">Headline</Label>
              <Input
                id="notification-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={120}
                placeholder="What readers need to know"
                disabled={!publicAlertsEnabled}
              />
              <p className="text-right text-xs text-muted-foreground">
                {title.length}/120
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notification-body">Summary</Label>
              <Textarea
                id="notification-body"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                maxLength={240}
                rows={4}
                placeholder="One clear sentence with enough context to decide whether to open it."
                disabled={!publicAlertsEnabled}
              />
              <p className="text-right text-xs text-muted-foreground">
                {body.length}/240
              </p>
            </div>

            <div className="space-y-2">
              <Label>Audience</Label>
              <GuidedEntityPicker
                label="Audience"
                value={audienceType}
                options={allowedAudienceOptions}
                onChange={(value) => setAudienceType((value ?? "sitewide") as AudienceType)}
                allowClear={false}
                disabled={!publicAlertsEnabled}
              />
            </div>

            {audienceType === "accounts" ? (
              <div className="space-y-3 rounded-lg border p-4">
                <div>
                  <p className="font-semibold">Selected accounts</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {canSearchAccounts
                      ? "Search and add one account at a time. Studio stores the canonical account ID automatically."
                      : "Account targeting is limited to administrators because directory results contain private identity details."}
                  </p>
                </div>
                {canSearchAccounts ? (
                  <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-start">
                    <StudioAccountPicker
                      value={accountCandidate}
                      onChange={setAccountCandidate}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-12"
                      disabled={!accountCandidate}
                      onClick={addAccount}
                    >
                      <Plus /> Add
                    </Button>
                  </div>
                ) : null}
                <div className="space-y-2">
                  {accounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center gap-3 rounded-md bg-muted/40 p-3"
                    >
                      <Avatar>
                        <AvatarImage src={account.imageUrl} alt="" />
                        <AvatarFallback><UserRound /></AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{account.displayName}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {account.username ? `@${account.username}` : account.primaryEmail}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Remove ${account.displayName}`}
                        onClick={() =>
                          setAccounts((current) =>
                            current.filter((item) => item.id !== account.id),
                          )
                        }
                      >
                        <X />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {audienceType === "staff_roles" ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {staffRoles.map((role) => (
                  <Button
                    key={role}
                    type="button"
                    variant={roles.includes(role) ? "default" : "outline"}
                    className="justify-start capitalize"
                    onClick={() => toggleRole(role)}
                  >
                    {roles.includes(role) ? <CheckCircle2 /> : <UserRound />}
                    {role}
                  </Button>
                ))}
              </div>
            ) : null}

            {audienceType === "njc_plus_segment" ? (
              <div className="space-y-2 rounded-lg border p-4">
                <Label htmlFor="notification-segment">NJC+ access group</Label>
                <Select
                  value={segment}
                  onValueChange={(value) => setSegment(value as NjcPlusSegment)}
                >
                  <SelectTrigger id="notification-segment">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(segmentLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs leading-5 text-muted-foreground">
                  These are independent entitlement groups. Invited beta access
                  is never treated as paid membership.
                </p>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label>Open destination</Label>
              <GuidedEntityPicker
                label="Destination"
                value={destinationChoice}
                options={destinationOptions}
                onChange={(value) => setDestinationChoice(value ?? "/")}
                allowClear={false}
                disabled={!publicAlertsEnabled}
              />
              {destinationChoice === "custom" ? (
                <Input
                  value={customDestination}
                  onChange={(event) => setCustomDestination(event.target.value)}
                  placeholder="/story/local-headline"
                  aria-label="Local notification destination"
                  maxLength={300}
                />
              ) : null}
              <p className="text-xs text-muted-foreground">
                External URLs and script destinations are rejected by the server.
              </p>
            </div>

            {error ? (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            {notice ? (
              <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-700" role="status">
                {notice}
              </p>
            ) : null}

            <Button
              type="button"
              disabled={!formValid || busy || preflighting}
              onClick={() => void reviewCampaign()}
            >
              {preflighting ? <LoaderCircle className="animate-spin" /> : <ShieldCheck />}
              Verify audience and review
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BellRing className="size-5" /> Recent campaigns
            </CardTitle>
            <CardDescription>
              Accepted and failed device attempts from the latest sends.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingHistory ? (
              <p className="flex items-center gap-2 py-10 text-sm text-muted-foreground" role="status">
                <LoaderCircle className="animate-spin" /> Loading campaigns…
              </p>
            ) : !policy.retainCampaignHistory ? (
              <div className="py-16 text-center">
                <BellRing className="mx-auto size-8 text-muted-foreground" />
                <p className="mt-3 font-semibold">History display is disabled</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Delivery records remain in the audit-safe database.
                </p>
              </div>
            ) : history.length ? (
              history.map((campaign) => (
                <article key={campaign.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{campaign.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                        {campaign.body}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Reuse copy from ${campaign.title}`}
                        title="Reuse this copy"
                        onClick={() => {
                          setTitle(campaign.title);
                          setBody(campaign.body);
                          setDestinationChoice(
                            destinationOptions.some((item) => item.value === campaign.destination)
                              ? campaign.destination
                              : "custom",
                          );
                          setCustomDestination(campaign.destination);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        <Copy />
                      </Button>
                      <Badge variant="outline" className="capitalize">
                        {campaign.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
                    <CampaignMetric label="Recipients" value={campaign.recipientCount} />
                    <CampaignMetric
                      label="Accepted"
                      value={campaign.acceptedCount ?? campaign.deliveredCount ?? 0}
                    />
                    <CampaignMetric label="Opened" value={campaign.openedCount ?? 0} />
                    <CampaignMetric label="Failed" value={campaign.failedCount} />
                  </div>
                  <p className="mt-3 text-[0.65rem] text-muted-foreground">
                    {new Date(campaign.createdAt).toLocaleString()} · {campaign.destination}
                  </p>
                </article>
              ))
            ) : (
              <div className="py-16 text-center">
                <Megaphone className="mx-auto size-8 text-muted-foreground" />
                <p className="mt-3 font-semibold">No campaigns yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Real sends will appear here automatically.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm notification campaign</DialogTitle>
            <DialogDescription>
              This immediately attempts delivery to every active subscription
              resolved for the selected audience.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="rounded-lg border bg-muted/25 p-4">
              <p className="font-semibold">{title}</p>
              <p className="mt-2 leading-6 text-muted-foreground">{body}</p>
            </div>
            <dl className="grid grid-cols-[7rem_1fr] gap-2">
              <dt className="text-muted-foreground">Audience</dt>
              <dd className="font-semibold">{audienceDescription}</dd>
              <dt className="text-muted-foreground">Destination</dt>
              <dd className="font-mono text-xs">{destination}</dd>
              <dt className="text-muted-foreground">Recipients</dt>
              <dd className="font-semibold">
                {verifiedPreflight?.recipients.toLocaleString() ?? "Checking"}
              </dd>
              <dt className="text-muted-foreground">Devices</dt>
              <dd className="font-semibold">
                {verifiedPreflight?.subscriptions.toLocaleString() ?? "Checking"}
              </dd>
            </dl>
            {verifiedPreflight && !verifiedPreflight.ready ? (
              <div className="flex gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                <CircleAlert className="mt-0.5 size-4 shrink-0" />
                No active browser subscription matches this audience.
              </div>
            ) : null}
            {typedConfirmationRequired ? (
              <div className="space-y-2">
                <Label htmlFor="notification-confirmation">
                  Type SEND to confirm this broad audience
                </Label>
                <Input
                  id="notification-confirmation"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  autoComplete="off"
                />
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setReviewOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={
                busy ||
                !verifiedPreflight?.ready ||
                (typedConfirmationRequired && confirmation !== "SEND")
              }
              onClick={() => void sendCampaign()}
            >
              {busy ? <LoaderCircle className="animate-spin" /> : <Send />}
              Send notification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CampaignMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-muted/35 px-2 py-2">
      <strong className="block text-sm">{value.toLocaleString()}</strong>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

function ReadinessMetric({
  label,
  ready,
  detail,
}: {
  label: string;
  ready: boolean;
  detail: string;
}) {
  return (
    <div className="border-b p-4 last:border-b-0 sm:border-r xl:border-b-0 xl:last:border-r-0">
      <div className="flex items-center gap-2 text-sm font-semibold">
        {ready ? (
          <CheckCircle2 className="size-4 text-emerald-600" />
        ) : (
          <CircleAlert className="size-4 text-amber-600" />
        )}
        {label}
      </div>
      <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  );
}
