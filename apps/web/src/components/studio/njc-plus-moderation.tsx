"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Flag, LoaderCircle, ShieldX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Comment = {
  id: string;
  contentId: string;
  contentTitle: string | null;
  authorClerkId: string;
  body: string;
  status: string;
  createdAt: string;
};
type Report = {
  id: string;
  commentId: string;
  reporterClerkId: string;
  reason: string;
  status: string;
  createdAt: string;
};

export function NjcPlusModeration() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");
  const openReports = useMemo(() => reports.filter((report) => report.status === "open"), [reports]);

  async function load() {
    setBusy(true);
    const response = await fetch("/api/v1/studio/njc-plus/comments");
    const payload = await response.json() as { data?: { comments: Comment[]; reports: Report[] }; error?: { message?: string } };
    if (response.ok && payload.data) {
      setComments(payload.data.comments);
      setReports(payload.data.reports);
    } else {
      setMessage(payload.error?.message ?? "Moderation data could not be loaded.");
    }
    setBusy(false);
  }
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  // The initial moderation queue is loaded once; mutations explicitly refresh it.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function moderate(target: "comment" | "report", id: string, status: string) {
    const reason = window.prompt(`Reason for marking this ${target} ${status}:`);
    if (!reason) return;
    setBusy(true);
    const response = await fetch("/api/v1/studio/njc-plus/comments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target, id, status, reason }),
    });
    const payload = await response.json() as { error?: { message?: string } };
    setMessage(response.ok ? "Moderation action recorded in the NJC+ audit log." : payload.error?.message ?? "Moderation failed.");
    if (response.ok) await load();
    else setBusy(false);
  }

  return <div>
    {message ? <p className="mb-4 rounded-md border p-3 text-sm" role="status">{message}</p> : null}
    <Tabs defaultValue="pending">
      <TabsList className="mb-4">
        <TabsTrigger value="pending">Pending <Badge className="ml-2">{comments.filter((comment) => comment.status === "pending").length}</Badge></TabsTrigger>
        <TabsTrigger value="reports">Reports <Badge className="ml-2" variant={openReports.length ? "destructive" : "secondary"}>{openReports.length}</Badge></TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
      </TabsList>
      <TabsContent value="pending"><CommentList comments={comments.filter((comment) => comment.status === "pending")} busy={busy} moderate={moderate} /></TabsContent>
      <TabsContent value="reports"><Card><CardContent className="p-0">{openReports.length ? <div className="divide-y">{openReports.map((report) => <div className="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-center" key={report.id}><div><p className="font-semibold"><Flag className="mr-2 inline size-4 text-destructive" />{report.reason}</p><p className="mt-1 font-mono text-[.65rem] text-muted-foreground">Comment {report.commentId} · reporter {report.reporterClerkId}</p></div><div className="flex gap-2"><Button size="sm" variant="outline" disabled={busy} onClick={() => void moderate("report", report.id, "dismissed")}>Dismiss</Button><Button size="sm" disabled={busy} onClick={() => void moderate("report", report.id, "resolved")}>Resolve</Button></div></div>)}</div> : <Empty text="No open reports" />}</CardContent></Card></TabsContent>
      <TabsContent value="history"><CommentList comments={comments.filter((comment) => comment.status !== "pending")} busy={busy} moderate={moderate} history /></TabsContent>
    </Tabs>
  </div>;
}

function CommentList({ comments, busy, moderate, history = false }: { comments: Comment[]; busy: boolean; moderate: (target: "comment", id: string, status: string) => Promise<void>; history?: boolean }) {
  return <Card><CardHeader><CardTitle>{history ? "Moderation history" : "Approval queue"}</CardTitle><CardDescription>Author IDs are shown for accountable enforcement without copying private profile data into comments.</CardDescription></CardHeader><CardContent>{comments.length ? <div className="divide-y">{comments.map((comment) => <article className="py-4" key={comment.id}><div className="flex flex-wrap items-center justify-between gap-2"><strong>{comment.contentTitle ?? "Deleted content"}</strong><Badge variant="outline" className="capitalize">{comment.status}</Badge></div><p className="mt-2 leading-relaxed">{comment.body}</p><p className="mt-2 font-mono text-[.65rem] text-muted-foreground">{comment.authorClerkId} · {new Date(comment.createdAt).toLocaleString()}</p>{!history ? <div className="mt-3 flex gap-2"><Button size="sm" disabled={busy} onClick={() => void moderate("comment", comment.id, "approved")}><Check /> Approve</Button><Button size="sm" variant="destructive" disabled={busy} onClick={() => void moderate("comment", comment.id, "rejected")}><ShieldX /> Reject</Button></div> : null}</article>)}</div> : busy ? <div className="grid place-items-center py-16"><LoaderCircle className="animate-spin" /></div> : <Empty text={history ? "No moderated comments yet" : "The approval queue is clear"} />}</CardContent></Card>;
}
function Empty({ text }: { text: string }) { return <div className="py-16 text-center text-sm text-muted-foreground">{text}</div>; }
