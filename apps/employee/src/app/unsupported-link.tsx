import { router } from "expo-router";
import { Screen, StateCard } from "@/components/screen";
export default function UnsupportedLinkScreen() { return <Screen title="Link unavailable"><StateCard title="Unsupported employee link" body="The link may be invalid, expired, deleted, unauthorized, or intended for a newer app version. Sensitive resource details were not disclosed." action="Go to employee home" onAction={() => router.replace("/")} /></Screen>; }
