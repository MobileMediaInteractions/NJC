import { ClerkProvider, useAuth } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '@/constants/theme';
import { useNotificationObserver } from '@/hooks/use-notification-observer';
import { useAudiencePresence } from '@/hooks/use-audience-presence';

type GetToken = () => Promise<string | null>;

function AppStack({ getToken }: { getToken?: GetToken }) {
  useNotificationObserver();
  useAudiencePresence(getToken);

  return <>
    <StatusBar style="light" />
    <Stack screenOptions={{ headerStyle: { backgroundColor: Colors.navy }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: '800' }, contentStyle: { backgroundColor: Colors.background } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="story/[slug]" options={{ title: 'Story' }} />
      <Stack.Screen name="account" options={{ title: 'Account & settings' }} />
      <Stack.Screen name="pair" options={{ title: 'Quick sign-in scanner' }} />
      <Stack.Screen name="admin/index" options={{ title: 'Newsroom quick controls' }} />
    </Stack>
  </>;
}

function ConfiguredApp() {
  const { getToken } = useAuth();
  return <AppStack getToken={getToken} />;
}

export default function RootLayout() {
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) return <AppStack />;
  return <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}><ConfiguredApp /></ClerkProvider>;
}
