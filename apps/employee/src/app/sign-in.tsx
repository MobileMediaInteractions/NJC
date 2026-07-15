import { useSignIn } from "@clerk/expo";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput } from "react-native";
import { Screen, StateCard } from "@/components/screen";
import { useAppTheme } from "@/providers/theme-provider";

export default function SignInScreen() {
  const { colors } = useAppTheme();
  const { signIn } = useSignIn();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [busy, setBusy] = useState(false); const [notice, setNotice] = useState("");
  if (!process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY) return <Screen title="Employee App"><StateCard title="Identity provider not configured" body="Add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to the employee app environment. Public account creation is intentionally unavailable here." /></Screen>;
  async function submit() { setBusy(true); setNotice(""); try { const result = await signIn.password({ emailAddress: email.trim(), password }); if (result.error) throw result.error; if (signIn.status !== "complete") throw new Error("Complete the additional verification step on the website, then return."); const finalized = await signIn.finalize(); if (finalized.error) throw finalized.error; } catch (error) { setNotice(error instanceof Error ? error.message : "Sign-in failed."); } finally { setBusy(false); } }
  return <Screen eyebrow="PRIVILEGED APPLICATION" title="Employee sign in"><Text style={[styles.copy, { color: colors.muted }]}>Use your existing New Jersey Courier account. Access is checked again by the server after sign-in.</Text><TextInput accessibilityLabel="Email address" autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="Email address" style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.line, color: colors.ink }]} /><TextInput accessibilityLabel="Password" autoCapitalize="none" autoComplete="current-password" secureTextEntry value={password} onChangeText={setPassword} placeholder="Password" style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.line, color: colors.ink }]} /><Pressable disabled={busy} onPress={() => void submit()} style={[styles.button, { backgroundColor: colors.brand }, busy && { opacity: 0.5 }]}><Text style={{ color: colors.onBrand, fontWeight: "900" }}>{busy ? "Signing in…" : "Sign in"}</Text></Pressable>{notice ? <Text accessibilityLiveRegion="polite" style={{ color: colors.danger }}>{notice}</Text> : null}</Screen>;
}
const styles = StyleSheet.create({ copy: { lineHeight: 21, marginBottom: 8 }, input: { minHeight: 50, borderWidth: 1, borderRadius: 9, paddingHorizontal: 14 }, button: { minHeight: 50, borderRadius: 9, alignItems: "center", justifyContent: "center" } });
