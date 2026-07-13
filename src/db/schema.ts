import {
  boolean,
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

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkId: text("clerk_id").notNull(),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    role: staffRole("role").notNull().default("contributor"),
    title: text("title"),
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
    categorySlug: text("category_slug").notNull().default("local"),
    categoryLabel: text("category_label").notNull().default("Local"),
    location: text("location").notNull().default("Harbor County"),
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
    imageUrl: text("image_url"),
    imageAlt: text("image_alt"),
    videoUrl: text("video_url"),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    readingMinutes: integer("reading_minutes").notNull().default(1),
    isBreaking: boolean("is_breaking").notNull().default(false),
    isLive: boolean("is_live").notNull().default(false),
    isExclusive: boolean("is_exclusive").notNull().default(false),
    isDeveloping: boolean("is_developing").notNull().default(false),
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
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("story_revisions_story_idx").on(table.storyId)],
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
    uploadedById: uuid("uploaded_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("media_pathname_idx").on(table.pathname)],
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
