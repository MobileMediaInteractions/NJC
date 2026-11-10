import type { StaffRole, StoryStatus } from "@harborline/contracts";

export type PublicationJobState =
  | "queued"
  | "due"
  | "publishing"
  | "published"
  | "cancelled"
  | "blocked"
  | "failed";

/** A per-account exception; a publishing role and a synchronized account are still required. */
export function canSelfPublishStory(role: StaffRole, viewerUserId: string | undefined, allowedUserIds: readonly string[]) {
  return Boolean(viewerUserId && allowedUserIds.includes(viewerUserId) &&
    (role === "admin" || role === "editor" || role === "producer"));
}

export function canPublishReviewedStory(input: {
  role: StaffRole;
  viewerUserId?: string;
  authorId: string | null;
  allowedUserIds: readonly string[];
  hasActiveApproval: boolean;
}) {
  if (!input.viewerUserId || !input.hasActiveApproval ||
      !["admin", "editor", "producer"].includes(input.role)) return false;
  return input.viewerUserId !== input.authorId ||
    canSelfPublishStory(input.role, input.viewerUserId, input.allowedUserIds);
}

export function canApproveStory(input: {
  role: StaffRole;
  storyStatus: StoryStatus;
  viewerUserId?: string;
  authorId: string | null;
  allowSelfApproval?: boolean;
}) {
  return (
    (input.role === "admin" || input.role === "editor" || input.role === "producer") &&
    input.storyStatus === "review" &&
    Boolean(input.viewerUserId) &&
    (input.viewerUserId !== input.authorId || input.allowSelfApproval === true)
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
