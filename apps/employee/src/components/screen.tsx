import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/providers/theme-provider";

export function Screen({ eyebrow, title, children, refresh, refreshing = false }: { eyebrow?: string; title: string; children: ReactNode; refresh?: () => void; refreshing?: boolean }) {
  const { colors } = useAppTheme();
  return <ScrollView contentContainerStyle={[styles.content, { backgroundColor: colors.background }]}>
    <View style={styles.headingRow}><View style={styles.headingCopy}>{eyebrow ? <Text style={[styles.eyebrow, { color: colors.accent }]}>{eyebrow}</Text> : null}<Text style={[styles.title, { color: colors.ink }]}>{title}</Text></View>{refresh ? <Pressable accessibilityRole="button" disabled={refreshing} onPress={refresh}><Text style={[styles.refresh, { color: colors.brand }]}>{refreshing ? "Refreshing…" : "Refresh"}</Text></Pressable> : null}</View>
    {children}
  </ScrollView>;
}
export function Card({ children }: { children: ReactNode }) { const { colors } = useAppTheme(); return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>{children}</View>; }
export function StateCard({ title, body, action, onAction }: { title: string; body: string; action?: string; onAction?: () => void }) { const { colors } = useAppTheme(); return <Card><Text style={[styles.cardTitle, { color: colors.ink }]}>{title}</Text><Text style={[styles.body, { color: colors.muted }]}>{body}</Text>{action && onAction ? <Pressable onPress={onAction} style={[styles.button, { backgroundColor: colors.brand }]}><Text style={{ color: colors.onBrand, fontWeight: "800" }}>{action}</Text></Pressable> : null}</Card>; }
export function Label({ children }: { children: ReactNode }) { const { colors } = useAppTheme(); return <Text style={[styles.label, { color: colors.muted }]}>{children}</Text>; }

const styles = StyleSheet.create({ content: { flexGrow: 1, padding: 18, gap: 12 }, headingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }, headingCopy: { flex: 1 }, eyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1.5 }, title: { fontSize: 30, lineHeight: 35, fontWeight: "900" }, refresh: { fontWeight: "800" }, card: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 8 }, cardTitle: { fontSize: 18, fontWeight: "900" }, body: { fontSize: 14, lineHeight: 20 }, button: { alignSelf: "flex-start", paddingHorizontal: 15, paddingVertical: 11, borderRadius: 8, marginTop: 6 }, label: { fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.7 } });
