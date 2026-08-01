import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const staffRole = pgEnum("staff_role", [
  "admin",
  "editor",
  "producer",
  "reporter",
  "contributor",
]);

export const storyStatus = pgEnum("story_status", [
  "idea",
  "assigned",
  "draft",
  "review",
  "scheduled",
  "published",
  "archived",
]);

export const commentStatus = pgEnum("comment_status", [
  "pending",
  "approved",
  "rejected",
  "flagged",
]);

export const employeeAccessRequestStatus = pgEnum(
  "employee_access_request_status",
  ["pending", "approved", "denied", "cancelled", "expired", "revoked"],
);

export const employeeChannelKind = pgEnum("employee_channel_kind", [
  "public",
  "private",
  "direct",
  "group",
]);

export const platformLicenseKind = pgEnum("platform_license_kind", ["commercial", "trial", "development", "first_party"]);
export const platformLicenseStatus = pgEnum("platform_license_status", ["active", "suspended", "revoked", "expired"]);
export const platformEnvironment = pgEnum("platform_environment", ["development", "preview", "staging", "production"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkId: text("clerk_id").notNull(),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    role: staffRole("role").notNull().default("contributor"),
    title: text("title"),
    bio: text("bio"),
    pseudonym: text("pseudonym"),
    pseudonymNormalized: text("pseudonym_normalized"),
    pseudonymEnabled: boolean("pseudonym_enabled").notNull().default(true),
    pseudonymModerationStatus: text("pseudonym_moderation_status")
      .notNull()
      .default("active"),
    pseudonymModerationReason: text("pseudonym_moderation_reason"),
    pseudonymModeratedByClerkId: text("pseudonym_moderated_by_clerk_id"),
    pseudonymModeratedAt: timestamp("pseudonym_moderated_at", {
      withTimezone: true,
    }),
    pseudonymRevision: integer("pseudonym_revision").notNull().default(0),
    pseudonymUpdatedAt: timestamp("pseudonym_updated_at", {
      withTimezone: true,
    }),
    publicSlug: text("public_slug"),
    publicProfilePublishedAt: timestamp("public_profile_published_at", {
      withTimezone: true,
    }),
    avatarUrl: text("avatar_url"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("users_clerk_id_idx").on(table.clerkId),
    uniqueIndex("users_email_idx").on(table.email),
    uniqueIndex("users_public_slug_idx").on(table.publicSlug),
    uniqueIndex("users_pseudonym_normalized_idx")
      .on(table.pseudonymNormalized)
      .where(sql`${table.pseudonymNormalized} is not null`),
    check("users_pseudonym_moderation_status_check", sql`${table.pseudonymModerationStatus} in ('active', 'disabled', 'correction_required')`),
  ],
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    color: text("color"),
    sortOrder: integer("sort_order").notNull().default(0),
    isVisible: boolean("is_visible").notNull().default(true),
  },
  (table) => [uniqueIndex("categories_slug_idx").on(table.slug)],
);

export const stories = pgTable(
  "stories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    headline: text("headline").notNull(),
    dek: text("dek").notNull().default(""),
    body: jsonb("body").$type<string[]>().notNull().default([]),
    whyItMatters: text("why_it_matters"),
    categorySlug: text("category_slug").notNull().default("local"),
    categoryLabel: text("category_label").notNull().default("Local"),
    location: text("location").notNull().default("Middlesex County"),
    status: storyStatus("status").notNull().default("draft"),
    authorId: uuid("author_id").references(() => users.id, {
      onDelete: "set null",
    }),
    authorSnapshot: jsonb("author_snapshot").$type<{
      id: string;
      name: string;
      role: string;
      initials: string;
      avatar?: string;
    }>(),
    publicBylineSnapshot: jsonb("public_byline_snapshot").$type<{
      mode: "account" | "pseudonym";
      name: string;
      initials: string;
      role: string;
      avatar?: string;
      profileSlug?: string;
      pseudonymRevision?: number;
    }>(),
    publicBylinesSnapshot: jsonb("public_bylines_snapshot").$type<Array<{
      userId: string;
      mode: "account" | "pseudonym";
      name: string;
      initials: string;
      role: string;
      avatar?: string;
      profileSlug?: string;
      pseudonymRevision?: number;
    }>>().notNull().default([]),
    contentVersion: integer("content_version").notNull().default(1),
    contentHash: text("content_hash"),
    imageUrl: text("image_url"),
    imageAlt: text("image_alt"),
    videoUrl: text("video_url"),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    canonicalUrl: text("canonical_url"),
    noIndex: boolean("no_index").notNull().default(false),
    readingMinutes: integer("reading_minutes").notNull().default(1),
    isBreaking: boolean("is_breaking").notNull().default(false),
    isLive: boolean("is_live").notNull().default(false),
    isExclusive: boolean("is_exclusive").notNull().default(false),
    isDeveloping: boolean("is_developing").notNull().default(false),
    isActive: boolean("is_active").notNull().default(false),
    editingClosedAt: timestamp("editing_closed_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("stories_slug_idx").on(table.slug),
    index("stories_status_published_idx").on(table.status, table.publishedAt),
    index("stories_category_idx").on(table.categorySlug, table.publishedAt),
    check("stories_content_version_positive_check", sql`${table.contentVersion} > 0`),
  ],
);

export const storyAuthors = pgTable(
  "story_authors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storyId: uuid("story_id").notNull().references(() => stories.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    position: integer("position").notNull().default(0),
    bylineMode: text("byline_mode").notNull().default("account"),
    addedByClerkId: text("added_by_clerk_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("story_authors_story_user_idx").on(table.storyId, table.userId),
    index("story_authors_story_position_idx").on(table.storyId, table.position),
    check("story_authors_byline_mode_check", sql`${table.bylineMode} in ('account', 'pseudonym')`),
  ],
);

export const pseudonymModerationEvents = pgTable(
  "pseudonym_moderation_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    actorClerkId: text("actor_clerk_id").notNull(),
    action: text("action").notNull(),
    reason: text("reason").notNull(),
    previousStatus: text("previous_status").notNull(),
    nextStatus: text("next_status").notNull(),
    pseudonymRevision: integer("pseudonym_revision").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("pseudonym_moderation_user_idx").on(table.userId, table.createdAt),
    check("pseudonym_moderation_action_check", sql`${table.action} in ('disable', 'restore', 'require_correction')`),
    check("pseudonym_moderation_previous_status_check", sql`${table.previousStatus} in ('active', 'disabled', 'correction_required')`),
    check("pseudonym_moderation_next_status_check", sql`${table.nextStatus} in ('active', 'disabled', 'correction_required')`),
  ],
);

export const storyApprovals = pgTable(
  "story_approvals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storyId: uuid("story_id").notNull().references(() => stories.id, { onDelete: "cascade" }),
    contentVersion: integer("content_version").notNull(),
    contentHash: text("content_hash").notNull(),
    approvedById: uuid("approved_by_id").references(() => users.id, { onDelete: "set null" }),
    approvedByClerkId: text("approved_by_clerk_id").notNull(),
    note: text("note"),
    approvedAt: timestamp("approved_at", { withTimezone: true }).notNull().defaultNow(),
    invalidatedAt: timestamp("invalidated_at", { withTimezone: true }),
    invalidatedByClerkId: text("invalidated_by_clerk_id"),
    invalidationReason: text("invalidation_reason"),
  },
  (table) => [
    index("story_approvals_story_idx").on(table.storyId, table.approvedAt),
    uniqueIndex("story_approvals_one_active_idx").on(table.storyId).where(sql`${table.invalidatedAt} is null`),
  ],
);

export const storyPublicationJobs = pgTable(
  "story_publication_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storyId: uuid("story_id").notNull().references(() => stories.id, { onDelete: "cascade" }),
    approvalId: uuid("approval_id").notNull().references(() => storyApprovals.id, { onDelete: "restrict" }),
    status: text("status").notNull().default("queued"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    originalScheduledAt: timestamp("original_scheduled_at", { withTimezone: true }).notNull(),
    contentHash: text("content_hash").notNull(),
    attemptCount: integer("attempt_count").notNull().default(0),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    lastErrorCode: text("last_error_code"),
    lastErrorMessage: text("last_error_message"),
    createdByClerkId: text("created_by_clerk_id").notNull(),
    updatedByClerkId: text("updated_by_clerk_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("story_publication_jobs_due_idx").on(table.status, table.scheduledAt),
    uniqueIndex("story_publication_jobs_one_open_idx")
      .on(table.storyId)
      .where(sql`${table.status} in ('queued', 'publishing', 'blocked', 'failed')`),
    check("story_publication_jobs_status_check", sql`${table.status} in ('queued', 'publishing', 'published', 'cancelled', 'blocked', 'failed')`),
  ],
);

export const storyRevisions = pgTable(
  "story_revisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    editorId: uuid("editor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    version: integer("version").notNull(),
    snapshot: jsonb("snapshot").notNull(),
    note: text("note"),
    reviewStatus: text("review_status").notNull().default("applied"),
    baseVersion: integer("base_version"),
    reviewedById: uuid("reviewed_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewNote: text("review_note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("story_revisions_story_idx").on(table.storyId),
    index("story_revisions_review_queue_idx").on(
      table.storyId,
      table.reviewStatus,
      table.createdAt,
    ),
    uniqueIndex("story_revisions_one_pending_idx")
      .on(table.storyId)
      .where(sql`${table.reviewStatus} = 'pending'`),
    check(
      "story_revisions_review_status_check",
      sql`${table.reviewStatus} in ('applied', 'pending', 'rejected', 'superseded')`,
    ),
  ],
);

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    blobUrl: text("blob_url").notNull(),
    pathname: text("pathname").notNull(),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(),
    width: integer("width"),
    height: integer("height"),
    altText: text("alt_text"),
    credit: text("credit"),
    copyright: text("copyright"),
    license: text("license"),
    source: text("source").notNull().default("studio"),
    extension: text("extension"),
    sha256: text("sha256"),
    durationMs: integer("duration_ms"),
    processingStatus: text("processing_status").notNull().default("ready"),
    visibility: text("visibility").notNull().default("public"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    uploadedById: uuid("uploaded_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    uploadedBySnapshot: jsonb("uploaded_by_snapshot").$type<{
      clerkId: string;
      name: string;
    }>(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("media_pathname_idx").on(table.pathname),
    index("media_type_created_idx").on(table.mimeType, table.createdAt),
    index("media_deleted_created_idx").on(table.deletedAt, table.createdAt),
    index("media_sha256_idx").on(table.sha256),
  ],
);

export const mediaAssetUsages = pgTable(
  "media_asset_usages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => mediaAssets.id, { onDelete: "restrict" }),
    product: text("product").notNull().default("courier"),
    ownerType: text("owner_type").notNull(),
    ownerId: text("owner_id").notNull(),
    field: text("field").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("media_asset_usage_unique_idx").on(
      table.assetId,
      table.product,
      table.ownerType,
      table.ownerId,
      table.field,
    ),
    index("media_asset_usage_owner_idx").on(table.product, table.ownerType, table.ownerId),
  ],
);

export const distributionFiles = pgTable(
  "distribution_files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pathname: text("pathname").notNull(),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(),
    sha256: text("sha256"),
    width: integer("width"),
    height: integer("height"),
    durationMs: integer("duration_ms"),
    processingStatus: text("processing_status").notNull().default("ready"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    uploadedByClerkId: text("uploaded_by_clerk_id").notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("distribution_files_pathname_idx").on(table.pathname),
    index("distribution_files_type_size_idx").on(table.mimeType, table.size),
    index("distribution_files_created_idx").on(table.createdAt),
    check("distribution_files_positive_size_check", sql`${table.size} > 0`),
    check(
      "distribution_files_dimensions_check",
      sql`(${table.width} is null or ${table.width} > 0) and (${table.height} is null or ${table.height} > 0)`,
    ),
    check(
      "distribution_files_duration_check",
      sql`${table.durationMs} is null or ${table.durationMs} >= 0`,
    ),
    check(
      "distribution_files_processing_status_check",
      sql`${table.processingStatus} in ('pending', 'ready', 'failed', 'quarantined')`,
    ),
  ],
);

export const distributionPackages = pgTable(
  "distribution_packages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    status: text("status").notNull().default("draft"),
    availableAt: timestamp("available_at", { withTimezone: true }),
    embargoAt: timestamp("embargo_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    downloadPolicy: text("download_policy").notNull().default("view_only"),
    termsText: text("terms_text").notNull().default(""),
    createdByClerkId: text("created_by_clerk_id").notNull(),
    updatedByClerkId: text("updated_by_clerk_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("distribution_packages_slug_idx").on(table.slug),
    index("distribution_packages_status_idx").on(table.status, table.updatedAt),
    check(
      "distribution_packages_status_check",
      sql`${table.status} in ('draft', 'available', 'expired', 'revoked', 'archived')`,
    ),
    check(
      "distribution_packages_download_policy_check",
      sql`${table.downloadPolicy} in ('view_only', 'grant_controlled', 'download')`,
    ),
    check(
      "distribution_packages_dates_check",
      sql`${table.expiresAt} is null or ${table.availableAt} is null or ${table.expiresAt} > ${table.availableAt}`,
    ),
  ],
);

export const distributionPackageItems = pgTable(
  "distribution_package_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    packageId: uuid("package_id")
      .notNull()
      .references(() => distributionPackages.id, { onDelete: "cascade" }),
    fileId: uuid("file_id").references(() => distributionFiles.id, {
      onDelete: "restrict",
    }),
    storyId: uuid("story_id").references(() => stories.id, {
      onDelete: "restrict",
    }),
    storySnapshot: jsonb("story_snapshot").$type<{
      headline: string;
      dek: string;
      body: string[];
      categoryLabel: string;
      sourceUpdatedAt: string;
      capturedAt: string;
    }>(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("distribution_package_asset_idx").on(
      table.packageId,
      table.fileId,
    ),
    uniqueIndex("distribution_package_story_idx").on(
      table.packageId,
      table.storyId,
    ),
    index("distribution_package_items_order_idx").on(
      table.packageId,
      table.sortOrder,
    ),
    check(
      "distribution_package_items_single_source_check",
      sql`num_nonnulls(${table.fileId}, ${table.storyId}) = 1`,
    ),
    check(
      "distribution_package_items_story_snapshot_check",
      sql`${table.storyId} is null or ${table.storySnapshot} is not null`,
    ),
  ],
);

export const distributionGrants = pgTable(
  "distribution_grants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    packageId: uuid("package_id")
      .notNull()
      .references(() => distributionPackages.id, { onDelete: "cascade" }),
    userClerkId: text("user_clerk_id").notNull(),
    grantedByClerkId: text("granted_by_clerk_id").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    downloadAllowed: boolean("download_allowed").notNull().default(false),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("distribution_grants_package_user_idx").on(
      table.packageId,
      table.userClerkId,
    ),
    index("distribution_grants_user_active_idx").on(
      table.userClerkId,
      table.revokedAt,
      table.expiresAt,
    ),
    check(
      "distribution_grants_dates_check",
      sql`${table.expiresAt} is null or ${table.expiresAt} > ${table.startsAt}`,
    ),
  ],
);

export const distributionPlaybackProgress = pgTable(
  "distribution_playback_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userClerkId: text("user_clerk_id").notNull(),
    fileId: uuid("file_id")
      .notNull()
      .references(() => distributionFiles.id, { onDelete: "cascade" }),
    positionMs: integer("position_ms").notNull().default(0),
    durationMs: integer("duration_ms").notNull().default(0),
    completed: boolean("completed").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("distribution_progress_user_file_idx").on(
      table.userClerkId,
      table.fileId,
    ),
    index("distribution_progress_updated_idx").on(
      table.userClerkId,
      table.updatedAt,
    ),
    check(
      "distribution_progress_values_check",
      sql`${table.positionMs} >= 0 and ${table.durationMs} >= 0 and (${table.durationMs} = 0 or ${table.positionMs} <= ${table.durationMs})`,
    ),
  ],
);

export const distributionAuditLogs = pgTable(
  "distribution_audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorClerkId: text("actor_clerk_id").notNull(),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    ipHash: text("ip_hash"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("distribution_audit_actor_idx").on(
      table.actorClerkId,
      table.createdAt,
    ),
    index("distribution_audit_target_idx").on(
      table.targetType,
      table.targetId,
      table.createdAt,
    ),
  ],
);

export const distributionUserLibrary = pgTable(
  "distribution_user_library",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userClerkId: text("user_clerk_id").notNull(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => distributionPackageItems.id, { onDelete: "cascade" }),
    collection: text("collection").notNull().default("Saved"),
    favorite: boolean("favorite").notNull().default(false),
    addedAt: timestamp("added_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("distribution_user_library_user_item_idx").on(
      table.userClerkId,
      table.itemId,
    ),
    index("distribution_user_library_collection_idx").on(
      table.userClerkId,
      table.collection,
    ),
    check(
      "distribution_user_library_collection_check",
      sql`length(btrim(${table.collection})) > 0`,
    ),
  ],
);

export const assignments = pgTable(
  "assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    description: text("description"),
    assigneeId: uuid("assignee_id").references(() => users.id, {
      onDelete: "set null",
    }),
    storyId: uuid("story_id").references(() => stories.id, {
      onDelete: "set null",
    }),
    dueAt: timestamp("due_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("assignments_assignee_idx").on(table.assigneeId)],
);

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id"),
    authorName: text("author_name").notNull(),
    authorEmail: text("author_email").notNull(),
    body: text("body").notNull(),
    status: commentStatus("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("comments_story_status_idx").on(table.storyId, table.status)],
);

export const newsletterSubscribers = pgTable(
  "newsletter_subscribers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    lists: jsonb("lists").$type<string[]>().notNull().default(["daily-brief"]),
    isActive: boolean("is_active").notNull().default(true),
    source: text("source").notNull().default("website"),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("newsletter_email_idx").on(table.email)],
);

export const alerts = pgTable(
  "alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    severity: text("severity").notNull().default("info"),
    link: text("link"),
    regions: jsonb("regions").$type<string[]>().notNull().default([]),
    isActive: boolean("is_active").notNull().default(true),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdById: uuid("created_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("alerts_active_idx").on(table.isActive, table.expiresAt)],
);

export const liveEvents = pgTable(
  "live_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    streamUrl: text("stream_url"),
    isLive: boolean("is_live").notNull().default(false),
    startedAt: timestamp("started_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("live_events_slug_idx").on(table.slug)],
);

export const newsTips = pgTable(
  "news_tips",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name"),
    email: text("email"),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    status: text("status").notNull().default("new"),
    source: text("source").notNull().default("website"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("news_tips_status_idx").on(table.status, table.createdAt)],
);

export interface TwentyUnderTwentyHonoreeSnapshot {
  name: string;
  school: string;
  city: string;
  county: string;
  bio: string;
  quote?: string;
  photoUrl?: string;
}

export const twentyUnderTwentyPrograms = pgTable(
  "twenty_under_twenty_programs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    year: integer("year").notNull(),
    status: text("status").notNull().default("draft"),
    title: text("title").notNull().default("20 Under 20"),
    description: text("description").notNull().default(""),
    eligibilitySummary: text("eligibility_summary").notNull().default("New Jersey high school students under 20"),
    ageLimit: integer("age_limit").notNull().default(20),
    classSize: integer("class_size").notNull().default(20),
    nominationOpensAt: timestamp("nomination_opens_at", { withTimezone: true }),
    nominationClosesAt: timestamp("nomination_closes_at", { withTimezone: true }),
    applicationOpensAt: timestamp("application_opens_at", { withTimezone: true }),
    applicationClosesAt: timestamp("application_closes_at", { withTimezone: true }),
    eventAt: timestamp("event_at", { withTimezone: true }),
    eventLocation: text("event_location"),
    keynoteSpeaker: text("keynote_speaker"),
    createdByClerkId: text("created_by_clerk_id").notNull(),
    updatedByClerkId: text("updated_by_clerk_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("twenty_under_twenty_program_year_idx").on(table.year),
    index("twenty_under_twenty_program_status_idx").on(table.status, table.year),
    check("twenty_under_twenty_program_status_check", sql`${table.status} in ('draft', 'nominations_open', 'applications_open', 'review', 'announced', 'archived')`),
    check("twenty_under_twenty_program_year_check", sql`${table.year} between 2026 and 2200`),
    check("twenty_under_twenty_program_age_check", sql`${table.ageLimit} between 13 and 25`),
    check("twenty_under_twenty_program_class_size_check", sql`${table.classSize} between 1 and 100`),
  ],
);

export const twentyUnderTwentySubmissions = pgTable(
  "twenty_under_twenty_submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    programId: uuid("program_id").notNull().references(() => twentyUnderTwentyPrograms.id, { onDelete: "restrict" }),
    kind: text("kind").notNull(),
    status: text("status").notNull().default("submitted"),
    receiptCode: text("receipt_code").notNull(),
    studentFirstName: text("student_first_name").notNull(),
    studentLastName: text("student_last_name").notNull(),
    studentEmail: text("student_email").notNull(),
    birthDate: text("birth_date").notNull(),
    school: text("school").notNull(),
    grade: text("grade").notNull(),
    city: text("city").notNull(),
    county: text("county").notNull(),
    educatorName: text("educator_name"),
    educatorEmail: text("educator_email"),
    educatorTitle: text("educator_title"),
    relationship: text("relationship"),
    communityImpact: text("community_impact").notNull(),
    serviceSummary: text("service_summary").notNull(),
    futureGoals: text("future_goals").notNull(),
    supportingLinks: jsonb("supporting_links").$type<string[]>().notNull().default([]),
    guardianName: text("guardian_name"),
    guardianEmail: text("guardian_email"),
    applicantAttested: boolean("applicant_attested").notNull().default(false),
    publicationConsent: boolean("publication_consent").notNull().default(false),
    educatorAttested: boolean("educator_attested").notNull().default(false),
    reviewScore: integer("review_score"),
    reviewRecommendation: text("review_recommendation"),
    privateReviewNotes: text("private_review_notes"),
    reviewedByClerkId: text("reviewed_by_clerk_id"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    honoreeSnapshot: jsonb("honoree_snapshot").$type<TwentyUnderTwentyHonoreeSnapshot>(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("twenty_under_twenty_receipt_idx").on(table.receiptCode),
    uniqueIndex("twenty_under_twenty_submission_student_kind_idx").on(
      table.programId,
      table.kind,
      table.studentEmail,
    ),
    index("twenty_under_twenty_submission_queue_idx").on(table.programId, table.status, table.submittedAt),
    index("twenty_under_twenty_submission_kind_idx").on(table.programId, table.kind, table.submittedAt),
    check("twenty_under_twenty_submission_kind_check", sql`${table.kind} in ('educator_nomination', 'student_application')`),
    check("twenty_under_twenty_submission_status_check", sql`${table.status} in ('submitted', 'eligible', 'in_review', 'finalist', 'selected', 'declined', 'withdrawn')`),
    check("twenty_under_twenty_submission_score_check", sql`${table.reviewScore} is null or ${table.reviewScore} between 0 and 100`),
    check("twenty_under_twenty_submission_publish_check", sql`${table.publishedAt} is null or (${table.status} = 'selected' and ${table.publicationConsent} = true and ${table.honoreeSnapshot} is not null)`),
  ],
);

export const pressKitRequests = pgTable(
  "press_kit_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    organization: text("organization").notNull(),
    email: text("email").notNull(),
    intendedUse: text("intended_use").notNull(),
    requestDetails: text("request_details").notNull(),
    assetGroups: jsonb("asset_groups").$type<string[]>().notNull().default([]),
    status: text("status").notNull().default("generated"),
    archiveBytes: integer("archive_bytes"),
    generatedAt: timestamp("generated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("press_kit_requests_status_idx").on(table.status, table.createdAt),
    index("press_kit_requests_email_idx").on(table.email, table.createdAt),
  ],
);

export const pressReleases = pgTable(
  "press_releases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentType: text("document_type").notNull().default("press_release"),
    status: text("status").notNull().default("draft"),
    headline: text("headline").notNull(),
    subheadline: text("subheadline").notNull().default(""),
    summary: text("summary").notNull().default(""),
    location: text("location").notNull().default("New Brunswick, N.J."),
    releaseTiming: text("release_timing").notNull().default("immediate"),
    releaseAt: timestamp("release_at", { withTimezone: true }),
    body: text("body").notNull(),
    quote: text("quote").notNull().default(""),
    quoteAttribution: text("quote_attribution").notNull().default(""),
    keyPoints: jsonb("key_points").$type<string[]>().notNull().default([]),
    boilerplate: text("boilerplate").notNull().default(""),
    contactName: text("contact_name").notNull(),
    contactTitle: text("contact_title").notNull().default(""),
    contactEmail: text("contact_email").notNull(),
    contactPhone: text("contact_phone").notNull().default(""),
    websiteUrl: text("website_url").notNull().default(""),
    internalNotes: text("internal_notes").notNull().default(""),
    createdByClerkId: text("created_by_clerk_id").notNull(),
    updatedByClerkId: text("updated_by_clerk_id").notNull(),
    lastExportedAt: timestamp("last_exported_at", { withTimezone: true }),
    exportCount: integer("export_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("press_releases_status_idx").on(table.status, table.updatedAt),
    index("press_releases_creator_idx").on(table.createdByClerkId, table.createdAt),
  ],
);

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerClerkId: text("owner_clerk_id").notNull(),
    ownerEmail: text("owner_email").notNull(),
    name: text("name").notNull(),
    prefix: text("prefix").notNull(),
    keyHash: text("key_hash").notNull(),
    scopes: jsonb("scopes").$type<string[]>().notNull().default([]),
    rateLimitMinute: integer("rate_limit_minute").notNull().default(60),
    rateLimitDay: integer("rate_limit_day").notNull().default(10000),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("api_keys_prefix_idx").on(table.prefix),
    index("api_keys_owner_idx").on(table.ownerClerkId, table.createdAt),
  ],
);

export const apiAuditLogs = pgTable(
  "api_audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    apiKeyId: uuid("api_key_id").references(() => apiKeys.id, { onDelete: "set null" }),
    actorClerkId: text("actor_clerk_id"),
    event: text("event").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("api_audit_event_idx").on(table.event, table.createdAt)],
);

export const pushDevices = pgTable(
  "push_devices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    token: text("token").notNull(),
    platform: text("platform").notNull(),
    userClerkId: text("user_clerk_id"),
    deviceName: text("device_name"),
    isActive: boolean("is_active").notNull().default(true),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("push_devices_token_idx").on(table.token)],
);

export const webPushSubscriptions = pgTable(
  "web_push_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    userClerkId: text("user_clerk_id"),
    userAgentFamily: text("user_agent_family"),
    locale: text("locale"),
    isActive: boolean("is_active").notNull().default(true),
    failureCount: integer("failure_count").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("web_push_subscriptions_endpoint_idx").on(table.endpoint),
    index("web_push_subscriptions_user_idx").on(table.userClerkId, table.isActive),
    index("web_push_subscriptions_active_idx").on(table.isActive, table.lastSeenAt),
  ],
);

export const notificationCampaigns = pgTable(
  "notification_campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    destination: text("destination").notNull().default("/"),
    audienceType: text("audience_type").notNull(),
    audienceSpec: jsonb("audience_spec").$type<{
      userClerkIds?: string[];
      roles?: string[];
      segment?: string;
    }>().notNull().default({}),
    status: text("status").notNull().default("sending"),
    createdByClerkId: text("created_by_clerk_id").notNull(),
    recipientCount: integer("recipient_count").notNull().default(0),
    subscriptionCount: integer("subscription_count").notNull().default(0),
    acceptedCount: integer("accepted_count").notNull().default(0),
    failedCount: integer("failed_count").notNull().default(0),
    openedCount: integer("opened_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("notification_campaigns_created_idx").on(table.createdAt),
    index("notification_campaigns_actor_idx").on(table.createdByClerkId, table.createdAt),
    check(
      "notification_campaigns_audience_type_check",
      sql`${table.audienceType} in ('sitewide', 'accounts', 'staff_roles', 'njc_plus_segment')`,
    ),
    check(
      "notification_campaigns_status_check",
      sql`${table.status} in ('sending', 'completed', 'partial', 'failed')`,
    ),
  ],
);

export const notificationDeliveries = pgTable(
  "notification_deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaign_id").notNull().references(() => notificationCampaigns.id, { onDelete: "cascade" }),
    subscriptionId: uuid("subscription_id").notNull().references(() => webPushSubscriptions.id, { onDelete: "restrict" }),
    recipientClerkId: text("recipient_clerk_id"),
    status: text("status").notNull().default("pending"),
    providerStatus: integer("provider_status"),
    errorCode: text("error_code"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    openedAt: timestamp("opened_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("notification_deliveries_campaign_subscription_idx").on(table.campaignId, table.subscriptionId),
    index("notification_deliveries_campaign_status_idx").on(table.campaignId, table.status),
    index("notification_deliveries_recipient_idx").on(table.recipientClerkId, table.createdAt),
    check(
      "notification_deliveries_status_check",
      sql`${table.status} in ('pending', 'accepted', 'failed')`,
    ),
  ],
);

export const audienceInstallations = pgTable(
  "audience_installations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    installationId: text("installation_id").notNull(),
    platform: text("platform").notNull(),
    source: text("source").notNull().default("unknown"),
    product: text("product").notNull().default("unknown"),
    releaseChannel: text("release_channel").notNull().default("production"),
    appVersion: text("app_version"),
    buildNumber: text("build_number").notNull().default("unknown"),
    osVersion: text("os_version"),
    deviceClass: text("device_class"),
    environment: text("environment").notNull().default("production"),
    qualityStatus: text("quality_status").notNull().default("verified"),
    userClerkId: text("user_clerk_id"),
    eventCount: integer("event_count").notNull().default(1),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("audience_installations_installation_idx").on(table.installationId),
    index("audience_installations_platform_seen_idx").on(table.platform, table.lastSeenAt),
    index("audience_installations_user_idx").on(table.userClerkId),
  ],
);

export const audienceInstallationVersions = pgTable(
  "audience_installation_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    installationId: text("installation_id")
      .notNull()
      .references(() => audienceInstallations.installationId, { onDelete: "cascade" }),
    platform: text("platform").notNull(),
    product: text("product").notNull(),
    releaseChannel: text("release_channel").notNull().default("production"),
    appVersion: text("app_version").notNull().default("unknown"),
    buildNumber: text("build_number").notNull().default("unknown"),
    osVersion: text("os_version"),
    deviceClass: text("device_class"),
    environment: text("environment").notNull().default("production"),
    qualityStatus: text("quality_status").notNull().default("verified"),
    eventCount: integer("event_count").notNull().default(1),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("audience_installation_versions_identity_idx").on(
      table.installationId,
      table.product,
      table.releaseChannel,
      table.appVersion,
      table.buildNumber,
    ),
    index("audience_installation_versions_platform_seen_idx").on(
      table.platform,
      table.lastSeenAt,
    ),
    index("audience_installation_versions_version_seen_idx").on(
      table.product,
      table.appVersion,
      table.buildNumber,
      table.lastSeenAt,
    ),
  ],
);

export const audiencePresenceEvents = pgTable(
  "audience_presence_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: text("event_id").notNull(),
    installationId: text("installation_id").notNull(),
    platform: text("platform").notNull(),
    product: text("product").notNull(),
    releaseChannel: text("release_channel").notNull().default("production"),
    appVersion: text("app_version").notNull().default("unknown"),
    buildNumber: text("build_number").notNull().default("unknown"),
    osVersion: text("os_version"),
    deviceClass: text("device_class"),
    environment: text("environment").notNull().default("production"),
    qualityStatus: text("quality_status").notNull().default("verified"),
    userClerkId: text("user_clerk_id"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("audience_presence_events_event_idx").on(table.eventId),
    index("audience_presence_events_installation_time_idx").on(
      table.installationId,
      table.receivedAt,
    ),
    index("audience_presence_events_platform_time_idx").on(
      table.platform,
      table.receivedAt,
    ),
  ],
);

export type AnalyticsStoryView = {
  storyId: string | null;
  slug: string;
  headline: string;
  views: number;
};

export type AnalyticsPathView = {
  pathname: string;
  views: number;
};

export type AnalyticsSourceView = {
  source: string;
  entries: number;
  views: number;
};

export type AnalyticsDeviceView = {
  platform: string;
  entries: number;
  views: number;
};

export const analyticsDailyViews = pgTable(
  "analytics_daily_views",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    calculationVersion: integer("calculation_version").notNull().default(2),
    qualityStatus: text("quality_status").notNull().default("verified"),
    environment: text("environment").notNull().default("production"),
    product: text("product").notNull().default("news-web"),
    day: text("day").notNull(),
    pathname: text("pathname").notNull(),
    storyId: uuid("story_id").references(() => stories.id, {
      onDelete: "set null",
    }),
    storySlug: text("story_slug"),
    storyHeadline: text("story_headline"),
    trafficSource: text("traffic_source").notNull().default("unknown"),
    devicePlatform: text("device_platform").notNull().default("unknown"),
    entries: integer("entries").notNull().default(0),
    views: integer("views").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("analytics_daily_views_day_path_source_device_idx").on(
      table.calculationVersion,
      table.qualityStatus,
      table.environment,
      table.product,
      table.day,
      table.pathname,
      table.trafficSource,
      table.devicePlatform,
    ),
    index("analytics_daily_views_day_idx").on(table.day),
    index("analytics_daily_views_story_day_idx").on(table.storySlug, table.day),
    index("analytics_daily_views_source_day_idx").on(table.trafficSource, table.day),
    index("analytics_daily_views_device_day_idx").on(table.devicePlatform, table.day),
  ],
);

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: text("event_id").notNull(),
    eventType: text("event_type").notNull().default("page_view"),
    calculationVersion: integer("calculation_version").notNull().default(2),
    qualityStatus: text("quality_status").notNull().default("verified"),
    environment: text("environment").notNull().default("production"),
    product: text("product").notNull().default("news-web"),
    platform: text("platform").notNull().default("web"),
    installationId: text("installation_id"),
    sessionId: text("session_id"),
    pathname: text("pathname").notNull(),
    storyId: uuid("story_id").references(() => stories.id, { onDelete: "set null" }),
    storySlug: text("story_slug"),
    storyHeadline: text("story_headline"),
    trafficSource: text("traffic_source").notNull().default("direct"),
    attributionModel: text("attribution_model").notNull().default("session_first_touch"),
    devicePlatform: text("device_platform").notNull().default("unknown"),
    isEntry: boolean("is_entry").notNull().default(false),
    appVersion: text("app_version").notNull().default("unknown"),
    buildNumber: text("build_number").notNull().default("unknown"),
    releaseChannel: text("release_channel").notNull().default("production"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("analytics_events_event_idx").on(table.eventId),
    index("analytics_events_received_idx").on(table.receivedAt),
    index("analytics_events_story_received_idx").on(table.storySlug, table.receivedAt),
    index("analytics_events_installation_received_idx").on(
      table.installationId,
      table.receivedAt,
    ),
    index("analytics_events_quality_received_idx").on(
      table.calculationVersion,
      table.qualityStatus,
      table.environment,
      table.receivedAt,
    ),
  ],
);

export const analyticsPeriodArchives = pgTable(
  "analytics_period_archives",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    calculationVersion: integer("calculation_version").notNull().default(2),
    revision: integer("revision").notNull().default(1),
    qualityStatus: text("quality_status").notNull().default("verified"),
    correctionReason: text("correction_reason"),
    period: text("period").notNull(),
    periodStart: text("period_start").notNull(),
    periodEnd: text("period_end").notNull(),
    totalViews: integer("total_views").notNull().default(0),
    storyViews: jsonb("story_views").$type<AnalyticsStoryView[]>().notNull().default([]),
    pathViews: jsonb("path_views").$type<AnalyticsPathView[]>().notNull().default([]),
    sourceViews: jsonb("source_views").$type<AnalyticsSourceView[]>().notNull().default([]),
    deviceViews: jsonb("device_views").$type<AnalyticsDeviceView[]>().notNull().default([]),
    generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("analytics_period_archives_period_start_idx").on(table.period, table.periodStart),
    index("analytics_period_archives_period_end_idx").on(table.period, table.periodEnd),
  ],
);

export const analyticsArchiveRevisions = pgTable(
  "analytics_archive_revisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    period: text("period").notNull(),
    periodStart: text("period_start").notNull(),
    periodEnd: text("period_end").notNull(),
    revision: integer("revision").notNull(),
    calculationVersion: integer("calculation_version").notNull(),
    qualityStatus: text("quality_status").notNull(),
    correctionReason: text("correction_reason"),
    totalViews: integer("total_views").notNull().default(0),
    storyViews: jsonb("story_views").$type<AnalyticsStoryView[]>().notNull().default([]),
    pathViews: jsonb("path_views").$type<AnalyticsPathView[]>().notNull().default([]),
    sourceViews: jsonb("source_views").$type<AnalyticsSourceView[]>().notNull().default([]),
    deviceViews: jsonb("device_views").$type<AnalyticsDeviceView[]>().notNull().default([]),
    generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("analytics_archive_revisions_period_revision_idx").on(
      table.period,
      table.periodStart,
      table.revision,
    ),
    index("analytics_archive_revisions_generated_idx").on(table.generatedAt),
  ],
);

export const devicePairingRequests = pgTable(
  "device_pairing_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    target: text("target").notNull(),
    deviceName: text("device_name").notNull(),
    deviceSecretHash: text("device_secret_hash").notNull(),
    userCodeHash: text("user_code_hash").notNull(),
    requesterIpHash: text("requester_ip_hash").notNull(),
    status: text("status").notNull().default("pending"),
    approvalAttempts: integer("approval_attempts").notNull().default(0),
    approvedByClerkId: text("approved_by_clerk_id"),
    approvedByName: text("approved_by_name"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("device_pairing_ip_created_idx").on(table.requesterIpHash, table.createdAt),
    index("device_pairing_status_expires_idx").on(table.status, table.expiresAt),
  ],
);

export const deviceSessions = pgTable(
  "device_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tokenHash: text("token_hash").notNull(),
    userClerkId: text("user_clerk_id").notNull(),
    displayName: text("display_name").notNull(),
    platform: text("platform").notNull(),
    deviceName: text("device_name").notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("device_sessions_token_idx").on(table.tokenHash),
    index("device_sessions_user_idx").on(table.userClerkId, table.createdAt),
  ],
);

export const siteSettings = pgTable("site_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedByClerkId: text("updated_by_clerk_id"),
  revision: integer("revision").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const siteConfigurationRevisions = pgTable(
  "site_configuration_revisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    settingKey: text("setting_key").notNull(),
    revision: integer("revision").notNull(),
    value: jsonb("value").notNull(),
    previousValue: jsonb("previous_value").notNull(),
    reason: text("reason").notNull(),
    environment: text("environment").notNull().default("production"),
    affectedPlatforms: jsonb("affected_platforms").$type<string[]>().notNull().default([]),
    affectedFeatures: jsonb("affected_features").$type<string[]>().notNull().default([]),
    changedByClerkId: text("changed_by_clerk_id").notNull(),
    rolledBackFromRevision: integer("rolled_back_from_revision"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("site_configuration_revisions_key_revision_idx").on(table.settingKey, table.revision),
    index("site_configuration_revisions_created_idx").on(table.settingKey, table.createdAt),
    check("site_configuration_environment_check", sql`${table.environment} in ('development', 'preview', 'staging', 'production')`),
  ],
);

export interface LegalPublishedSnapshot {
  title: string;
  summary: string;
  body: string[];
  severity: "informational" | "material" | "critical";
  revision: number;
  publishedAt: string;
}

export const legalCenterEntries = pgTable(
  "legal_center_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull().default(""),
    body: jsonb("body").$type<string[]>().notNull().default([]),
    severity: text("severity").notNull().default("informational"),
    status: text("status").notNull().default("draft"),
    sortOrder: integer("sort_order").notNull().default(0),
    verificationChecks: jsonb("verification_checks").$type<string[]>().notNull().default([]),
    createdByClerkId: text("created_by_clerk_id").notNull(),
    updatedByClerkId: text("updated_by_clerk_id").notNull(),
    submittedByClerkId: text("submitted_by_clerk_id"),
    approvedByClerkId: text("approved_by_clerk_id"),
    publishedRevision: integer("published_revision").notNull().default(0),
    publishedSnapshot: jsonb("published_snapshot").$type<LegalPublishedSnapshot>(),
    reviewRequestedAt: timestamp("review_requested_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("legal_center_entries_slug_idx").on(table.slug),
    index("legal_center_entries_status_order_idx").on(table.status, table.sortOrder),
    check(
      "legal_center_entries_severity_check",
      sql`${table.severity} in ('informational', 'material', 'critical')`,
    ),
    check(
      "legal_center_entries_status_check",
      sql`${table.status} in ('draft', 'review', 'published')`,
    ),
    check(
      "legal_center_entries_revision_check",
      sql`${table.publishedRevision} >= 0`,
    ),
    check(
      "legal_center_entries_second_approval_check",
      sql`${table.severity} <> 'critical' or ${table.approvedByClerkId} is null or ${table.approvedByClerkId} <> ${table.submittedByClerkId}`,
    ),
  ],
);

/**
 * Product-level release controls. Parents override children in application
 * policy, while each row remains independently configurable and auditable.
 */
export const featureFlags = pgTable(
  "feature_flags",
  {
    key: text("key").primaryKey(),
    parentKey: text("parent_key"),
    enabled: boolean("enabled").notNull().default(false),
    description: text("description").notNull().default(""),
    configuration: jsonb("configuration").$type<Record<string, unknown>>().notNull().default({}),
    updatedByClerkId: text("updated_by_clerk_id"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("feature_flags_parent_idx").on(table.parentKey)],
);

export const premiumContent = pgTable(
  "premium_content",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: text("kind").notNull(),
    status: text("status").notNull().default("draft"),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    eyebrow: text("eyebrow").notNull().default("NJC+"),
    summary: text("summary").notNull().default(""),
    body: jsonb("body").$type<string[]>().notNull().default([]),
    parentId: uuid("parent_id"),
    seasonNumber: integer("season_number"),
    episodeNumber: integer("episode_number"),
    durationMs: integer("duration_ms"),
    imageAssetId: uuid("image_asset_id").references(() => mediaAssets.id, { onDelete: "set null" }),
    imageUrl: text("image_url"),
    imageAlt: text("image_alt"),
    mediaAssetId: uuid("media_asset_id").references(() => mediaAssets.id, { onDelete: "set null" }),
    mediaUrl: text("media_url"),
    mediaMimeType: text("media_mime_type"),
    captionsUrl: text("captions_url"),
    transcript: text("transcript"),
    authors: jsonb("authors").$type<Array<{ id?: string; name: string; role?: string }>>().notNull().default([]),
    speakers: jsonb("speakers").$type<Array<{ name: string; role?: string }>>().notNull().default([]),
    categories: jsonb("categories").$type<string[]>().notNull().default([]),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    relatedIds: jsonb("related_ids").$type<string[]>().notNull().default([]),
    paywallPolicy: text("paywall_policy").notNull().default("njc_plus"),
    requiredTierIds: jsonb("required_tier_ids").$type<string[]>().notNull().default([]),
    previewSeconds: integer("preview_seconds").notNull().default(0),
    rentalHours: integer("rental_hours"),
    commentsEnabled: boolean("comments_enabled").notNull().default(false),
    isLive: boolean("is_live").notNull().default(false),
    isBreaking: boolean("is_breaking").notNull().default(false),
    isFeatured: boolean("is_featured").notNull().default(false),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    socialImageUrl: text("social_image_url"),
    noIndex: boolean("no_index").notNull().default(false),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdByClerkId: text("created_by_clerk_id").notNull(),
    updatedByClerkId: text("updated_by_clerk_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("premium_content_slug_idx").on(table.slug),
    index("premium_content_status_published_idx").on(table.status, table.publishedAt),
    index("premium_content_kind_published_idx").on(table.kind, table.publishedAt),
    index("premium_content_parent_idx").on(table.parentId, table.seasonNumber, table.episodeNumber),
  ],
);

export const premiumContentRelations = pgTable(
  "premium_content_relations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceContentId: uuid("source_content_id").notNull().references(() => premiumContent.id, { onDelete: "cascade" }),
    targetContentId: uuid("target_content_id").notNull().references(() => premiumContent.id, { onDelete: "cascade" }),
    relationType: text("relation_type").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("premium_content_relation_unique_idx").on(table.sourceContentId, table.targetContentId, table.relationType),
    index("premium_content_relation_target_idx").on(table.targetContentId, table.relationType),
  ],
);

export const premiumHomepageModules = pgTable(
  "premium_homepage_modules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    moduleType: text("module_type").notNull(),
    title: text("title").notNull().default(""),
    eyebrow: text("eyebrow").notNull().default(""),
    contentIds: jsonb("content_ids").$type<string[]>().notNull().default([]),
    configuration: jsonb("configuration").$type<Record<string, unknown>>().notNull().default({}),
    sortOrder: integer("sort_order").notNull().default(0),
    enabled: boolean("enabled").notNull().default(true),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    updatedByClerkId: text("updated_by_clerk_id").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("premium_homepage_order_idx").on(table.enabled, table.sortOrder)],
);

export const premiumContentRevisions = pgTable(
  "premium_content_revisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contentId: uuid("content_id").notNull().references(() => premiumContent.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    snapshot: jsonb("snapshot").notNull(),
    note: text("note"),
    editorClerkId: text("editor_clerk_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("premium_content_revision_unique_idx").on(table.contentId, table.version)],
);

export const premiumTiers = pgTable(
  "premium_tiers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    priceCents: integer("price_cents").notNull(),
    currency: text("currency").notNull().default("usd"),
    interval: text("interval").notNull().default("month"),
    benefits: jsonb("benefits").$type<string[]>().notNull().default([]),
    capabilities: jsonb("capabilities").$type<string[]>().notNull().default([]),
    trialEligible: boolean("trial_eligible").notNull().default(false),
    accessCreditEligible: boolean("access_credit_eligible").notNull().default(false),
    available: boolean("available").notNull().default(false),
    visible: boolean("visible").notNull().default(false),
    providerPriceId: text("provider_price_id"),
    rules: jsonb("rules").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("premium_tiers_slug_idx").on(table.slug)],
);

export const premiumOffers = pgTable(
  "premium_offers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    tierId: uuid("tier_id").notNull().references(() => premiumTiers.id, { onDelete: "restrict" }),
    kind: text("kind").notNull().default("trial"),
    name: text("name").notNull(),
    promotionalText: text("promotional_text").notNull().default(""),
    priceCents: integer("price_cents").notNull().default(100),
    durationDays: integer("duration_days").notNull().default(3),
    active: boolean("active").notNull().default(false),
    perUserLimit: integer("per_user_limit").notNull().default(1),
    paymentRequired: boolean("payment_required").notNull().default(true),
    autoRenews: boolean("auto_renews").notNull().default(true),
    renewalPriceCents: integer("renewal_price_cents"),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    providerPriceId: text("provider_price_id"),
    eligibility: jsonb("eligibility").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("premium_offers_slug_idx").on(table.slug)],
);

export const premiumSubscriptions = pgTable(
  "premium_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userClerkId: text("user_clerk_id").notNull(),
    tierId: uuid("tier_id").notNull().references(() => premiumTiers.id, { onDelete: "restrict" }),
    offerId: uuid("offer_id").references(() => premiumOffers.id, { onDelete: "set null" }),
    provider: text("provider").notNull().default("stripe"),
    providerCustomerId: text("provider_customer_id"),
    providerSubscriptionId: text("provider_subscription_id"),
    status: text("status").notNull().default("pending"),
    currentPeriodStartsAt: timestamp("current_period_starts_at", { withTimezone: true }),
    currentPeriodEndsAt: timestamp("current_period_ends_at", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("premium_subscriptions_user_status_idx").on(table.userClerkId, table.status),
    uniqueIndex("premium_subscriptions_provider_idx").on(table.provider, table.providerSubscriptionId),
  ],
);

export const financialSettings = pgTable(
  "financial_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    singletonKey: text("singleton_key").notNull().default("primary"),
    legalEntityName: text("legal_entity_name").notNull().default(""),
    reportingCurrency: text("reporting_currency").notNull().default("usd"),
    fiscalYearStartMonth: integer("fiscal_year_start_month").notNull().default(1),
    federalIncomeTaxReserveBps: integer("federal_income_tax_reserve_bps").notNull().default(0),
    stateIncomeTaxReserveBps: integer("state_income_tax_reserve_bps").notNull().default(0),
    payrollTaxReserveBps: integer("payroll_tax_reserve_bps").notNull().default(0),
    contingencyReserveBps: integer("contingency_reserve_bps").notNull().default(0),
    chargebackReserveBps: integer("chargeback_reserve_bps").notNull().default(0),
    operatingReserveMonths: integer("operating_reserve_months").notNull().default(0),
    monthlyOperatingBudgetCents: integer("monthly_operating_budget_cents").notNull().default(0),
    targetMonthlyPageViews: integer("target_monthly_page_views").notNull().default(100000),
    modeledAdvertisingRpmCents: integer("modeled_advertising_rpm_cents").notNull().default(800),
    targetPaidMembers: integer("target_paid_members").notNull().default(250),
    modeledMemberRevenueCents: integer("modeled_member_revenue_cents").notNull().default(999),
    monthlySponsorshipTargetCents: integer("monthly_sponsorship_target_cents").notNull().default(0),
    taxPolicyReviewedAt: timestamp("tax_policy_reviewed_at", { withTimezone: true }),
    taxPolicyReviewedBy: text("tax_policy_reviewed_by"),
    notes: text("notes").notNull().default(""),
    updatedByClerkId: text("updated_by_clerk_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("financial_settings_singleton_idx").on(table.singletonKey),
    check(
      "financial_settings_fiscal_month_check",
      sql`${table.fiscalYearStartMonth} between 1 and 12`,
    ),
    check(
      "financial_settings_reserve_rates_check",
      sql`${table.federalIncomeTaxReserveBps} between 0 and 10000
        and ${table.stateIncomeTaxReserveBps} between 0 and 10000
        and ${table.payrollTaxReserveBps} between 0 and 10000
        and ${table.contingencyReserveBps} between 0 and 10000
        and ${table.chargebackReserveBps} between 0 and 10000`,
    ),
    check(
      "financial_settings_operating_reserve_check",
      sql`${table.operatingReserveMonths} between 0 and 36
        and ${table.monthlyOperatingBudgetCents} >= 0`,
    ),
    check(
      "financial_settings_opportunity_model_check",
      sql`${table.targetMonthlyPageViews} between 0 and 1000000000
        and ${table.modeledAdvertisingRpmCents} between 0 and 1000000
        and ${table.targetPaidMembers} between 0 and 10000000
        and ${table.modeledMemberRevenueCents} between 0 and 100000000
        and ${table.monthlySponsorshipTargetCents} between 0 and 100000000000`,
    ),
  ],
);

export const financialProviderEvents = pgTable(
  "financial_provider_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: text("provider").notNull().default("stripe"),
    providerEventId: text("provider_event_id").notNull(),
    eventType: text("event_type").notNull(),
    providerObjectId: text("provider_object_id"),
    livemode: boolean("livemode").notNull().default(false),
    status: text("status").notNull().default("processing"),
    attemptCount: integer("attempt_count").notNull().default(1),
    lastErrorCode: text("last_error_code"),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("financial_provider_events_provider_idx").on(
      table.provider,
      table.providerEventId,
    ),
    index("financial_provider_events_status_idx").on(
      table.status,
      table.receivedAt,
    ),
    check(
      "financial_provider_events_status_check",
      sql`${table.status} in ('processing', 'processed', 'ignored', 'failed')`,
    ),
  ],
);

export const financialLedgerEntries = pgTable(
  "financial_ledger_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    source: text("source").notNull(),
    entryKind: text("entry_kind").notNull(),
    revenueCategory: text("revenue_category").notNull().default("other"),
    currency: text("currency").notNull().default("usd"),
    grossAmountCents: integer("gross_amount_cents").notNull().default(0),
    feeAmountCents: integer("fee_amount_cents").notNull().default(0),
    taxAmountCents: integer("tax_amount_cents").notNull().default(0),
    netAmountCents: integer("net_amount_cents").notNull().default(0),
    status: text("status").notNull().default("posted"),
    description: text("description").notNull(),
    counterparty: text("counterparty"),
    userClerkId: text("user_clerk_id"),
    providerCustomerId: text("provider_customer_id"),
    providerObjectId: text("provider_object_id"),
    providerBalanceTransactionId: text("provider_balance_transaction_id"),
    providerPayoutId: text("provider_payout_id"),
    providerEventId: text("provider_event_id"),
    idempotencyKey: text("idempotency_key").notNull(),
    reversalOfId: uuid("reversal_of_id"),
    availableOn: timestamp("available_on", { withTimezone: true }),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    createdByClerkId: text("created_by_clerk_id").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("financial_ledger_idempotency_idx").on(table.idempotencyKey),
    uniqueIndex("financial_ledger_balance_transaction_idx").on(
      table.providerBalanceTransactionId,
    ),
    index("financial_ledger_occurred_idx").on(table.occurredAt),
    index("financial_ledger_kind_occurred_idx").on(
      table.entryKind,
      table.occurredAt,
    ),
    index("financial_ledger_category_occurred_idx").on(
      table.revenueCategory,
      table.occurredAt,
    ),
    check(
      "financial_ledger_source_check",
      sql`${table.source} in ('stripe', 'manual', 'import', 'system')`,
    ),
    check(
      "financial_ledger_kind_check",
      sql`${table.entryKind} in (
        'payment', 'refund', 'dispute', 'dispute_reversal', 'fee',
        'payout', 'tax_payment', 'expense', 'income', 'adjustment', 'reversal'
      )`,
    ),
    check(
      "financial_ledger_status_check",
      sql`${table.status} in ('pending', 'available', 'posted', 'failed', 'void')`,
    ),
  ],
);

export const financialPeriodCloses = pgTable(
  "financial_period_closes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    periodType: text("period_type").notNull(),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
    version: integer("version").notNull().default(1),
    status: text("status").notNull().default("closed"),
    snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
    reconciliationStatus: text("reconciliation_status").notNull().default("unreviewed"),
    notes: text("notes").notNull().default(""),
    supersedesId: uuid("supersedes_id"),
    closedByClerkId: text("closed_by_clerk_id").notNull(),
    reviewedByClerkId: text("reviewed_by_clerk_id"),
    closedAt: timestamp("closed_at", { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("financial_period_close_version_idx").on(
      table.periodType,
      table.periodStart,
      table.periodEnd,
      table.version,
    ),
    index("financial_period_close_status_idx").on(
      table.status,
      table.periodEnd,
    ),
    check(
      "financial_period_close_type_check",
      sql`${table.periodType} in ('month', 'quarter', 'year')`,
    ),
    check(
      "financial_period_close_status_check",
      sql`${table.status} in ('closed', 'superseded')`,
    ),
    check(
      "financial_period_close_reconciliation_check",
      sql`${table.reconciliationStatus} in ('unreviewed', 'reviewed', 'exception')`,
    ),
    check(
      "financial_period_close_dates_check",
      sql`${table.periodEnd} > ${table.periodStart} and ${table.version} > 0`,
    ),
  ],
);

export const premiumEntitlements = pgTable(
  "premium_entitlements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userClerkId: text("user_clerk_id").notNull(),
    scopeType: text("scope_type").notNull(),
    scopeId: text("scope_id").notNull(),
    sourceType: text("source_type").notNull(),
    sourceId: text("source_id"),
    status: text("status").notNull().default("active"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull().defaultNow(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    pausedAt: timestamp("paused_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("premium_entitlements_user_active_idx").on(table.userClerkId, table.status, table.endsAt),
    index("premium_entitlements_scope_idx").on(table.scopeType, table.scopeId, table.status),
    uniqueIndex("premium_entitlements_source_idx").on(
      table.userClerkId,
      table.sourceType,
      table.sourceId,
      table.scopeType,
      table.scopeId,
    ),
  ],
);

export const premiumBetaTesterGrants = pgTable(
  "premium_beta_tester_grants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userClerkId: text("user_clerk_id").notNull(),
    status: text("status").notNull().default("active"),
    featureKeys: jsonb("feature_keys").$type<string[]>().notNull().default([]),
    premiumContentIncluded: boolean("premium_content_included").notNull().default(false),
    contentIds: jsonb("content_ids").$type<string[]>().notNull().default([]),
    showMemberBranding: boolean("show_member_branding").notNull().default(false),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull().defaultNow(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    pausedAt: timestamp("paused_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    invitedByClerkId: text("invited_by_clerk_id").notNull(),
    revokedByClerkId: text("revoked_by_clerk_id"),
    reason: text("reason").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("premium_beta_tester_user_status_idx").on(table.userClerkId, table.status, table.endsAt),
    index("premium_beta_tester_active_window_idx").on(table.status, table.startsAt, table.endsAt),
    uniqueIndex("premium_beta_tester_one_current_idx")
      .on(table.userClerkId)
      .where(sql`${table.status} in ('active', 'paused')`),
  ],
);

export const accessCreditLedger = pgTable(
  "access_credit_ledger",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userClerkId: text("user_clerk_id").notNull(),
    amount: integer("amount").notNull(),
    transactionType: text("transaction_type").notNull(),
    reason: text("reason").notNull(),
    sourceType: text("source_type"),
    sourceId: text("source_id"),
    reversalOfId: uuid("reversal_of_id"),
    idempotencyKey: text("idempotency_key"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdByClerkId: text("created_by_clerk_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("access_credit_ledger_user_idx").on(table.userClerkId, table.createdAt),
    uniqueIndex("access_credit_ledger_idempotency_idx").on(table.idempotencyKey),
  ],
);

export const accessCreditRedemptionRules = pgTable(
  "access_credit_redemption_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    active: boolean("active").notNull().default(false),
    costCredits: integer("cost_credits").notNull(),
    benefitType: text("benefit_type").notNull(),
    benefitValue: integer("benefit_value"),
    tierId: uuid("tier_id").references(() => premiumTiers.id, { onDelete: "restrict" }),
    contentId: uuid("content_id").references(() => premiumContent.id, { onDelete: "restrict" }),
    limits: jsonb("limits").$type<Record<string, unknown>>().notNull().default({}),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("access_credit_rules_active_idx").on(table.active, table.costCredits)],
);

export const accessCreditRedemptions = pgTable(
  "access_credit_redemptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userClerkId: text("user_clerk_id").notNull(),
    ruleId: uuid("rule_id").notNull().references(() => accessCreditRedemptionRules.id, { onDelete: "restrict" }),
    ledgerTransactionId: uuid("ledger_transaction_id").notNull().references(() => accessCreditLedger.id, { onDelete: "restrict" }),
    entitlementId: uuid("entitlement_id").references(() => premiumEntitlements.id, { onDelete: "restrict" }),
    status: text("status").notNull().default("completed"),
    idempotencyKey: text("idempotency_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("access_credit_redemptions_idempotency_idx").on(table.idempotencyKey),
    index("access_credit_redemptions_user_idx").on(table.userClerkId, table.createdAt),
  ],
);

export const premiumPlaybackProgress = pgTable(
  "premium_playback_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userClerkId: text("user_clerk_id").notNull(),
    contentId: uuid("content_id").notNull().references(() => premiumContent.id, { onDelete: "cascade" }),
    positionMs: integer("position_ms").notNull().default(0),
    durationMs: integer("duration_ms"),
    completed: boolean("completed").notNull().default(false),
    devicePlatform: text("device_platform").notNull().default("web"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("premium_playback_progress_user_content_idx").on(table.userClerkId, table.contentId),
    index("premium_playback_progress_user_updated_idx").on(table.userClerkId, table.updatedAt),
  ],
);

export const premiumComments = pgTable(
  "premium_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contentId: uuid("content_id").notNull().references(() => premiumContent.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id"),
    authorClerkId: text("author_clerk_id").notNull(),
    body: text("body").notNull(),
    status: text("status").notNull().default("pending"),
    editedAt: timestamp("edited_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("premium_comments_content_status_idx").on(table.contentId, table.status, table.createdAt)],
);

export const premiumCommentReports = pgTable(
  "premium_comment_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    commentId: uuid("comment_id").notNull().references(() => premiumComments.id, { onDelete: "cascade" }),
    reporterClerkId: text("reporter_clerk_id").notNull(),
    reason: text("reason").notNull(),
    status: text("status").notNull().default("open"),
    reviewedByClerkId: text("reviewed_by_clerk_id"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("premium_comment_reports_reporter_idx").on(table.commentId, table.reporterClerkId),
    index("premium_comment_reports_status_idx").on(table.status, table.createdAt),
  ],
);

export const premiumAuditLogs = pgTable(
  "premium_audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorClerkId: text("actor_clerk_id").notNull(),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    reason: text("reason"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ipHash: text("ip_hash"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("premium_audit_target_idx").on(table.targetType, table.targetId, table.createdAt),
    index("premium_audit_actor_idx").on(table.actorClerkId, table.createdAt),
  ],
);

export const dataRequests = pgTable(
  "data_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkId: text("clerk_id"),
    email: text("email").notNull(),
    requestType: text("request_type").notNull(),
    jurisdiction: text("jurisdiction"),
    status: text("status").notNull().default("received"),
    verificationTokenHash: text("verification_token_hash"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [index("data_requests_email_idx").on(table.email, table.createdAt)],
);

export const portableExports = pgTable(
  "portable_exports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    blobUrl: text("blob_url").notNull(),
    pathname: text("pathname").notNull(),
    checksumSha256: text("checksum_sha256").notNull(),
    size: integer("size").notNull(),
    createdByClerkId: text("created_by_clerk_id").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("portable_exports_created_idx").on(table.createdAt)],
);

export const employeeCapabilityGrants = pgTable(
  "employee_capability_grants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userClerkId: text("user_clerk_id").notNull(),
    capability: text("capability").notNull(),
    effect: text("effect").notNull().default("allow"),
    grantedByClerkId: text("granted_by_clerk_id").notNull(),
    reason: text("reason"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("employee_capability_grants_user_idx").on(table.userClerkId, table.createdAt),
    index("employee_capability_grants_active_idx").on(table.userClerkId, table.capability, table.revokedAt),
  ],
);

export const employeeAccessRequests = pgTable(
  "employee_access_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requesterClerkId: text("requester_clerk_id").notNull(),
    requesterEmail: text("requester_email").notNull(),
    capability: text("capability").notNull(),
    sourceApp: text("source_app").notNull().default("reader"),
    intendedDestination: text("intended_destination"),
    reason: text("reason"),
    status: employeeAccessRequestStatus("status").notNull().default("pending"),
    reviewedByClerkId: text("reviewed_by_clerk_id"),
    reviewerNote: text("reviewer_note"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("employee_access_requests_requester_idx").on(table.requesterClerkId, table.createdAt),
    index("employee_access_requests_review_idx").on(table.status, table.createdAt),
  ],
);

export const employeeChatChannels = pgTable(
  "employee_chat_channels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: employeeChannelKind("kind").notNull().default("public"),
    slug: text("slug"),
    name: text("name").notNull(),
    topic: text("topic"),
    conversationKey: text("conversation_key"),
    isArchived: boolean("is_archived").notNull().default(false),
    createdByClerkId: text("created_by_clerk_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("employee_chat_channels_slug_idx").on(table.slug),
    uniqueIndex("employee_chat_channels_conversation_idx").on(table.conversationKey),
    index("employee_chat_channels_kind_idx").on(table.kind, table.isArchived),
  ],
);

export const employeeChatMembers = pgTable(
  "employee_chat_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    channelId: uuid("channel_id").notNull().references(() => employeeChatChannels.id, { onDelete: "cascade" }),
    userClerkId: text("user_clerk_id").notNull(),
    membershipRole: text("membership_role").notNull().default("member"),
    lastReadAt: timestamp("last_read_at", { withTimezone: true }),
    mutedUntil: timestamp("muted_until", { withTimezone: true }),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    leftAt: timestamp("left_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("employee_chat_members_channel_user_idx").on(table.channelId, table.userClerkId),
    index("employee_chat_members_user_idx").on(table.userClerkId, table.leftAt),
  ],
);

export const employeeChatMessages = pgTable(
  "employee_chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    channelId: uuid("channel_id").notNull().references(() => employeeChatChannels.id, { onDelete: "cascade" }),
    authorClerkId: text("author_clerk_id").notNull(),
    authorName: text("author_name").notNull(),
    body: text("body").notNull(),
    replyToId: uuid("reply_to_id"),
    mentions: jsonb("mentions").$type<string[]>().notNull().default([]),
    isPinned: boolean("is_pinned").notNull().default(false),
    editedAt: timestamp("edited_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedByClerkId: text("deleted_by_clerk_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("employee_chat_messages_channel_cursor_idx").on(table.channelId, table.createdAt),
    index("employee_chat_messages_author_idx").on(table.authorClerkId, table.createdAt),
  ],
);

export const employeeChatAttachments = pgTable(
  "employee_chat_attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    channelId: uuid("channel_id").notNull().references(() => employeeChatChannels.id, { onDelete: "cascade" }),
    messageId: uuid("message_id").references(() => employeeChatMessages.id, { onDelete: "cascade" }),
    uploaderClerkId: text("uploader_clerk_id").notNull(),
    pathname: text("pathname").notNull(),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("employee_chat_attachments_path_idx").on(table.pathname),
    index("employee_chat_attachments_message_idx").on(table.messageId),
  ],
);

export const employeeChatReports = pgTable(
  "employee_chat_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    messageId: uuid("message_id").notNull().references(() => employeeChatMessages.id, { onDelete: "cascade" }),
    reporterClerkId: text("reporter_clerk_id").notNull(),
    reason: text("reason").notNull(),
    status: text("status").notNull().default("open"),
    resolvedByClerkId: text("resolved_by_clerk_id"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("employee_chat_reports_message_reporter_idx").on(table.messageId, table.reporterClerkId),
    index("employee_chat_reports_status_idx").on(table.status, table.createdAt),
  ],
);

export const employeePresence = pgTable(
  "employee_presence",
  {
    userClerkId: text("user_clerk_id").primaryKey(),
    status: text("status").notNull().default("online"),
    platform: text("platform").notNull().default("web"),
    typingChannelId: uuid("typing_channel_id").references(() => employeeChatChannels.id, { onDelete: "set null" }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    typingExpiresAt: timestamp("typing_expires_at", { withTimezone: true }),
  },
);

export const employeePushDevices = pgTable(
  "employee_push_devices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    token: text("token").notNull(),
    userClerkId: text("user_clerk_id").notNull(),
    platform: text("platform").notNull(),
    appVersion: text("app_version"),
    isActive: boolean("is_active").notNull().default(true),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("employee_push_devices_token_idx").on(table.token),
    index("employee_push_devices_user_idx").on(table.userClerkId, table.isActive),
  ],
);

export const employeeNotifications = pgTable(
  "employee_notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recipientClerkId: text("recipient_clerk_id").notNull(),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    destination: text("destination"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("employee_notifications_recipient_idx").on(table.recipientClerkId, table.createdAt),
    index("employee_notifications_unread_idx").on(table.recipientClerkId, table.readAt),
  ],
);

export const employeeAuditLogs = pgTable(
  "employee_audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorClerkId: text("actor_clerk_id").notNull(),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("employee_audit_actor_idx").on(table.actorClerkId, table.createdAt),
    index("employee_audit_action_idx").on(table.action, table.createdAt),
  ],
);

export const platformOrganizations = pgTable("platform_organizations", { id: uuid("id").primaryKey().defaultRandom(), name: text("name").notNull(), status: text("status").notNull().default("active"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() });
export const platformCustomers = pgTable("platform_customers", { id: uuid("id").primaryKey().defaultRandom(), organizationId: uuid("organization_id").notNull().references(() => platformOrganizations.id, { onDelete: "restrict" }), externalId: text("external_id"), email: text("email"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() }, (table) => [index("platform_customers_org_idx").on(table.organizationId)]);
export const platformProducts = pgTable("platform_products", { id: uuid("id").primaryKey().defaultRandom(), slug: text("slug").notNull(), name: text("name").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() }, (table) => [uniqueIndex("platform_products_slug_idx").on(table.slug)]);
export const platformFeatureModules = pgTable("platform_feature_modules", { id: uuid("id").primaryKey().defaultRandom(), featureId: text("feature_id").notNull(), version: text("version").notNull(), manifest: jsonb("manifest").notNull(), checksum: text("checksum").notNull(), status: text("status").notNull().default("active"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() }, (table) => [uniqueIndex("platform_feature_modules_id_version_idx").on(table.featureId, table.version)]);
export const platformApplications = pgTable("platform_applications", { id: uuid("id").primaryKey().defaultRandom(), organizationId: uuid("organization_id").notNull().references(() => platformOrganizations.id, { onDelete: "restrict" }), productId: uuid("product_id").notNull().references(() => platformProducts.id, { onDelete: "restrict" }), name: text("name").notNull(), status: text("status").notNull().default("active"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() }, (table) => [index("platform_applications_org_idx").on(table.organizationId)]);
export const platformApplicationIdentities = pgTable("platform_application_identities", { id: uuid("id").primaryKey().defaultRandom(), applicationId: uuid("application_id").notNull().references(() => platformApplications.id, { onDelete: "cascade" }), platform: text("platform").notNull(), environment: platformEnvironment("environment").notNull(), buildId: text("build_id").notNull(), bundleOrPackageId: text("bundle_or_package_id"), signingIdentity: text("signing_identity"), host: text("host"), attestationRequired: boolean("attestation_required").notNull().default(true), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() }, (table) => [uniqueIndex("platform_app_identity_unique_idx").on(table.applicationId, table.platform, table.environment, table.buildId)]);
export const platformPlans = pgTable("platform_plans", { id: uuid("id").primaryKey().defaultRandom(), productId: uuid("product_id").notNull().references(() => platformProducts.id, { onDelete: "restrict" }), slug: text("slug").notNull(), name: text("name").notNull(), seatLimit: integer("seat_limit").notNull().default(1), deviceLimit: integer("device_limit").notNull().default(1), onlineLeaseSeconds: integer("online_lease_seconds").notNull().default(3600), offlineLeaseSeconds: integer("offline_lease_seconds").notNull().default(86400), graceSeconds: integer("grace_seconds").notNull().default(300), usageLimits: jsonb("usage_limits").$type<Record<string, number>>().notNull().default({}), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() }, (table) => [uniqueIndex("platform_plans_product_slug_idx").on(table.productId, table.slug)]);
export const platformPlanEntitlements = pgTable("platform_plan_entitlements", { id: uuid("id").primaryKey().defaultRandom(), planId: uuid("plan_id").notNull().references(() => platformPlans.id, { onDelete: "cascade" }), featureId: text("feature_id").notNull(), configuration: jsonb("configuration").notNull().default({}), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() }, (table) => [uniqueIndex("platform_plan_entitlements_unique_idx").on(table.planId, table.featureId)]);
export const platformLicenses = pgTable("platform_licenses", { id: uuid("id").primaryKey().defaultRandom(), organizationId: uuid("organization_id").notNull().references(() => platformOrganizations.id, { onDelete: "restrict" }), customerId: uuid("customer_id").notNull().references(() => platformCustomers.id, { onDelete: "restrict" }), productId: uuid("product_id").notNull().references(() => platformProducts.id, { onDelete: "restrict" }), applicationId: uuid("application_id").notNull().references(() => platformApplications.id, { onDelete: "restrict" }), planId: uuid("plan_id").notNull().references(() => platformPlans.id, { onDelete: "restrict" }), kind: platformLicenseKind("kind").notNull(), status: platformLicenseStatus("status").notNull().default("active"), version: integer("version").notNull().default(1), keyPrefix: text("key_prefix"), keyHash: text("key_hash"), startsAt: timestamp("starts_at", { withTimezone: true }).notNull().defaultNow(), expiresAt: timestamp("expires_at", { withTimezone: true }), suspendedAt: timestamp("suspended_at", { withTimezone: true }), revokedAt: timestamp("revoked_at", { withTimezone: true }), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow() }, (table) => [uniqueIndex("platform_licenses_key_prefix_idx").on(table.keyPrefix), index("platform_licenses_org_idx").on(table.organizationId, table.createdAt)]);
export const platformLicenseVersions = pgTable("platform_license_versions", { id: uuid("id").primaryKey().defaultRandom(), licenseId: uuid("license_id").notNull().references(() => platformLicenses.id, { onDelete: "cascade" }), version: integer("version").notNull(), snapshot: jsonb("snapshot").notNull(), createdBy: text("created_by").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() }, (table) => [uniqueIndex("platform_license_versions_unique_idx").on(table.licenseId, table.version)]);
export const platformSeats = pgTable("platform_seats", { id: uuid("id").primaryKey().defaultRandom(), licenseId: uuid("license_id").notNull().references(() => platformLicenses.id, { onDelete: "cascade" }), assigneeId: text("assignee_id"), transferredAt: timestamp("transferred_at", { withTimezone: true }), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() }, (table) => [index("platform_seats_license_idx").on(table.licenseId)]);
export const platformInstallations = pgTable("platform_installations", { id: uuid("id").primaryKey().defaultRandom(), licenseId: uuid("license_id").notNull().references(() => platformLicenses.id, { onDelete: "restrict" }), applicationIdentityId: uuid("application_identity_id").notNull().references(() => platformApplicationIdentities.id, { onDelete: "restrict" }), pseudonymousDeviceIdHash: text("pseudonymous_device_id_hash").notNull(), activatedAt: timestamp("activated_at", { withTimezone: true }).notNull().defaultNow(), deactivatedAt: timestamp("deactivated_at", { withTimezone: true }), lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow() }, (table) => [index("platform_installations_license_idx").on(table.licenseId, table.deactivatedAt), uniqueIndex("platform_installations_device_idx").on(table.licenseId, table.pseudonymousDeviceIdHash)]);
export const platformActivations = pgTable("platform_activations", { id: uuid("id").primaryKey().defaultRandom(), licenseId: uuid("license_id").notNull().references(() => platformLicenses.id, { onDelete: "restrict" }), installationId: uuid("installation_id").notNull().references(() => platformInstallations.id, { onDelete: "restrict" }), status: text("status").notNull().default("active"), ipHash: text("ip_hash"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() }, (table) => [index("platform_activations_license_idx").on(table.licenseId, table.createdAt)]);
export const platformOfflineLeases = pgTable("platform_offline_leases", { id: uuid("id").primaryKey().defaultRandom(), licenseId: uuid("license_id").notNull().references(() => platformLicenses.id, { onDelete: "restrict" }), installationId: uuid("installation_id").notNull().references(() => platformInstallations.id, { onDelete: "restrict" }), keyId: text("key_id").notNull(), receiptHash: text("receipt_hash").notNull(), expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), graceEndsAt: timestamp("grace_ends_at", { withTimezone: true }).notNull(), revokedAt: timestamp("revoked_at", { withTimezone: true }), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() }, (table) => [index("platform_offline_leases_install_idx").on(table.installationId, table.expiresAt)]);
export const platformSigningKeys = pgTable("platform_signing_keys", { id: text("id").primaryKey(), algorithm: text("algorithm").notNull().default("Ed25519"), publicKeyPem: text("public_key_pem").notNull(), privateKeyReference: text("private_key_reference").notNull(), status: text("status").notNull().default("active"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), retiredAt: timestamp("retired_at", { withTimezone: true }) });
export const platformLicenseAudit = pgTable("platform_license_audit", { id: uuid("id").primaryKey().defaultRandom(), actor: text("actor").notNull(), action: text("action").notNull(), targetType: text("target_type").notNull(), targetId: text("target_id").notNull(), metadata: jsonb("metadata").notNull().default({}), ipHash: text("ip_hash"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() }, (table) => [index("platform_license_audit_target_idx").on(table.targetType, table.targetId, table.createdAt)]);
export const platformWebhooks = pgTable("platform_webhooks", { id: uuid("id").primaryKey().defaultRandom(), organizationId: uuid("organization_id").notNull().references(() => platformOrganizations.id, { onDelete: "cascade" }), url: text("url").notNull(), secretReference: text("secret_reference").notNull(), events: jsonb("events").$type<string[]>().notNull().default([]), isActive: boolean("is_active").notNull().default(true), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() });
export const platformIdempotencyRecords = pgTable("platform_idempotency_records", { id: uuid("id").primaryKey().defaultRandom(), scope: text("scope").notNull(), key: text("key").notNull(), requestHash: text("request_hash").notNull(), response: jsonb("response").notNull(), expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() }, (table) => [uniqueIndex("platform_idempotency_scope_key_idx").on(table.scope, table.key), index("platform_idempotency_expiry_idx").on(table.expiresAt)]);
export const platformUsageReports = pgTable("platform_usage_reports", { id: uuid("id").primaryKey().defaultRandom(), installationId: uuid("installation_id").notNull().references(() => platformInstallations.id, { onDelete: "restrict" }), periodStart: timestamp("period_start", { withTimezone: true }).notNull(), periodEnd: timestamp("period_end", { withTimezone: true }).notNull(), counters: jsonb("counters").$type<Record<string, number>>().notNull(), signature: text("signature").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() }, (table) => [uniqueIndex("platform_usage_reports_period_idx").on(table.installationId, table.periodStart, table.periodEnd)]);
