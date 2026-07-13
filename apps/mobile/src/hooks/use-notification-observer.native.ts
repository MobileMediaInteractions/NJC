import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
export function useNotificationObserver() { useEffect(() => { const redirect = (notification: Notifications.Notification) => { const url = notification.request.content.data?.url; if (typeof url === 'string' && url.startsWith('/')) router.push(url as never); }; const initial = Notifications.getLastNotificationResponse(); if (initial?.notification) redirect(initial.notification); const subscription = Notifications.addNotificationResponseReceivedListener((response) => redirect(response.notification)); return () => subscription.remove(); }, []); }
