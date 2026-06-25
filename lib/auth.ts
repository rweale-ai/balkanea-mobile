import { Platform } from 'react-native'
import { supabase } from './supabase'
import type { Session, User } from '@supabase/supabase-js'
import * as WebBrowser from 'expo-web-browser'

export type AuthUser = User
export type AuthSession = Session

export async function signUp(email: string, password: string, fullName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
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

export async function signInWithPhone(phone: string) {
  const { error } = await supabase.auth.signInWithOtp({ phone })
  if (error) throw error
}

export async function verifyPhoneOtp(phone: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' })
  if (error) throw error
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
  const { error } = await supabase.auth.resetPasswordForEmail(email)
  if (error) throw error
}

export async function updateProfile(updates: { full_name?: string; phone?: string; language?: string; currency?: string }) {
  const { error } = await supabase.auth.updateUser({
    data: updates,
  })
  if (error) throw error
}
