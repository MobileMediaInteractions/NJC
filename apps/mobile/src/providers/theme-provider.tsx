import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";
import { darkColors, lightColors, type AppColors } from "@/constants/theme";
import { deviceStorage } from "@/lib/storage";

export type ThemePreference = "system" | "light" | "dark";

type ThemeContextValue = {
  preference: ThemePreference;
  resolvedTheme: "light" | "dark";
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
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    let active = true;
    void deviceStorage.getItem(storageKey).then((saved) => {
      if (active && isPreference(saved)) setPreferenceState(saved);
    });
    return () => {
      active = false;
    };
  }, []);

  const setPreference = useCallback(async (next: ThemePreference) => {
    setPreferenceState(next);
    await deviceStorage.setItem(storageKey, next);
  }, []);

  const resolvedTheme =
    preference === "system"
      ? deviceTheme === "dark"
        ? "dark"
        : "light"
      : preference;
  const colors = resolvedTheme === "dark" ? darkColors : lightColors;
  const value = useMemo(
    () => ({ preference, resolvedTheme, colors, setPreference }),
    [colors, preference, resolvedTheme, setPreference],
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
