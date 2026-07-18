export type {
  Author,
  StaffRole,
  Story,
  StoryStatus,
  WeatherSnapshot,
} from "@harborline/contracts";

import type { StaffRole } from "@harborline/contracts";

export interface StudioUser {
  id: string;
  databaseId?: string;
  name: string;
  email: string;
  role: StaffRole;
}
