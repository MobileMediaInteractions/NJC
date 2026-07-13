import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { type AppColors } from "@/constants/theme";
import { useAppTheme } from "@/providers/theme-provider";

export function LoadingState() {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  return (
    <View style={styles.state}>
      <ActivityIndicator color={colors.blue} />
      <Text style={styles.copy}>Loading local coverage…</Text>
    </View>
  );
}
export function EmptyState({
  title,
  body,
  action,
  onPress,
}: {
  title: string;
  body: string;
  action?: string;
  onPress?: () => void;
}) {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  return (
    <View style={styles.state}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.copy}>{body}</Text>
      {action && onPress ? (
        <Pressable onPress={onPress} style={styles.button}>
          <Text style={styles.buttonText}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    state: { padding: 30, alignItems: "center", gap: 10 },
    title: {
      fontSize: 20,
      color: colors.ink,
      fontWeight: "800",
      textAlign: "center",
    },
    copy: { color: colors.muted, textAlign: "center", lineHeight: 20 },
    button: {
      marginTop: 8,
      backgroundColor: colors.blue,
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderRadius: 7,
    },
    buttonText: { color: colors.onPrimary, fontWeight: "800" },
  });
