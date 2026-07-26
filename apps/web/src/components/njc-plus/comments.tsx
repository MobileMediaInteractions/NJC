"use client";

import { useEffect, useState } from "react";
import { Flag, LoaderCircle, MessageCircle, Send } from "lucide-react";

type Comment = {
  id: string;
  parentId: string | null;
  body: string;
  createdAt: string;
  editedAt: string | null;
};

export function NjcPlusComments({ contentId }: { contentId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");

  async function load() {
    const response = await fetch(`/api/v1/plus/comments?contentId=${encodeURIComponent(contentId)}`);
    const payload = await response.json() as { data?: Comment[] };
    if (response.ok) setComments(payload.data ?? []);
    setBusy(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  // The content identity is stable for the lifetime of this page.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentId]);

  async function submit() {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/v1/plus/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentId, body }),
    });
    const payload = await response.json() as { error?: { message?: string } };
    setMessage(response.ok
      ? "Your comment is awaiting newsroom review."
      : payload.error?.message ?? "The comment could not be submitted.");
    if (response.ok) setBody("");
    setBusy(false);
  }

  async function report(commentId: string) {
    const reason = window.prompt("Briefly explain why this comment should be reviewed:");
    if (!reason) return;
    const response = await fetch("/api/v1/plus/comments/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId, reason }),
    });
    const payload = await response.json() as { error?: { message?: string } };
    setMessage(response.ok ? "Report sent to the moderation desk." : payload.error?.message ?? "The report could not be submitted.");
  }

  return <section className="plus-comments" aria-labelledby="plus-comments-heading">
    <div className="plus-comments-heading">
      <div><p>Public square</p><h2 id="plus-comments-heading">Conversation</h2></div>
      <span><MessageCircle /> {comments.length} approved</span>
    </div>
    <div className="plus-comment-form">
      <label htmlFor="plus-comment-body">Add to the conversation</label>
      <textarea id="plus-comment-body" value={body} onChange={(event) => setBody(event.target.value)} maxLength={4000} rows={4} placeholder="Keep it civil, local and on topic." />
      <button disabled={busy || body.trim().length < 2} onClick={() => void submit()}>{busy ? <LoaderCircle className="animate-spin" /> : <Send />} Submit for review</button>
      {message ? <p role="status">{message}</p> : null}
    </div>
    {comments.length ? <div className="plus-comment-list">{comments.map((comment) => <article key={comment.id}>
      <div><strong>NJC+ member</strong><time dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleDateString()}</time></div>
      <p>{comment.body}</p>
      <button onClick={() => void report(comment.id)}><Flag /> Report</button>
    </article>)}</div> : !busy ? <div className="plus-comments-empty">No approved comments yet. Start a thoughtful conversation.</div> : null}
  </section>;
}
