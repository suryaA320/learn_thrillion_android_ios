import React, { useEffect, useState } from 'react';
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
import { useNavigation, useRoute } from '@react-navigation/native';
import api from '../utils/api_endpoints/api';
import { formatLoginApiError } from '../utils/loginErrorMessage';

const CONFIRM_PATH = 'auth/password-reset/confirm/';

export default function ResetPassword() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const email = route.params?.email || '';
  const resetToken = route.params?.resetToken || '';

  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!email || !resetToken) {
      navigation.replace('ForgotPassword');
    }
  }, [email, resetToken, navigation]);

  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    if (!password || password !== password2) {
      setError('Passwords must match.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(CONFIRM_PATH, {
        email,
        reset_token: resetToken,
        password,
        password2,
      });
      setSuccess('Password reset successfully. You can sign in now.');
      setTimeout(() => {
        navigation.replace('Login');
      }, 1200);
    } catch (err) {
      setError(formatLoginApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (!email || !resetToken) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />
      <View style={styles.root}>
        <View style={styles.hero}>
          <View style={styles.heroAccent} />
          <Text style={styles.brand}>Learn Thrillion</Text>
          <Text style={styles.heroTitle}>Reset password</Text>
          <Text style={styles.heroSubtitle}>Choose a new password for your account.</Text>
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
                {success ? (
                  <View style={styles.successBanner}>
                    <Text style={styles.successText}>{success}</Text>
                  </View>
                ) : null}

                <Text style={styles.label}>Email</Text>
                <TextInput style={[styles.input, styles.inputDisabled]} value={email} editable={false} />

                <Text style={[styles.label, styles.labelSpaced]}>New password</Text>
                <View style={styles.passwordRow}>
                  <TextInput
                    style={styles.inputPassword}
                    placeholder="New password"
                    placeholderTextColor="#94a3b8"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoComplete="new-password"
                    textContentType="newPassword"
                    editable={!submitting}
                  />
                  <TouchableOpacity
                    style={styles.togglePw}
                    onPress={() => setShowPassword((v) => !v)}
                    hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                  >
                    <Text style={styles.togglePwText}>{showPassword ? 'Hide' : 'Show'}</Text>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.label, styles.labelSpaced]}>Confirm password</Text>
                <View style={styles.passwordRow}>
                  <TextInput
                    style={styles.inputPassword}
                    placeholder="Confirm password"
                    placeholderTextColor="#94a3b8"
                    value={password2}
                    onChangeText={setPassword2}
                    secureTextEntry={!showConfirm}
                    autoComplete="new-password"
                    textContentType="newPassword"
                    editable={!submitting}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                  />
                  <TouchableOpacity
                    style={styles.togglePw}
                    onPress={() => setShowConfirm((v) => !v)}
                    hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                  >
                    <Text style={styles.togglePwText}>{showConfirm ? 'Hide' : 'Show'}</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, submitting && styles.primaryBtnDisabled]}
                  onPress={handleSubmit}
                  disabled={submitting}
                  activeOpacity={0.88}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Reset password</Text>
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
  successBanner: {
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
  },
  successText: { color: '#3730a3', fontSize: 13, lineHeight: 19 },
  label: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 8 },
  labelSpaced: { marginTop: 4 },
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
  inputDisabled: { color: '#64748b', backgroundColor: '#f1f5f9' },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingRight: 4,
  },
  inputPassword: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 15 : 14,
    fontSize: 16,
    color: '#0f172a',
  },
  togglePw: { paddingVertical: 12, paddingHorizontal: 14 },
  togglePwText: { fontSize: 14, fontWeight: '700', color: '#4f46e5' },
  primaryBtn: {
    marginTop: 26,
    backgroundColor: '#4f46e5',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: 52,
  },
  primaryBtnDisabled: { opacity: 0.75 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  backLinkWrap: { marginTop: 22, alignItems: 'center' },
  backLink: { color: '#4f46e5', fontSize: 14, fontWeight: '700' },
});
