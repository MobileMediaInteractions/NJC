export type { ThemePreference } from "@harborline/contracts";

export const themeStorageKey = "harborline:theme";
export const themeChangeEvent = "njc:theme-change";

export function readThemePreference(): import("@harborline/contracts").ThemePreference {
  if (typeof window === "undefined") return "system";
  const current = document.documentElement.dataset.themePreference;
  if (current === "light" || current === "dark" || current === "system") return current;
  let saved: string | null | undefined;
  try { saved = window.localStorage.getItem(themeStorageKey); }
  catch { saved = document.documentElement.dataset.themePreference; }
  return saved === "dark" || saved === "light" ? saved : "system";
}

// Re-read storage when a tab returns from the back/forward cache or regains focus.
// If storage is blocked, retain the current document's in-memory choice.
export function restoreThemePreference() {
  try {
    const saved = window.localStorage.getItem(themeStorageKey);
    return saved === "dark" || saved === "light" ? saved : "system";
  } catch {
    return readThemePreference();
  }
}

export const themeBootstrapScript = `
  (() => {
    try {
      let saved = null;
      try { saved = localStorage.getItem('${themeStorageKey}'); } catch {}
      const systemTheme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      const preference = ['light', 'dark', 'system'].includes(saved) ? saved : 'system';
      const theme = preference === 'system'
        ? systemTheme
        : preference;
      document.documentElement.classList.toggle('dark', theme === 'dark');
      document.documentElement.dataset.theme = theme;
      document.documentElement.dataset.bsTheme = theme;
      document.documentElement.dataset.themePreference = preference;
      document.documentElement.style.colorScheme = theme;
    } catch {}
  })();
`;
