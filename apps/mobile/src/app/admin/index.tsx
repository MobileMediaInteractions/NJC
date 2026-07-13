import { useAuth, useUser } from '@clerk/expo';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import type { AudienceSummary, Story, StoryStatus } from '@harborline/contracts';
import { Colors } from '@/constants/theme';
import { authenticatedRequest } from '@/lib/api';

type Metrics = { review: number; scheduled: number; publishedToday: number; activeAlerts: number; pushDevices: number; audience: AudienceSummary; database: string };
type GetToken = () => Promise<string | null>;

async function fetchAdminData(getToken: GetToken) {
  const token = await getToken();
  if (!token) throw new Error('Sign-in expired.');
  return Promise.all([
    authenticatedRequest<Story[]>('/api/v1/mobile/admin/queue', token),
    authenticatedRequest<Metrics>('/api/v1/mobile/admin/metrics', token),
  ]);
}

export default function AdminScreen() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const role = String((user?.publicMetadata as Record<string, unknown> | undefined)?.role ?? 'reader');
  const authorized = ['admin', 'editor', 'producer'].includes(role);
  const [stories, setStories] = useState<Story[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [live, setLive] = useState(false);
  const [notice, setNotice] = useState('');

  const request = useCallback(async <T,>(path: string, init?: RequestInit) => {
    const token = await getToken();
    if (!token) throw new Error('Sign-in expired.');
    return authenticatedRequest<T>(path, token, init);
  }, [getToken]);

  const refresh = useCallback(async () => {
    const [queue, health] = await fetchAdminData(getToken);
    setStories(queue);
    setMetrics(health);
  }, [getToken]);

  useEffect(() => {
    if (!authorized) return;
    let active = true;
    void fetchAdminData(getToken).then(([queue, health]) => {
      if (!active) return;
      setStories(queue);
      setMetrics(health);
    }).catch((error: unknown) => {
      if (active) setNotice(error instanceof Error ? error.message : 'Could not load newsroom controls.');
    });
    return () => { active = false; };
  }, [authorized, getToken]);

  async function setStatus(id: string, status: StoryStatus) {
    try { await request(`/api/v1/mobile/admin/stories/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }); setNotice(`Story moved to ${status}.`); await refresh(); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Update failed.'); }
  }

  async function sendAlert() {
    try { await request('/api/v1/mobile/admin/alerts', { method: 'POST', body: JSON.stringify({ title, body, severity: 'breaking' }) }); setTitle(''); setBody(''); setNotice('Alert sent and recorded.'); await refresh(); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Alert failed.'); }
  }

  async function toggleLive(value: boolean) {
    try { await request('/api/v1/mobile/admin/live', { method: 'PATCH', body: JSON.stringify({ isLive: value }) }); setLive(value); setNotice(`Live banner ${value ? 'enabled' : 'disabled'}.`); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Live update failed.'); }
  }

  if (!authorized) return <View style={styles.center}><Text style={styles.heading}>Newsroom authorization required</Text><Text style={styles.copy}>Only admins, editors and producers can use mobile publishing controls.</Text></View>;
  return <ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.eyebrow}>READ-ONLY HEALTH</Text><Text style={styles.heading}>Desk at a glance</Text>
    {metrics ? <View style={styles.metrics}>{[['In review', metrics.review], ['Scheduled', metrics.scheduled], ['Today', metrics.publishedToday], ['Devices', metrics.pushDevices]].map(([label, value]) => <View key={String(label)} style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>)}</View> : null}
    {metrics ? <><Text style={styles.cardTitle}>Audience by platform · 24 hours</Text><View style={styles.platforms}>{metrics.audience.platforms.map((platform) => <View key={platform.platform} style={styles.platform}><Text style={styles.platformValue}>{platform.active24h}</Text><Text style={styles.metricLabel}>{platform.label}</Text></View>)}</View></> : null}
    <View style={styles.live}><View><Text style={styles.cardTitle}>Live banner</Text><Text style={styles.copy}>Reflect an active broadcast across apps.</Text></View><Switch value={live} onValueChange={(value) => void toggleLive(value)} trackColor={{ true: Colors.red }} /></View>
    <Text style={styles.cardTitle}>Send urgent alert</Text><TextInput value={title} onChangeText={setTitle} placeholder="Alert headline" style={styles.input} /><TextInput value={body} onChangeText={setBody} placeholder="Short verified summary" multiline style={[styles.input, styles.textarea]} /><Pressable onPress={() => void sendAlert()} style={styles.danger}><Text style={styles.dangerText}>Send breaking alert</Text></Pressable>
    {notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}
    <Text style={[styles.cardTitle, styles.queueTitle]}>Review queue</Text>
    {stories.map((story) => <View key={story.id} style={styles.story}><Text style={styles.storyStatus}>{story.status.toUpperCase()}</Text><Text style={styles.storyTitle}>{story.headline}</Text><View style={styles.actions}><Pressable onPress={() => void setStatus(story.id, 'published')} style={styles.publish}><Text style={styles.publishText}>Publish</Text></Pressable><Pressable onPress={() => void setStatus(story.id, 'draft')} style={styles.return}><Text style={styles.returnText}>Return</Text></Pressable>{story.status === 'published' ? <Pressable onPress={() => void setStatus(story.id, 'archived')}><Text style={styles.archive}>Unpublish</Text></Pressable> : null}</View></View>)}
  </ScrollView>;
}

const styles = StyleSheet.create({
  center: { flex: 1, padding: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background }, content: { padding: 18, backgroundColor: Colors.background }, eyebrow: { color: Colors.red, fontWeight: '900', fontSize: 10, letterSpacing: 1.4 }, heading: { color: Colors.navy, fontSize: 27, fontWeight: '900', marginTop: 4 }, copy: { color: Colors.muted, lineHeight: 20, marginTop: 3 }, metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 16 }, metric: { width: '48%', backgroundColor: Colors.surface, padding: 14, borderWidth: 1, borderColor: Colors.line }, metricValue: { color: Colors.navy, fontSize: 25, fontWeight: '900' }, metricLabel: { color: Colors.muted, fontSize: 11, fontWeight: '700' }, platforms: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }, platform: { flexGrow: 1, minWidth: '22%', backgroundColor: Colors.sky, padding: 11 }, platformValue: { color: Colors.navy, fontSize: 20, fontWeight: '900' }, live: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.line, padding: 15, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, cardTitle: { color: Colors.ink, fontSize: 18, fontWeight: '900', marginBottom: 8 }, input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.line, borderRadius: 7, minHeight: 48, paddingHorizontal: 13, marginBottom: 10, color: Colors.ink }, textarea: { minHeight: 90, paddingTop: 12, textAlignVertical: 'top' }, danger: { backgroundColor: Colors.red, minHeight: 48, borderRadius: 7, alignItems: 'center', justifyContent: 'center' }, dangerText: { color: '#fff', fontWeight: '900' }, notice: { backgroundColor: Colors.sky, color: Colors.ink, padding: 12, marginTop: 12 }, queueTitle: { marginTop: 24 }, story: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.line, padding: 14, marginBottom: 10 }, storyStatus: { color: Colors.blue, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 }, storyTitle: { color: Colors.ink, fontSize: 16, fontWeight: '800', marginTop: 5 }, actions: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 12 }, publish: { backgroundColor: Colors.blue, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 5 }, publishText: { color: '#fff', fontWeight: '800', fontSize: 12 }, return: { borderWidth: 1, borderColor: Colors.line, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 5 }, returnText: { color: Colors.ink, fontWeight: '800', fontSize: 12 }, archive: { color: Colors.red, fontWeight: '800', fontSize: 12, padding: 8 },
});
