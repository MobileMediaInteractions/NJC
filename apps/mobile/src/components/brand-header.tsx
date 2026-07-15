import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppIcon } from "@/components/app-icon";
import { type AppColors } from "@/constants/theme";
import { useAppTheme } from "@/providers/theme-provider";

export function BrandHeader({ eyebrow }: { eyebrow?: string }) {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  return (
    <View style={styles.wrap}>
      <View>
        <Text style={styles.eyebrow}>{eyebrow ?? "MIDDLESEX COUNTY · NEW JERSEY"}</Text>
        <Text style={styles.brand}>NJ COURIER</Text>
        <Text style={styles.local}>LOCAL NEWS</Text>
      </View>
      <Link href="/account" asChild>
        <Pressable accessibilityLabel="Open account" style={styles.account}>
          <AppIcon name="person-outline" size={21} color={colors.navy} />
        </Pressable>
      </Link>
    </View>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    wrap: {
      backgroundColor: colors.surface,
      paddingHorizontal: 18,
      paddingTop: 12,
      paddingBottom: 13,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottomWidth: 1,
      borderBottomColor: colors.line,
    },
    eyebrow: {
      color: colors.blue,
      fontSize: 9,
      letterSpacing: 1.6,
      fontWeight: "800",
    },
    brand: {
      color: colors.navy,
      fontSize: 23,
      letterSpacing: -0.8,
      fontWeight: "900",
      lineHeight: 24,
    },
    local: {
      color: colors.red,
      fontSize: 9,
      letterSpacing: 3.4,
      fontWeight: "900",
    },
    account: {
      width: 42,
      height: 42,
      borderRadius: 21,
      borderWidth: 1,
      borderColor: colors.line,
      alignItems: "center",
      justifyContent: "center",
    },
  });
