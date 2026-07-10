import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, Alert, Image, ScrollView,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { signIn, signUp, signInWithGoogle, signInWithApple, signInWithPhone, verifyPhoneOtp } from '../lib/auth'
import { setGuestMode } from '../lib/guest'
import { useLang } from '../lib/i18n'
import type { Language } from '../lib/i18n'
import { Colors, Spacing, Radius, Typography, Shadows, Gradients } from '../constants/theme'
import Constants from 'expo-constants'

type AuthMethod = 'email' | 'phone'
type Mode = 'signin' | 'signup'

export default function AuthScreen() {
  const router = useRouter()
  const { t, lang, setLang } = useLang()
  const [method, setMethod] = useState<AuthMethod>('email')
  const [mode, setMode] = useState<Mode>('signin')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleEmailSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(t.auth.missingFields, t.auth.enterEmailPassword)
      return
    }
    if (mode === 'signup' && !fullName.trim()) {
      Alert.alert(t.auth.missingFields, t.auth.enterFullName)
      return
    }
    setLoading(true)
    try {
      if (mode === 'signup') {
        await signUp(email.trim(), password, fullName.trim())
        Alert.alert(t.auth.checkEmail, t.auth.confirmationSent, [
          { text: 'OK', onPress: () => setMode('signin') },
        ])
      } else {
        await signIn(email.trim(), password)
        router.replace('/(tabs)')
      }
    } catch (err: any) {
      Alert.alert(t.auth.error, err?.message ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleSendOtp = async () => {
    const cleaned = phone.trim().replace(/\s/g, '')
    if (!cleaned || cleaned.length < 8) {
      Alert.alert(t.auth.invalidNumber, t.auth.enterValidPhone)
      return
    }
    setLoading(true)
    try {
      await signInWithPhone(cleaned)
      setOtpSent(true)
    } catch (err: any) {
      Alert.alert(t.auth.error, err?.message ?? 'Failed to send verification code')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (!otp.trim() || otp.trim().length !== 6) {
      Alert.alert(t.auth.invalidCode, t.auth.enterSixDigit)
      return
    }
    setLoading(true)
    try {
      await verifyPhoneOtp(phone.trim().replace(/\s/g, ''), otp.trim())
      router.replace('/(tabs)')
    } catch (err: any) {
      Alert.alert(t.auth.error, err?.message ?? 'Invalid verification code')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.langBar}>
        <TouchableOpacity
          style={styles.langToggle}
          activeOpacity={0.7}
          onPress={() => setLang(lang === 'mk' ? 'en' : 'mk')}
        >
          <Image source={{ uri: lang === 'mk' ? 'https://flagcdn.com/w80/mk.png' : 'https://flagcdn.com/w80/gb.png' }} style={styles.langFlag} />
          <Text style={styles.langLabel}>{lang === 'mk' ? 'MK' : 'EN'}</Text>
        </TouchableOpacity>
      </View>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <View style={styles.logoSection}>
            <Image source={require('../assets/balkanea-logo.png')} style={styles.logo} resizeMode="contain" />
            <Text style={styles.tagline}>{t.auth.tagline}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{mode === 'signin' ? t.auth.welcomeBack : t.auth.createAccount}</Text>

            {/* Social login */}
            <View style={styles.socialRow}>
              <TouchableOpacity style={styles.socialBtn} activeOpacity={0.7}
                onPress={async () => { try { await signInWithGoogle() } catch (e: any) { Alert.alert(t.auth.error, e?.message ?? t.auth.googleSignInFailed) } }}>
                <Text style={styles.googleIcon}>G</Text>
                <Text style={styles.socialText}>{t.auth.google}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialBtn} activeOpacity={0.7}
                onPress={async () => { try { await signInWithApple() } catch (e: any) { Alert.alert(t.auth.error, e?.message ?? t.auth.appleSignInFailed) } }}>
                <Ionicons name="logo-apple" size={18} color={Colors.text} />
                <Text style={styles.socialText}>{t.auth.apple}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t.auth.or}</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Method toggle — email vs phone */}
            <View style={styles.methodRow}>
              <TouchableOpacity
                style={[styles.methodBtn, method === 'email' && styles.methodBtnActive]}
                onPress={() => { setMethod('email'); setOtpSent(false) }}
                activeOpacity={0.7}
              >
                <Ionicons name="mail-outline" size={16} color={method === 'email' ? Colors.primary : Colors.textSecondary} />
                <Text style={[styles.methodText, method === 'email' && styles.methodTextActive]}>{t.auth.email}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.methodBtn, method === 'phone' && styles.methodBtnActive]}
                onPress={() => { setMethod('phone'); setOtpSent(false) }}
                activeOpacity={0.7}
              >
                <Ionicons name="phone-portrait-outline" size={16} color={method === 'phone' ? Colors.primary : Colors.textSecondary} />
                <Text style={[styles.methodText, method === 'phone' && styles.methodTextActive]}>{t.auth.phone}</Text>
              </TouchableOpacity>
            </View>

            {/* Email form */}
            {method === 'email' && (
              <>
                {mode === 'signup' && (
                  <View style={styles.field}>
                    <Text style={styles.label}>{t.auth.fullName}</Text>
                    <View style={styles.inputWrap}>
                      <Ionicons name="person-outline" size={18} color={Colors.textLight} style={styles.inputIcon} />
                      <TextInput style={styles.input} value={fullName} onChangeText={setFullName}
                        placeholder={t.auth.fullNamePlaceholder} placeholderTextColor={Colors.textLight} autoCapitalize="words" />
                    </View>
                  </View>
                )}
                <View style={styles.field}>
                  <Text style={styles.label}>{t.auth.emailLabel}</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="mail-outline" size={18} color={Colors.textLight} style={styles.inputIcon} />
                    <TextInput style={styles.input} value={email} onChangeText={setEmail}
                      placeholder={t.auth.emailPlaceholder} placeholderTextColor={Colors.textLight}
                      keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
                  </View>
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>{t.auth.password}</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="lock-closed-outline" size={18} color={Colors.textLight} style={styles.inputIcon} />
                    <TextInput style={[styles.input, { flex: 1 }]} value={password} onChangeText={setPassword}
                      placeholder={mode === 'signup' ? t.auth.passwordMinChars : t.auth.passwordPlaceholder}
                      placeholderTextColor={Colors.textLight} secureTextEntry={!showPassword} autoCapitalize="none" />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                      <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.textLight} />
                    </TouchableOpacity>
                  </View>
                </View>
                <TouchableOpacity onPress={handleEmailSubmit} disabled={loading} activeOpacity={0.8} style={styles.submitWrap}>
                  <LinearGradient colors={Gradients.primaryFade} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.submitBtn}>
                    <Text style={styles.submitText}>
                      {loading ? t.auth.pleaseWait : mode === 'signin' ? t.auth.signIn : t.auth.signUp}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}

            {/* Phone form */}
            {method === 'phone' && !otpSent && (
              <>
                <View style={styles.field}>
                  <Text style={styles.label}>{t.auth.phoneNumber}</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="call-outline" size={18} color={Colors.textLight} style={styles.inputIcon} />
                    <TextInput style={styles.input} value={phone} onChangeText={setPhone}
                      placeholder={t.auth.phonePlaceholder} placeholderTextColor={Colors.textLight}
                      keyboardType="phone-pad" autoCapitalize="none" />
                  </View>
                  <Text style={styles.hint}>{t.auth.phoneHint}</Text>
                </View>
                <TouchableOpacity onPress={handleSendOtp} disabled={loading} activeOpacity={0.8} style={styles.submitWrap}>
                  <LinearGradient colors={Gradients.primaryFade} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.submitBtn}>
                    <Text style={styles.submitText}>{loading ? t.auth.sending : t.auth.sendCode}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}

            {/* OTP verification */}
            {method === 'phone' && otpSent && (
              <>
                <View style={styles.otpHeader}>
                  <Ionicons name="chatbubble-outline" size={20} color={Colors.primary} />
                  <Text style={styles.otpHeaderText}>{t.auth.codeSentTo} {phone}</Text>
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>{t.auth.verificationCode}</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="keypad-outline" size={18} color={Colors.textLight} style={styles.inputIcon} />
                    <TextInput style={[styles.input, styles.otpInput]} value={otp} onChangeText={setOtp}
                      placeholder="000000" placeholderTextColor={Colors.textLight}
                      keyboardType="number-pad" maxLength={6} autoFocus />
                  </View>
                </View>
                <TouchableOpacity onPress={handleVerifyOtp} disabled={loading} activeOpacity={0.8} style={styles.submitWrap}>
                  <LinearGradient colors={Gradients.primaryFade} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.submitBtn}>
                    <Text style={styles.submitText}>{loading ? t.auth.verifying : t.auth.verifySignIn}</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setOtpSent(false); setOtp('') }} style={styles.resendRow}>
                  <Text style={styles.resendText}>{t.auth.didntReceive}<Text style={styles.resendLink}>{t.auth.resendCode}</Text></Text>
                </TouchableOpacity>
              </>
            )}

            {/* Toggle sign in / sign up (email only) */}
            {method === 'email' && (
              <TouchableOpacity onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')} style={styles.switchRow}>
                <Text style={styles.switchText}>
                  {mode === 'signin' ? t.auth.noAccount : t.auth.hasAccount}
                  <Text style={styles.switchLink}>{mode === 'signin' ? t.auth.signUpLink : t.auth.signInLink}</Text>
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity onPress={async () => { await setGuestMode(true); router.replace('/(tabs)') }} style={styles.skipBtn}>
            <Text style={styles.skipText}>{t.auth.continueWithout}</Text>
            <Ionicons name="arrow-forward" size={14} color={Colors.textSecondary} />
          </TouchableOpacity>

          <Text style={styles.versionText}>v{Constants.expoConfig?.version ?? '1.0.0'}</Text>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: Spacing.lg },

  langBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
  },
  langToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  langFlag: { width: 20, height: 14, borderRadius: 2 },
  langLabel: { ...Typography.caption, fontWeight: '600', color: Colors.text, fontSize: 12 },

  logoSection: { alignItems: 'center', marginBottom: Spacing.xl },
  logo: { width: 160, height: 48, marginBottom: Spacing.sm },
  tagline: { ...Typography.body, color: Colors.textSecondary },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadows.md,
  },
  cardTitle: { ...Typography.h1, color: Colors.text, marginBottom: Spacing.md, textAlign: 'center' },

  socialRow: { flexDirection: 'row', gap: 10, marginBottom: Spacing.md },
  socialBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12, borderRadius: Radius.md, backgroundColor: Colors.background,
    borderWidth: 1, borderColor: Colors.border,
  },
  googleIcon: { fontSize: 18, fontWeight: '700', color: '#4285F4' },
  socialText: { ...Typography.button, color: Colors.text, fontSize: 14 },

  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md, gap: Spacing.sm },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { ...Typography.caption, color: Colors.textLight },

  methodRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.md },
  methodBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: Radius.md, backgroundColor: Colors.background,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  methodBtnActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  methodText: { ...Typography.bodyMedium, fontSize: 14, color: Colors.textSecondary },
  methodTextActive: { color: Colors.primary, fontWeight: '600' },

  field: { marginBottom: Spacing.md },
  label: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '600', marginBottom: 6 },
  hint: { ...Typography.caption, color: Colors.textLight, marginTop: 4, fontSize: 11 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.sm,
  },
  inputIcon: { marginRight: 8 },
  input: {
    flex: 1, paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    ...Typography.body, color: Colors.text, fontSize: 15,
  },
  otpInput: { letterSpacing: 8, fontSize: 22, fontWeight: '700', textAlign: 'center' },
  eyeBtn: { padding: 8 },

  otpHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md,
    backgroundColor: Colors.primaryLight, borderRadius: Radius.md, padding: Spacing.sm + 2 },
  otpHeaderText: { ...Typography.body, color: Colors.primary, fontSize: 13, flex: 1 },

  submitWrap: { marginTop: Spacing.sm },
  submitBtn: { borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center' },
  submitText: { ...Typography.button, color: '#fff', fontSize: 16 },

  switchRow: { marginTop: Spacing.md, alignItems: 'center' },
  switchText: { ...Typography.body, color: Colors.textSecondary, fontSize: 14 },
  switchLink: { color: Colors.primary, fontWeight: '600' },

  resendRow: { marginTop: Spacing.md, alignItems: 'center' },
  resendText: { ...Typography.body, color: Colors.textSecondary, fontSize: 13 },
  resendLink: { color: Colors.primary, fontWeight: '600' },

  skipBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    marginTop: Spacing.lg, paddingVertical: Spacing.sm,
  },
  skipText: { ...Typography.body, color: Colors.textSecondary, fontSize: 14 },
  versionText: {
    ...Typography.caption,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: Spacing.lg,
    fontSize: 11,
  },
})
