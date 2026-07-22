export type { ThemePreference } from "@harborline/contracts";

export const themeStorageKey = "harborline:theme";

export const themeBootstrapScript = `
  (() => {
    try {
      const saved = localStorage.getItem('${themeStorageKey}');
      const systemTheme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      let preference = ['light', 'dark', 'system'].includes(saved) ? saved : 'system';
      if (preference === systemTheme) preference = 'system';
      if (saved !== preference) localStorage.setItem('${themeStorageKey}', preference);
      const theme = preference === 'system'
        ? systemTheme
        : preference;
      document.documentElement.classList.toggle('dark', theme === 'dark');
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
    } catch {}
  })();
`;
