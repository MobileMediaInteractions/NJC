import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { Story } from '@harborline/contracts';
import { BrandHeader } from '@/components/brand-header';
import { EmptyState, LoadingState } from '@/components/states';
import { StoryCard } from '@/components/story-card';
import { Colors } from '@/constants/theme';
import { getStories } from '@/lib/api';

export default function LatestScreen() {
  const [query, setQuery] = useState(''); const [stories, setStories] = useState<Story[]>([]); const [loading, setLoading] = useState(true);
  useEffect(() => { const handle = setTimeout(() => { setLoading(true); void getStories(query ? `q=${encodeURIComponent(query)}&limit=40` : 'limit=40').then((value) => { setStories(value); setLoading(false); }); }, 250); return () => clearTimeout(handle); }, [query]);
  return <View style={styles.screen}><BrandHeader eyebrow="LATEST COVERAGE" /><View style={styles.search}><TextInput accessibilityLabel="Search local news" value={query} onChangeText={setQuery} placeholder="Search Harborline" placeholderTextColor={Colors.muted} style={styles.input} /></View><ScrollView contentContainerStyle={styles.content}>{loading ? <LoadingState /> : stories.length ? <><Text style={styles.count}>{stories.length} STORIES</Text>{stories.map((story) => <StoryCard key={story.id} story={story} />)}</> : <EmptyState title="No local results" body="Try a broader topic or location." />}</ScrollView></View>;
}
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: Colors.background }, search: { padding: 14, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.line }, input: { height: 46, borderWidth: 1, borderColor: Colors.line, borderRadius: 8, paddingHorizontal: 14, backgroundColor: Colors.background, color: Colors.ink, fontSize: 16 }, content: { padding: 16 }, count: { color: Colors.blue, fontSize: 10, fontWeight: '900', letterSpacing: 1.4, marginBottom: 12 } });
