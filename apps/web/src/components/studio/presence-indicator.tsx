import { Laptop, Monitor, Smartphone, Tablet, type LucideIcon } from "lucide-react";
import {
  formatPresenceLastSeen,
  type EmployeePresencePlatform,
  type EmployeePresenceStatus,
} from "@/lib/employee-presence";
import { cn } from "@/lib/utils";

const statusPresentation: Record<EmployeePresenceStatus, { label: string; dot: string }> = {
  online: { label: "Online", dot: "bg-emerald-500" },
  away: { label: "Away", dot: "bg-orange-400" },
  dnd: { label: "Do not disturb", dot: "bg-red-500" },
  offline: { label: "Offline", dot: "bg-zinc-500" },
};

const platformPresentation: Record<EmployeePresencePlatform, { label: string; icon: LucideIcon }> = {
  web: { label: "Web browser", icon: Monitor },
  ios: { label: "iPhone or iPad", icon: Smartphone },
  android: { label: "Android mobile", icon: Smartphone },
  macos: { label: "Mac", icon: Laptop },
  windows: { label: "Windows computer", icon: Monitor },
  linux: { label: "Linux computer", icon: Monitor },
  unknown: { label: "Unknown device", icon: Tablet },
};

export function PresenceIndicator({
  status,
  platform,
  lastSeenAt,
  compact = false,
}: {
  status: EmployeePresenceStatus;
  platform: EmployeePresencePlatform;
  lastSeenAt: Date | string | null;
  compact?: boolean;
}) {
  const state = statusPresentation[status];
  const device = platformPresentation[platform];
  const PlatformIcon = device.icon;
  const detail = status === "offline" ? formatPresenceLastSeen(lastSeenAt) : state.label;

  return (
    <span className="inline-flex min-w-0 items-center gap-2" title={`${state.label} · ${device.label} · ${formatPresenceLastSeen(lastSeenAt)}`}>
      <span className={cn("size-2.5 shrink-0 rounded-full ring-2 ring-background", state.dot)} aria-hidden="true" />
      {!compact ? <span className="truncate text-xs text-muted-foreground">{detail}</span> : null}
      <PlatformIcon className="size-3.5 shrink-0 text-muted-foreground" aria-label={device.label} />
      <span className="sr-only">{state.label} on {device.label}. {formatPresenceLastSeen(lastSeenAt)}</span>
    </span>
  );
}

export function presenceStatusLabel(status: EmployeePresenceStatus) {
  return statusPresentation[status].label;
}
