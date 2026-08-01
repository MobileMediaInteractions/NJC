import type { StaffRole, StoryStatus } from "@/lib/types";

export function canPublishStory(role: StaffRole) {
  return role === "admin" || role === "editor" || role === "producer";
}

export function canTransitionStoryStatus(
  current: StoryStatus,
  next: StoryStatus,
  role: StaffRole,
  isOwner = false,
) {
  if (current === "draft" && next === "review") {
    return isOwner || canPublishStory(role);
  }
  if (current === "review" && next === "draft") {
    return canPublishStory(role);
  }
  return false;
}

export function isValidScheduledPublication(
  scheduledAt: Date,
  now = new Date(),
) {
  return (
    !Number.isNaN(scheduledAt.getTime()) &&
    scheduledAt.getTime() >= now.getTime() + 60_000
  );
}
