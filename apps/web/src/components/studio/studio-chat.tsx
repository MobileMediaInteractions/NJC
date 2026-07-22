"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Hash, Loader2, MessageCircle, MessageSquarePlus, MoreHorizontal, Plus, Reply, Search, Send, Trash2, UsersRound, X } from "lucide-react";
import type { EmployeeCapability, StaffRole } from "@harborline/contracts";
import { PresenceIndicator } from "@/components/studio/presence-indicator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { detectBrowserPresencePlatform, employeePresenceStatuses, resolveEmployeePresence, type EmployeePresencePlatform, type EmployeePresenceStatus } from "@/lib/employee-presence";

type Viewer = { id: string; name: string; email: string; role: StaffRole; capabilities: EmployeeCapability[] };
type Channel = { id: string; kind: "public" | "private" | "direct" | "group"; name: string; topic: string | null; unread: number; updatedAt: string };
type Message = { id: string; channelId: string; authorClerkId: string; authorName: string; body: string; replyToId: string | null; mentions: string[]; isPinned: boolean; editedAt: string | null; deletedAt: string | null; createdAt: string };
type DirectoryEntry = { clerkId: string; displayName: string; title: string | null; avatarUrl: string | null };
type Presence = { userClerkId: string; status: EmployeePresenceStatus; platform: EmployeePresencePlatform; lastSeenAt: string | null; typingChannelId: string | null };
type Bootstrap = { channels: Channel[] };

export function StudioChat({ viewer, initialChannelId }: { viewer: Viewer; initialChannelId: string | null }) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [directory, setDirectory] = useState<DirectoryEntry[]>([]);
  const [presence, setPresence] = useState<Presence[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialChannelId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [channelDialogOpen, setChannelDialogOpen] = useState(false);
  const [channelName, setChannelName] = useState("");
  const cursorRef = useRef<string | null>(null);
  const requestRunning = useRef(false);
  const typingSentAt = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);
  const selected = channels.find((channel) => channel.id === selectedId) ?? null;
  const canWrite = viewer.capabilities.includes("chat:write");
  const canManage = viewer.capabilities.includes("chat:manage");
  const canModerate = viewer.capabilities.includes("chat:moderate");

  const refreshWorkspace = useCallback(async () => {
    try {
      const [bootstrap, people, activity] = await Promise.all([
        request<Bootstrap>("/api/v1/employee/bootstrap"),
        request<DirectoryEntry[]>("/api/v1/employee/directory"),
        request<Presence[]>("/api/v1/employee/chat/presence"),
      ]);
      setChannels(bootstrap.channels);
      setDirectory(people);
      setPresence(activity);
      setSelectedId((current) => current && bootstrap.channels.some((channel) => channel.id === current) ? current : bootstrap.channels[0]?.id ?? null);
      setNotice(null);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Team communication is unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (replace = false, query = "") => {
    if (!selectedId || requestRunning.current) return;
    requestRunning.current = true;
    if (replace) setLoadingMessages(true);
    try {
      const after = !replace && cursorRef.current ? `&after=${encodeURIComponent(cursorRef.current)}` : "";
      const q = query.trim() ? `&q=${encodeURIComponent(query.trim())}` : "";
      const next = await request<Message[]>(`/api/v1/employee/chat/channels/${selectedId}/messages?limit=100${after}${q}`);
      setMessages((current) => replace ? next : [...current, ...next.filter((message) => !current.some((item) => item.id === message.id))]);
      const latest = next.at(-1)?.createdAt;
      if (latest && !query) cursorRef.current = latest;
      if (replace && !query) {
        await request(`/api/v1/employee/chat/channels/${selectedId}/read`, { method: "POST" });
        setChannels((current) => current.map((channel) => channel.id === selectedId ? { ...channel, unread: 0 } : channel));
      } else if (next.length && !query && document.visibilityState === "visible") {
        await request(`/api/v1/employee/chat/channels/${selectedId}/read`, { method: "POST" });
        setChannels((current) => current.map((channel) => channel.id === selectedId ? { ...channel, unread: 0 } : channel));
      }
      setNotice(null);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Messages could not be loaded.");
    } finally {
      requestRunning.current = false;
      if (replace) setLoadingMessages(false);
    }
  }, [selectedId]);

  useEffect(() => { const initial = window.setTimeout(() => void refreshWorkspace(), 0); const timer = window.setInterval(() => void refreshWorkspace(), 15_000); return () => { window.clearTimeout(initial); window.clearInterval(timer); }; }, [refreshWorkspace]);
  useEffect(() => {
    if (!selectedId) return;
    cursorRef.current = null;
    window.history.replaceState(null, "", `/studio/chat?channel=${encodeURIComponent(selectedId)}`);
    const initial = window.setTimeout(() => { setMessages([]); setSearch(""); void loadMessages(true); }, 0);
    const timer = window.setInterval(() => void loadMessages(false), 3_000);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); };
  }, [loadMessages, selectedId]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages.length]);

  async function sendMessage() {
    const clean = body.trim();
    if (!clean || !selectedId || !canWrite) return;
    setSending(true);
    setBody("");
    try {
      const mentions = directory.filter((person) => clean.toLocaleLowerCase().includes(`@${person.displayName.toLocaleLowerCase()}`)).map((person) => person.clerkId);
      const created = await request<Message>(`/api/v1/employee/chat/channels/${selectedId}/messages`, { method: "POST", body: JSON.stringify({ body: clean, replyToId: replyTo?.id, mentions, clientId: crypto.randomUUID() }) });
      setMessages((current) => [...current, created]);
      cursorRef.current = created.createdAt;
      setReplyTo(null);
      setNotice(null);
    } catch (error) {
      setBody(clean);
      setNotice(error instanceof Error ? error.message : "Message was not sent.");
    } finally {
      setSending(false);
    }
  }

  async function deleteMessage(message: Message) {
    try {
      const updated = await request<Message>(`/api/v1/employee/chat/messages/${message.id}`, { method: "DELETE" });
      setMessages((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Message was not deleted.");
    }
  }

  async function createChannel() {
    const name = channelName.trim();
    if (!name) return;
    try {
      const channel = await request<Channel>("/api/v1/employee/chat/channels", { method: "POST", body: JSON.stringify({ kind: "public", name, memberClerkIds: [] }) });
      setChannelDialogOpen(false);
      setChannelName("");
      await refreshWorkspace();
      setSelectedId(channel.id);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Channel could not be created.");
    }
  }

  async function openDirectMessage(person: DirectoryEntry) {
    if (person.clerkId === viewer.id || !canWrite) return;
    try {
      const channel = await request<Channel>("/api/v1/employee/chat/channels", { method: "POST", body: JSON.stringify({ kind: "direct", name: person.displayName, memberClerkIds: [person.clerkId] }) });
      await refreshWorkspace();
      setSelectedId(channel.id);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Direct conversation could not be opened.");
    }
  }

  function updateTyping(value: string) {
    setBody(value);
    if (!selectedId || Date.now() - typingSentAt.current < 2_000) return;
    typingSentAt.current = Date.now();
    const savedStatus = window.localStorage.getItem("njc:studio:presence");
    const status: EmployeePresenceStatus = employeePresenceStatuses.includes(savedStatus as EmployeePresenceStatus) ? savedStatus as EmployeePresenceStatus : "online";
    void fetch("/api/v1/employee/chat/presence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, platform: detectBrowserPresencePlatform(navigator.userAgent), typingChannelId: selectedId }) });
  }

  const typingPeople = presence.filter((item) => item.typingChannelId === selectedId && item.userClerkId !== viewer.id).map((item) => directory.find((person) => person.clerkId === item.userClerkId)?.displayName).filter(Boolean);

  return (
    <div className="-m-4 grid min-h-[calc(100vh-4rem)] overflow-hidden border-y bg-card sm:-m-7 lg:grid-cols-[16rem_minmax(0,1fr)_17rem]">
      <aside className="border-b bg-[#071f31] text-white lg:border-b-0 lg:border-r lg:border-white/10">
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-4"><div><p className="text-sm font-bold">Courier newsroom</p><p className="text-[0.65rem] uppercase tracking-widest text-white/45">Team communication</p></div>{canManage ? <Dialog open={channelDialogOpen} onOpenChange={setChannelDialogOpen}><DialogTrigger asChild><Button size="icon-sm" variant="ghost" aria-label="Create channel"><Plus /></Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Create a public channel</DialogTitle><DialogDescription>Everyone with newsroom chat access can find and join this conversation.</DialogDescription></DialogHeader><Input value={channelName} onChange={(event) => setChannelName(event.target.value)} placeholder="Channel name" maxLength={80} onKeyDown={(event) => { if (event.key === "Enter") void createChannel(); }} /><DialogFooter><Button onClick={() => void createChannel()} disabled={!channelName.trim()}>Create channel</Button></DialogFooter></DialogContent></Dialog> : null}</div>
        <div className="max-h-52 overflow-y-auto p-2 lg:max-h-[calc(100vh-8rem)]">
          <p className="px-2 pb-2 pt-1 text-[0.65rem] font-bold uppercase tracking-widest text-white/40">Channels & messages</p>
          {loading ? <div className="flex items-center gap-2 px-2 py-3 text-xs text-white/50"><Loader2 className="size-3.5 animate-spin" /> Loading conversations</div> : channels.length ? channels.map((channel) => <button key={channel.id} type="button" onClick={() => setSelectedId(channel.id)} className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm ${channel.id === selectedId ? "bg-white/12 text-white" : "text-white/60 hover:bg-white/7 hover:text-white"}`}><span className="shrink-0">{channel.kind === "public" ? <Hash className="size-4" /> : <MessageCircle className="size-4" />}</span><span className="min-w-0 flex-1 truncate">{channel.name}</span>{channel.unread ? <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[0.65rem] font-black text-white">{channel.unread > 9 ? "9+" : channel.unread}</span> : null}</button>) : <p className="px-2 py-4 text-xs leading-5 text-white/45">No conversations yet. A channel manager can create the first one.</p>}
        </div>
      </aside>

      <section className="flex min-h-[34rem] min-w-0 flex-col bg-background">
        <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
          <div className="min-w-0"><h1 className="flex items-center gap-2 truncate text-base font-bold">{selected?.kind === "public" ? <Hash className="size-4" /> : <MessageCircle className="size-4" />}{selected?.name ?? "Team chat"}</h1><p className="truncate text-xs text-muted-foreground">{selected?.topic ?? (selected ? "Internal newsroom conversation" : "Choose a conversation to begin")}</p></div>
          {selected ? <form onSubmit={(event) => { event.preventDefault(); cursorRef.current = null; void loadMessages(true, search); }} className="flex gap-1"><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search messages" className="h-8 w-40" aria-label="Search conversation" /><Button type="submit" size="icon-sm" variant="ghost" aria-label="Search"><Search /></Button></form> : null}
        </header>
        {notice ? <div className="border-b border-red-500/30 bg-red-500/10 px-4 py-2 text-xs text-red-300" role="status">{notice}</div> : null}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          {!selected ? <EmptyChat icon={<MessageCircle className="size-8" />} title="Choose a conversation" body="Channels and direct messages remain private to authorized newsroom staff." /> : loadingMessages ? <div className="flex min-h-72 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading messages</div> : messages.length ? <div className="space-y-1">{messages.map((message) => <MessageRow key={message.id} message={message} viewerId={viewer.id} canModerate={canModerate} onReply={setReplyTo} onDelete={deleteMessage} reply={message.replyToId ? messages.find((item) => item.id === message.replyToId) : undefined} />)}<div ref={endRef} /></div> : <EmptyChat icon={<MessageSquarePlus className="size-8" />} title="Start the conversation" body="Write the first message. New replies will appear automatically." />}
        </div>
        {selected && canWrite ? <footer className="border-t bg-card p-3 sm:p-4">{replyTo ? <div className="mb-2 flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-xs"><Reply className="size-3.5" /><span className="min-w-0 flex-1 truncate">Replying to {replyTo.authorName}: {replyTo.body}</span><Button variant="ghost" size="icon-xs" onClick={() => setReplyTo(null)} aria-label="Cancel reply"><X /></Button></div> : null}<div className="flex items-end gap-2"><Textarea value={body} onChange={(event) => updateTyping(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} placeholder={`Message ${selected.name}`} aria-label="Message" rows={2} maxLength={8000} className="min-h-16 resize-none" /><Button onClick={() => void sendMessage()} disabled={!body.trim() || sending} size="icon" aria-label="Send message">{sending ? <Loader2 className="animate-spin" /> : <Send />}</Button></div>{typingPeople.length ? <p className="mt-2 text-[0.68rem] text-muted-foreground">{typingPeople.join(", ")} {typingPeople.length === 1 ? "is" : "are"} typing…</p> : <p className="mt-2 text-[0.68rem] text-muted-foreground">Enter to send · Shift+Enter for a new line · use @Full Name to mention</p>}</footer> : null}
      </section>

      <aside className="hidden border-l bg-card lg:block">
        <div className="flex h-16 items-center gap-2 border-b px-4"><UsersRound className="size-4" /><h2 className="text-sm font-bold">Newsroom activity</h2></div>
        <div className="max-h-[calc(100vh-8rem)] overflow-y-auto p-2">{directory.map((person) => { const activity = resolveEmployeePresence(presence.find((item) => item.userClerkId === person.clerkId)); const initials = person.displayName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(); return <div key={person.clerkId} className="group flex items-center gap-3 rounded-md p-2 hover:bg-muted/60"><Avatar size="sm"><AvatarImage src={person.avatarUrl ?? undefined} alt="" /><AvatarFallback>{initials}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{person.displayName}{person.clerkId === viewer.id ? " (you)" : ""}</p><PresenceIndicator status={activity.status} platform={activity.platform} lastSeenAt={activity.lastSeenAt} /></div>{person.clerkId !== viewer.id && canWrite ? <Button size="icon-xs" variant="ghost" className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100" onClick={() => void openDirectMessage(person)} aria-label={`Message ${person.displayName}`}><MessageCircle /></Button> : null}</div>; })}</div>
      </aside>
    </div>
  );
}

function MessageRow({ message, viewerId, canModerate, onReply, onDelete, reply }: { message: Message; viewerId: string; canModerate: boolean; onReply: (message: Message) => void; onDelete: (message: Message) => Promise<void>; reply?: Message }) {
  const initials = message.authorName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return <article className="group flex gap-3 rounded-md px-2 py-2.5 hover:bg-muted/45"><Avatar><AvatarFallback className="bg-brand-blue text-xs text-white">{initials}</AvatarFallback></Avatar><div className="min-w-0 flex-1">{reply ? <p className="mb-1 truncate border-l-2 pl-2 text-[0.68rem] text-muted-foreground">Reply to {reply.authorName}: {reply.deletedAt ? "Deleted message" : reply.body}</p> : null}<div className="flex flex-wrap items-baseline gap-2"><p className="text-sm font-bold">{message.authorName}</p><time className="text-[0.65rem] text-muted-foreground" dateTime={message.createdAt}>{new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", month: "short", day: "numeric" }).format(new Date(message.createdAt))}</time>{message.editedAt ? <span className="text-[0.6rem] text-muted-foreground">edited</span> : null}{message.isPinned ? <Badge variant="secondary" className="h-4 px-1 text-[0.55rem]">Pinned</Badge> : null}</div><p className={`mt-1 whitespace-pre-wrap break-words text-sm leading-6 ${message.deletedAt ? "italic text-muted-foreground" : ""}`}>{message.deletedAt ? "Message deleted" : message.body}</p></div>{!message.deletedAt ? <DropdownMenu><DropdownMenuTrigger asChild><Button size="icon-xs" variant="ghost" className="opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100" aria-label="Message actions"><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => onReply(message)}><Reply /> Reply</DropdownMenuItem>{message.authorClerkId === viewerId || canModerate ? <DropdownMenuItem variant="destructive" onSelect={() => void onDelete(message)}><Trash2 /> Delete</DropdownMenuItem> : null}</DropdownMenuContent></DropdownMenu> : null}</article>;
}

function EmptyChat({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return <div className="grid min-h-72 place-items-center"><Card className="max-w-sm border-dashed p-7 text-center"><span className="mx-auto flex justify-center text-muted-foreground">{icon}</span><h2 className="mt-3 font-semibold">{title}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p></Card></div>;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers }, cache: "no-store" });
  const payload = await response.json().catch(() => null) as { data?: T; error?: { message?: string } } | null;
  if (!response.ok || !payload?.data) throw new Error(payload?.error?.message ?? "The newsroom service did not complete the request.");
  return payload.data;
}
