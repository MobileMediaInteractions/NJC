"use client";

import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, LoaderCircle, Search, UserRound, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { StudioAccountSummary } from "@/lib/studio-account-types";

export type GuidedOption = {
  value: string;
  label: string;
  description?: string;
  keywords?: string;
  metadata?: Record<string, string | number | null>;
};

export function StudioAccountPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: StudioAccountSummary | null;
  onChange: (account: StudioAccountSummary | null) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StudioAccountSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const normalized = query.trim();
    if (!open || !normalized) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(
          `/api/v1/studio/accounts/search?q=${encodeURIComponent(normalized)}&limit=10`,
          { signal: controller.signal, cache: "no-store" },
        );
        const payload = await response.json() as {
          data?: StudioAccountSummary[];
          error?: { message?: string };
        };
        if (!response.ok) throw new Error(payload.error?.message ?? "Account search failed");
        setResults(payload.data ?? []);
      } catch (searchError) {
        if (searchError instanceof DOMException && searchError.name === "AbortError") return;
        setResults([]);
        setError(searchError instanceof Error ? searchError.message : "Account search failed");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [open, query]);

  function select(account: StudioAccountSummary) {
    onChange(account);
    setOpen(false);
    setQuery("");
    setResults([]);
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="h-auto min-h-12 w-full justify-between px-3 py-2 text-left"
        onClick={() => setOpen(true)}
        disabled={disabled}
        aria-haspopup="dialog"
      >
        {value ? <AccountIdentity account={value} /> : <span className="flex items-center gap-2 text-muted-foreground"><Search /> Search by name, username, email, or account ID</span>}
        <ChevronsUpDown className="ml-3 size-4 shrink-0 text-muted-foreground" />
      </Button>
      {value ? (
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>Canonical account selected automatically.</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
            <X /> Clear
          </Button>
        </div>
      ) : null}
      <CommandDialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) {
            setQuery("");
            setResults([]);
            setLoading(false);
            setError("");
          }
        }}
        title="Find an account"
        description="Search the authorized Clerk directory by identity details."
        className="sm:max-w-xl"
      >
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={(nextQuery) => {
              setQuery(nextQuery);
              setResults([]);
              setError("");
              setLoading(Boolean(nextQuery.trim()));
            }}
            placeholder="Start typing a name, username, email, or user_ ID…"
            autoFocus
          />
          <CommandList aria-busy={loading}>
            {!query.trim() ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                Results begin after the first character. Exact Clerk IDs remain supported for advanced lookup.
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-muted-foreground" role="status">
                <LoaderCircle className="animate-spin" /> Searching accounts…
              </div>
            ) : error ? (
              <div className="px-4 py-10 text-center text-sm text-destructive" role="alert">{error}</div>
            ) : (
              <>
                <CommandEmpty>No matching accounts.</CommandEmpty>
                <CommandGroup heading={`${results.length} authorized result${results.length === 1 ? "" : "s"}`}>
                  {results.map((account) => (
                    <CommandItem
                      key={account.id}
                      value={account.id}
                      onSelect={() => select(account)}
                      className="py-3"
                    >
                      <AccountIdentity account={account} />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </div>
  );
}

function AccountIdentity({ account }: { account: StudioAccountSummary }) {
  const initials = account.displayName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return (
    <span className="flex min-w-0 items-center gap-3">
      <Avatar>
        <AvatarImage src={account.imageUrl} alt="" />
        <AvatarFallback>{initials || <UserRound />}</AvatarFallback>
      </Avatar>
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2">
          <strong className="truncate">{account.displayName}</strong>
          <Badge variant={account.role ? "secondary" : "outline"} className="capitalize">{account.role ?? "reader"}</Badge>
        </span>
        <span className="block truncate text-xs font-normal text-muted-foreground">
          {account.username ? `@${account.username} · ` : ""}{account.primaryEmail ?? "No primary email"}
          {account.title ? ` · ${account.title}` : ""}
        </span>
      </span>
    </span>
  );
}

export function GuidedEntityPicker({
  label,
  value,
  options,
  onChange,
  placeholder = "Choose an item",
  emptyMessage = "No matching items.",
  disabled = false,
  allowClear = true,
}: {
  label: string;
  value: string | null;
  options: GuidedOption[];
  onChange: (value: string | null) => void;
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  allowClear?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="h-auto min-h-10 w-full justify-between px-3 py-2 text-left font-normal"
        onClick={() => setOpen(true)}
        disabled={disabled}
        aria-haspopup="dialog"
      >
        <span className="min-w-0">
          <span className={cn("block truncate", !selected && "text-muted-foreground")}>{selected?.label ?? placeholder}</span>
          {selected?.description ? <span className="block truncate text-xs text-muted-foreground">{selected.description}</span> : null}
        </span>
        <ChevronsUpDown className="ml-3 size-4 shrink-0 text-muted-foreground" />
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} title={label} description={`Search and select ${label.toLowerCase()}.`} className="sm:max-w-lg">
        <Command>
          <CommandInput placeholder={`Search ${label.toLowerCase()}…`} autoFocus />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {allowClear ? (
                <CommandItem value="none clear" onSelect={() => { onChange(null); setOpen(false); }}>
                  <span className="text-muted-foreground">None</span>
                </CommandItem>
              ) : null}
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={`${option.label} ${option.description ?? ""} ${option.keywords ?? ""}`}
                  data-checked={option.value === value}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className="py-3"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{option.label}</span>
                    {option.description ? <span className="block truncate text-xs text-muted-foreground">{option.description}</span> : null}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </div>
  );
}

export function GuidedEntityMultiPicker({
  label,
  values,
  options,
  onChange,
  placeholder = "Choose items",
  disabled = false,
}: {
  label: string;
  values: string[];
  options: GuidedOption[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.filter((option) => values.includes(option.value));
  function toggle(value: string) {
    onChange(values.includes(value)
      ? values.filter((item) => item !== value)
      : [...values, value]);
  }
  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="h-auto min-h-10 w-full justify-between px-3 py-2 text-left font-normal"
        onClick={() => setOpen(true)}
        disabled={disabled}
        aria-haspopup="dialog"
      >
        <span className={cn("truncate", selected.length === 0 && "text-muted-foreground")}>
          {selected.length === 0 ? placeholder : selected.length === 1 ? selected[0].label : `${selected.length} selected`}
        </span>
        <ChevronsUpDown className="ml-3 size-4 shrink-0 text-muted-foreground" />
      </Button>
      {selected.length ? (
        <div className="flex flex-wrap gap-1">
          {selected.map((option) => (
            <Badge key={option.value} variant="secondary">
              {option.label}
              <button type="button" onClick={() => toggle(option.value)} disabled={disabled} aria-label={`Remove ${option.label}`}>
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
      <CommandDialog open={open} onOpenChange={setOpen} title={label} description={`Search and select ${label.toLowerCase()}.`} className="sm:max-w-lg">
        <Command>
          <CommandInput placeholder={`Search ${label.toLowerCase()}…`} autoFocus />
          <CommandList>
            <CommandEmpty>No matching items.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const checked = values.includes(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    value={`${option.label} ${option.description ?? ""} ${option.keywords ?? ""}`}
                    data-checked={checked}
                    onSelect={() => toggle(option.value)}
                    className="py-3"
                  >
                    <span className={cn("grid size-5 place-items-center rounded border", checked && "border-primary bg-primary text-primary-foreground")}>
                      {checked ? <Check className="size-3" /> : null}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{option.label}</span>
                      {option.description ? <span className="block truncate text-xs text-muted-foreground">{option.description}</span> : null}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </div>
  );
}
