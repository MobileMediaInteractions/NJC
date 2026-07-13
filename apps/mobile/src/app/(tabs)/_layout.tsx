import { Tabs } from 'expo-router';
import { AppIcon } from '@/components/app-icon';
import { Colors } from '@/constants/theme';

export default function TabsLayout() {
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: Colors.blue, tabBarInactiveTintColor: Colors.muted, tabBarLabelStyle: { fontSize: 10, fontWeight: '700' }, tabBarStyle: { height: 66, paddingTop: 5, paddingBottom: 7, borderTopColor: Colors.line, backgroundColor: Colors.surface } }}>
    <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <AppIcon name="home-outline" color={color} size={size} /> }} />
    <Tabs.Screen name="latest" options={{ title: 'Latest', tabBarIcon: ({ color, size }) => <AppIcon name="newspaper-outline" color={color} size={size} /> }} />
    <Tabs.Screen name="weather" options={{ title: 'Weather', tabBarIcon: ({ color, size }) => <AppIcon name="partly-sunny-outline" color={color} size={size} /> }} />
    <Tabs.Screen name="watch" options={{ title: 'Watch', tabBarIcon: ({ color, size }) => <AppIcon name="play-circle-outline" color={color} size={size} /> }} />
    <Tabs.Screen name="saved" options={{ title: 'Saved', tabBarIcon: ({ color, size }) => <AppIcon name="bookmark-outline" color={color} size={size} /> }} />
  </Tabs>;
}
