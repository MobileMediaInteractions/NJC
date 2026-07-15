import { useAuth } from "@clerk/expo";
import { useCallback, useEffect, useState } from "react";
import { Linking, Pressable, Text } from "react-native";
import { Card, Screen, StateCard } from "@/components/screen";
import { employeeRequest } from "@/lib/api";
import { useAppTheme } from "@/providers/theme-provider";

type EmployeeNotification = { id: string; kind: string; title: string; body: string; destination: string | null; readAt: string | null; createdAt: string };
export default function NotificationsScreen() {
  const { getToken } = useAuth(); const { colors } = useAppTheme(); const [items, setItems] = useState<EmployeeNotification[]>([]); const [notice, setNotice] = useState<string | null>(null); const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); try { const token = await getToken(); if (!token) throw new Error("Session expired."); setItems(await employeeRequest("/api/v1/employee/notifications", token)); setNotice(null); } catch (error) { setNotice(error instanceof Error ? error.message : "Updates are unavailable."); } finally { setLoading(false); } }, [getToken]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);
  async function open(item: EmployeeNotification) { const token = await getToken(); if (!token) return; await employeeRequest("/api/v1/employee/notifications", token, { method: "PATCH", body: JSON.stringify({ id: item.id }) }); if (item.destination) await Linking.openURL(item.destination); else await load(); }
  return <Screen eyebrow="PRIVATE PREVIEWS" title="Updates" refresh={() => void load()} refreshing={loading}>{notice ? <StateCard title="Could not load updates" body={notice} action="Retry" onAction={() => void load()} /> : null}{items.length ? items.map((item) => <Pressable key={item.id} onPress={() => void open(item)}><Card><Text style={{ color: colors.ink, fontSize: 16, fontWeight: item.readAt ? "700" : "900" }}>{item.title}</Text><Text style={{ color: colors.muted }}>{item.body}</Text><Text style={{ color: colors.muted, fontSize: 11 }}>{new Date(item.createdAt).toLocaleString()}</Text></Card></Pressable>) : !loading && !notice ? <StateCard title="You’re caught up" body="Mentions, access decisions, and internal notices will appear here without exposing sensitive content in push previews." /> : null}</Screen>;
}
