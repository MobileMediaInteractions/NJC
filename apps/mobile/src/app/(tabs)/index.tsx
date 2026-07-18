import { useCallback, useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { Story } from "@harborline/contracts";
import { BrandHeader } from "@/components/brand-header";
import { EmptyState, LoadingState } from "@/components/states";
import { StoryCard } from "@/components/story-card";
import { type AppColors } from "@/constants/theme";
import { useAppTheme } from "@/providers/theme-provider";
import { getStories } from "@/lib/api";

export default function HomeScreen() {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setStories(await getStories());
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Local coverage could not be loaded.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const data = await getStories();
        if (!active) return;
        setStories(data);
        setError(null);
      } catch (loadError) {
        if (!active) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Local coverage could not be loaded.",
        );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <View style={styles.screen}>
      <BrandHeader />
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={colors.blue}
          />
        }
      >
        {error && stories.length ? (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              Could not refresh. Showing coverage saved on this device.
            </Text>
          </View>
        ) : null}
        {loading ? (
          <LoadingState />
        ) : error && !stories.length ? (
          <EmptyState
            title="Coverage unavailable"
            body={error}
            action="Try again"
            onPress={() => void refresh()}
          />
        ) : !stories.length ? (
          <EmptyState
            title="No published stories yet"
            body="New local reporting will appear here after it is published by the newsroom."
            action="Refresh"
            onPress={() => void refresh()}
          />
        ) : (
          <>
            {stories[0] ? <StoryCard story={stories[0]} featured /> : null}
            <View style={styles.section}>
              <Text style={styles.kicker}>YOUR LOCAL BRIEFING</Text>
              <Text style={styles.title}>More from Middlesex County</Text>
              {stories.slice(1).map((story) => (
                <StoryCard key={story.id} story={story} />
              ))}
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
    notice: {
      backgroundColor: colors.sky,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    noticeText: { color: colors.navy, fontSize: 12, fontWeight: "700" },
    section: { padding: 16 },
    kicker: {
      color: colors.red,
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1.5,
    },
    title: {
      color: colors.navy,
      fontSize: 25,
      fontWeight: "900",
      marginTop: 4,
      marginBottom: 14,
    },
  });
