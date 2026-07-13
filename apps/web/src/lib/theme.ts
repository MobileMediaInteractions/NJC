export type ThemePreference = "system" | "light" | "dark";

export const themeStorageKey = "harborline:theme";

export const themeBootstrapScript = `
  (() => {
    try {
      const saved = localStorage.getItem('${themeStorageKey}');
      const preference = ['light', 'dark', 'system'].includes(saved) ? saved : 'system';
      const theme = preference === 'system'
        ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : preference;
      document.documentElement.classList.toggle('dark', theme === 'dark');
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
    } catch {}
  })();
`;
