import { Platform } from 'react-native'
import { supabase } from './supabase'
import { BACKEND_URL } from './backend-url'
import type { Session, User } from '@supabase/supabase-js'
import * as WebBrowser from 'expo-web-browser'
import * as AppleAuthentication from 'expo-apple-authentication'

export type AuthUser = User
export type AuthSession = Session

// Where Supabase's confirmation / password-reset emails send the user back
// (2026-09-29): the app's own link, handled by app/auth/callback.tsx (via
// app/+native-intent.tsx on phones). Must be allowed in Supabase ->
// Authentication -> URL Configuration -> Redirect URLs ("balkanea://**" and
// the web origin) or Supabase falls back to the Site URL.
export function authCallbackUrl(): string {
  return Platform.OS === 'web' ? `${window.location.origin}/auth/callback` : 'balkanea://auth/callback'
}

export async function signUp(email: string, password: string, fullName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: authCallbackUrl(),
    },
  })
  if (error) throw error
  return data
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: Platform.OS === 'web' ? window.location.origin : 'balkanea://auth/callback',
      skipBrowserRedirect: Platform.OS !== 'web',
    },
  })
  if (error) throw error

  if (Platform.OS !== 'web' && data.url) {
    const result = await WebBrowser.openAuthSessionAsync(data.url, 'balkanea://auth/callback')
    if (result.type === 'success' && result.url) {
      const params = new URL(result.url)
      const accessToken = params.hash ? new URLSearchParams(params.hash.substring(1)).get('access_token') : null
      const refreshToken = params.hash ? new URLSearchParams(params.hash.substring(1)).get('refresh_token') : null
      if (accessToken && refreshToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      }
    }
  }
}

export async function signInWithApple() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: {
      redirectTo: Platform.OS === 'web' ? window.location.origin : 'balkanea://auth/callback',
      skipBrowserRedirect: Platform.OS !== 'web',
    },
  })
  if (error) throw error

  if (Platform.OS !== 'web' && data.url) {
    const result = await WebBrowser.openAuthSessionAsync(data.url, 'balkanea://auth/callback')
    if (result.type === 'success' && result.url) {
      const params = new URL(result.url)
      const accessToken = params.hash ? new URLSearchParams(params.hash.substring(1)).get('access_token') : null
      const refreshToken = params.hash ? new URLSearchParams(params.hash.substring(1)).get('refresh_token') : null
      if (accessToken && refreshToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      }
    }
  }
}

// Native Sign in with Apple — required by App Store guideline 4.8 since the
// app also offers Google sign-in. iOS only; other platforms fall back to
// signInWithApple() above (browser-based OAuth).
export async function isAppleNativeSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false
  return AppleAuthentication.isAvailableAsync()
}

export async function signInWithAppleNative() {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  })

  if (!credential.identityToken) throw new Error('Apple did not return an identity token')

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  })
  if (error) throw error

  // Apple only returns the user's name on their very first sign-in ever —
  // capture it now or it's gone for good.
  const { givenName, familyName } = credential.fullName ?? {}
  if (givenName || familyName) {
    const fullName = [givenName, familyName].filter(Boolean).join(' ')
    await updateProfile({ full_name: fullName }).catch(() => { /* non-critical */ })
  }

  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession()
  return data.session
}

export async function getUser(): Promise<User | null> {
  const { data } = await supabase.auth.getUser()
  return data.user
}

export function onAuthStateChange(callback: (session: Session | null) => void) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session)
  })
  return data.subscription.unsubscribe
}

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: authCallbackUrl() })
  if (error) throw error
}

// Sets the new password after the user opened a password-reset link (the
// link signs them in with a short-lived recovery session first).
export async function setNewPassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw error
}

// Deletes the signed-in user's own account (App Store / Google Play
// requirement). The backend (Chat /api/delete-account) takes the user id
// ONLY from this access token; confirmed bookings are kept (detached from
// the account) for refunds and upcoming stays. Signs out on success.
export async function deleteAccount(): Promise<{ ok: boolean }> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { ok: false }
  try {
    const res = await fetch(`${BACKEND_URL}/api/delete-account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({}),
    })
    const data = await res.json()
    if (!data.success) return { ok: false }
  } catch {
    return { ok: false }
  }
  await supabase.auth.signOut().catch(() => {})
  return { ok: true }
}

export async function updateProfile(updates: { full_name?: string; phone?: string; language?: string; currency?: string }) {
  const { error } = await supabase.auth.updateUser({
    data: updates,
  })
  if (error) throw error
}
