import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { Story } from "@harborline/contracts";
import { AppIcon } from "@/components/app-icon";
import { EmptyState, LoadingState } from "@/components/states";
import { type AppColors } from "@/constants/theme";
import { useAppTheme } from "@/providers/theme-provider";
import { apiBaseUrl, getStory } from "@/lib/api";
import { isBookmarked, toggleBookmark } from "@/lib/bookmarks";

export default function StoryScreen() {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [story, setStory] = useState<Story | null | undefined>();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let active = true;
    void Promise.all([getStory(slug), isBookmarked(slug)]).then(
      ([value, bookmarked]) => {
        if (!active) return;
        setStory(value);
        setSaved(bookmarked);
      },
    );
    return () => {
      active = false;
    };
  }, [slug]);

  if (story === undefined) return <LoadingState />;
  if (!story)
    return (
      <EmptyState
        title="Story unavailable"
        body="This story may have moved or is not saved on this device."
      />
    );
  return (
    <ScrollView style={styles.screen}>
      <Image
        source={{ uri: story.image }}
        style={styles.image}
        contentFit="cover"
        accessibilityLabel={story.imageAlt}
        alt={story.imageAlt}
      />
      <View style={styles.content}>
        <View style={styles.labels}>
          {story.isBreaking ? (
            <Text style={styles.breaking}>BREAKING</Text>
          ) : null}
          <Text style={styles.category}>
            {story.categoryLabel.toUpperCase()}
          </Text>
        </View>
        <Text style={styles.headline}>{story.headline}</Text>
        <Text style={styles.dek}>{story.dek}</Text>
        <Text style={styles.byline}>
          By {story.author.name} · {story.location} · {story.readingMinutes} min
        </Text>
        <View style={styles.actions}>
          <Pressable
            accessibilityLabel={saved ? "Remove bookmark" : "Save story"}
            onPress={() => void toggleBookmark(story).then(setSaved)}
            style={styles.action}
          >
            <AppIcon
              name={saved ? "bookmark" : "bookmark-outline"}
              size={19}
              color={colors.blue}
            />
            <Text style={styles.actionText}>{saved ? "Saved" : "Save"}</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Share story"
            onPress={() =>
              void Share.share({
                title: story.headline,
                message: `${story.headline}\n${apiBaseUrl}/story/${story.slug}`,
              })
            }
            style={styles.action}
          >
            <AppIcon name="share-outline" size={19} color={colors.blue} />
            <Text style={styles.actionText}>Share</Text>
          </Pressable>
        </View>
        {story.body.map((paragraph) => (
          <Text key={paragraph} style={styles.body}>
            {paragraph}
          </Text>
        ))}
        <View style={styles.tags}>
          {story.tags.map((tag) => (
            <Text key={tag} style={styles.tag}>
              #{tag}
            </Text>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.surface },
    image: { width: "100%", height: 245, backgroundColor: colors.sky },
    content: { padding: 20, paddingBottom: 50 },
    labels: { flexDirection: "row", alignItems: "center", gap: 9 },
    breaking: {
      backgroundColor: colors.red,
      color: "#fff",
      fontSize: 9,
      fontWeight: "900",
      paddingHorizontal: 7,
      paddingVertical: 4,
    },
    category: {
      color: colors.blue,
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1.4,
    },
    headline: {
      color: colors.navy,
      fontSize: 34,
      lineHeight: 38,
      fontWeight: "900",
      letterSpacing: -0.8,
      marginTop: 12,
    },
    dek: { color: colors.muted, fontSize: 18, lineHeight: 26, marginTop: 12 },
    byline: {
      color: colors.ink,
      fontSize: 12,
      fontWeight: "700",
      marginTop: 18,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.line,
    },
    actions: { flexDirection: "row", gap: 10, marginVertical: 16 },
    action: {
      flexDirection: "row",
      gap: 6,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.line,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 7,
    },
    actionText: { color: colors.blue, fontWeight: "800" },
    body: { color: colors.ink, fontSize: 17, lineHeight: 29, marginBottom: 18 },
    tags: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
    tag: {
      color: colors.blue,
      backgroundColor: colors.sky,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 5,
      fontSize: 12,
      fontWeight: "700",
    },
  });
