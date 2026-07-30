"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ExternalLink,
  Hash,
  Loader2,
  MessageCircleMore,
  Send,
  Settings2,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Channel = {
  id: string;
  name: string;
  kind: "public" | "private" | "direct" | "group";
  unread: number;
};

type Message = {
  id: string;
  authorName: string;
  body: string;
  deletedAt: string | null;
  createdAt: string;
};

type Bootstrap = { channels: Channel[] };

export function StudioMiniChat({
  open,
  onOpenChange,
  onDisable,
  cleanStudioPaths,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDisable: () => void;
  cleanStudioPaths: boolean;
}) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const loadChannels = useCallback(async () => {
    const data = await request<Bootstrap>("/api/v1/employee/bootstrap");
    setChannels(data.channels);
    setSelectedId((current) =>
      current && data.channels.some((channel) => channel.id === current)
        ? current
        : (data.channels[0]?.id ?? null),
    );
  }, []);

  const loadMessages = useCallback(async () => {
    if (!selectedId) return;
    const data = await request<Message[]>(
      `/api/v1/employee/chat/channels/${selectedId}/messages?limit=30`,
    );
    setMessages(data);
    await request(`/api/v1/employee/chat/channels/${selectedId}/read`, {
      method: "POST",
    });
  }, [selectedId]);

  useEffect(() => {
    if (!open) return;
    const initial = window.setTimeout(() => {
      setLoading(true);
      setError("");
      void loadChannels()
        .catch((reason) =>
          setError(
            reason instanceof Error ? reason.message : "Chat is unavailable.",
          ),
        )
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(initial);
  }, [loadChannels, open]);

  useEffect(() => {
    if (!open || !selectedId) return;
    const initial = window.setTimeout(
      () =>
        void loadMessages().catch((reason) =>
          setError(
            reason instanceof Error
              ? reason.message
              : "Messages are unavailable.",
          ),
        ),
      0,
    );
    const timer = window.setInterval(
      () => void loadMessages().catch(() => undefined),
      5_000,
    );
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [loadMessages, open, selectedId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  async function send() {
    const clean = body.trim();
    if (!clean || !selectedId || sending) return;
    setSending(true);
    setError("");
    try {
      const created = await request<Message>(
        `/api/v1/employee/chat/channels/${selectedId}/messages`,
        {
          method: "POST",
          body: JSON.stringify({
            body: clean,
            mentions: [],
            attachmentIds: [],
            clientId: crypto.randomUUID(),
          }),
        },
      );
      setMessages((current) => [...current, created]);
      setBody("");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Message was not sent.",
      );
    } finally {
      setSending(false);
    }
  }

  if (!open) {
    return (
      <Button
        type="button"
        size="lg"
        onClick={() => onOpenChange(true)}
        className="fixed bottom-5 right-5 z-50 h-12 rounded-full border border-[#d5a341]/35 bg-[#0a241c] px-4 text-white shadow-[0_18px_50px_rgba(2,19,14,.28)] hover:bg-[#12382b]"
        aria-label="Open newsroom mini chat"
      >
        <MessageCircleMore />
        Team chat
      </Button>
    );
  }

  const selected = channels.find((channel) => channel.id === selectedId);
  return (
    <section
      className="fixed bottom-4 right-4 z-50 grid h-[min(38rem,calc(100dvh-2rem))] w-[min(24rem,calc(100vw-2rem))] grid-rows-[auto_auto_minmax(0,1fr)_auto] overflow-hidden rounded-2xl border border-white/10 bg-[#0d1713] text-white shadow-[0_28px_90px_rgba(0,0,0,.42)]"
      aria-label="Newsroom mini chat"
    >
      <header className="flex items-center justify-between border-b border-white/10 bg-[#071f18] px-4 py-3">
        <div>
          <p className="text-[0.58rem] font-black uppercase tracking-[0.18em] text-[#d5a341]">
            Live Teamspace
          </p>
          <h2 className="mt-0.5 text-sm font-bold">Newsroom chat</h2>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-white/60 hover:bg-white/10 hover:text-white"
            onClick={onDisable}
            aria-label="Disable floating team chat"
            title="Disable floating chat"
          >
            <Settings2 />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-white/60 hover:bg-white/10 hover:text-white"
            onClick={() => onOpenChange(false)}
            aria-label="Minimize team chat"
          >
            <X />
          </Button>
        </div>
      </header>

      <div className="flex gap-1 overflow-x-auto border-b border-white/10 px-2 py-2">
        {channels.map((channel) => (
          <button
            key={channel.id}
            type="button"
            onClick={() => setSelectedId(channel.id)}
            aria-pressed={channel.id === selectedId}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-transparent px-2.5 py-1.5 text-xs font-semibold text-white/45 transition hover:bg-white/8 hover:text-white aria-pressed:border-[#d5a341]/30 aria-pressed:bg-[#d5a341]/15 aria-pressed:text-[#f5cf80]"
          >
            <Hash className="size-3" />
            {channel.name}
            {channel.unread ? (
              <span className="rounded-full bg-red-600 px-1.5 text-[0.58rem] text-white">
                {channel.unread > 9 ? "9+" : channel.unread}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="min-h-0 overflow-y-auto px-3 py-3">
        {loading ? (
          <div className="grid h-full place-items-center text-xs text-white/45">
            <Loader2 className="mb-2 size-5 animate-spin" />
            Loading Teamspace
          </div>
        ) : error ? (
          <p className="rounded-lg border border-red-400/20 bg-red-500/10 p-3 text-xs text-red-200">
            {error}
          </p>
        ) : !selected ? (
          <p className="grid h-full place-items-center text-xs text-white/42">
            No conversations are available.
          </p>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => (
              <article key={message.id} className="flex gap-2.5">
                <Avatar size="sm">
                  <AvatarFallback className="bg-white/8 text-[0.6rem] text-white">
                    {initials(message.authorName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <p className="truncate text-xs font-bold">
                      {message.authorName}
                    </p>
                    <time className="text-[0.56rem] text-white/30">
                      {new Intl.DateTimeFormat("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      }).format(new Date(message.createdAt))}
                    </time>
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-xs leading-5 text-white/68">
                    {message.deletedAt ? "Message deleted" : message.body}
                  </p>
                </div>
              </article>
            ))}
            <div ref={endRef} />
          </div>
        )}
      </div>

      <footer className="border-t border-white/10 bg-[#071f18] p-3">
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <Input
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={selected ? `Message #${selected.name}` : "Message"}
            disabled={!selected || sending}
            className="border-white/10 bg-white/6 text-white placeholder:text-white/30"
            aria-label="Mini chat message"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!selected || !body.trim() || sending}
            aria-label="Send mini chat message"
          >
            {sending ? <Loader2 className="animate-spin" /> : <Send />}
          </Button>
        </form>
        <Link
          href={cleanStudioPaths ? "/chat" : "/studio/chat"}
          className="mt-2 flex items-center justify-center gap-1.5 text-[0.62rem] font-semibold text-white/38 transition hover:text-white"
        >
          Open full Teamspace <ExternalLink className="size-3" />
        </Link>
      </footer>
    </section>
  );
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as {
    data?: T;
    error?: { message?: string };
  } | null;
  if (!response.ok || payload?.data === undefined) {
    throw new Error(
      payload?.error?.message ?? "Teamspace could not complete the request.",
    );
  }
  return payload.data;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
