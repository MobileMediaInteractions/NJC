import type { StoryStatus } from "@/lib/types";

export type StoryQueueTab = "active" | "drafts" | "submitted" | "scheduled" | "complete" | "archived";

export interface StoryQueueItem {
  status: StoryStatus;
  isActive: boolean;
}

export const storyQueueTabs: ReadonlyArray<{ value: StoryQueueTab; label: string }> = [
  { value: "active", label: "Active" },
  { value: "drafts", label: "Drafts" },
  { value: "submitted", label: "Submitted" },
  { value: "scheduled", label: "Scheduled" },
  { value: "complete", label: "Published" },
  { value: "archived", label: "Archived" },
];

export function storyMatchesQueueTab(story: StoryQueueItem, tab: StoryQueueTab) {
  if (tab === "active") {
    return story.status !== "archived" && (story.status !== "published" || story.isActive);
  }
  if (tab === "drafts") return story.status === "idea" || story.status === "assigned" || story.status === "draft";
  if (tab === "submitted") return story.status === "review";
  if (tab === "scheduled") return story.status === "scheduled";
  if (tab === "complete") return story.status === "published";
  return story.status === "archived";
}

export function countStoriesByQueueTab(stories: StoryQueueItem[]) {
  return Object.fromEntries(
    storyQueueTabs.map((tab) => [tab.value, stories.filter((story) => storyMatchesQueueTab(story, tab.value)).length]),
  ) as Record<StoryQueueTab, number>;
}
