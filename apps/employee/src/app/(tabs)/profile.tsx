import { useAuth, useClerk } from "@clerk/expo";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Card, Label, Screen } from "@/components/screen";
import { registerEmployeeNotifications } from "@/lib/notifications";
import { useEmployee } from "@/providers/employee-provider";
import { useAppTheme, type ThemePreference } from "@/providers/theme-provider";
import { useState } from "react";

export default function ProfileScreen() {
  const { getToken } = useAuth(); const { signOut } = useClerk(); const employee = useEmployee(); const theme = useAppTheme(); const [notice, setNotice] = useState("");
  async function enablePush() { try { const token = await getToken(); if (!token) throw new Error("Session expired."); await registerEmployeeNotifications(token); setNotice("Employee notifications are enabled on this device."); } catch (error) { setNotice(error instanceof Error ? error.message : "Notification setup failed."); } }
  return <Screen eyebrow="ACCOUNT & SECURITY" title="Profile"><Card><Label>Signed in as</Label><Text style={[styles.name, { color: theme.colors.ink }]}>{employee.data?.viewer.name}</Text><Text style={{ color: theme.colors.muted }}>{employee.data?.viewer.email}</Text><Text style={{ color: theme.colors.muted }}>Role: {employee.data?.viewer.role}</Text></Card><Card><Label>Appearance</Label><View style={styles.choices}>{(["system", "light", "dark"] as ThemePreference[]).map((value) => <Pressable key={value} onPress={() => void theme.setPreference(value)} style={[styles.choice, { borderColor: theme.colors.line, backgroundColor: theme.preference === value ? theme.colors.brandSoft : theme.colors.surface }]}><Text style={{ color: theme.colors.ink, textTransform: "capitalize", fontWeight: "800" }}>{value}</Text></Pressable>)}</View></Card><Pressable onPress={() => void enablePush()} style={[styles.button, { backgroundColor: theme.colors.brand }]}><Text style={{ color: theme.colors.onBrand, fontWeight: "900" }}>Enable employee notifications</Text></Pressable>{notice ? <Text style={{ color: theme.colors.muted }}>{notice}</Text> : null}<Pressable onPress={() => void signOut()}><Text style={{ color: theme.colors.danger, fontWeight: "900", paddingVertical: 14 }}>Sign out and clear the session</Text></Pressable></Screen>;
}
const styles = StyleSheet.create({ name: { fontSize: 20, fontWeight: "900" }, choices: { flexDirection: "row", gap: 8 }, choice: { flex: 1, borderWidth: 1, borderRadius: 8, alignItems: "center", paddingVertical: 11 }, button: { minHeight: 50, borderRadius: 9, alignItems: "center", justifyContent: "center" } });
