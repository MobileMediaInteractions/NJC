import { formatDistanceToNowStrict } from "date-fns";

export function timeAgo(date: string) {
  try {
    return `${formatDistanceToNowStrict(new Date(date))} ago`;
  } catch {
    return "Recently";
  }
}

export function formatStoryDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
    timeZoneName: "short",
  }).format(new Date(date));
}
