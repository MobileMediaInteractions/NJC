import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/theme';

export function LoadingState() { return <View style={styles.state}><ActivityIndicator color={Colors.blue} /><Text style={styles.copy}>Loading local coverage…</Text></View>; }
export function EmptyState({ title, body, action, onPress }: { title: string; body: string; action?: string; onPress?: () => void }) {
  return <View style={styles.state}><Text style={styles.title}>{title}</Text><Text style={styles.copy}>{body}</Text>{action && onPress ? <Pressable onPress={onPress} style={styles.button}><Text style={styles.buttonText}>{action}</Text></Pressable> : null}</View>;
}
const styles = StyleSheet.create({ state: { padding: 30, alignItems: 'center', gap: 10 }, title: { fontSize: 20, color: Colors.ink, fontWeight: '800', textAlign: 'center' }, copy: { color: Colors.muted, textAlign: 'center', lineHeight: 20 }, button: { marginTop: 8, backgroundColor: Colors.blue, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 7 }, buttonText: { color: '#fff', fontWeight: '800' } });
