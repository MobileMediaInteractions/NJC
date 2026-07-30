import { z } from "zod";

export const notificationStaffRoles = [
  "admin",
  "editor",
  "producer",
  "reporter",
  "contributor",
] as const;

export const notificationNjcPlusSegments = [
  "member",
  "trial",
  "complimentary",
  "invited_beta_tester",
] as const;

const clerkId = z.string().trim().regex(/^user_[A-Za-z0-9_-]{5,120}$/);

export const notificationAudienceSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("sitewide") }).strict(),
  z.object({
    type: z.literal("accounts"),
    userClerkIds: z.array(clerkId).min(1).max(100)
      .transform((values) => [...new Set(values)]),
  }).strict(),
  z.object({
    type: z.literal("staff_roles"),
    roles: z.array(z.enum(notificationStaffRoles)).min(1).max(notificationStaffRoles.length)
      .transform((values) => [...new Set(values)]),
  }).strict(),
  z.object({
    type: z.literal("njc_plus_segment"),
    segment: z.enum(notificationNjcPlusSegments),
  }).strict(),
]);

const notificationCampaignFields = {
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().min(3).max(240),
  destination: z.string().trim().max(300).default("/"),
  audience: notificationAudienceSchema,
};

function normalizeCampaignDestination<
  Value extends { destination: string },
>(value: Value, context: z.RefinementCtx) {
  const destination = normalizeNotificationDestination(value.destination);
  if (!destination) {
    context.addIssue({
      code: "custom",
      path: ["destination"],
      message: "Choose a public local Courier destination",
    });
    return z.NEVER;
  }
  return { ...value, destination };
}

export const notificationCampaignDraftSchema = z.object(
  notificationCampaignFields,
).strict().transform(normalizeCampaignDestination);

export const notificationCampaignInputSchema = z.object({
  ...notificationCampaignFields,
  confirmed: z.literal(true),
}).strict().transform(normalizeCampaignDestination);

export const webPushSubscriptionSchema = z.object({
  endpoint: z.url({ protocol: /^https$/ }).max(2_048),
  expirationTime: z.number().int().nonnegative().nullable().optional(),
  keys: z.object({
    p256dh: z.string().trim().min(32).max(512).regex(/^[A-Za-z0-9_-]+={0,2}$/),
    auth: z.string().trim().min(8).max(256).regex(/^[A-Za-z0-9_-]+={0,2}$/),
  }).strict(),
}).strict();

export const webPushUnsubscribeSchema = z.object({
  endpoint: z.url({ protocol: /^https$/ }).max(2_048),
}).strict();

export type NotificationAudience = z.infer<typeof notificationAudienceSchema>;
export type NotificationCampaignDraft = z.output<typeof notificationCampaignDraftSchema>;
export type NotificationCampaignInput = z.output<typeof notificationCampaignInputSchema>;

export function notificationAudienceAllowed(
  audience: NotificationAudience,
  policy: {
    allowSitewideAudience: boolean;
    allowAccountAudience: boolean;
    allowRoleAudience: boolean;
    allowNjcPlusAudience: boolean;
  },
) {
  if (audience.type === "sitewide") return policy.allowSitewideAudience;
  if (audience.type === "accounts") return policy.allowAccountAudience;
  if (audience.type === "staff_roles") return policy.allowRoleAudience;
  return policy.allowNjcPlusAudience;
}

const privateDestinationPrefixes = [
  "/api",
  "/studio",
  "/distribution",
  "/developers",
  "/profile",
  "/sign-in",
  "/sign-up",
] as const;

export function normalizeNotificationDestination(value: string) {
  if (!value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(value)) {
    return null;
  }
  try {
    const parsed = new URL(value, "https://notifications.invalid");
    if (parsed.origin !== "https://notifications.invalid") return null;
    const pathname = parsed.pathname.replace(/\/{2,}/g, "/");
    if (
      privateDestinationPrefixes.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
      )
    ) {
      return null;
    }
    return `${pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

export function notificationAudienceSpec(audience: NotificationAudience) {
  if (audience.type === "accounts") return { userClerkIds: audience.userClerkIds };
  if (audience.type === "staff_roles") return { roles: audience.roles };
  if (audience.type === "njc_plus_segment") return { segment: audience.segment };
  return {};
}

export function uniqueNotificationIds(values: readonly string[]) {
  return [...new Set(values.filter(Boolean))];
}

export function countNotificationRecipients(
  subscriptions: readonly { id: string; userClerkId: string | null }[],
) {
  return new Set(
    subscriptions.map((subscription) =>
      subscription.userClerkId ?? `anonymous:${subscription.id}`),
  ).size;
}

export function resolveExclusiveNjcPlusSegment(
  segment: (typeof notificationNjcPlusSegments)[number],
  input: {
    member: readonly string[];
    trial: readonly string[];
    complimentary: readonly string[];
    invitedBetaTester: readonly string[];
  },
) {
  const member = uniqueNotificationIds(input.member);
  const trial = withoutNotificationIds(uniqueNotificationIds(input.trial), member);
  const complimentary = withoutNotificationIds(
    uniqueNotificationIds(input.complimentary),
    [...member, ...trial],
  );
  const invitedBetaTester = withoutNotificationIds(
    uniqueNotificationIds(input.invitedBetaTester),
    [...member, ...trial, ...complimentary],
  );
  if (segment === "member") return member;
  if (segment === "trial") return trial;
  if (segment === "complimentary") return complimentary;
  return invitedBetaTester;
}

function withoutNotificationIds(values: string[], excluded: string[]) {
  const blocked = new Set(excluded);
  return values.filter((value) => !blocked.has(value));
}
