import React, { useEffect, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Platform } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { setNewPassword } from '../../lib/auth'
import { useLang } from '../../lib/i18n'
import { Colors, Spacing, Radius, Typography } from '../../constants/theme'

// Where Supabase's email links land (2026-09-29): sign-up confirmation,
// password reset (type=recovery) and the Google sign-in redirect. On phones
// app/+native-intent.tsx has already turned the #fragment into params; on
// web the fragment is still in window.location.hash.
//
// Safe to run twice (e.g. Google sign-in already set the session through
// openAuthSessionAsync before this link also arrived): an existing session
// just continues to the app.

type Params = { access_token?: string; refresh_token?: string; type?: string; error_description?: string }

function readParams(routeParams: Params): Params {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.hash.length > 1) {
    const h = new URLSearchParams(window.location.hash.slice(1))
    return {
      access_token: h.get('access_token') ?? undefined,
      refresh_token: h.get('refresh_token') ?? undefined,
      type: h.get('type') ?? undefined,
      error_description: h.get('error_description') ?? undefined,
    }
  }
  return routeParams
}

export default function AuthCallbackScreen() {
  const { t } = useLang()
  const router = useRouter()
  const routeParams = useLocalSearchParams<Params>()
  const [stage, setStage] = useState<'working' | 'recovery' | 'error'>('working')
  const [error, setError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const p = readParams(routeParams)
      if (p.error_description) {
        if (!cancelled) { setError(p.error_description); setStage('error') }
        return
      }
      if (p.access_token && p.refresh_token) {
        const { error: e } = await supabase.auth.setSession({ access_token: p.access_token, refresh_token: p.refresh_token })
        if (cancelled) return
        if (e) { setError(e.message); setStage('error'); return }
      }
      const { data: { session } } = await supabase.auth.getSession()
      if (cancelled) return
      if (p.type === 'recovery' && session) { setStage('recovery'); return }
      router.replace(session ? '/(tabs)' : '/auth')
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const save = async () => {
    if (password.length < 8) { setError(t.auth.passwordMinChars); return }
    if (password !== confirm) { setError(t.auth.passwordsDontMatch); return }
    setSaving(true)
    setError(null)
    try {
      await setNewPassword(password)
      router.replace('/(tabs)')
    } catch (e: any) {
      setError(e?.message ?? t.auth.error)
      setSaving(false)
    }
  }

  if (stage === 'working') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} />
        <Text style={styles.note}>{t.auth.pleaseWait}</Text>
      </View>
    )
  }

  if (stage === 'error') {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>{t.auth.linkInvalid}</Text>
        {error ? <Text style={styles.note}>{error}</Text> : null}
        <TouchableOpacity style={styles.button} onPress={() => router.replace('/auth')} activeOpacity={0.8}>
          <Text style={styles.buttonText}>{t.auth.signIn}</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.center}>
      <Text style={styles.title}>{t.auth.newPasswordTitle}</Text>
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder={t.auth.passwordMinChars}
        placeholderTextColor={Colors.textLight}
        secureTextEntry
        autoCapitalize="none"
        textContentType="newPassword"
        editable={!saving}
      />
      <TextInput
        style={styles.input}
        value={confirm}
        onChangeText={setConfirm}
        placeholder={t.auth.confirmPassword}
        placeholderTextColor={Colors.textLight}
        secureTextEntry
        autoCapitalize="none"
        textContentType="newPassword"
        editable={!saving}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity style={styles.button} onPress={save} disabled={saving} activeOpacity={0.8}>
        {saving ? <ActivityIndicator color={Colors.surface} /> : <Text style={styles.buttonText}>{t.auth.savePassword}</Text>}
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.lg, backgroundColor: Colors.background, gap: Spacing.sm },
  title: { ...Typography.h2, color: Colors.text, textAlign: 'center', marginBottom: Spacing.sm },
  note: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center' },
  error: { ...Typography.caption, color: Colors.error, textAlign: 'center' },
  input: {
    width: '100%', maxWidth: 420, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, ...Typography.body, color: Colors.text, backgroundColor: Colors.surface,
  },
  button: {
    width: '100%', maxWidth: 420, backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.sm,
  },
  buttonText: { ...Typography.button, color: Colors.surface },
})
