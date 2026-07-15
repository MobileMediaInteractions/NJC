import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { darkColors, lightColors, type AppColors } from "@/constants/theme";
import { deviceStorage } from "@/lib/storage";

export type ThemePreference = "system" | "light" | "dark";
type ThemeContextValue = { preference: ThemePreference; resolvedTheme: "light" | "dark"; colors: AppColors; setPreference: (value: ThemePreference) => Promise<void> };
const ThemeContext = createContext<ThemeContextValue | null>(null);
const key = "njcourier:employee:theme";

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  useEffect(() => { void deviceStorage.getItem(key).then((value) => { if (value === "system" || value === "light" || value === "dark") setPreferenceState(value); }); }, []);
  const setPreference = useCallback(async (value: ThemePreference) => { setPreferenceState(value); await deviceStorage.setItem(key, value); }, []);
  const resolvedTheme = preference === "system" ? system === "dark" ? "dark" : "light" : preference;
  const colors = resolvedTheme === "dark" ? darkColors : lightColors;
  const value = useMemo(() => ({ preference, resolvedTheme, colors, setPreference }), [colors, preference, resolvedTheme, setPreference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
export function useAppTheme() { const value = useContext(ThemeContext); if (!value) throw new Error("Theme provider is missing"); return value; }
