"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Boxes, LoaderCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Package = {
  id: string;
  title: string;
  description: string;
  status: string;
  updatedAt: Date;
};

export function DistributionConsole({
  packages,
  readiness,
}: {
  packages: Package[];
  readiness: {
    deliveryEnabled: boolean;
    databaseReady: boolean;
    privateStorageReady: boolean;
  };
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function create() {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/v1/studio/distribution/packages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        status: "draft",
        availableAt: null,
        embargoAt: null,
        expiresAt: null,
        downloadPolicy: "view_only",
        termsText: "",
      }),
    });
    const payload = (await response.json()) as {
      data?: { id: string };
      error?: { message?: string };
    };
    if (response.ok && payload.data) {
      router.push(`/studio/distribution/${payload.data.id}`);
    } else {
      setMessage(payload.error?.message ?? "Package creation failed");
      setBusy(false);
    }
  }

  return (
    <div className="max-w-6xl">
      <div>
        <p className="text-sm font-semibold text-primary">Private distribution</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          Release packages
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Share advance stories and private media with specifically authorized,
          verified accounts. Distribution never publishes content to the
          Courier.
        </p>
      </div>
      <div className={`mt-5 rounded-lg border p-4 text-sm ${readiness.deliveryEnabled && readiness.databaseReady && readiness.privateStorageReady ? "border-emerald-400/30 bg-emerald-400/10" : "border-amber-400/40 bg-amber-400/10"}`}>
        <strong>
          {readiness.deliveryEnabled &&
          readiness.databaseReady &&
          readiness.privateStorageReady
            ? "Recipient delivery is ready"
            : "Recipient delivery is not ready"}
        </strong>
        <p className="mt-1 text-muted-foreground">
          Runtime gate {readiness.deliveryEnabled ? "enabled" : "disabled"} ·
          database {readiness.databaseReady ? "connected" : "missing"} ·
          private Blob {readiness.privateStorageReady ? "connected" : "missing"}.
          Staff may prepare drafts, but recipients receive no content until
          every requirement is ready.
        </p>
      </div>
      <div className="mt-7 grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="size-4" /> New package
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="distribution-title">Package title</Label>
              <Input
                id="distribution-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={160}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="distribution-description">Description</Label>
              <Textarea
                id="distribution-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={2_000}
              />
            </div>
            <Button
              className="w-full"
              disabled={busy || title.trim().length < 3}
              onClick={() => void create()}
            >
              {busy ? <LoaderCircle className="animate-spin" /> : <Plus />}
              Create private package
            </Button>
            {message ? (
              <p className="text-sm text-destructive" role="status">
                {message}
              </p>
            ) : null}
          </CardContent>
        </Card>
        <div className="space-y-3">
          {packages.length ? (
            packages.map((record) => (
              <Link key={record.id} href={`/studio/distribution/${record.id}`}>
                <Card className="transition-colors hover:border-primary/50">
                  <CardContent className="flex items-center gap-4 p-5">
                    <div className="grid size-11 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                      <Boxes className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <h2 className="truncate font-semibold">{record.title}</h2>
                        <span className="rounded-full border px-2 py-1 text-[.62rem] font-black uppercase">
                          {record.status}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm text-muted-foreground">
                        {record.description || "No description"}
                      </p>
                      <small className="text-muted-foreground">
                        Updated {new Date(record.updatedAt).toLocaleString()}
                      </small>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          ) : (
            <div className="grid min-h-72 place-content-center justify-items-center rounded-lg border border-dashed text-center">
              <Boxes className="size-8 text-muted-foreground" />
              <h2 className="mt-3 font-semibold">No packages yet</h2>
              <p className="max-w-sm text-sm text-muted-foreground">
                Create a draft package, attach private files or an approved
                advance story, then grant access.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
