import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  normalizeThemePreference,
  type ResolvedTheme,
  type ThemePreference,
} from "@harborline/contracts";
import { useColorScheme } from "react-native";
import { darkColors, lightColors, type AppColors } from "@/constants/theme";
import { deviceStorage } from "@/lib/storage";

export type { ThemePreference } from "@harborline/contracts";

type ThemeContextValue = {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  systemTheme: ResolvedTheme;
  colors: AppColors;
  setPreference: (preference: ThemePreference) => Promise<void>;
};

const storageKey = "harborline:mobile:theme";
const ThemeContext = createContext<ThemeContextValue | null>(null);

function isPreference(value: string | null): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const deviceTheme = useColorScheme();
  const systemTheme: ResolvedTheme =
    deviceTheme === "dark" ? "dark" : "light";
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    let active = true;
    void deviceStorage.getItem(storageKey).then((saved) => {
      if (active && isPreference(saved)) {
        const normalized = normalizeThemePreference(saved, systemTheme);
        setPreferenceState(normalized);
        if (normalized !== saved) {
          void deviceStorage.setItem(storageKey, normalized);
        }
      }
    });
    return () => {
      active = false;
    };
  }, [systemTheme]);

  const setPreference = useCallback(
    async (next: ThemePreference) => {
      const normalized = normalizeThemePreference(next, systemTheme);
      setPreferenceState(normalized);
      await deviceStorage.setItem(storageKey, normalized);
    },
    [systemTheme],
  );

  const resolvedTheme =
    preference === "system"
      ? systemTheme
      : preference;
  const colors = resolvedTheme === "dark" ? darkColors : lightColors;
  const value = useMemo(
    () => ({ preference, resolvedTheme, systemTheme, colors, setPreference }),
    [colors, preference, resolvedTheme, systemTheme, setPreference],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context)
    throw new Error("useAppTheme must be used within AppThemeProvider");
  return context;
}
