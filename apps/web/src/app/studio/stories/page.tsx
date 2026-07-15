import Link from "next/link";
import { FilePlus2, Search } from "lucide-react";
import { StudioGate } from "@/components/studio/studio-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { studioDrafts } from "@/lib/seed";

export default function StudioStoriesPage() {
  const rows = [...studioDrafts, { id: "pub-1", headline: "New Brunswick unveils a $48M plan to protect the working waterfront", section: "Local", owner: "Mara Chen", status: "published", updated: "2 hrs ago" }];
  return <StudioGate><div><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h1 className="text-3xl font-bold tracking-tight">Stories</h1><p className="mt-1 text-sm text-muted-foreground">Manage every assignment from pitch to publication.</p></div><Button asChild><Link href="/studio/stories/new"><FilePlus2 /> New story</Link></Button></div><Card className="mt-7"><CardHeader className="gap-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><Tabs defaultValue="all"><TabsList><TabsTrigger value="all">All</TabsTrigger><TabsTrigger value="mine">My stories</TabsTrigger><TabsTrigger value="review">Needs review</TabsTrigger><TabsTrigger value="scheduled">Scheduled</TabsTrigger></TabsList></Tabs><div className="relative max-w-sm flex-1 lg:max-w-xs"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Search newsroom" /></div></div></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Headline</TableHead><TableHead>Section</TableHead><TableHead>Owner</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Updated</TableHead></TableRow></TableHeader><TableBody>{rows.map((story) => <TableRow key={story.id}><TableCell><Link href={story.status === "published" ? "/story/port-alder-council-unveils-harbor-resilience-plan" : "/studio/stories/new"} className="font-medium hover:underline">{story.headline}</Link></TableCell><TableCell className="text-muted-foreground">{story.section}</TableCell><TableCell>{story.owner}</TableCell><TableCell><Badge variant={story.status === "review" ? "default" : "secondary"} className="capitalize">{story.status}</Badge></TableCell><TableCell className="text-right text-xs text-muted-foreground">{story.updated}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card></div></StudioGate>;
}
