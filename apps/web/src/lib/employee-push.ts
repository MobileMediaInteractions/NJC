import { and, eq, inArray } from "drizzle-orm";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { employeePushDevices } from "@harborline/backend/schema";

export async function sendEmployeePush(
  recipients: string[],
  title: string,
  destination: string,
) {
  if (!hasDatabase() || !recipients.length) return { attempted: 0, accepted: 0 };
  const devices = await getDb().select({ token: employeePushDevices.token }).from(employeePushDevices).where(and(inArray(employeePushDevices.userClerkId, [...new Set(recipients)]), eq(employeePushDevices.isActive, true)));
  let accepted = 0;
  for (let index = 0; index < devices.length; index += 100) {
    const messages = devices.slice(index, index + 100).map(({ token }) => ({ to: token, title, body: "Open Employee App to view this private update.", data: { url: destination }, priority: "high", channelId: "employee-updates" }));
    const response = await fetch("https://exp.host/--/api/v2/push/send", { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json", ...(process.env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}) }, body: JSON.stringify(messages) });
    if (response.ok) accepted += messages.length;
    else console.error("Employee push batch failed", response.status);
  }
  return { attempted: devices.length, accepted };
}
