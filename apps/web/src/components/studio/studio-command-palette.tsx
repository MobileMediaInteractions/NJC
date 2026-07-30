"use client";

import { useRouter } from "next/navigation";
import {
  FilePlus2,
  LayoutGrid,
  Search,
  Settings2,
  Sparkles,
} from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  studioNavigationHref,
  type StudioNavigationHub,
} from "@/lib/studio-navigation";

type QuickAction = {
  id: string;
  label: string;
  description: string;
  href: string;
};

export function StudioCommandPalette({
  open,
  onOpenChange,
  hubs,
  cleanStudioPaths,
  quickActions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hubs: StudioNavigationHub[];
  cleanStudioPaths: boolean;
  quickActions: QuickAction[];
}) {
  const router = useRouter();

  function navigate(href: string) {
    onOpenChange(false);
    router.push(studioNavigationHref(href, cleanStudioPaths));
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Studio command center"
      description="Search every available workspace or start common work."
      className="sm:max-w-2xl"
    >
      <Command>
        <CommandInput placeholder="Go somewhere or start something…" />
        <CommandList className="max-h-[26rem]">
          <CommandEmpty>No permitted Studio action matches that search.</CommandEmpty>
          {quickActions.length ? (
            <>
              <CommandGroup heading="Start work">
                {quickActions.map((action) => (
                  <CommandItem
                    key={action.id}
                    value={`${action.label} ${action.description}`}
                    onSelect={() => navigate(action.href)}
                  >
                    <FilePlus2 />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{action.label}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {action.description}
                      </span>
                    </span>
                    <CommandShortcut>Open</CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          ) : null}
          {hubs.map((hub) => (
            <CommandGroup key={hub.id} heading={hub.label}>
              {hub.items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${hub.label} ${item.label} ${hub.description}`}
                  onSelect={() => navigate(item.href)}
                >
                  {item.id === "settings" ? (
                    <Settings2 />
                  ) : item.id === "dashboard" ? (
                    <Sparkles />
                  ) : (
                    <LayoutGrid />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{item.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {hub.description}
                    </span>
                  </span>
                  <CommandShortcut>Go</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
        <div className="flex items-center justify-between border-t px-3 py-2 text-[0.68rem] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Search className="size-3.5" /> Search replaces navigation hunting
          </span>
          <span>Enter to open · Esc to close</span>
        </div>
      </Command>
    </CommandDialog>
  );
}
