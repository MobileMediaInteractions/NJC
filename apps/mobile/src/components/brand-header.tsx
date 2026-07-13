import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from '@/components/app-icon';
import { Colors } from '@/constants/theme';

export function BrandHeader({ eyebrow }: { eyebrow?: string }) {
  return <View style={styles.wrap}>
    <View><Text style={styles.eyebrow}>{eyebrow ?? 'HLN 8 · PORT ALDER'}</Text><Text style={styles.brand}>HARBORLINE</Text><Text style={styles.local}>LOCAL</Text></View>
    <Link href="/account" asChild><Pressable accessibilityLabel="Open account" style={styles.account}><AppIcon name="person-outline" size={21} color={Colors.navy} /></Pressable></Link>
  </View>;
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: Colors.surface, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: Colors.line },
  eyebrow: { color: Colors.blue, fontSize: 9, letterSpacing: 1.6, fontWeight: '800' },
  brand: { color: Colors.navy, fontSize: 23, letterSpacing: -0.8, fontWeight: '900', lineHeight: 24 },
  local: { color: Colors.red, fontSize: 9, letterSpacing: 3.4, fontWeight: '900' },
  account: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: Colors.line, alignItems: 'center', justifyContent: 'center' },
});
