import assert from "node:assert/strict";
import test from "node:test";
import {
  createStaffProfileSlug,
  getStaffProfileMissingFields,
  hasVisibleStaffProfile,
  isPublicStaffProfileVisible,
  isStaffProfileComplete,
  shouldPublishStaffProfile,
  staffBiographyMinimumLength,
  staffProfileUpdateSchema,
} from "../src/lib/staff-profile-policy";

test("staff profiles remain private until every public field is complete", () => {
  assert.equal(
    isStaffProfileComplete({
      displayName: "Jamie Rivera",
      title: "",
      bio: "Short biography",
    }),
    false,
  );
  assert.deepEqual(
    getStaffProfileMissingFields({
      displayName: "Jamie Rivera",
      title: "",
      bio: "Short biography",
    }),
    ["newsroom title", `biography (${staffBiographyMinimumLength}+ characters)`],
  );
});

test("an email fallback cannot become a public staff name", () => {
  assert.deepEqual(
    getStaffProfileMissingFields({
      displayName: "reporter@example.com",
      title: "Reporter",
      bio: "This biography is intentionally long enough to satisfy the public profile publication threshold for newsroom staff.",
    }),
    ["verified public name"],
  );
});

test("a complete staff profile is eligible for manual publication", () => {
  const complete = {
    displayName: "Jamie Rivera",
    title: "Middlesex County reporter",
    bio: "Jamie Rivera reports on municipal government, public schools and the people shaping daily life across Middlesex County, New Jersey.",
  };
  assert.equal(
    isStaffProfileComplete(complete),
    true,
  );
  assert.equal(
    shouldPublishStaffProfile({
      ...complete,
      requested: false,
      isActive: true,
    }),
    false,
  );
  assert.equal(
    shouldPublishStaffProfile({
      ...complete,
      requested: true,
      isActive: true,
    }),
    true,
  );
  assert.equal(
    shouldPublishStaffProfile({
      ...complete,
      requested: true,
      isActive: false,
    }),
    false,
  );
  assert.equal(
    shouldPublishStaffProfile({
      ...complete,
      bio: "",
      requested: true,
      isActive: true,
    }),
    false,
  );
});

test("public staff slugs are stable and URL safe", () => {
  assert.equal(createStaffProfileSlug("  Abdullah Muzammil  "), "abdullah-muzammil");
  assert.equal(createStaffProfileSlug("Renée O'Connor"), "renee-o-connor");
});

test("the public directory includes only explicitly published valid profiles", () => {
  const complete = {
    isActive: true,
    displayName: "Jamie Rivera",
    title: "Middlesex County reporter",
    bio: "Jamie Rivera reports on municipal government, public schools and the people shaping daily life across Middlesex County, New Jersey.",
    publicSlug: "jamie-rivera",
    publicProfilePublishedAt: new Date("2026-07-28T12:00:00.000Z"),
  };

  assert.equal(isPublicStaffProfileVisible(complete), true);
  assert.equal(
    isPublicStaffProfileVisible({
      ...complete,
      publicProfilePublishedAt: null,
    }),
    false,
  );
  assert.equal(
    isPublicStaffProfileVisible({ ...complete, publicSlug: null }),
    false,
  );
  assert.equal(
    isPublicStaffProfileVisible({ ...complete, bio: "" }),
    false,
  );
  assert.equal(
    isPublicStaffProfileVisible({ ...complete, isActive: false }),
    false,
  );
  assert.equal(hasVisibleStaffProfile([]), false);
  assert.equal(
    hasVisibleStaffProfile([
      { ...complete, publicProfilePublishedAt: null },
      complete,
    ]),
    true,
  );
});

test("staff profile updates allow drafts while bounding stored content", () => {
  assert.equal(
    staffProfileUpdateSchema.safeParse({
      title: "",
      bio: "",
      publishToStaffPage: false,
    }).success,
    true,
  );
  assert.equal(
    staffProfileUpdateSchema.safeParse({
      title: "x".repeat(121),
      bio: "Biography",
      publishToStaffPage: true,
    }).success,
    false,
  );
  assert.equal(
    staffProfileUpdateSchema.safeParse({ title: "", bio: "" }).success,
    true,
  );
});
