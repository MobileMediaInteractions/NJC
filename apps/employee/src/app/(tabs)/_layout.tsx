import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useAppTheme } from "@/providers/theme-provider";

export default function TabsLayout() {
  const { colors } = useAppTheme();
  return <Tabs screenOptions={({ route }) => ({ headerStyle: { backgroundColor: colors.brand }, headerTintColor: colors.onBrand, tabBarActiveTintColor: colors.accent, tabBarInactiveTintColor: colors.muted, tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line }, sceneStyle: { backgroundColor: colors.background }, tabBarIcon: ({ color, size }) => <Ionicons name={route.name === "index" ? "home" : route.name === "chat" ? "chatbubbles" : route.name === "tools" ? "construct" : route.name === "notifications" ? "notifications" : "person-circle"} color={color} size={size} /> })}>
    <Tabs.Screen name="index" options={{ title: "Home" }} />
    <Tabs.Screen name="chat" options={{ title: "Chat" }} />
    <Tabs.Screen name="tools" options={{ title: "Tools" }} />
    <Tabs.Screen name="notifications" options={{ title: "Updates" }} />
    <Tabs.Screen name="profile" options={{ title: "Profile" }} />
  </Tabs>;
}
