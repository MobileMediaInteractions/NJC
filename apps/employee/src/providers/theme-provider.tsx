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
  setPreference: (value: ThemePreference) => Promise<void>;
};
const ThemeContext = createContext<ThemeContextValue | null>(null);
const key = "njcourier:employee:theme";

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const systemTheme: ResolvedTheme = system === "dark" ? "dark" : "light";
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  useEffect(() => {
    void deviceStorage.getItem(key).then((value) => {
      if (value === "system" || value === "light" || value === "dark") {
        const normalized = normalizeThemePreference(value, systemTheme);
        setPreferenceState(normalized);
        if (normalized !== value) void deviceStorage.setItem(key, normalized);
      }
    });
  }, [systemTheme]);
  const setPreference = useCallback(
    async (value: ThemePreference) => {
      const normalized = normalizeThemePreference(value, systemTheme);
      setPreferenceState(normalized);
      await deviceStorage.setItem(key, normalized);
    },
    [systemTheme],
  );
  const resolvedTheme = preference === "system" ? systemTheme : preference;
  const colors = resolvedTheme === "dark" ? darkColors : lightColors;
  const value = useMemo(
    () => ({ preference, resolvedTheme, systemTheme, colors, setPreference }),
    [colors, preference, resolvedTheme, systemTheme, setPreference],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
export function useAppTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("Theme provider is missing");
  return value;
}
