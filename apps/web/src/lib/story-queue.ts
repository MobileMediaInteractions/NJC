import type { StoryStatus } from "@/lib/types";

export type StoryQueueTab = "all" | "drafts" | "submitted" | "scheduled" | "complete" | "archived";

export const storyQueueTabs: ReadonlyArray<{ value: StoryQueueTab; label: string }> = [
  { value: "all", label: "All" },
  { value: "drafts", label: "Drafts" },
  { value: "submitted", label: "Submitted" },
  { value: "scheduled", label: "Scheduled" },
  { value: "complete", label: "Published" },
  { value: "archived", label: "Archived" },
];

export function storyMatchesQueueTab(status: StoryStatus, tab: StoryQueueTab) {
  if (tab === "all") return true;
  if (tab === "drafts") return status === "idea" || status === "assigned" || status === "draft";
  if (tab === "submitted") return status === "review";
  if (tab === "scheduled") return status === "scheduled";
  if (tab === "complete") return status === "published";
  return status === "archived";
}

export function countStoriesByQueueTab(statuses: StoryStatus[]) {
  return Object.fromEntries(
    storyQueueTabs.map((tab) => [tab.value, statuses.filter((status) => storyMatchesQueueTab(status, tab.value)).length]),
  ) as Record<StoryQueueTab, number>;
}
