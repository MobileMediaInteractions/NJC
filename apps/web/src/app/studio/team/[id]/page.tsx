import Link from "next/link";
import { ArrowLeft, CheckCircle2, KeyRound, Link2, Mail, Phone, ShieldCheck, UserRound } from "lucide-react";
import { UserProfileEditor } from "@/components/studio/user-profile-editor";
import { StudioGate } from "@/components/studio/studio-gate";
import { StudioShell } from "@/components/studio/studio-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getStudioUser } from "@/lib/auth";
import { getStudioAccount } from "@/lib/studio-accounts";

export const dynamic = "force-dynamic";

export default async function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await getStudioUser();
  if (!viewer) return <StudioGate><></></StudioGate>;
  if (viewer.role !== "admin") {
    return <StudioShell viewer={viewer}><Card><CardHeader><CardTitle>User management is restricted</CardTitle><CardDescription>An administrator role is required to inspect user profiles and change newsroom access.</CardDescription></CardHeader></Card></StudioShell>;
  }

  const { id } = await params;
  let account: Awaited<ReturnType<typeof getStudioAccount>> | null = null;
  try {
    account = await getStudioAccount(id);
  } catch (error) {
    console.error("Studio user profile page lookup failed", { targetId: id, error });
  }

  if (!account) {
    return <StudioShell viewer={viewer}><Card><CardHeader><CardTitle>User profile unavailable</CardTitle><CardDescription>The account may have been removed, or Clerk could not return it. No cached profile is shown as authoritative.</CardDescription></CardHeader><CardContent><Button asChild variant="outline"><Link href="/studio/team"><ArrowLeft /> Return to users</Link></Button></CardContent></Card></StudioShell>;
  }

  const initials = account.displayName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return (
    <StudioShell viewer={viewer}>
      <div className="max-w-6xl">
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4"><Link href="/studio/team"><ArrowLeft /> All users</Link></Button>
        <header className="flex flex-wrap items-start justify-between gap-5 border-b pb-6">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar className="size-16"><AvatarImage src={account.imageUrl} alt="" /><AvatarFallback className="text-lg">{initials}</AvatarFallback></Avatar>
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h1 className="truncate text-3xl font-bold tracking-tight">{account.displayName}</h1><StatusBadge status={account.status} /></div><p className="mt-1 text-sm text-muted-foreground">{account.primaryEmail ?? "No primary email"}</p><p className="mt-1 break-all font-mono text-[0.68rem] text-muted-foreground">{account.id}</p></div>
          </div>
          <Badge variant={account.role ? "secondary" : "outline"} className="capitalize">{account.role ?? "Reader"}</Badge>
        </header>

        <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]">
          <div className="space-y-6">
            <UserProfileEditor initialAccount={account} currentUserId={viewer.id} />

            <Card><CardHeader><CardTitle>Identity methods</CardTitle><CardDescription>Verified identifiers and connected sign-in providers from Clerk. Email and phone changes stay in Clerk’s verification flows.</CardDescription></CardHeader><CardContent className="space-y-6">
              <IdentitySection icon={<Mail />} title="Email addresses" empty="No email addresses" items={account.emails.map((email) => ({ id: email.id, primary: email.primary, label: email.address, detail: `${email.verificationStatus}${email.verificationStrategy ? ` · ${email.verificationStrategy}` : ""}` }))} />
              <IdentitySection icon={<Phone />} title="Phone numbers" empty="No phone numbers" items={account.phoneNumbers.map((phone) => ({ id: phone.id, primary: phone.primary, label: phone.number, detail: `${phone.verificationStatus}${phone.reservedForSecondFactor ? " · second factor" : ""}` }))} />
              <IdentitySection icon={<Link2 />} title="Connected accounts" empty="No external sign-in providers" items={account.externalAccounts.map((external) => ({ id: external.id, primary: false, label: formatProvider(external.provider), detail: [external.emailAddress, external.username, external.verificationStatus].filter(Boolean).join(" · ") }))} />
            </CardContent></Card>
          </div>

          <div className="space-y-6">
            <Card><CardHeader><CardTitle>Security</CardTitle><CardDescription>Current account security posture reported by Clerk.</CardDescription></CardHeader><CardContent className="space-y-3">
              <BooleanRow label="Primary email verified" value={account.emailVerified} />
              <BooleanRow label="Password enabled" value={account.passwordEnabled} />
              <BooleanRow label="Two-factor authentication" value={account.twoFactorEnabled} />
              <BooleanRow label="Authenticator app" value={account.totpEnabled} />
              <BooleanRow label="Backup codes" value={account.backupCodeEnabled} />
              <DetailRow label="Account status" value={account.status} capitalize />
            </CardContent></Card>

            <Card><CardHeader><CardTitle>Account details</CardTitle></CardHeader><CardContent className="space-y-3">
              <DetailRow label="Username" value={account.username ?? "Not set"} />
              <DetailRow label="External ID" value={account.externalId ?? "Not set"} mono />
              <DetailRow label="Locale" value={account.locale ?? "Not set"} />
              <DetailRow label="Created" value={formatDate(account.createdAt)} />
              <DetailRow label="Last active" value={formatDate(account.lastActiveAt)} />
              <DetailRow label="Last sign-in" value={formatDate(account.lastSignInAt)} />
              <DetailRow label="Identity updated" value={formatDate(account.updatedAt)} />
              <DetailRow label="Legal accepted" value={formatDate(account.legalAcceptedAt)} />
            </CardContent></Card>

            <Card><CardHeader><CardTitle>Newsroom record</CardTitle><CardDescription>Postgres cache used by publishing and employee tools.</CardDescription></CardHeader><CardContent>{account.databaseProfile ? <div className="space-y-3"><BooleanRow label="Active staff record" value={account.databaseProfile.isActive} /><DetailRow label="Database ID" value={account.databaseProfile.id} mono /><DetailRow label="Created" value={formatDate(account.databaseProfile.createdAt)} /><DetailRow label="Updated" value={formatDate(account.databaseProfile.updatedAt)} /></div> : <div className="flex gap-3 rounded-lg border border-dashed p-4 text-sm text-muted-foreground"><UserRound className="mt-0.5 size-5 shrink-0" /><p>This reader has no newsroom record. Assigning a staff role creates one automatically.</p></div>}</CardContent></Card>
          </div>
        </div>
      </div>
    </StudioShell>
  );
}

function IdentitySection({ icon, title, empty, items }: { icon: React.ReactNode; title: string; empty: string; items: Array<{ id: string; label: string; detail: string; primary: boolean }> }) {
  return <section><h2 className="flex items-center gap-2 text-sm font-semibold [&_svg]:size-4">{icon}{title}</h2>{items.length ? <ul className="mt-3 divide-y rounded-lg border">{items.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"><div><p className="text-sm font-medium">{item.label}</p><p className="mt-0.5 text-xs capitalize text-muted-foreground">{item.detail}</p></div>{item.primary ? <Badge variant="secondary">Primary</Badge> : null}</li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">{empty}</p>}</section>;
}

function BooleanRow({ label, value }: { label: string; value: boolean }) {
  return <div className="flex items-center justify-between gap-4 text-sm"><span className="text-muted-foreground">{label}</span><span className={value ? "flex items-center gap-1.5 text-emerald-400" : "text-muted-foreground"}>{value ? <><CheckCircle2 className="size-4" /> Enabled</> : "No"}</span></div>;
}

function DetailRow({ label, value, mono = false, capitalize = false }: { label: string; value: string; mono?: boolean; capitalize?: boolean }) {
  return <div className="flex items-start justify-between gap-5 text-sm"><span className="shrink-0 text-muted-foreground">{label}</span><span className={`break-all text-right ${mono ? "font-mono text-xs" : ""} ${capitalize ? "capitalize" : ""}`}>{value}</span></div>;
}

function StatusBadge({ status }: { status: "active" | "banned" | "locked" }) {
  const icon = status === "active" ? <ShieldCheck /> : <KeyRound />;
  return <Badge variant={status === "active" ? "outline" : "destructive"} className="capitalize [&_svg]:size-3">{icon}{status}</Badge>;
}

function formatProvider(provider: string) {
  return provider.replace(/^oauth_/, "").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Never";
}
