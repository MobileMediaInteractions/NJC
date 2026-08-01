import type { StaffRole, StoryStatus } from "@harborline/contracts";

export type PublicationJobState =
  | "queued"
  | "due"
  | "publishing"
  | "published"
  | "cancelled"
  | "blocked"
  | "failed";

export function canApproveStory(input: {
  role: StaffRole;
  storyStatus: StoryStatus;
  viewerUserId?: string;
  authorId: string | null;
}) {
  return (
    (input.role === "admin" || input.role === "editor" || input.role === "producer") &&
    input.storyStatus === "review" &&
    Boolean(input.viewerUserId) &&
    input.viewerUserId !== input.authorId
  );
}

export function canScheduleApprovedStory(
  role: StaffRole,
  status: StoryStatus,
  hasActiveApproval: boolean,
) {
  return (
    (role === "admin" || role === "editor" || role === "producer") &&
    status === "review" &&
    hasActiveApproval
  );
}

export function isDue(scheduledAt: Date, now: Date) {
  return scheduledAt.getTime() <= now.getTime();
}

export function utcSchedulePreview(value: Date) {
  return value.toISOString().replace(".000Z", "Z");
}
