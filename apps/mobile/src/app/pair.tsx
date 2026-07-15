import { useAuth } from "@clerk/expo";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Link, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { type AppColors } from "@/constants/theme";
import { useAppTheme } from "@/providers/theme-provider";
import { authenticatedRequest } from "@/lib/api";

function formatCode(value: string) {
  const clean = value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
  return clean.length > 3 ? `${clean.slice(0, 3)}-${clean.slice(3)}` : clean;
}

function parsePairing(value: string) {
  try {
    const url = new URL(value);
    const session = url.searchParams.get("session") ?? "";
    const code = formatCode(url.searchParams.get("code") ?? "");
    const requestedTarget = url.searchParams.get("target");
    const target =
      requestedTarget === "web" ||
      requestedTarget === "roku" ||
      requestedTarget === "androidtv"
        ? requestedTarget
        : url.pathname.includes("/login/tv")
          ? "tv"
          : "";
    return session && code && target
      ? {
          session,
          code,
          target: target as "tv" | "androidtv" | "roku" | "web",
        }
      : null;
  } catch {
    return null;
  }
}

export default function PairScreen() {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const params = useLocalSearchParams<{
    session?: string;
    code?: string;
    target?: string;
  }>();
  const { isSignedIn, getToken } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [session, setSession] = useState(
    typeof params.session === "string" ? params.session : "",
  );
  const [code, setCode] = useState(
    formatCode(typeof params.code === "string" ? params.code : ""),
  );
  const [target, setTarget] = useState<
    "tv" | "androidtv" | "roku" | "web"
  >(
    params.target === "tv" ||
      params.target === "roku" ||
      params.target === "androidtv"
      ? params.target
      : "web",
  );
  const [scanned, setScanned] = useState(Boolean(session && code));
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  function onScan(data: string) {
    const parsed = parsePairing(data);
    if (!parsed) {
      setNotice("That QR code is not an NJ Courier sign-in request.");
      return;
    }
    setSession(parsed.session);
    setCode(parsed.code);
    setTarget(parsed.target);
    setScanned(true);
    setNotice("");
  }

  async function approve() {
    setBusy(true);
    setNotice("");
    try {
      const token = await getToken();
      if (!token) throw new Error("Sign in before approving another device.");
      await authenticatedRequest(
        `/api/v1/device-pairing/${encodeURIComponent(session)}/approve`,
        token,
        { method: "POST", body: JSON.stringify({ code, target }) },
      );
      setNotice(
        target === "web"
          ? "Browser approved. It will finish signing in now."
          : `${target === "roku" ? "Roku" : target === "androidtv" ? "Android TV" : "Apple TV"} approved. It will finish signing in now.`,
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "The device could not be approved.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!isSignedIn)
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Sign in first</Text>
        <Text style={styles.copy}>
          Only an authenticated Courier account can approve a browser or
          television.
        </Text>
        <Link href="/account" asChild>
          <Pressable style={styles.primary}>
            <Text style={styles.primaryText}>Open account sign-in</Text>
          </Pressable>
        </Link>
      </View>
    );

  if (!scanned)
    return (
      <View style={styles.cameraPage}>
        <View style={styles.cameraHeader}>
          <Text style={styles.cameraTitle}>Scan NJ Courier QR</Text>
          <Text style={styles.cameraCopy}>
            The QR should be visible on the browser or television you want to
            connect.
          </Text>
        </View>
        {permission?.granted ? (
          <CameraView
            style={styles.camera}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={({ data }) => onScan(data)}
          >
            <View style={styles.frame} />
          </CameraView>
        ) : (
          <View style={styles.permission}>
            <Text style={styles.copy}>
              Camera access is needed only while scanning this sign-in QR.
            </Text>
            <Pressable
              onPress={() => void requestPermission()}
              style={styles.primary}
            >
              <Text style={styles.primaryText}>Allow camera</Text>
            </Pressable>
          </View>
        )}
      </View>
    );

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>VERIFY THE OTHER DEVICE</Text>
      <Text style={styles.title}>Do these codes match?</Text>
      <Text style={styles.copy}>
        Compare this code with the one on the{" "}
        {target === "web"
          ? "browser"
          : target === "roku"
            ? "Roku"
            : target === "androidtv"
              ? "Android TV"
              : "Apple TV"}
        . If anything is different,
        do not approve.
      </Text>
      <View style={styles.codeCard}>
        <Text style={styles.codeLabel}>SYNC CODE</Text>
        <TextInput
          accessibilityLabel="Sync code"
          autoCapitalize="characters"
          value={code}
          onChangeText={(value) => setCode(formatCode(value))}
          style={styles.code}
          maxLength={7}
        />
      </View>
      <Pressable
        disabled={busy || !session || code.length !== 7}
        onPress={() => void approve()}
        style={[
          styles.primary,
          (busy || !session || code.length !== 7) && styles.disabled,
        ]}
      >
        <Text style={styles.primaryText}>
          {busy ? "Verifying…" : "The codes match — approve sign-in"}
        </Text>
      </Pressable>
      <Pressable
        onPress={() => {
          setSession("");
          setCode("");
          setScanned(false);
          setNotice("");
        }}
        style={styles.cancel}
      >
        <Text style={styles.cancelText}>Cancel and scan again</Text>
      </Pressable>
      {notice ? (
        <Text accessibilityLiveRegion="polite" style={styles.notice}>
          {notice}
        </Text>
      ) : null}
      <Text style={styles.security}>
        The QR carries a short-lived request, not your password. Codes expire
        after 10 minutes and can be used once.
      </Text>
    </ScrollView>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    cameraPage: { flex: 1, backgroundColor: colors.brandNavy },
    cameraHeader: { padding: 24 },
    cameraTitle: { color: "#fff", fontSize: 28, fontWeight: "900" },
    cameraCopy: {
      color: "#C8D9E4",
      fontSize: 15,
      lineHeight: 22,
      marginTop: 8,
    },
    camera: { flex: 1, alignItems: "center", justifyContent: "center" },
    frame: {
      width: 250,
      height: 250,
      borderWidth: 4,
      borderColor: colors.yellow,
      borderRadius: 20,
      backgroundColor: "transparent",
    },
    permission: {
      flex: 1,
      justifyContent: "center",
      padding: 24,
      backgroundColor: colors.background,
    },
    center: {
      flex: 1,
      justifyContent: "center",
      padding: 24,
      backgroundColor: colors.background,
    },
    content: { flexGrow: 1, padding: 24, backgroundColor: colors.background },
    eyebrow: {
      color: colors.red,
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 1.4,
    },
    title: {
      color: colors.navy,
      fontSize: 31,
      lineHeight: 37,
      fontWeight: "900",
      marginTop: 7,
    },
    copy: {
      color: colors.muted,
      fontSize: 15,
      lineHeight: 23,
      marginTop: 10,
      marginBottom: 20,
    },
    codeCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 12,
      padding: 20,
      marginVertical: 10,
    },
    codeLabel: {
      color: colors.muted,
      textAlign: "center",
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 2,
    },
    code: {
      color: colors.navy,
      textAlign: "center",
      fontFamily: "monospace",
      fontSize: 36,
      fontWeight: "900",
      letterSpacing: 5,
      marginTop: 8,
    },
    primary: {
      backgroundColor: colors.blue,
      borderRadius: 8,
      minHeight: 52,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
      marginTop: 14,
    },
    primaryText: {
      color: colors.onPrimary,
      fontWeight: "900",
      textAlign: "center",
    },
    disabled: { opacity: 0.5 },
    cancel: { minHeight: 48, justifyContent: "center", alignItems: "center" },
    cancelText: { color: colors.blue, fontWeight: "800" },
    notice: {
      marginTop: 8,
      backgroundColor: colors.sky,
      color: colors.ink,
      padding: 14,
      lineHeight: 20,
    },
    security: {
      color: colors.muted,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 28,
      textAlign: "center",
    },
  });
