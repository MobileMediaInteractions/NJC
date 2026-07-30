import { Command, Keyboard, Search, ShieldCheck } from "lucide-react";
import { StudioGate } from "@/components/studio/studio-gate";
import { StudioShell } from "@/components/studio/studio-shell";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getStudioUser } from "@/lib/auth";
import { studioCommandGroups } from "@/lib/studio-commands";

export default async function StudioCommandsPage() {
  const viewer = await getStudioUser();
  if (!viewer) return <StudioGate><></></StudioGate>;

  return (
    <StudioShell viewer={viewer}>
      <div className="mx-auto max-w-6xl space-y-7">
        <header>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Studio help</Badge>
            <Badge variant="outline">Role-aware</Badge>
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">
            Commands and guarded actions
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            A plain-language reference for shortcuts, editorial actions and
            manual confirmations. Commands never bypass your role or the
            server-side approval workflow.
          </p>
        </header>

        <Card className="overflow-hidden border-primary/30 bg-primary/5">
          <CardContent className="grid gap-5 p-6 md:grid-cols-[auto_1fr_auto] md:items-center">
            <div className="grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Search />
            </div>
            <div>
              <h2 className="font-bold">Search instead of navigating</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Press the shortcut anywhere in Studio, type what you need, then
                press Enter. Results only include workspaces your role can use.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Key label="⌘" />
              <Key label="K" />
              <span className="text-xs text-muted-foreground">or Ctrl + K</span>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-3">
          {studioCommandGroups.map((group, index) => {
            const Icon = [Keyboard, Command, ShieldCheck][index] ?? Command;
            return (
              <Card key={group.title}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon className="size-5 text-primary" /> {group.title}
                  </CardTitle>
                  <CardDescription>{group.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {group.commands.map((command) => (
                    <article
                      key={command.label}
                      className="border-b pb-5 last:border-0 last:pb-0"
                    >
                      {"keys" in command && command.keys ? (
                        <div className="mb-2 flex flex-wrap gap-1.5">
                          {command.keys.map((key) => (
                            <Key key={key} label={key} compact />
                          ))}
                        </div>
                      ) : null}
                      <h3 className="text-sm font-bold">{command.label}</h3>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {command.detail}
                      </p>
                    </article>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </StudioShell>
  );
}

function Key({ label, compact = false }: { label: string; compact?: boolean }) {
  return (
    <kbd
      className={`grid place-items-center rounded-md border bg-background font-mono font-bold shadow-sm ${
        compact ? "min-h-6 min-w-6 px-1.5 text-[0.65rem]" : "size-9 text-sm"
      }`}
    >
      {label}
    </kbd>
  );
}
