import assert from "node:assert/strict";
import test from "node:test";
import {
  createStaffProfileSlug,
  getStaffProfileMissingFields,
  isStaffProfileComplete,
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

test("a complete staff profile is eligible for automatic publication", () => {
  assert.equal(
    isStaffProfileComplete({
      displayName: "Jamie Rivera",
      title: "Middlesex County reporter",
      bio: "Jamie Rivera reports on municipal government, public schools and the people shaping daily life across Middlesex County, New Jersey.",
    }),
    true,
  );
});

test("public staff slugs are stable and URL safe", () => {
  assert.equal(createStaffProfileSlug("  Abdullah Muzammil  "), "abdullah-muzammil");
  assert.equal(createStaffProfileSlug("Renée O'Connor"), "renee-o-connor");
});

test("staff profile updates allow drafts while bounding stored content", () => {
  assert.equal(
    staffProfileUpdateSchema.safeParse({ title: "", bio: "" }).success,
    true,
  );
  assert.equal(
    staffProfileUpdateSchema.safeParse({
      title: "x".repeat(121),
      bio: "Biography",
    }).success,
    false,
  );
});
