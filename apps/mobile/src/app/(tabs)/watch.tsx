import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import type { LiveSnapshot } from "@harborline/contracts";
import { BrandHeader } from "@/components/brand-header";
import { type AppColors } from "@/constants/theme";
import { useAppTheme } from "@/providers/theme-provider";
import { getLive } from "@/lib/api";
export default function WatchScreen() {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const [live, setLive] = useState<LiveSnapshot | null>(null);
  useEffect(() => {
    void getLive().then(setLive);
  }, []);
  const player = useVideoPlayer(live?.streamUrl ?? null);
  return (
    <View style={styles.screen}>
      <BrandHeader eyebrow="WATCH HARBORLINE" />
      <ScrollView>
        <View style={styles.video}>
          {live?.streamUrl ? (
            <VideoView
              player={player}
              style={StyleSheet.absoluteFill}
              nativeControls
              contentFit="contain"
            />
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.station}>HLN 8</Text>
              <Text style={styles.offline}>The live stream is off air</Text>
              <Text style={styles.offlineCopy}>
                Recorded updates and a configured HLS stream will appear here.
              </Text>
            </View>
          )}
        </View>
        <View style={styles.liveRow}>
          <View style={[styles.dot, live?.isLive && styles.dotLive]} />
          <Text style={styles.liveText}>
            {live?.isLive ? "LIVE NOW" : "UPCOMING"}
          </Text>
          <Text style={styles.liveTitle}>
            {live?.title ?? "Harborline Now"}
          </Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.heading}>Today on HLN 8</Text>
          {(live?.schedule ?? []).map((item) => (
            <View
              key={`${item.startsAt}-${item.title}`}
              style={styles.schedule}
            >
              <Text style={styles.time}>{item.startsAt}</Text>
              <Text style={styles.show}>{item.title}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
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
    offlineCopy: { color: "#ffffff99", textAlign: "center", marginTop: 5 },
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
