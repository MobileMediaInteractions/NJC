import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useEmployee } from "@/providers/employee-provider";
import { useAppTheme } from "@/providers/theme-provider";

export default function TabsLayout() {
  const { colors } = useAppTheme();
  const employee = useEmployee();
  const unreadChat = employee.data?.channels.reduce((total, channel) => total + channel.unread, 0) ?? 0;
  const unreadNotifications = employee.data?.unreadNotifications ?? 0;
  return <Tabs screenOptions={({ route }) => ({ headerStyle: { backgroundColor: colors.brand }, headerTintColor: colors.onBrand, tabBarActiveTintColor: colors.accent, tabBarInactiveTintColor: colors.muted, tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line }, sceneStyle: { backgroundColor: colors.background }, tabBarIcon: ({ color, size }) => <Ionicons name={route.name === "index" ? "home" : route.name === "chat" ? "chatbubbles" : route.name === "tools" ? "construct" : route.name === "notifications" ? "notifications" : "person-circle"} color={color} size={size} /> })}>
    <Tabs.Screen name="index" options={{ title: "Home" }} />
    <Tabs.Screen name="chat" options={{ title: "Chat", tabBarBadge: unreadChat ? (unreadChat > 9 ? "9+" : unreadChat) : undefined, tabBarBadgeStyle: { backgroundColor: colors.danger, color: colors.onBrand } }} />
    <Tabs.Screen name="tools" options={{ title: "Tools" }} />
    <Tabs.Screen name="notifications" options={{ title: "Updates", tabBarBadge: unreadNotifications ? (unreadNotifications > 9 ? "9+" : unreadNotifications) : undefined, tabBarBadgeStyle: { backgroundColor: colors.danger, color: colors.onBrand } }} />
    <Tabs.Screen name="profile" options={{ title: "Profile" }} />
  </Tabs>;
}
