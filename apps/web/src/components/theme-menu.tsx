"use client";

import * as React from "react";
import {
  adaptiveThemePreferences,
  type ResolvedTheme,
} from "@harborline/contracts";
import { Laptop, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type ThemePreference, useTheme } from "@/components/theme-provider";

function themeChoice(value: ThemePreference, systemTheme: ResolvedTheme) {
  if (value === "system") {
    return {
      value,
      label: `System · ${systemTheme === "dark" ? "Dark" : "Light"}`,
      icon: Laptop,
    };
  }
  return {
    value,
    label: value === "dark" ? "Dark" : "Light",
    icon: value === "dark" ? Moon : Sun,
  };
}

export function ThemeMenu() {
  const { preference, resolvedTheme, systemTheme, setPreference } = useTheme();
  const choices = adaptiveThemePreferences(systemTheme).map((value) =>
    themeChoice(value, systemTheme),
  );
  const mounted = React.useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const ActiveIcon = mounted ? (resolvedTheme === "dark" ? Moon : Sun) : Laptop;
  const appearanceLabel = mounted
    ? preference === "system"
      ? `system ${systemTheme}`
      : preference
    : "device setting";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Appearance: ${appearanceLabel}`}
        >
          <ActiveIcon className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={preference}
          onValueChange={(value) => setPreference(value as ThemePreference)}
        >
          {choices.map(({ value, label, icon: Icon }) => (
            <DropdownMenuRadioItem key={value} value={value}>
              <Icon /> {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
