import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { apiBaseUrl } from '@/lib/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldPlaySound: false, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }),
});

export async function registerForAlerts(token?: string | null) {
  if (!Device.isDevice) throw new Error('Use a physical device or supported simulator to register for alerts.');
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('breaking-news', { name: 'Breaking news', importance: Notifications.AndroidImportance.HIGH });
  const existing = await Notifications.getPermissionsAsync();
  const finalStatus = existing.status === 'granted' ? existing.status : (await Notifications.requestPermissionsAsync()).status;
  if (finalStatus !== 'granted') throw new Error('Notification permission was not granted.');
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId || projectId === 'REPLACE_WITH_EAS_PROJECT_ID') throw new Error('Add the EAS project ID before registering devices.');
  const pushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const response = await fetch(`${apiBaseUrl}/api/v1/mobile/push/register`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ token: pushToken, platform: Platform.OS, deviceName: Device.deviceName }) });
  if (!response.ok) throw new Error('The device could not be registered.');
  return pushToken;
}
