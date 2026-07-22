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

export const audienceInstallations = pgTable(
  "audience_installations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    installationId: text("installation_id").notNull(),
    platform: text("platform").notNull(),
    source: text("source").notNull().default("unknown"),
    appVersion: text("app_version"),
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
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

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
