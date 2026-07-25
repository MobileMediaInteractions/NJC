import { getSiteOrigin } from "@/lib/origin";

export interface AuthorProfile {
  slug: string;
  name: string;
  description: string;
}

const authorProfiles = [
  {
    slug: "abdullah-muzammil",
    name: "Abdullah Muzammil",
    description:
      "Reporting and contributions published by Abdullah Muzammil for The New Jersey Courier.",
  },
] as const satisfies readonly AuthorProfile[];

function normalizedName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

export function getAuthorProfileBySlug(slug: string) {
  return authorProfiles.find((profile) => profile.slug === slug);
}

export function getAuthorProfileByName(name: string) {
  const candidate = normalizedName(name);
  return authorProfiles.find(
    (profile) => normalizedName(profile.name) === candidate,
  );
}

export function getAuthorProfileUrl(name: string) {
  const profile = getAuthorProfileByName(name);
  return profile
    ? new URL(`/author/${profile.slug}`, getSiteOrigin()).toString()
    : undefined;
}

export function getAuthorProfilePaths() {
  return authorProfiles.map((profile) => `/author/${profile.slug}`);
}
