import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Story } from '@harborline/contracts';
import { AppIcon } from '@/components/app-icon';
import { Colors } from '@/constants/theme';

export function StoryCard({ story, featured = false }: { story: Story; featured?: boolean }) {
  return <Link href={{ pathname: '/story/[slug]', params: { slug: story.slug } }} asChild>
    <Pressable accessibilityRole="link" style={featured ? styles.featuredCard : styles.card}>
      <Image source={{ uri: story.image }} style={featured ? styles.featuredImage : styles.image} contentFit="cover" accessibilityLabel={story.imageAlt} alt={story.imageAlt} />
      <View style={styles.content}>
        <View style={styles.labelRow}>{story.isBreaking ? <Text style={styles.breaking}>BREAKING</Text> : null}<Text style={styles.label}>{story.categoryLabel.toUpperCase()}</Text></View>
        <Text style={featured ? styles.featuredHeadline : styles.headline}>{story.headline}</Text>
        <Text style={styles.dek} numberOfLines={featured ? 3 : 2}>{story.dek}</Text>
        <View style={styles.meta}><Text style={styles.metaText}>{story.location} · {story.readingMinutes} min</Text><AppIcon name="chevron-forward" size={15} color={Colors.muted} /></View>
      </View>
    </Pressable>
  </Link>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.line, borderRadius: 12, overflow: 'hidden', marginBottom: 14 },
  featuredCard: { backgroundColor: Colors.surface, borderTopWidth: 1, borderBottomWidth: 1, borderColor: Colors.line, overflow: 'hidden', marginBottom: 14 },
  image: { width: '100%', height: 170, backgroundColor: Colors.sky },
  featuredImage: { width: '100%', height: 230, backgroundColor: Colors.sky },
  content: { padding: 16 }, labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  label: { color: Colors.blue, fontSize: 10, letterSpacing: 1.4, fontWeight: '900' },
  breaking: { color: '#fff', backgroundColor: Colors.red, paddingHorizontal: 7, paddingVertical: 3, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  headline: { color: Colors.ink, fontSize: 21, lineHeight: 25, fontWeight: '900', letterSpacing: -0.35 },
  featuredHeadline: { color: Colors.ink, fontSize: 28, lineHeight: 32, fontWeight: '900', letterSpacing: -0.35 }, dek: { color: Colors.muted, fontSize: 14, lineHeight: 20, marginTop: 8 },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }, metaText: { color: Colors.muted, fontSize: 11, fontWeight: '600' },
});
