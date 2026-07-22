import Link from "next/link";
import { ChevronLeft, ChevronRight, Search, ShieldCheck, UsersRound } from "lucide-react";
import { StudioGate } from "@/components/studio/studio-gate";
import { StudioShell } from "@/components/studio/studio-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getStudioUser } from "@/lib/auth";
import { listStudioAccounts } from "@/lib/studio-accounts";

export const dynamic = "force-dynamic";

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const viewer = await getStudioUser();
  if (!viewer) return <StudioGate><></></StudioGate>;
  if (viewer.role !== "admin") {
    return <StudioShell viewer={viewer}><Card><CardHeader><CardTitle>User management is restricted</CardTitle><CardDescription>An administrator role is required to view account details and change newsroom roles.</CardDescription></CardHeader></Card></StudioShell>;
  }

  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  let directory: Awaited<ReturnType<typeof listStudioAccounts>> | null = null;
  try {
    directory = await listStudioAccounts({ query, page, pageSize: 25 });
  } catch (error) {
    console.error("Studio Clerk directory lookup failed", error);
  }

  return (
    <StudioShell viewer={viewer}>
      <div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Users & roles</h1>
            <p className="mt-1 text-sm text-muted-foreground">Every Clerk account, including readers who have never entered Studio.</p>
          </div>
          <Badge variant={directory ? "secondary" : "outline"}>{directory ? `${directory.totalCount} total accounts` : "Identity directory unavailable"}</Badge>
        </div>

        <Card className="mt-7">
          <CardHeader className="gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div><CardTitle>Account directory</CardTitle><CardDescription>Select a person to inspect identity, security, linked sign-ins and newsroom access.</CardDescription></div>
            <form method="get" className="flex w-full max-w-sm gap-2">
              <Input name="q" defaultValue={query} aria-label="Search users" placeholder="Name, email, phone or user ID" />
              <Button type="submit" variant="secondary"><Search /> Search</Button>
            </form>
          </CardHeader>
          <CardContent>
            {!directory ? <DirectoryUnavailable /> : directory.accounts.length ? (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead>Account</TableHead><TableHead>Role</TableHead><TableHead>Security</TableHead><TableHead>Last active</TableHead><TableHead>Status</TableHead><TableHead><span className="sr-only">Open</span></TableHead></TableRow></TableHeader>
                    <TableBody>{directory.accounts.map((account) => {
                      const initials = account.displayName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
                      return <TableRow key={account.id}>
                        <TableCell><Link href={`/studio/team/${account.id}`} className="flex items-center gap-3 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"><Avatar><AvatarImage src={account.imageUrl} alt="" /><AvatarFallback>{initials}</AvatarFallback></Avatar><div><p className="font-medium group-hover:underline">{account.displayName}</p><p className="text-xs text-muted-foreground">{account.primaryEmail ?? "No primary email"}</p>{account.title ? <p className="mt-0.5 text-xs text-muted-foreground">{account.title}</p> : null}</div></Link></TableCell>
                        <TableCell>{account.role ? <Badge variant="secondary" className="capitalize">{account.role}</Badge> : <Badge variant="outline">Reader</Badge>}</TableCell>
                        <TableCell>{account.twoFactorEnabled ? <span className="flex items-center gap-1.5 text-sm text-emerald-400"><ShieldCheck className="size-4" /> 2FA</span> : <span className="text-sm text-muted-foreground">Standard</span>}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(account.lastActiveAt)}</TableCell>
                        <TableCell><StatusBadge status={account.status} /></TableCell>
                        <TableCell><Button asChild size="sm" variant="ghost"><Link href={`/studio/team/${account.id}`}>View</Link></Button></TableCell>
                      </TableRow>;
                    })}</TableBody>
                  </Table>
                </div>
                <Pagination page={directory.page} pageCount={directory.pageCount} query={query} />
              </>
            ) : (
              <div className="grid min-h-64 place-items-center border border-dashed px-6 text-center"><div><UsersRound className="mx-auto size-8 text-muted-foreground" /><h2 className="mt-3 font-semibold">No matching accounts</h2><p className="mt-1 text-sm text-muted-foreground">Try another name, email address, phone number or Clerk user ID.</p>{query ? <Button asChild variant="outline" className="mt-4"><Link href="/studio/team">Clear search</Link></Button> : null}</div></div>
            )}
          </CardContent>
        </Card>
      </div>
    </StudioShell>
  );
}

function DirectoryUnavailable() {
  return <div className="grid min-h-64 place-items-center border border-dashed px-6 text-center"><div><UsersRound className="mx-auto size-8 text-muted-foreground" /><h2 className="mt-3 font-semibold">Clerk directory unavailable</h2><p className="mt-1 max-w-lg text-sm text-muted-foreground">Check the Clerk secret key and identity service status. No cached database list is substituted because it would omit reader accounts.</p></div></div>;
}

function Pagination({ page, pageCount, query }: { page: number; pageCount: number; query: string }) {
  if (pageCount <= 1) return null;
  const href = (nextPage: number) => `/studio/team?${new URLSearchParams({ ...(query ? { q: query } : {}), page: String(nextPage) }).toString()}`;
  return <div className="mt-5 flex items-center justify-between border-t pt-5"><p className="text-xs text-muted-foreground">Page {page} of {pageCount}</p><div className="flex gap-2"><Button asChild={page > 1} variant="outline" size="sm" disabled={page <= 1}>{page > 1 ? <Link href={href(page - 1)}><ChevronLeft /> Previous</Link> : <><ChevronLeft /> Previous</>}</Button><Button asChild={page < pageCount} variant="outline" size="sm" disabled={page >= pageCount}>{page < pageCount ? <Link href={href(page + 1)}>Next <ChevronRight /></Link> : <>Next <ChevronRight /></>}</Button></div></div>;
}

function StatusBadge({ status }: { status: "active" | "banned" | "locked" }) {
  return <Badge variant={status === "active" ? "outline" : "destructive"} className="capitalize">{status}</Badge>;
}

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Never";
}
