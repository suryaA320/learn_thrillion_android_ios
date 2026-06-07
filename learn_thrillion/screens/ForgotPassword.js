import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import api from '../utils/api_endpoints/api';
import { formatLoginApiError } from '../utils/loginErrorMessage';

const REQUEST_CODE_PATH = 'auth/password-reset/request-code/';
const VERIFY_CODE_PATH = 'auth/password-reset/verify-code/';

export default function ForgotPassword() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const handleSendCode = async () => {
    setError('');
    setInfo('');
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Enter your email address.');
      return;
    }
    setSending(true);
    try {
      await api.post(REQUEST_CODE_PATH, { email: trimmed });
      setCodeSent(true);
      setInfo('If this email is registered, a 6-digit code was sent. It expires in 3 minutes.');
    } catch (err) {
      setError(formatLoginApiError(err));
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async () => {
    setError('');
    setInfo('');
    const trimmedEmail = email.trim();
    const trimmedCode = code.trim();
    if (!trimmedEmail || trimmedCode.length !== 6) {
      setError('Enter your email and the 6-digit code from your inbox.');
      return;
    }
    setVerifying(true);
    try {
      const res = await api.post(VERIFY_CODE_PATH, {
        email: trimmedEmail,
        code: trimmedCode,
      });
      const verifiedEmail = res.data?.email || trimmedEmail;
      const resetToken = res.data?.reset_token;
      if (!resetToken) {
        setError('Could not start password reset. Request a new code.');
        return;
      }
      navigation.navigate('ResetPassword', {
        email: verifiedEmail,
        resetToken,
      });
    } catch (err) {
      setError(formatLoginApiError(err));
    } finally {
      setVerifying(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />
      <View style={styles.root}>
        <View style={styles.hero}>
          <View style={styles.heroAccent} />
          <Text style={styles.brand}>Learn Thrillion</Text>
          <Text style={styles.heroTitle}>Forgot password</Text>
          <Text style={styles.heroSubtitle}>
            Enter your email and the 6-digit code we send you.
          </Text>
        </View>

        <KeyboardAvoidingView
          style={styles.sheetOuter}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 28 + insets.bottom }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.sheet}>
              <View style={styles.formCard}>
                {error ? (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}
                {info ? (
                  <View style={styles.infoBanner}>
                    <Text style={styles.infoText}>{info}</Text>
                  </View>
                ) : null}

                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="name@school.edu"
                  placeholderTextColor="#94a3b8"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="emailAddress"
                  editable={!sending && !verifying}
                />

                <TouchableOpacity
                  style={[styles.secondaryBtn, sending && styles.btnDisabled]}
                  onPress={handleSendCode}
                  disabled={sending || verifying}
                  activeOpacity={0.88}
                >
                  {sending ? (
                    <ActivityIndicator color="#4f46e5" />
                  ) : (
                    <Text style={styles.secondaryBtnText}>Send verification code</Text>
                  )}
                </TouchableOpacity>

                <Text style={[styles.label, styles.labelSpaced]}>6-digit verification code</Text>
                <TextInput
                  style={styles.input}
                  placeholder="000000"
                  placeholderTextColor="#94a3b8"
                  value={code}
                  onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  editable={!verifying}
                />
                {codeSent ? (
                  <Text style={styles.codeHint}>Code sent. Check your inbox (expires in 3 minutes).</Text>
                ) : null}

                <TouchableOpacity
                  style={[styles.primaryBtn, verifying && styles.primaryBtnDisabled]}
                  onPress={handleVerify}
                  disabled={verifying}
                  activeOpacity={0.88}
                >
                  {verifying ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Verify and continue</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.backLinkWrap}
                  onPress={() => navigation.navigate('Login')}
                  accessibilityRole="link"
                >
                  <Text style={styles.backLink}>Back to sign in</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#3730a3' },
  root: { flex: 1 },
  hero: { paddingHorizontal: 28, paddingTop: 12, paddingBottom: 28 },
  heroAccent: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#a5b4fc',
    marginBottom: 20,
    opacity: 0.95,
  },
  brand: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: 'rgba(236, 253, 245, 0.75)',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#f5f3ff',
    letterSpacing: -0.8,
  },
  heroSubtitle: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(236, 253, 245, 0.88)',
    maxWidth: 320,
  },
  sheetOuter: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  sheet: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 8,
    paddingHorizontal: 20,
    minHeight: 420,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 22,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.9)',
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
  },
  errorText: { color: '#991b1b', fontSize: 13, lineHeight: 19 },
  infoBanner: {
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
  },
  infoText: { color: '#3730a3', fontSize: 13, lineHeight: 19 },
  label: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 8 },
  labelSpaced: { marginTop: 16 },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 15 : 14,
    fontSize: 16,
    color: '#0f172a',
  },
  secondaryBtn: {
    marginTop: 14,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    backgroundColor: '#eef2ff',
  },
  secondaryBtnText: { color: '#4f46e5', fontSize: 15, fontWeight: '700' },
  codeHint: { marginTop: 8, fontSize: 12, color: '#64748b', lineHeight: 17 },
  primaryBtn: {
    marginTop: 22,
    backgroundColor: '#4f46e5',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: 52,
  },
  primaryBtnDisabled: { opacity: 0.75 },
  btnDisabled: { opacity: 0.75 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  backLinkWrap: { marginTop: 22, alignItems: 'center' },
  backLink: { color: '#4f46e5', fontSize: 14, fontWeight: '700' },
});
