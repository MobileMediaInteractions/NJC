"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, BellRing, Check, MessageCircleMore } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  detectBrowserPresencePlatform,
  employeePresenceStatuses,
  type EmployeePresenceStatus,
} from "@/lib/employee-presence";

type EmployeeBootstrap = {
  channels: Array<{ id: string; unread: number }>;
  unreadNotifications: number;
};

type EmployeeNotification = {
  id: string;
  title: string;
  body: string;
  destination: string | null;
  readAt: string | null;
  createdAt: string;
};

export function useStudioCommunication({ enabled, initialUnread }: { enabled: boolean; initialUnread: number }) {
  const [unreadChat, setUnreadChat] = useState(initialUnread);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [notifications, setNotifications] = useState<EmployeeNotification[]>([]);
  const [status, setStatusState] = useState<EmployeePresenceStatus>(() => {
    if (typeof window === "undefined") return "online";
    const saved = window.localStorage.getItem("njc:studio:presence");
    return saved && employeePresenceStatuses.includes(saved as EmployeePresenceStatus) ? saved as EmployeePresenceStatus : "online";
  });
  const initializedNotifications = useRef(false);
  const seenNotificationIds = useRef(new Set<string>());

  const heartbeat = useCallback(async (nextStatus: EmployeePresenceStatus = status) => {
    if (!enabled) return;
    const platform = detectBrowserPresencePlatform(navigator.userAgent);
    await fetch("/api/v1/employee/chat/presence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus, platform }),
      keepalive: true,
    }).catch(() => undefined);
  }, [enabled, status]);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    const [bootstrapResponse, notificationsResponse] = await Promise.all([
      fetch("/api/v1/employee/bootstrap", { cache: "no-store" }),
      fetch("/api/v1/employee/notifications", { cache: "no-store" }),
    ]).catch(() => [null, null] as const);
    if (bootstrapResponse?.ok) {
      const payload = await bootstrapResponse.json() as { data: EmployeeBootstrap };
      setUnreadChat(payload.data.channels.reduce((total, channel) => total + Number(channel.unread || 0), 0));
      setUnreadNotifications(Number(payload.data.unreadNotifications || 0));
    }
    if (notificationsResponse?.ok) {
      const payload = await notificationsResponse.json() as { data: EmployeeNotification[] };
      const next = payload.data;
      if (initializedNotifications.current && status !== "dnd" && typeof Notification !== "undefined" && Notification.permission === "granted") {
        for (const item of next.filter((entry) => !entry.readAt && !seenNotificationIds.current.has(entry.id))) {
          const alert = new Notification(item.title, { body: item.body, tag: item.id, icon: "/icon" });
          alert.onclick = () => { window.focus(); window.location.assign(studioNotificationDestination(item.destination)); };
        }
      }
      for (const item of next) seenNotificationIds.current.add(item.id);
      initializedNotifications.current = true;
      setNotifications(next);
    }
  }, [enabled, status]);

  useEffect(() => {
    if (!enabled) return;
    const initial = window.setTimeout(() => void refresh(), 0);
    const refreshTimer = window.setInterval(() => void refresh(), 10_000);
    return () => { window.clearTimeout(initial); window.clearInterval(refreshTimer); };
  }, [enabled, refresh]);

  useEffect(() => {
    if (!enabled) return;
    void heartbeat();
    const timer = window.setInterval(() => void heartbeat(), 30_000);
    const onVisibility = () => void heartbeat(document.hidden && status === "online" ? "away" : status);
    const onPageHide = () => void heartbeat("offline");
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [enabled, heartbeat, status]);

  const setStatus = useCallback((next: EmployeePresenceStatus) => {
    setStatusState(next);
    window.localStorage.setItem("njc:studio:presence", next);
    void heartbeat(next);
  }, [heartbeat]);

  const markNotificationRead = useCallback(async (item: EmployeeNotification) => {
    await fetch("/api/v1/employee/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id }) });
    setNotifications((current) => current.map((entry) => entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry));
    setUnreadNotifications((current) => Math.max(0, current - (item.readAt ? 0 : 1)));
    window.location.assign(studioNotificationDestination(item.destination));
  }, []);

  return { unreadChat, unreadNotifications, notifications, status, setStatus, markNotificationRead, refresh };
}

export function StudioCommunicationControls({
  enabled,
  unreadNotifications,
  notifications,
  status,
  setStatus,
  markNotificationRead,
}: {
  enabled: boolean;
  unreadNotifications: number;
  notifications: EmployeeNotification[];
  status: EmployeePresenceStatus;
  setStatus: (status: EmployeePresenceStatus) => void;
  markNotificationRead: (item: EmployeeNotification) => Promise<void>;
}) {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() => typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  if (!enabled) return null;

  return (
    <div className="flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Activity status: ${status}`}>
            <span className={`size-2.5 rounded-full ${status === "online" ? "bg-emerald-500" : status === "away" ? "bg-orange-400" : status === "dnd" ? "bg-red-500" : "bg-zinc-500"}`} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel>Your activity status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {employeePresenceStatuses.map((option) => <DropdownMenuItem key={option} onSelect={() => setStatus(option)} className="capitalize"><span className={`size-2 rounded-full ${option === "online" ? "bg-emerald-500" : option === "away" ? "bg-orange-400" : option === "dnd" ? "bg-red-500" : "bg-zinc-500"}`} />{option === "dnd" ? "Do not disturb" : option}{option === status ? <Check className="ml-auto" /> : null}</DropdownMenuItem>)}
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" className="relative" aria-label={`${unreadNotifications} unread team notifications`}>
            {unreadNotifications ? <BellRing /> : <Bell />}
            {unreadNotifications ? <span className="absolute -right-1 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[0.6rem] font-black leading-4 text-white">{formatUnread(unreadNotifications)}</span> : null}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 p-2">
          <DropdownMenuLabel className="flex items-center gap-2"><MessageCircleMore className="size-4" /> Team notifications</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {permission === "default" ? <DropdownMenuItem onSelect={() => void Notification.requestPermission().then(setPermission)}><BellRing /> Enable desktop alerts</DropdownMenuItem> : null}
          {notifications.length ? notifications.slice(0, 8).map((item) => <DropdownMenuItem key={item.id} onSelect={() => void markNotificationRead(item)} className="flex-col items-start gap-1 p-2"><span className="flex w-full items-center gap-2 font-semibold">{!item.readAt ? <span className="size-2 shrink-0 rounded-full bg-red-500" /> : null}{item.title}</span><span className="line-clamp-2 text-xs text-muted-foreground">{item.body}</span></DropdownMenuItem>) : <p className="px-2 py-5 text-center text-xs text-muted-foreground">No team notifications yet.</p>}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function formatUnread(value: number) {
  return value > 9 ? "9+" : String(value);
}

function studioNotificationDestination(destination: string | null) {
  const match = destination?.match(/\/v1\/chat\/channel\/([0-9a-f-]{36})/i);
  return match?.[1] ? `/studio/chat?channel=${encodeURIComponent(match[1])}` : "/studio/chat";
}
