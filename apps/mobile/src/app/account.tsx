import { useAuth, useClerk, useSignIn, useSignUp, useUser } from '@clerk/expo';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Colors } from '@/constants/theme'; import { apiBaseUrl } from '@/lib/api'; import { registerForAlerts } from '@/lib/notifications';

type Mode = 'sign-in' | 'sign-up' | 'verify';
const staffRoles = ['admin', 'editor', 'producer', 'reporter', 'contributor'];

function messageFrom(error: unknown) { if (error && typeof error === 'object' && 'message' in error) return String(error.message); return 'Something went wrong. Please try again.'; }

export default function AccountScreen() {
  if (!process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY) return <ScrollView contentContainerStyle={styles.content}><Text style={styles.title}>Account services are ready to connect</Text><Text style={styles.copy}>Add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to enable shared reader and newsroom sign-in. Public news, weather and saved stories work without an account.</Text><LegalLinks /></ScrollView>;
  return <ConfiguredAccount />;
}

function ConfiguredAccount() {
  const { isSignedIn, getToken } = useAuth(); const { user } = useUser(); const { signOut } = useClerk(); const { signIn } = useSignIn(); const { signUp } = useSignUp();
  const [mode, setMode] = useState<Mode>('sign-in'); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [code, setCode] = useState(''); const [busy, setBusy] = useState(false); const [notice, setNotice] = useState('');
  const role = String((user?.publicMetadata as Record<string, unknown> | undefined)?.role ?? 'reader'); const isStaff = staffRoles.includes(role);

  async function submit() {
    setBusy(true); setNotice('');
    try {
      if (mode === 'verify') {
        const result = await signUp.verifications.verifyEmailCode({ code });
        if (result.error) throw result.error;
        const finalized = await signUp.finalize(); if (finalized.error) throw finalized.error;
      } else if (mode === 'sign-up') {
        const result = await signUp.password({ emailAddress: email.trim(), password, legalAccepted: true });
        if (result.error) throw result.error;
        if (signUp.status === 'complete') { const finalized = await signUp.finalize(); if (finalized.error) throw finalized.error; }
        else { const sent = await signUp.verifications.sendEmailCode(); if (sent.error) throw sent.error; setMode('verify'); setNotice('Enter the verification code sent to your email.'); }
      } else {
        const result = await signIn.password({ emailAddress: email.trim(), password });
        if (result.error) throw result.error;
        if (signIn.status !== 'complete') throw new Error('This account requires another verification step. Finish sign-in on the website, then return to the app.');
        const finalized = await signIn.finalize(); if (finalized.error) throw finalized.error;
      }
    } catch (error) { setNotice(messageFrom(error)); } finally { setBusy(false); }
  }

  async function alerts() { setBusy(true); try { const token = await getToken(); await registerForAlerts(token); setNotice('Breaking-news alerts are enabled on this device.'); } catch (error) { setNotice(messageFrom(error)); } finally { setBusy(false); } }

  if (isSignedIn) return <ScrollView contentContainerStyle={styles.content}><Text style={styles.eyebrow}>SIGNED IN</Text><Text style={styles.title}>{user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? 'Harborline reader'}</Text><Text style={styles.copy}>Role: {role}. Your saved stories stay on this device; account services support alerts and newsroom authorization.</Text><Pressable disabled={busy} onPress={() => void alerts()} style={styles.primary}><Text style={styles.primaryText}>Enable breaking-news alerts</Text></Pressable>{isStaff ? <Link href="/admin" asChild><Pressable style={styles.staff}><Text style={styles.staffText}>Open newsroom quick controls</Text></Pressable></Link> : null}{notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}<View style={styles.rule} /><Pressable onPress={() => void Linking.openURL(`${apiBaseUrl}/data-requests`)}><Text style={styles.link}>Export or delete my account data</Text></Pressable><Pressable onPress={() => void signOut()}><Text style={styles.signOut}>Sign out</Text></Pressable><LegalLinks /></ScrollView>;

  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}><Text style={styles.eyebrow}>HARBORLINE ACCOUNT</Text><Text style={styles.title}>{mode === 'sign-up' ? 'Create your account' : mode === 'verify' ? 'Verify your email' : 'Welcome back'}</Text><Text style={styles.copy}>{mode === 'sign-up' ? 'Accounts are for readers 13 and older. By creating one, you accept the Terms and Privacy Policy.' : 'Sign in to manage alerts and access authorized newsroom controls.'}</Text>{mode !== 'verify' ? <><TextInput accessibilityLabel="Email address" autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="Email address" style={styles.input} /><TextInput accessibilityLabel="Password" autoCapitalize="none" autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'} secureTextEntry value={password} onChangeText={setPassword} placeholder="Password" style={styles.input} /></> : <TextInput accessibilityLabel="Verification code" keyboardType="number-pad" value={code} onChangeText={setCode} placeholder="Verification code" style={styles.input} />}<Pressable disabled={busy} onPress={() => void submit()} style={[styles.primary, busy && styles.disabled]}><Text style={styles.primaryText}>{busy ? 'Please wait…' : mode === 'sign-up' ? 'Create account' : mode === 'verify' ? 'Verify account' : 'Sign in'}</Text></Pressable>{notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}{mode !== 'verify' ? <Pressable onPress={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}><Text style={styles.switch}>{mode === 'sign-in' ? 'New to Harborline? Create an account' : 'Already have an account? Sign in'}</Text></Pressable> : null}<LegalLinks /></ScrollView>;
}

function LegalLinks() { return <View style={styles.legal}><Text style={styles.legalTitle}>Privacy and support</Text>{[['Privacy policy', '/privacy'], ['Terms of use', '/terms'], ['Accessibility', '/accessibility'], ['Data requests', '/data-requests']].map(([label, path]) => <Pressable key={path} onPress={() => void Linking.openURL(`${apiBaseUrl}${path}`)}><Text style={styles.link}>{label}</Text></Pressable>)}</View>; }

const styles = StyleSheet.create({ content: { flexGrow: 1, padding: 22, backgroundColor: Colors.background }, eyebrow: { color: Colors.red, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 }, title: { color: Colors.navy, fontSize: 30, lineHeight: 35, fontWeight: '900', marginTop: 6 }, copy: { color: Colors.muted, fontSize: 15, lineHeight: 23, marginTop: 10, marginBottom: 18 }, input: { height: 50, borderWidth: 1, borderColor: Colors.line, borderRadius: 8, backgroundColor: Colors.surface, paddingHorizontal: 14, color: Colors.ink, marginBottom: 12, fontSize: 16 }, primary: { backgroundColor: Colors.blue, borderRadius: 8, minHeight: 50, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, marginTop: 4 }, primaryText: { color: '#fff', fontWeight: '900' }, disabled: { opacity: 0.6 }, notice: { color: Colors.ink, backgroundColor: Colors.sky, padding: 12, marginTop: 12, lineHeight: 20 }, switch: { color: Colors.blue, fontWeight: '800', textAlign: 'center', padding: 18 }, staff: { backgroundColor: Colors.yellow, borderRadius: 8, minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: 12 }, staffText: { color: Colors.navy, fontWeight: '900' }, rule: { height: 1, backgroundColor: Colors.line, marginVertical: 22 }, signOut: { color: Colors.red, fontWeight: '800', paddingVertical: 14 }, legal: { marginTop: 28, borderTopWidth: 1, borderTopColor: Colors.line, paddingTop: 18, gap: 12 }, legalTitle: { color: Colors.ink, fontWeight: '900', marginBottom: 2 }, link: { color: Colors.blue, fontWeight: '700' } });
