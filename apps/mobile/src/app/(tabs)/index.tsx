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
import { LoadingState } from "@/components/states";
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

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const data = await getStories();
    setStories(data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    let active = true;
    void getStories().then((data) => {
      if (!active) return;
      setStories(data);
      setLoading(false);
    });
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
        <View style={styles.alert}>
          <Text style={styles.alertLabel}>DEVELOPING</Text>
          <Text style={styles.alertText}>
            Coastal storm watch begins Tuesday at 6 a.m.
          </Text>
        </View>
        {loading ? (
          <LoadingState />
        ) : (
          <>
            {stories[0] ? <StoryCard story={stories[0]} featured /> : null}
            <View style={styles.section}>
              <Text style={styles.kicker}>YOUR LOCAL BRIEFING</Text>
              <Text style={styles.title}>More from Harbor County</Text>
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
    alert: {
      backgroundColor: colors.sky,
      paddingHorizontal: 16,
      paddingVertical: 10,
      flexDirection: "row",
      gap: 10,
      alignItems: "center",
    },
    alertLabel: {
      backgroundColor: colors.yellow,
      color: colors.brandNavy,
      fontSize: 9,
      fontWeight: "900",
      paddingHorizontal: 7,
      paddingVertical: 4,
      letterSpacing: 0.9,
    },
    alertText: { color: colors.navy, fontSize: 12, fontWeight: "700", flex: 1 },
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
