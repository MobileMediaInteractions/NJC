import { desc } from "drizzle-orm";
import Link from "next/link";
import { FilePlus2 } from "lucide-react";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { premiumContent } from "@harborline/backend/schema";
import { NjcPlusStudioHeading } from "@/components/studio/njc-plus-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { premiumContentStatuses, premiumKindLabel } from "@/lib/njc-plus";

export default async function ContentPage() {
  const data = hasDatabase() ? await getDb().select().from(premiumContent).orderBy(desc(premiumContent.updatedAt)).limit(300) : [];
  return <><div className="flex flex-wrap items-start justify-between gap-4"><NjcPlusStudioHeading eyebrow="Unified framework" title="Premium content" description="Stories, films, series, podcasts, live desks and collections share one workflow, hierarchy and revision system." /><Button asChild><Link href="/studio/njc-plus/content/new"><FilePlus2 /> New production</Link></Button></div><Tabs defaultValue="active"><TabsList className="mb-4 flex h-auto flex-wrap"><TabsTrigger value="active">Active</TabsTrigger>{premiumContentStatuses.map((status) => <TabsTrigger key={status} value={status} className="capitalize">{status} <span className="ml-1 text-[.65rem] opacity-60">{data.filter((item) => item.status === status).length}</span></TabsTrigger>)}</TabsList><TabsContent value="active"><ContentRows rows={data.filter((item) => item.status !== "archived")} /></TabsContent>{premiumContentStatuses.map((status) => <TabsContent key={status} value={status}><ContentRows rows={data.filter((item) => item.status === status)} /></TabsContent>)}</Tabs></>;
}
function ContentRows({ rows }: { rows: Array<typeof premiumContent.$inferSelect> }) { return <Card><CardContent className="p-0">{rows.length ? <div className="divide-y">{rows.map((item) => <Link href={`/studio/njc-plus/content/${item.id}`} key={item.id} className="grid gap-3 px-5 py-4 hover:bg-muted/40 sm:grid-cols-[1fr_auto_auto] sm:items-center"><div><p className="font-semibold">{item.title}</p><p className="mt-1 font-mono text-[.65rem] text-muted-foreground">/plus/{item.slug}</p></div><Badge variant="secondary">{premiumKindLabel(item.kind)}</Badge><div className="text-right"><Badge variant={item.status === "published" ? "default" : "outline"} className="capitalize">{item.status}</Badge><p className="mt-1 text-[.65rem] text-muted-foreground">{item.updatedAt.toLocaleString()}</p></div></Link>)}</div> : <div className="py-16 text-center"><p className="font-semibold">No content in this view</p><p className="mt-1 text-xs text-muted-foreground">The list reflects database records only.</p></div>}</CardContent></Card>; }
