import { useAuth } from "@clerk/expo";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Screen, StateCard } from "@/components/screen";
import { employeeRequest } from "@/lib/api";

export default function DeepLinkResolverScreen() {
  const params = useLocalSearchParams<{ path?: string | string[] }>(); const { getToken } = useAuth(); const [error, setError] = useState<string | null>(null);
  useEffect(() => { let active = true; void (async () => { try { const initial = await Linking.getInitialURL(); const path = Array.isArray(params.path) ? params.path.join("/") : params.path ?? "dashboard"; const url = initial && initial.includes("/v1/") ? initial : `njcourier-employee:///v1/${path}`; const token = await getToken(); if (!token) throw new Error("Sign in to continue."); const result = await employeeRequest<{ route: string }>("/api/v1/employee/deep-links/resolve", token, { method: "POST", body: JSON.stringify({ url, appVersion: Constants.expoConfig?.version ?? "1.0.0" }) }); if (active) router.replace(result.route as never); } catch (caught) { if (active) setError(caught instanceof Error ? caught.message : "This link is unavailable."); } })(); return () => { active = false; }; }, [getToken, params.path]);
  return <Screen title="Opening employee link">{error ? <StateCard title="Link unavailable" body={error} action="Go to employee home" onAction={() => router.replace("/")} /> : <StateCard title="Checking access" body="Validating the destination, app version, session, resource, and current capabilities." />}</Screen>;
}
