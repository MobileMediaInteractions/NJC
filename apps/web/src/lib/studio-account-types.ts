import type { StaffRole } from "@harborline/contracts";

export const managedStaffRoles = [
  "admin",
  "editor",
  "producer",
  "reporter",
  "contributor",
] as const satisfies readonly StaffRole[];

export type StudioAccountSummary = {
  id: string;
  displayName: string;
  primaryEmail: string | null;
  imageUrl: string;
  role: StaffRole | null;
  title: string | null;
  status: "active" | "banned" | "locked";
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
  lastActiveAt: string | null;
};

export type StudioAccountProfile = StudioAccountSummary & {
  firstName: string;
  lastName: string;
  username: string | null;
  externalId: string | null;
  locale: string | null;
  passwordEnabled: boolean;
  totpEnabled: boolean;
  backupCodeEnabled: boolean;
  legalAcceptedAt: string | null;
  lastSignInAt: string | null;
  updatedAt: string;
  emails: Array<{
    id: string;
    address: string;
    primary: boolean;
    verificationStatus: string;
    verificationStrategy: string | null;
  }>;
  phoneNumbers: Array<{
    id: string;
    number: string;
    primary: boolean;
    verificationStatus: string;
    reservedForSecondFactor: boolean;
  }>;
  externalAccounts: Array<{
    id: string;
    provider: string;
    emailAddress: string;
    username: string | null;
    verificationStatus: string;
  }>;
  databaseProfile: {
    id: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  } | null;
};

export type StudioAccountPage = {
  accounts: StudioAccountSummary[];
  totalCount: number;
  page: number;
  pageSize: number;
  pageCount: number;
};
