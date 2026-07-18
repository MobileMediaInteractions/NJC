import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import type { LiveSnapshot } from "@harborline/contracts";
import { BrandHeader } from "@/components/brand-header";
import { EmptyState, LoadingState } from "@/components/states";
import { type AppColors } from "@/constants/theme";
import { useAppTheme } from "@/providers/theme-provider";
import { getLive } from "@/lib/api";
export default function WatchScreen() {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const [live, setLive] = useState<LiveSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setLive(await getLive());
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Live programming could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);
  const player = useVideoPlayer(live?.streamUrl ?? null);
  return (
    <View style={styles.screen}>
      <BrandHeader eyebrow="WATCH NJ COURIER" />
      <ScrollView>
        {loading ? (
          <LoadingState />
        ) : error && !live ? (
          <EmptyState
            title="Live programming unavailable"
            body={error}
            action="Try again"
            onPress={() => void load()}
          />
        ) : !live ? (
          <EmptyState
            title="No live information available"
            body="Streams and programs will appear here when they are published by the newsroom."
            action="Refresh"
            onPress={() => void load()}
          />
        ) : (
          <>
            {error ? (
              <View style={styles.notice}>
                <Text style={styles.noticeText}>
                  Could not refresh. Showing live information saved on this device.
                </Text>
              </View>
            ) : null}
            <View style={styles.video}>
              {live.streamUrl ? (
                <VideoView
                  player={player}
                  style={StyleSheet.absoluteFill}
                  nativeControls
                  contentFit="contain"
                />
              ) : (
                <View style={styles.placeholder}>
                  <Text style={styles.station}>{live.title}</Text>
                  <Text style={styles.offline}>The live stream is off air</Text>
                </View>
              )}
            </View>
            <View style={styles.liveRow}>
              <View style={[styles.dot, live.isLive && styles.dotLive]} />
              <Text style={styles.liveText}>
                {live.isLive ? "LIVE NOW" : "OFF AIR"}
              </Text>
              <Text style={styles.liveTitle}>{live.title}</Text>
            </View>
            <View style={styles.content}>
              <Text style={styles.heading}>Schedule</Text>
              {live.schedule.length ? (
                live.schedule.map((item) => (
                  <View
                    key={`${item.startsAt}-${item.title}`}
                    style={styles.schedule}
                  >
                    <Text style={styles.time}>{item.startsAt}</Text>
                    <Text style={styles.show}>{item.title}</Text>
                  </View>
                ))
              ) : (
                <EmptyState
                  title="No programs scheduled"
                  body="The newsroom has not published an upcoming live schedule."
                />
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    notice: { backgroundColor: colors.sky, padding: 12 },
    noticeText: { color: colors.navy, textAlign: "center", fontWeight: "700" },
    video: { width: "100%", aspectRatio: 16 / 9, backgroundColor: "#031522" },
    placeholder: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    station: {
      color: colors.yellow,
      fontSize: 28,
      fontWeight: "900",
      letterSpacing: 2,
    },
    offline: { color: "#fff", fontSize: 17, fontWeight: "800", marginTop: 6 },
    liveRow: {
      padding: 16,
      backgroundColor: colors.surface,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.line,
    },
    dot: {
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor: colors.muted,
    },
    dotLive: { backgroundColor: colors.red },
    liveText: {
      color: colors.red,
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1,
    },
    liveTitle: { color: colors.ink, fontWeight: "800", flex: 1 },
    content: { padding: 16 },
    heading: {
      color: colors.navy,
      fontSize: 24,
      fontWeight: "900",
      marginBottom: 10,
    },
    schedule: {
      flexDirection: "row",
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.line,
    },
    time: { color: colors.blue, fontWeight: "900", width: 74 },
    show: { color: colors.ink, fontWeight: "700" },
  });
