import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { employeeRequest } from "@/lib/api";

Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldPlaySound: false, shouldSetBadge: true, shouldShowBanner: true, shouldShowList: true }) });

export async function registerEmployeeNotifications(token: string) {
  if (!Device.isDevice) throw new Error("Use a physical device to register employee notifications.");
  if (Platform.OS === "android") await Notifications.setNotificationChannelAsync("employee-updates", { name: "Employee updates", importance: Notifications.AndroidImportance.HIGH });
  const existing = await Notifications.getPermissionsAsync();
  const status = existing.status === "granted" ? existing.status : (await Notifications.requestPermissionsAsync()).status;
  if (status !== "granted") throw new Error("Notification permission was not granted.");
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId || projectId === "REPLACE_WITH_EMPLOYEE_EAS_PROJECT_ID") throw new Error("Configure the employee EAS project ID before registering notifications.");
  const push = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await employeeRequest("/api/v1/employee/push/register", token, { method: "POST", body: JSON.stringify({ token: push, platform: Platform.OS, appVersion: Constants.expoConfig?.version }) });
  return push;
}
