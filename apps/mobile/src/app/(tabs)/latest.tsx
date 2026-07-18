import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { Story } from "@harborline/contracts";
import { BrandHeader } from "@/components/brand-header";
import { EmptyState, LoadingState } from "@/components/states";
import { StoryCard } from "@/components/story-card";
import { type AppColors } from "@/constants/theme";
import { useAppTheme } from "@/providers/theme-provider";
import { getStories } from "@/lib/api";

export default function LatestScreen() {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const [query, setQuery] = useState("");
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    const handle = setTimeout(() => {
      setLoading(true);
      setStories([]);
      void (async () => {
        try {
          const value = await getStories(
            query ? `q=${encodeURIComponent(query)}&limit=40` : "limit=40",
          );
          if (!active) return;
          setStories(value);
          setError(null);
        } catch (loadError) {
          if (!active) return;
          setError(
            loadError instanceof Error
              ? loadError.message
              : "The latest coverage could not be loaded.",
          );
        } finally {
          if (active) setLoading(false);
        }
      })();
    }, 250);
    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [query, reload]);
  return (
    <View style={styles.screen}>
      <BrandHeader eyebrow="LATEST COVERAGE" />
      <View style={styles.search}>
        <TextInput
          accessibilityLabel="Search local news"
          value={query}
          onChangeText={setQuery}
          placeholder="Search the Courier"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <LoadingState />
        ) : error ? (
          <EmptyState
            title="Latest coverage unavailable"
            body={error}
            action="Try again"
            onPress={() => setReload((value) => value + 1)}
          />
        ) : stories.length ? (
          <>
            <Text style={styles.count}>{stories.length} STORIES</Text>
            {stories.map((story) => (
              <StoryCard key={story.id} story={story} />
            ))}
          </>
        ) : (
          <EmptyState
            title={query ? "No local results" : "No published stories yet"}
            body={
              query
                ? "Try a broader topic or location."
                : "New local reporting will appear here after it is published by the newsroom."
            }
          />
        )}
      </ScrollView>
    </View>
  );
}
const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    search: {
      padding: 14,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.line,
    },
    input: {
      height: 46,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 8,
      paddingHorizontal: 14,
      backgroundColor: colors.background,
      color: colors.ink,
      fontSize: 16,
    },
    content: { padding: 16 },
    count: {
      color: colors.blue,
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1.4,
      marginBottom: 12,
    },
  });
