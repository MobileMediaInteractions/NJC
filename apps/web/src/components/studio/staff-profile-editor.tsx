"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  CircleDashed,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  getStaffProfileMissingFields,
  staffBiographyMaximumLength,
  staffBiographyMinimumLength,
} from "@/lib/staff-profile-policy";
import type { StaffProfileDraft } from "@/lib/staff-profiles";

export function StaffProfileEditor({
  initialProfile,
}: {
  initialProfile: StaffProfileDraft;
}) {
  const [profile, setProfile] = useState(initialProfile);
  const [title, setTitle] = useState(initialProfile.title);
  const [bio, setBio] = useState(initialProfile.bio);
  const [publishToStaffPage, setPublishToStaffPage] = useState(
    Boolean(initialProfile.publicProfilePublishedAt),
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const missing = getStaffProfileMissingFields({
    displayName: profile.displayName,
    title,
    bio,
  });
  const ready = missing.length === 0;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/v1/studio/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          bio,
          publishToStaffPage: ready && publishToStaffPage,
        }),
      });
      const payload = (await response.json()) as {
        data?: StaffProfileDraft;
        error?: {
          message?: string;
          details?: {
            formErrors?: string[];
            fieldErrors?: Record<string, string[]>;
          };
        };
      };
      if (!response.ok || !payload.data) {
        const detail =
          payload.error?.details?.formErrors?.[0] ??
          Object.values(payload.error?.details?.fieldErrors ?? {}).flat()[0];
        throw new Error(
          detail ??
            payload.error?.message ??
            "The public profile could not be saved",
        );
      }
      setProfile(payload.data);
      setTitle(payload.data.title);
      setBio(payload.data.bio);
      setPublishToStaffPage(Boolean(payload.data.publicProfilePublishedAt));
      setMessage(
        payload.data.publicProfilePublishedAt
          ? "Saved and published to the Courier staff page."
          : "Profile saved as a private draft.",
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The public profile could not be saved",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle>Public staff profile</CardTitle>
            <CardDescription className="mt-1 max-w-2xl">
              Complete your newsroom profile, then choose whether it should
              appear in the public staff directory. Saving a complete profile
              does not publish it automatically.
            </CardDescription>
          </div>
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
              profile.publicProfilePublishedAt
                ? "border-emerald-400/35 bg-emerald-400/10 text-emerald-300"
                : "border-white/15 text-muted-foreground"
            }`}
          >
            {profile.publicProfilePublishedAt ? (
              <CheckCircle2 className="size-3.5" />
            ) : (
              <CircleDashed className="size-3.5" />
            )}
            {profile.publicProfilePublishedAt ? "Published" : "Private draft"}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="space-y-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Public name</Label>
              <Input value={profile.displayName} disabled />
              <p className="text-xs text-muted-foreground">
                This comes from your verified Courier account.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-title">Newsroom title</Label>
              <Input
                id="staff-title"
                value={title}
                maxLength={120}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Middlesex County reporter"
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="staff-biography">About you</Label>
              <span className="text-xs tabular-nums text-muted-foreground">
                {bio.length}/{staffBiographyMaximumLength}
              </span>
            </div>
            <Textarea
              id="staff-biography"
              value={bio}
              maxLength={staffBiographyMaximumLength}
              rows={9}
              onChange={(event) => setBio(event.target.value)}
              placeholder="Tell readers what you cover, your reporting background, your connection to New Jersey and what people can expect from your work."
            />
            <p className="text-xs leading-5 text-muted-foreground">
              Write in the third person or first person. At least{" "}
              {staffBiographyMinimumLength} characters are required before the
              profile can publish.
            </p>
          </div>

          {!ready ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">
                Still needed before publication
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {missing.map((field) => (
                  <li key={field}>{field}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex items-start justify-between gap-5 rounded-lg border p-4">
            <div className="space-y-1">
              <Label htmlFor="publish-staff-profile">
                Show me on the public staff page
              </Label>
              <p className="max-w-2xl text-xs leading-5 text-muted-foreground">
                Turn this on to publish your profile. Turn it off at any time
                to remove yourself from the directory without deleting your
                profile information.
              </p>
              {!ready ? (
                <p className="text-xs font-semibold text-amber-500">
                  Complete the required fields before enabling publication.
                </p>
              ) : null}
            </div>
            <Switch
              id="publish-staff-profile"
              checked={ready && publishToStaffPage}
              disabled={!ready || busy}
              onCheckedChange={setPublishToStaffPage}
              aria-label="Show me on the public staff page"
            />
          </div>

          {message ? (
            <p
              role="status"
              className="flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-300"
            >
              <CheckCircle2 className="size-4" />
              {message}
            </p>
          ) : null}
          {error ? (
            <p
              role="alert"
              className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : null}
              Save profile settings
            </Button>
            {profile.publicSlug && profile.publicProfilePublishedAt ? (
              <Button asChild type="button" variant="outline">
                <Link
                  href={`/author/${profile.publicSlug}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View public profile <ExternalLink />
                </Link>
              </Button>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
