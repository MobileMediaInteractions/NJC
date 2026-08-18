import { count, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { Eye, MessageSquareText, UsersRound } from "lucide-react";
import { notFound } from "next/navigation";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { premiumContent, premiumPreviewConfigurations, premiumPreviewInvitations, premiumPreviewResponses } from "@harborline/backend/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NjcPlusStudioHeading } from "@/components/studio/njc-plus-nav";
import { getStudioUser } from "@/lib/auth";

export default async function CourierCutPage() {
  const viewer = await getStudioUser();
  if (!viewer || !["admin", "editor", "producer"].includes(viewer.role)) notFound();
  const rows = hasDatabase() ? await getDb().select({
    configuration: premiumPreviewConfigurations,
    content: premiumContent,
    invitations: count(premiumPreviewInvitations.id),
    feedback: count(premiumPreviewResponses.id),
  }).from(premiumPreviewConfigurations)
    .innerJoin(premiumContent, eq(premiumContent.id, premiumPreviewConfigurations.contentId))
    .leftJoin(premiumPreviewInvitations, eq(premiumPreviewInvitations.previewId, premiumPreviewConfigurations.id))
    .leftJoin(premiumPreviewResponses, eq(premiumPreviewResponses.invitationId, premiumPreviewInvitations.id))
    .groupBy(premiumPreviewConfigurations.id, premiumContent.id)
    .orderBy(desc(premiumPreviewConfigurations.updatedAt)) : [];
  return <><NjcPlusStudioHeading eyebrow="Early access review" title="The Courier Cut" description="Private unreleased productions, invited viewers, viewing state and feedback in one server-authorized workspace." /><div className="grid gap-4 md:grid-cols-3"><Metric icon={<Eye />} label="Configured cuts" value={rows.length} /><Metric icon={<UsersRound />} label="Invitations" value={rows.reduce((sum, row) => sum + Number(row.invitations), 0)} /><Metric icon={<MessageSquareText />} label="Responses" value={rows.reduce((sum, row) => sum + Number(row.feedback), 0)} /></div><Card className="mt-6"><CardHeader><CardTitle>Courier Cut productions</CardTitle><CardDescription>Open a production to manage its source timeline, global-intro inheritance, invitations and survey.</CardDescription></CardHeader><CardContent>{rows.length ? <div className="divide-y">{rows.map((row) => <Link key={row.configuration.id} href={`/studio/njc-plus/content/${row.content.id}`} className="grid gap-2 py-4 hover:text-primary md:grid-cols-[1fr_auto]"><div><p className="font-semibold">{row.content.title}</p><p className="text-xs capitalize text-muted-foreground">{row.content.kind.replaceAll("_", " ")} · {row.content.status} · {row.configuration.enabled ? "Accepting authorized viewers" : "Disabled"}</p></div><p className="text-xs text-muted-foreground">{Number(row.invitations)} invited · {Number(row.feedback)} responded</p></Link>)}</div> : <div className="py-12 text-center"><UsersRound className="mx-auto text-muted-foreground" /><h2 className="mt-3 font-semibold">No Courier Cut productions</h2><p className="text-sm text-muted-foreground">Create or open NJC+ content, then enable The Courier Cut.</p></div>}</CardContent></Card></>;
}
function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) { return <Card><CardContent className="p-5"><span className="text-primary [&_svg]:size-5">{icon}</span><p className="mt-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-1 text-3xl font-bold">{value}</p></CardContent></Card>; }
