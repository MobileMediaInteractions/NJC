import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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
import { getBookmark, toggleBookmark } from "@/lib/bookmarks";

export default function StoryScreen() {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [story, setStory] = useState<Story | null | undefined>();
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!slug) {
      setStory(null);
      setNotice("This story link is incomplete.");
      return;
    }

    setStory(undefined);
    const [storyResult, bookmarkResult] = await Promise.allSettled([
      getStory(slug),
      getBookmark(slug),
    ]);
    const bookmark =
      bookmarkResult.status === "fulfilled" ? bookmarkResult.value : null;
    setSaved(Boolean(bookmark));

    if (storyResult.status === "fulfilled") {
      setStory(storyResult.value ?? bookmark);
      setNotice(
        !storyResult.value && bookmark
          ? "This story is no longer available from the service. Showing the copy saved on this device."
          : null,
      );
      return;
    }

    setStory(bookmark);
    setNotice(
      bookmark
        ? "Could not refresh this story. Showing the copy saved on this device."
        : storyResult.reason instanceof Error
          ? storyResult.reason.message
          : "This story could not be loaded.",
    );
  }, [slug]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const save = useCallback(async () => {
    if (!story) return;
    try {
      setSaved(await toggleBookmark(story));
      setNotice(null);
    } catch {
      setNotice("The saved-story list could not be updated on this device.");
    }
  }, [story]);

  const share = useCallback(async () => {
    if (!story) return;
    try {
      await Share.share({
        title: story.headline,
        message: `${story.headline}\n${apiBaseUrl}/story/${story.slug}`,
      });
    } catch {
      setNotice("This story could not be shared from the device.");
    }
  }, [story]);

  if (story === undefined) return <LoadingState />;
  if (!story)
    return (
      <EmptyState
        title="Story unavailable"
        body={notice ?? "This story may have moved or is not saved on this device."}
        action="Try again"
        onPress={() => void load()}
      />
    );
  return (
    <ScrollView style={styles.screen}>
      {notice ? (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>{notice}</Text>
        </View>
      ) : null}
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
            onPress={() => void save()}
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
            onPress={() => void share()}
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
    notice: { backgroundColor: colors.sky, padding: 12 },
    noticeText: { color: colors.navy, textAlign: "center", fontWeight: "700" },
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
