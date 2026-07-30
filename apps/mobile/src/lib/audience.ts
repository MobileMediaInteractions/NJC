import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiBaseUrl } from '@/lib/api';
import { deviceStorage } from '@/lib/storage';

const installationKey = 'harborline:audience:installation';
const preferenceKey = 'harborline:audience:enabled';
const lastReportKey = 'harborline:audience:last-report';
const reportIntervalMs = 15 * 60 * 1000;

type GetToken = () => Promise<string | null>;

function createInstallationId() {
  const random = Array.from({ length: 5 }, () => Math.random().toString(36).slice(2)).join('');
  return `${Date.now().toString(36)}${random}`.slice(0, 64);
}

function createEventId(prefix: string) {
  const random = Array.from({ length: 5 }, () => Math.random().toString(36).slice(2)).join('');
  return `${prefix}_${Date.now().toString(36)}${random}`.slice(0, 80);
}

function applicationBuildNumber() {
  const value =
    Platform.OS === 'ios'
      ? Constants.expoConfig?.ios?.buildNumber
      : Constants.expoConfig?.android?.versionCode;
  return value == null ? 'unknown' : String(value);
}

async function getInstallationId() {
  const existing = await deviceStorage.getItem(installationKey);
  if (existing) return existing;
  const created = createInstallationId();
  await deviceStorage.setItem(installationKey, created);
  return created;
}

export async function getAudienceMeasurementEnabled() {
  return (await deviceStorage.getItem(preferenceKey)) !== 'false';
}

export async function reportAudiencePresence(getToken?: GetToken, force = false) {
  if (!(await getAudienceMeasurementEnabled())) return;
  const now = Date.now();
  const lastReport = Number(await deviceStorage.getItem(lastReportKey) ?? 0);
  if (!force && now - lastReport < reportIntervalMs) return;
  await deviceStorage.setItem(lastReportKey, String(now));
  const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
  const token = await getToken?.().catch(() => null);
  await fetch(`${apiBaseUrl}/api/v1/audience/presence`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({
      eventId: createEventId('presence'),
      installationId: await getInstallationId(),
      platform,
      source: platform === 'web' ? 'mobile-app-web' : 'mobile-app',
      product: 'reader-mobile',
      appVersion: Constants.expoConfig?.version ?? '1.0.0',
      buildNumber: applicationBuildNumber(),
      releaseChannel: 'production',
      osVersion: String(Platform.Version),
      deviceClass: platform === 'web' ? 'browser' : 'phone',
      occurredAt: new Date(now).toISOString(),
    }),
  }).catch(() => undefined);
}

export async function setAudienceMeasurementEnabled(enabled: boolean) {
  const installationId = await deviceStorage.getItem(installationKey);
  await deviceStorage.setItem(preferenceKey, String(enabled));
  if (enabled) {
    await reportAudiencePresence(undefined, true);
    return;
  }
  await deviceStorage.removeItem(lastReportKey);
  if (!installationId) return;
  await fetch(`${apiBaseUrl}/api/v1/audience/presence`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ installationId }),
  }).catch(() => undefined);
  await deviceStorage.removeItem(installationKey);
}
