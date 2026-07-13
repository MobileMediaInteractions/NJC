import type {
  LiveSnapshot,
  PairingPollResult,
  PairingRequest,
  Story,
} from "@harborline/contracts";
import { requestHarborlineApi } from "@harborline/api-client";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";

const darkColors = {
  navy: "#031C2E",
  blue: "#0A4B78",
  sky: "#DDECF4",
  yellow: "#F5B335",
  red: "#D82C3B",
  white: "#FFFFFF",
  muted: "#AAC0CE",
  surface: "#0B3551",
  onMedia: "#FFFFFF",
};
type TvColors = typeof darkColors;
const lightColors: TvColors = {
  navy: "#EDF3F6",
  blue: "#0A4B78",
  sky: "#DDECF4",
  yellow: "#D99612",
  red: "#C92435",
  white: "#072F4D",
  muted: "#536976",
  surface: "#FFFFFF",
  onMedia: "#FFFFFF",
};
const configuredUrl =
  process.env.EXPO_PUBLIC_TV_API_URL ?? Constants.expoConfig?.extra?.apiUrl;
const apiUrl =
  typeof configuredUrl === "string"
    ? configuredUrl.replace(/\/$/, "")
    : "http://localhost:3000";
const tokenKey = "harborline:tv:device-token";
const installationKey = "harborline:tv:installation";
const themeKey = "harborline:tv:theme";

type Account = { name: string; platform: string; expiresAt?: string };
type ThemePreference = "system" | "light" | "dark";
type ThemeContextValue = {
  colors: TvColors;
  styles: ReturnType<typeof createStyles>;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => Promise<void>;
};
const ThemeContext = createContext<ThemeContextValue | null>(null);

function TvThemeProvider({ children }: { children: ReactNode }) {
  const systemTheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  useEffect(() => {
    let active = true;
    void SecureStore.getItemAsync(themeKey).then((value) => {
      if (
        active &&
        (value === "system" || value === "light" || value === "dark")
      )
        setPreferenceState(value);
    });
    return () => {
      active = false;
    };
  }, []);
  const resolved =
    preference === "system"
      ? systemTheme === "light"
        ? "light"
        : "dark"
      : preference;
  const colors = resolved === "dark" ? darkColors : lightColors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const setPreference = useCallback(async (next: ThemePreference) => {
    setPreferenceState(next);
    await SecureStore.setItemAsync(themeKey, next);
  }, []);
  const value = useMemo(
    () => ({ colors, styles, preference, setPreference }),
    [colors, preference, setPreference, styles],
  );
  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

function useTvTheme() {
  const context = useContext(ThemeContext);
  if (!context)
    throw new Error("useTvTheme must be used within TvThemeProvider");
  return context;
}

async function api<T>(path: string, init?: RequestInit) {
  return requestHarborlineApi<T>(path, { baseUrl: apiUrl }, init);
}

async function reportPresence(token?: string) {
  let installationId = await SecureStore.getItemAsync(installationKey);
  if (!installationId) {
    installationId =
      `${Date.now().toString(36)}${Array.from({ length: 5 }, () => Math.random().toString(36).slice(2)).join("")}`.slice(
        0,
        64,
      );
    await SecureStore.setItemAsync(installationKey, installationId);
  }
  await fetch(`${apiUrl}/api/v1/audience/presence`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      installationId,
      platform: "tvos",
      source: "tv-app",
      appVersion: Constants.expoConfig?.version ?? "1.0.0",
    }),
  }).catch(() => undefined);
}

export default function App() {
  return (
    <TvThemeProvider>
      <TvApp />
    </TvThemeProvider>
  );
}

function TvApp() {
  const [account, setAccount] = useState<Account | null>(null);
  const [pairing, setPairing] = useState<PairingRequest | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [live, setLive] = useState<LiveSnapshot | null>(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  const beginPairing = useCallback(async () => {
    setNotice("");
    setPairing(null);
    setLoading(true);
    try {
      setPairing(
        await api<PairingRequest>("/api/v1/device-pairing", {
          method: "POST",
          body: JSON.stringify({
            target: "tv",
            deviceName: Platform.isTVOS ? "Apple TV" : "TV device",
          }),
        }),
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Could not create a television sign-in code.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.all([
      api<Story[]>("/api/v1/stories?limit=12").catch(() => []),
      api<LiveSnapshot>("/api/v1/live").catch(() => null),
      SecureStore.getItemAsync(tokenKey),
      reportPresence(),
    ]).then(async ([storyRows, liveSnapshot, token]) => {
      if (!active) return;
      setStories(storyRows);
      setLive(liveSnapshot);
      if (token) {
        try {
          const identity = await api<Account>("/api/v1/device-session", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (active) setAccount(identity);
          await reportPresence(token);
        } catch {
          await SecureStore.deleteItemAsync(tokenKey);
        }
      }
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (loading || account || pairing || notice) return;
    const timer = setTimeout(() => void beginPairing(), 0);
    return () => clearTimeout(timer);
  }, [account, beginPairing, loading, notice, pairing]);
  useEffect(() => {
    if (!pairing || account) return;
    let active = true;
    const poll = async () => {
      try {
        const result = await api<PairingPollResult>(
          `/api/v1/device-pairing/${pairing.id}/poll`,
          {
            method: "POST",
            body: JSON.stringify({ deviceSecret: pairing.deviceSecret }),
          },
        );
        if (!active) return;
        if (result.status === "approved" && "accessToken" in result) {
          await SecureStore.setItemAsync(tokenKey, result.accessToken);
          setAccount({ ...result.account, expiresAt: result.expiresAt });
          await reportPresence(result.accessToken);
          setPairing(null);
        } else if (["expired", "consumed", "denied"].includes(result.status)) {
          setPairing(null);
          setNotice(
            "This code is no longer active. Select Try again for a new code.",
          );
        }
      } catch (error) {
        if (active)
          setNotice(
            error instanceof Error
              ? error.message
              : "Could not check sign-in status.",
          );
      }
    };
    const timer = setInterval(
      () => void poll(),
      pairing.pollIntervalSeconds * 1000,
    );
    void poll();
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [account, pairing]);

  async function signOut() {
    const token = await SecureStore.getItemAsync(tokenKey);
    if (token)
      await fetch(`${apiUrl}/api/v1/device-session`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => undefined);
    await SecureStore.deleteItemAsync(tokenKey);
    setAccount(null);
    setNotice("");
    setPairing(null);
  }

  if (!account)
    return (
      <PairingScreen
        pairing={pairing}
        loading={loading}
        notice={notice}
        retry={beginPairing}
      />
    );
  return (
    <HomeScreen
      account={account}
      stories={stories}
      live={live}
      signOut={signOut}
    />
  );
}

function PairingScreen({
  pairing,
  loading,
  notice,
  retry,
}: {
  pairing: PairingRequest | null;
  loading: boolean;
  notice: string;
  retry: () => Promise<void>;
}) {
  const { colors, styles } = useTvTheme();
  return (
    <View style={styles.pairingPage}>
      <View style={styles.topBar}>
        <View style={styles.brand}>
          <View style={styles.brandLine} />
          <Text style={styles.brandName}>HARBORLINE</Text>
          <Text style={styles.brandLocal}>LOCAL TV</Text>
        </View>
        <ThemeControls />
      </View>
      <View style={styles.pairingContent}>
        <View style={styles.pairingCopy}>
          <Text style={styles.eyebrow}>CONNECT YOUR APPLE TV</Text>
          <Text style={styles.pairingTitle}>
            Local news, ready for the big screen.
          </Text>
          <Text style={styles.body}>Scan the QR with your phone or visit</Text>
          <Text style={styles.address}>
            {pairing?.verificationUri ?? `${apiUrl}/login/tv`}
          </Text>
          <Text style={styles.security}>
            Sign in on your phone, then verify that its sync code exactly
            matches this television. The QR never contains your password.
          </Text>
        </View>
        <View style={styles.qrCard}>
          {pairing ? (
            <>
              <Image
                source={{ uri: pairing.qrImageUrl }}
                style={styles.qr}
                alt="QR code to connect this Apple TV"
                accessibilityLabel="QR code to connect this Apple TV"
              />
              <Text style={styles.codeLabel}>SYNC CODE</Text>
              <Text style={styles.code}>{pairing.userCode}</Text>
              <View style={styles.waiting}>
                <ActivityIndicator color={colors.blue} />
                <Text style={styles.waitingText}>Waiting for approval</Text>
              </View>
            </>
          ) : (
            <View style={styles.cardCenter}>
              {loading ? (
                <ActivityIndicator size="large" color={colors.blue} />
              ) : (
                <>
                  <Text style={styles.error}>
                    {notice || "Sign-in code unavailable"}
                  </Text>
                  <FocusButton label="Try again" onPress={() => void retry()} />
                </>
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function HomeScreen({
  account,
  stories,
  live,
  signOut,
}: {
  account: Account;
  stories: Story[];
  live: LiveSnapshot | null;
  signOut: () => Promise<void>;
}) {
  const { styles } = useTvTheme();
  const lead = stories[0];
  return (
    <View style={styles.home}>
      <View style={styles.nav}>
        <View style={styles.brandCompact}>
          <View style={styles.brandLine} />
          <Text style={styles.brandName}>HARBORLINE</Text>
          <Text style={styles.brandLocal}>TV</Text>
        </View>
        <View style={styles.navItems}>
          <Text style={styles.navActive}>Home</Text>
          <Text style={styles.navItem}>Latest</Text>
          <Text style={styles.navItem}>Watch</Text>
          <Text style={styles.navItem}>Weather</Text>
        </View>
        <View style={styles.account}>
          <Text style={styles.accountName}>{account.name}</Text>
          <ThemeControls />
          <FocusButton
            label="Sign out"
            onPress={() => void signOut()}
            compact
          />
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.homeContent}>
        {live?.isLive ? (
          <View style={styles.liveBanner}>
            <Text style={styles.livePill}>LIVE</Text>
            <Text style={styles.liveTitle}>{live.title}</Text>
            <FocusButton label="Watch now" onPress={() => undefined} compact />
          </View>
        ) : null}
        {lead ? (
          <View style={styles.hero}>
            <Image
              source={{ uri: lead.image }}
              style={styles.heroImage}
              alt={lead.imageAlt}
            />
            <View style={styles.heroShade} />
            <View style={styles.heroCopy}>
              <Text style={styles.heroCategory}>
                {lead.categoryLabel.toUpperCase()}
              </Text>
              <Text style={styles.heroHeadline}>{lead.headline}</Text>
              <Text numberOfLines={2} style={styles.heroDek}>
                {lead.dek}
              </Text>
              <FocusButton label="Read story" onPress={() => undefined} />
            </View>
          </View>
        ) : null}
        <Text style={styles.sectionTitle}>Latest from Harbor County</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rail}
        >
          {stories.slice(1).map((story) => (
            <StoryTile key={story.id} story={story} />
          ))}
        </ScrollView>
      </ScrollView>
    </View>
  );
}

function StoryTile({ story }: { story: Story }) {
  const { styles } = useTvTheme();
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[styles.tile, focused && styles.tileFocused]}
    >
      <Image
        source={{ uri: story.image }}
        style={styles.tileImage}
        alt={story.imageAlt}
      />
      <View style={styles.tileCopy}>
        <Text style={styles.tileCategory}>
          {story.categoryLabel.toUpperCase()}
        </Text>
        <Text numberOfLines={3} style={styles.tileHeadline}>
          {story.headline}
        </Text>
      </View>
    </Pressable>
  );
}

function FocusButton({
  label,
  onPress,
  compact = false,
  selected = false,
}: {
  label: string;
  onPress: () => void;
  compact?: boolean;
  selected?: boolean;
}) {
  const { styles } = useTvTheme();
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[
        styles.button,
        compact && styles.buttonCompact,
        selected && styles.buttonSelected,
        focused && styles.buttonFocused,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          (focused || selected) && styles.buttonTextFocused,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ThemeControls() {
  const { preference, setPreference, styles } = useTvTheme();
  const choices: { value: ThemePreference; label: string }[] = [
    { value: "system", label: "Device" },
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
  ];
  return (
    <View style={styles.themeControls}>
      <Text style={styles.themeLabel}>APPEARANCE</Text>
      {choices.map((choice) => (
        <FocusButton
          key={choice.value}
          label={choice.label}
          compact
          selected={preference === choice.value}
          onPress={() => void setPreference(choice.value)}
        />
      ))}
    </View>
  );
}

const createStyles = (colors: TvColors) =>
  StyleSheet.create({
    pairingPage: {
      flex: 1,
      backgroundColor: colors.navy,
      paddingHorizontal: 76,
      paddingVertical: 44,
    },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    brand: { flexDirection: "row", alignItems: "center", gap: 12 },
    brandCompact: { flexDirection: "row", alignItems: "center", gap: 9 },
    brandLine: { width: 7, height: 36, backgroundColor: colors.yellow },
    brandName: {
      color: colors.white,
      fontSize: 25,
      fontWeight: "900",
      letterSpacing: 1,
    },
    brandLocal: {
      color: colors.yellow,
      fontSize: 15,
      fontWeight: "900",
      letterSpacing: 2,
    },
    pairingContent: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 72,
    },
    pairingCopy: { flex: 1 },
    eyebrow: {
      color: colors.yellow,
      fontSize: 16,
      fontWeight: "900",
      letterSpacing: 3,
    },
    pairingTitle: {
      color: colors.white,
      fontSize: 52,
      lineHeight: 60,
      fontWeight: "900",
      marginTop: 16,
      maxWidth: 680,
    },
    body: { color: colors.muted, fontSize: 23, marginTop: 28 },
    address: {
      color: colors.white,
      fontSize: 25,
      fontWeight: "800",
      marginTop: 8,
    },
    security: {
      color: colors.muted,
      fontSize: 17,
      lineHeight: 27,
      marginTop: 30,
      maxWidth: 650,
    },
    qrCard: {
      width: 390,
      height: 510,
      borderRadius: 22,
      backgroundColor: "#FFFFFF",
      padding: 28,
      alignItems: "center",
      justifyContent: "center",
    },
    qr: { width: 300, height: 300 },
    codeLabel: {
      color: "#6C7B85",
      fontSize: 12,
      fontWeight: "900",
      letterSpacing: 3,
      marginTop: 14,
    },
    code: {
      color: "#072F4D",
      fontSize: 41,
      fontWeight: "900",
      letterSpacing: 7,
      marginTop: 7,
    },
    waiting: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginTop: 18,
    },
    waitingText: { color: colors.blue, fontSize: 15, fontWeight: "800" },
    cardCenter: { alignItems: "center", gap: 20 },
    error: { color: colors.red, fontSize: 17, textAlign: "center" },
    button: {
      marginTop: 20,
      minWidth: 170,
      minHeight: 58,
      paddingHorizontal: 28,
      borderRadius: 9,
      backgroundColor: colors.white,
      borderWidth: 3,
      borderColor: colors.white,
      alignItems: "center",
      justifyContent: "center",
    },
    buttonCompact: {
      minWidth: 110,
      minHeight: 44,
      marginTop: 0,
      paddingHorizontal: 18,
    },
    buttonFocused: {
      backgroundColor: colors.yellow,
      borderColor: colors.yellow,
      transform: [{ scale: 1.06 }],
    },
    buttonSelected: { borderColor: colors.yellow },
    buttonText: { color: colors.navy, fontSize: 17, fontWeight: "900" },
    buttonTextFocused: { color: "#072F4D" },
    home: { flex: 1, backgroundColor: colors.navy },
    nav: {
      height: 92,
      paddingHorizontal: 54,
      flexDirection: "row",
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor: "#FFFFFF22",
    },
    navItems: { marginLeft: 70, flexDirection: "row", gap: 38 },
    navItem: { color: colors.muted, fontSize: 17, fontWeight: "700" },
    navActive: {
      color: colors.white,
      fontSize: 17,
      fontWeight: "900",
      borderBottomWidth: 3,
      borderBottomColor: colors.yellow,
      paddingBottom: 8,
    },
    account: {
      marginLeft: "auto",
      flexDirection: "row",
      alignItems: "center",
      gap: 18,
    },
    accountName: { color: colors.muted, fontSize: 14 },
    homeContent: { padding: 48, paddingBottom: 80 },
    liveBanner: {
      borderRadius: 12,
      backgroundColor: colors.red,
      paddingHorizontal: 24,
      height: 68,
      flexDirection: "row",
      alignItems: "center",
      gap: 18,
      marginBottom: 28,
    },
    livePill: {
      color: colors.red,
      backgroundColor: "#FFFFFF",
      fontSize: 13,
      fontWeight: "900",
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    liveTitle: {
      color: colors.white,
      fontSize: 22,
      fontWeight: "900",
      flex: 1,
    },
    hero: {
      height: 470,
      borderRadius: 18,
      overflow: "hidden",
      justifyContent: "flex-end",
    },
    heroImage: {
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
    },
    heroShade: { position: "absolute", inset: 0, backgroundColor: "#031C2E88" },
    heroCopy: { width: "62%", padding: 46 },
    heroCategory: {
      color: colors.yellow,
      fontSize: 15,
      fontWeight: "900",
      letterSpacing: 2,
    },
    heroHeadline: {
      color: colors.onMedia,
      fontSize: 46,
      lineHeight: 52,
      fontWeight: "900",
      marginTop: 9,
    },
    heroDek: { color: "#E6EFF4", fontSize: 20, lineHeight: 29, marginTop: 14 },
    sectionTitle: {
      color: colors.white,
      fontSize: 29,
      fontWeight: "900",
      marginTop: 44,
      marginBottom: 20,
    },
    rail: { gap: 24, padding: 8 },
    tile: {
      width: 330,
      borderRadius: 14,
      overflow: "hidden",
      backgroundColor: colors.surface,
      borderWidth: 4,
      borderColor: "transparent",
    },
    tileFocused: { borderColor: colors.yellow, transform: [{ scale: 1.04 }] },
    tileImage: { width: "100%", height: 180 },
    tileCopy: { padding: 18 },
    tileCategory: {
      color: colors.yellow,
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 1.5,
    },
    tileHeadline: {
      color: colors.white,
      fontSize: 20,
      lineHeight: 26,
      fontWeight: "800",
      marginTop: 7,
    },
    themeControls: { flexDirection: "row", alignItems: "center", gap: 9 },
    themeLabel: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 1.2,
    },
  });
