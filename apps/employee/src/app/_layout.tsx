import { ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { Redirect, Stack, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { AppThemeProvider, useAppTheme } from "@/providers/theme-provider";
import { EmployeeProvider, useEmployee } from "@/providers/employee-provider";

function AccessGate() {
  const { isLoaded, isSignedIn } = useAuth();
  const employee = useEmployee();
  const segments = useSegments();
  const { colors, resolvedTheme } = useAppTheme();
  if (!isLoaded || (isSignedIn && employee.loading)) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}><ActivityIndicator color={colors.brand} /></View>;
  const publicRoute = segments[0] === "sign-in" || segments[0] === "access-request" || segments[0] === "unsupported-link";
  if (!isSignedIn && segments[0] !== "sign-in") return <Redirect href="/sign-in" />;
  if (isSignedIn && !employee.data && !publicRoute) return <Redirect href="/access-request" />;
  if (isSignedIn && employee.data && segments[0] === "sign-in") return <Redirect href="/" />;
  return <><StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} /><Stack screenOptions={{ headerStyle: { backgroundColor: colors.brand }, headerTintColor: colors.onBrand, contentStyle: { backgroundColor: colors.background } }}><Stack.Screen name="(tabs)" options={{ headerShown: false }} /><Stack.Screen name="sign-in" options={{ title: "Employee sign in" }} /><Stack.Screen name="access-request" options={{ title: "Access status" }} /><Stack.Screen name="chat/[id]" options={{ title: "Conversation" }} /><Stack.Screen name="tools/[tool]" options={{ title: "Employee tool" }} /><Stack.Screen name="v1/[...path]" options={{ title: "Opening link" }} /><Stack.Screen name="unsupported-link" options={{ title: "Link unavailable" }} /></Stack></>;
}
function ConfiguredApp() { return <EmployeeProvider><AccessGate /></EmployeeProvider>; }
export default function RootLayout() {
  const key = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
  return <AppThemeProvider>{key ? <ClerkProvider publishableKey={key} tokenCache={tokenCache}><ConfiguredApp /></ClerkProvider> : <View style={styles.unconfigured}><Text style={styles.unconfiguredTitle}>Employee App</Text><Text style={styles.unconfiguredBody}>Identity is not configured. Add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY; privileged routes remain unavailable until then.</Text></View>}</AppThemeProvider>;
}
const styles = StyleSheet.create({ unconfigured: { flex: 1, padding: 28, alignItems: "center", justifyContent: "center", backgroundColor: "#F8F5EE" }, unconfiguredTitle: { color: "#173E32", fontSize: 30, fontWeight: "900" }, unconfiguredBody: { color: "#646A65", lineHeight: 21, textAlign: "center", marginTop: 10 } });
