import { Pressable, StyleSheet, Text, View } from "react-native";
import { adaptiveThemePreferences } from "@harborline/contracts";
import { type AppColors } from "@/constants/theme";
import { type ThemePreference, useAppTheme } from "@/providers/theme-provider";

export function ThemeSetting() {
  const { colors, preference, systemTheme, setPreference } = useAppTheme();
  const styles = makeStyles(colors);
  const choices: { value: ThemePreference; label: string }[] =
    adaptiveThemePreferences(systemTheme).map((value) => ({
      value,
      label:
        value === "system"
          ? `System · ${systemTheme === "dark" ? "Dark" : "Light"}`
          : value === "dark"
            ? "Dark"
            : "Light",
    }));

  return (
    <View>
      <Text style={styles.title}>Appearance</Text>
      <Text style={styles.copy}>
        Follow your device or use the available contrasting appearance.
      </Text>
      <View style={styles.options} accessibilityRole="radiogroup">
        {choices.map((choice) => {
          const selected = preference === choice.value;
          return (
            <Pressable
              key={choice.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => void setPreference(choice.value)}
              style={[styles.option, selected && styles.selectedOption]}
            >
              <Text style={[styles.label, selected && styles.selectedLabel]}>
                {choice.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    title: { color: colors.ink, fontWeight: "900", marginBottom: 2 },
    copy: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 3 },
    options: { flexDirection: "row", gap: 8, marginTop: 12 },
    option: {
      flex: 1,
      minHeight: 42,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 8,
      backgroundColor: colors.surface,
    },
    selectedOption: {
      backgroundColor: colors.blue,
      borderColor: colors.blue,
    },
    label: { color: colors.ink, fontWeight: "800" },
    selectedLabel: { color: colors.onPrimary },
  });
