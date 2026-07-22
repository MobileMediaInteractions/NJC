"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { managedStaffRoles, type StudioAccountProfile } from "@/lib/studio-account-types";

const roleDescriptions = {
  reader: "Public account only; no Studio or employee access.",
  contributor: "Can prepare contributed work but cannot enter the employee app.",
  reporter: "Can use Studio and employee communication, and submit reporting for review.",
  producer: "Can publish and operate live, alert and editorial tools.",
  editor: "Can publish, manage chat and review employee access requests.",
  admin: "Full newsroom, configuration, user and permission administration.",
} as const;

export function UserProfileEditor({ initialAccount, currentUserId }: { initialAccount: StudioAccountProfile; currentUserId: string }) {
  const router = useRouter();
  const [account, setAccount] = useState(initialAccount);
  const [firstName, setFirstName] = useState(initialAccount.firstName);
  const [lastName, setLastName] = useState(initialAccount.lastName);
  const [title, setTitle] = useState(initialAccount.title ?? "");
  const [role, setRole] = useState<keyof typeof roleDescriptions>(initialAccount.role ?? "reader");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const editingSelf = account.id === currentUserId;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`/api/v1/studio/users/${encodeURIComponent(account.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, title, role: role === "reader" ? null : role }),
      });
      const result = await response.json() as { data?: StudioAccountProfile; error?: { message?: string; details?: { formErrors?: string[]; fieldErrors?: Record<string, string[]> } } };
      if (!response.ok || !result.data) {
        const detail = result.error?.details?.formErrors?.[0] ?? Object.values(result.error?.details?.fieldErrors ?? {}).flat()[0];
        throw new Error(detail ?? result.error?.message ?? "The user profile could not be saved");
      }
      setAccount(result.data);
      setFirstName(result.data.firstName);
      setLastName(result.data.lastName);
      setTitle(result.data.title ?? "");
      setRole(result.data.role ?? "reader");
      setMessage("Profile and newsroom access updated.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The user profile could not be saved");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Editable profile</CardTitle><CardDescription>Names and role are written to Clerk. The newsroom title is stored in the Courier database.</CardDescription></CardHeader>
      <CardContent>
        <form onSubmit={save} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="account-first-name">First name</Label><Input id="account-first-name" value={firstName} maxLength={100} onChange={(event) => setFirstName(event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="account-last-name">Last name</Label><Input id="account-last-name" value={lastName} maxLength={100} onChange={(event) => setLastName(event.target.value)} /></div>
          </div>
          <div className="space-y-2"><Label htmlFor="account-title">Newsroom title</Label><Input id="account-title" value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} placeholder="Middlesex County reporter" /><p className="text-xs text-muted-foreground">Used in the employee directory. It does not grant permissions.</p></div>
          <div className="space-y-2">
            <Label htmlFor="account-role">Role and access</Label>
            <Select value={role} onValueChange={(value) => setRole(value as typeof role)} disabled={editingSelf}>
              <SelectTrigger id="account-role" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="reader">Reader · no Studio access</SelectItem>{managedStaffRoles.map((value) => <SelectItem key={value} value={value} className="capitalize">{value}</SelectItem>)}</SelectContent>
            </Select>
            <p className="text-xs leading-5 text-muted-foreground">{roleDescriptions[role]}</p>
          </div>
          {editingSelf ? <div className="flex gap-3 rounded-lg border border-amber-400/40 bg-amber-400/10 p-4 text-sm"><ShieldAlert className="mt-0.5 size-5 shrink-0" /><p>Your own role is locked here to prevent accidental administrator lockout. Another administrator can change it.</p></div> : null}
          {message ? <p role="status" className="flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-300"><CheckCircle2 className="size-4" />{message}</p> : null}
          {error ? <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : null}Save user</Button>
        </form>
      </CardContent>
    </Card>
  );
}
