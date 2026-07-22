"use client";

import * as React from "react";
import {
  normalizeThemePreference,
  type ResolvedTheme,
} from "@harborline/contracts";
import { themeStorageKey, type ThemePreference } from "@/lib/theme";

export type { ThemePreference } from "@/lib/theme";

type ThemeContextValue = {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  systemTheme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

function applyTheme(preference: ThemePreference, systemIsDark: boolean) {
  const resolvedTheme =
    preference === "system" ? (systemIsDark ? "dark" : "light") : preference;
  document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.style.colorScheme = resolvedTheme;
  return resolvedTheme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = React.useState<ThemePreference>(
    () => {
      if (typeof window === "undefined") return "system";
      const saved = window.localStorage.getItem(themeStorageKey);
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";
      return normalizeThemePreference(
        isThemePreference(saved) ? saved : "system",
        systemTheme,
      );
    },
  );
  const [systemIsDark, setSystemIsDark] = React.useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  const systemTheme: ResolvedTheme = systemIsDark ? "dark" : "light";
  const resolvedTheme = preference === "system" ? systemTheme : preference;

  React.useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemIsDark(event.matches);
      const nextSystemTheme: ResolvedTheme = event.matches ? "dark" : "light";
      setPreferenceState((current) => {
        const normalized = normalizeThemePreference(current, nextSystemTheme);
        if (normalized !== current) {
          window.localStorage.setItem(themeStorageKey, normalized);
        }
        return normalized;
      });
    };
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  React.useEffect(() => {
    applyTheme(preference, systemIsDark);
  }, [preference, systemIsDark]);

  const setPreference = React.useCallback(
    (next: ThemePreference) => {
      const normalized = normalizeThemePreference(next, systemTheme);
      window.localStorage.setItem(themeStorageKey, normalized);
      setPreferenceState(normalized);
    },
    [systemTheme],
  );

  const value = React.useMemo(
    () => ({ preference, resolvedTheme, systemTheme, setPreference }),
    [preference, resolvedTheme, systemTheme, setPreference],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = React.useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
