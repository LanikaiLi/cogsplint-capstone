import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/features/auth/auth-context';
import { colors, fonts, radius } from '@/theme';

const MIN_PASSWORD_LENGTH = 6;

export default function SignInScreen() {
  const { logIn, signUp } = useAuth();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const isSignUp = mode === 'signup';

  async function submit() {
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setMessage('Please enter your email and password.');
      return;
    }
    if (isSignUp && password.length < MIN_PASSWORD_LENGTH) {
      setMessage(`Please choose a password with at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    setBusy(true);
    setMessage(null);
    const result = isSignUp ? await signUp(cleanEmail, password) : await logIn(cleanEmail, password);
    setBusy(false);
    // On success with a session, the root layout moves us to the main app by itself.
    if (result.message) {
      setMessage(result.message);
      if (result.ok) {
        setMode('login');
      }
    }
  }

  function switchMode() {
    setMode(isSignUp ? 'login' : 'signup');
    setMessage(null);
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 48 }]}
        keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>Cogsplint</Text>
        <Text style={styles.subtitle}>
          {isSignUp ? 'Create your account' : 'Welcome back'}
        </Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
          placeholder="you@example.com"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          textContentType={isSignUp ? 'newPassword' : 'password'}
          autoComplete={isSignUp ? 'new-password' : 'current-password'}
          placeholder="At least 6 characters"
          placeholderTextColor={colors.textMuted}
          onSubmitEditing={submit}
        />

        {message && <Text style={styles.message}>{message}</Text>}

        <Pressable
          style={[styles.button, busy && styles.buttonBusy]}
          onPress={submit}
          disabled={busy}
          accessibilityRole="button">
          {busy ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>{isSignUp ? 'Sign up' : 'Log in'}</Text>
          )}
        </Pressable>

        <View style={styles.switchRow}>
          <Text style={styles.switchText}>
            {isSignUp ? 'Already have an account?' : 'New here?'}
          </Text>
          <Pressable onPress={switchMode} accessibilityRole="button">
            <Text style={styles.switchLink}>{isSignUp ? ' Log in' : ' Create an account'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { paddingHorizontal: 24, paddingBottom: 32 },
  brand: { fontFamily: fonts.heading, fontSize: 36, color: colors.primary },
  subtitle: {
    marginTop: 4,
    marginBottom: 32,
    fontFamily: fonts.body,
    fontSize: 17,
    color: colors.textMuted,
  },
  label: { marginBottom: 6, fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text },
  input: {
    marginBottom: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: radius.small,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.text,
  },
  message: {
    marginBottom: 16,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.notice,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: radius.medium,
    backgroundColor: colors.primary,
  },
  buttonBusy: { opacity: 0.7 },
  buttonText: { fontFamily: fonts.bodySemiBold, fontSize: 16, color: '#FFFFFF' },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  switchText: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
  switchLink: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.primary },
});
