import type { StoryNoteType } from "@harborline/contracts";

export const STORY_NOTE_MAX_CHARACTERS = 1_200;

export const storyNoteTypes = [
  {
    value: "editors_note",
    label: "Editor’s Note",
    description: "Editorial context, disclosure or an important newsroom decision.",
  },
  {
    value: "reporting_note",
    label: "Reporting Note",
    description: "How the reporting, sourcing, methodology or verification was handled.",
  },
  {
    value: "update_note",
    label: "Update Note",
    description: "A clear explanation of a meaningful addition or update to the story.",
  },
] as const satisfies ReadonlyArray<{
  value: StoryNoteType;
  label: string;
  description: string;
}>;

export function storyNoteLabel(type: StoryNoteType) {
  return storyNoteTypes.find((option) => option.value === type)?.label ?? "Story Note";
}

export function isStoryNoteType(value: unknown): value is StoryNoteType {
  return storyNoteTypes.some((option) => option.value === value);
}
