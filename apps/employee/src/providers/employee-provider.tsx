import { useAuth } from "@clerk/expo";
import type { EmployeeCapability, StaffRole } from "@harborline/contracts";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import { employeeRequest } from "@/lib/api";
import { reportEmployeeAudience } from "@/lib/audience";

export type EmployeeChannel = { id: string; kind: "public" | "private" | "direct" | "group"; name: string; topic: string | null; unread: number; updatedAt: string };
type Bootstrap = { viewer: { id: string; name: string; email: string; role: StaffRole; capabilities: EmployeeCapability[] }; channels: EmployeeChannel[]; unreadNotifications: number; transport: { kind: string; recommendedIntervalMs: number }; minimumVersion: string };
type EmployeeState = { data: Bootstrap | null; loading: boolean; offline: boolean; error: string | null; refresh: () => Promise<void>; has: (capability: EmployeeCapability) => boolean };
const Context = createContext<EmployeeState | null>(null);

export function EmployeeProvider({ children }: { children: ReactNode }) {
  const { isSignedIn, getToken } = useAuth();
  const [data, setData] = useState<Bootstrap | null>(null);
  const dataRef = useRef<Bootstrap | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    if (!isSignedIn) { setData(null); setLoading(false); return; }
    try {
      const token = await getToken();
      if (!token) throw new Error("Your session expired. Sign in again.");
      const next = await employeeRequest<Bootstrap>("/api/v1/employee/bootstrap", token);
      void reportEmployeeAudience(token).catch(() => undefined);
      dataRef.current = next; setData(next); setError(null); setOffline(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Employee services are unavailable.");
      setOffline(Boolean(dataRef.current));
      if (!dataRef.current) setData(null);
    } finally { setLoading(false); }
  }, [getToken, isSignedIn]);

  useEffect(() => { const timer = setTimeout(() => void refresh(), 0); return () => clearTimeout(timer); }, [refresh]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => { if (state === "active") void refresh(); });
    const timer = setInterval(() => { if (AppState.currentState === "active") void refresh(); }, 30_000);
    return () => { subscription.remove(); clearInterval(timer); };
  }, [refresh]);
  const has = useCallback((capability: EmployeeCapability) => Boolean(data?.viewer.capabilities.includes(capability)), [data]);
  const value = useMemo(() => ({ data, loading, offline, error, refresh, has }), [data, error, has, loading, offline, refresh]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useEmployee() { const value = useContext(Context); if (!value) throw new Error("Employee provider is missing"); return value; }
