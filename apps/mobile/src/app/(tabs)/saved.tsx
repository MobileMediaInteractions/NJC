import { Link, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { Story } from "@harborline/contracts";
import { BrandHeader } from "@/components/brand-header";
import { EmptyState } from "@/components/states";
import { StoryCard } from "@/components/story-card";
import { type AppColors } from "@/constants/theme";
import { useAppTheme } from "@/providers/theme-provider";
import { getBookmarks } from "@/lib/bookmarks";
export default function SavedScreen() {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const [stories, setStories] = useState<Story[]>([]);
  useFocusEffect(
    useCallback(() => {
      void getBookmarks().then(setStories);
    }, []),
  );
  return (
    <View style={styles.screen}>
      <BrandHeader eyebrow="YOUR NJ COURIER" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headingRow}>
          <View>
            <Text style={styles.kicker}>READ ANYWHERE</Text>
            <Text style={styles.heading}>Saved stories</Text>
          </View>
          <Link href="/account" asChild>
            <Pressable style={styles.settings}>
              <Text style={styles.settingsText}>Settings</Text>
            </Pressable>
          </Link>
        </View>
        {stories.length ? (
          stories.map((story) => <StoryCard key={story.id} story={story} />)
        ) : (
          <EmptyState
            title="Nothing saved yet"
            body="Bookmark important local coverage from any story. Saved copies remain available when your connection is limited."
          />
        )}
      </ScrollView>
    </View>
  );
}
const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16 },
    headingRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 18,
    },
    kicker: {
      color: colors.red,
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1.4,
    },
    heading: { color: colors.navy, fontSize: 25, fontWeight: "900" },
    settings: {
      paddingHorizontal: 13,
      paddingVertical: 9,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 7,
      backgroundColor: colors.surface,
    },
    settingsText: { color: colors.blue, fontWeight: "800", fontSize: 12 },
  });
