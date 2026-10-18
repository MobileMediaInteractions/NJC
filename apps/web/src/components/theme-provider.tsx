"use client";

import * as React from "react";
import type { ResolvedTheme } from "@harborline/contracts";
import { readThemePreference, restoreThemePreference, themeChangeEvent, themeStorageKey, type ThemePreference } from "@/lib/theme";

export type { ThemePreference } from "@/lib/theme";

type ThemeContextValue = {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  systemTheme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

const systemIsDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;

function applyTheme(preference: ThemePreference, systemIsDark: boolean) {
  const resolvedTheme =
    preference === "system" ? (systemIsDark ? "dark" : "light") : preference;
  document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.dataset.bsTheme = resolvedTheme;
  document.documentElement.dataset.themePreference = preference;
  document.documentElement.style.colorScheme = resolvedTheme;
  return resolvedTheme;
}

function subscribePreference(notify: () => void) {
  const changed = () => { applyTheme(readThemePreference(), systemIsDark()); notify(); };
  const restored = () => {
    applyTheme(restoreThemePreference(), systemIsDark());
    notify();
  };
  const storageChanged = (event: StorageEvent) => {
    if (event.key === themeStorageKey || event.key === null) {
      document.documentElement.dataset.themePreference = event.newValue === "dark" || event.newValue === "light" ? event.newValue : "system";
      changed();
    }
  };
  window.addEventListener(themeChangeEvent, changed);
  window.addEventListener("storage", storageChanged);
  window.addEventListener("pageshow", restored);
  window.addEventListener("focus", restored);
  return () => {
    window.removeEventListener(themeChangeEvent, changed);
    window.removeEventListener("storage", storageChanged);
    window.removeEventListener("pageshow", restored);
    window.removeEventListener("focus", restored);
  };
}

function subscribeSystem(notify: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const changed = () => { applyTheme(readThemePreference(), media.matches); notify(); };
  media.addEventListener("change", changed);
  window.addEventListener("pageshow", changed);
  window.addEventListener("focus", changed);
  return () => {
    media.removeEventListener("change", changed);
    window.removeEventListener("pageshow", changed);
    window.removeEventListener("focus", changed);
  };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // SSR and hydration agree; first-paint colors follow the root bootstrap.
  const preference = React.useSyncExternalStore(subscribePreference, readThemePreference, () => "system" as const);
  const isDark = React.useSyncExternalStore(subscribeSystem, systemIsDark, () => false);
  const systemTheme: ResolvedTheme = isDark ? "dark" : "light";
  const resolvedTheme = preference === "system" ? systemTheme : preference;
  React.useEffect(() => {
    // Never overwrite the bootstrap with the temporary hydration snapshot.
    applyTheme(readThemePreference(), systemIsDark());
  }, [preference, isDark]);
  const setPreference = React.useCallback((next: ThemePreference) => {
    if (next !== "light" && next !== "dark" && next !== "system") return;
    applyTheme(next, systemIsDark());
    try { window.localStorage.setItem(themeStorageKey, next); } catch { /* Keep the document preference when storage is unavailable. */ }
    window.dispatchEvent(new Event(themeChangeEvent));
  }, []);

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
