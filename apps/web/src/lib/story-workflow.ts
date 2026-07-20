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
  if (current === "review" && (next === "draft" || next === "published")) {
    return canPublishStory(role);
  }
  return false;
}
