"use client";

import * as React from "react";
import { themeStorageKey, type ThemePreference } from "@/lib/theme";

export type { ThemePreference } from "@/lib/theme";

type ThemeContextValue = {
  preference: ThemePreference;
  resolvedTheme: "light" | "dark";
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
      return isThemePreference(saved) ? saved : "system";
    },
  );
  const [systemIsDark, setSystemIsDark] = React.useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  const resolvedTheme =
    preference === "system" ? (systemIsDark ? "dark" : "light") : preference;

  React.useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemIsDark(event.matches);
    };
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  React.useEffect(() => {
    applyTheme(preference, systemIsDark);
  }, [preference, systemIsDark]);

  const setPreference = React.useCallback((next: ThemePreference) => {
    window.localStorage.setItem(themeStorageKey, next);
    setPreferenceState(next);
  }, []);

  const value = React.useMemo(
    () => ({ preference, resolvedTheme, setPreference }),
    [preference, resolvedTheme, setPreference],
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
