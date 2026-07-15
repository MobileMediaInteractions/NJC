import { Link } from "expo-router";
import { Pressable, Text } from "react-native";
import type { EmployeeCapability } from "@harborline/contracts";
import { Card, Screen, StateCard } from "@/components/screen";
import { useEmployee } from "@/providers/employee-provider";
import { useAppTheme } from "@/providers/theme-provider";

const tools: { id: "metrics" | "editorial" | "alerts" | "live" | "licensing"; title: string; body: string; capability: EmployeeCapability }[] = [
  { id: "metrics", title: "Newsroom health", body: "Audience, publishing queue, alert and device totals.", capability: "tools:metrics" },
  { id: "editorial", title: "Editorial queue", body: "Review, publish, return or archive newsroom stories.", capability: "tools:editorial" },
  { id: "alerts", title: "Urgent alerts", body: "Send a verified breaking-news or weather alert.", capability: "tools:alerts" },
  { id: "live", title: "Live controls", body: "Update the cross-platform live-state banner.", capability: "tools:live" },
  { id: "licensing", title: "Platform licenses", body: "View licenses and immediately suspend, restore, or revoke access.", capability: "platform:license-admin" },
];
export default function ToolsScreen() { const employee = useEmployee(); const { colors } = useAppTheme(); const visible = tools.filter((tool) => employee.has(tool.capability)); return <Screen eyebrow="PERMISSION AWARE" title="Employee tools">{visible.length ? visible.map((tool) => <Link key={tool.id} href={{ pathname: "/tools/[tool]", params: { tool: tool.id } }} asChild><Pressable><Card><Text style={{ color: colors.ink, fontSize: 18, fontWeight: "900" }}>{tool.title}</Text><Text style={{ color: colors.muted, lineHeight: 20 }}>{tool.body}</Text></Card></Pressable></Link>) : <StateCard title="No tools assigned" body="Your account can use the employee app but has no operational-tool capabilities." />}</Screen>; }
