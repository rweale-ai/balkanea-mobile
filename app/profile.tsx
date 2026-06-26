import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Alert, Animated, Platform,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getUser, signOut } from '../lib/auth'
import { setGuestMode } from '../lib/guest'
import { useLang, setLang } from '../lib/i18n'
import type { Language } from '../lib/i18n'
import { Colors, Spacing, Radius, Typography, Shadows, Gradients } from '../constants/theme'
import Constants from 'expo-constants'

const NOTIF_KEY = 'balkanea_notif_prefs'
const CURRENCY_KEY = 'balkanea_currency'
const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0'

type NotifPrefs = {
  bookingConfirmations: boolean
  checkinReminders: boolean
  promoOffers: boolean
}

const DEFAULT_NOTIF: NotifPrefs = {
  bookingConfirmations: true,
  checkinReminders: true,
  promoOffers: false,
}

// ── Animated toggle switch ─────────────────────────────────────────

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current

  useEffect(() => {
    Animated.spring(anim, {
      toValue: value ? 1 : 0,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start()
  }, [value])

  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [2, 20] })

  return (
    <TouchableOpacity
      style={[tog.track, { backgroundColor: value ? Colors.primary : Colors.border }]}
      onPress={() => onChange(!value)}
      activeOpacity={0.8}
    >
      <Animated.View style={[tog.thumb, { transform: [{ translateX }] }]} />
    </TouchableOpacity>
  )
}

const tog = StyleSheet.create({
  track: {
    width: 48, height: 28, borderRadius: 14,
    padding: 3, justifyContent: 'center',
  },
  thumb: {
    width: 22, height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    ...Shadows.sm,
  },
})

// ── Language segmented pill ────────────────────────────────────────

function LangPill({ lang, onChange }: { lang: Language; onChange: (l: Language) => void }) {
  return (
    <View style={lp.wrap}>
      {(['mk', 'en'] as Language[]).map(l => (
        <TouchableOpacity
          key={l}
          style={[lp.seg, lang === l && lp.segActive]}
          onPress={() => onChange(l)}
          activeOpacity={0.7}
        >
          <Text style={[lp.label, lang === l && lp.labelActive]}>
            {l.toUpperCase()}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

const lp = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: Colors.borderLight,
    borderRadius: Radius.full,
    padding: 3,
    gap: 3,
  },
  seg: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  segActive: { backgroundColor: '#fff', ...Shadows.sm },
  label: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '700' },
  labelActive: { color: Colors.text },
})

// ── Currency pill ──────────────────────────────────────────────────

function CurrencyPill({ currency, onChange }: {
  currency: string
  onChange: (c: string) => void
}) {
  const options = ['EUR', 'MKD', 'USD', 'GBP']
  const current = options.indexOf(currency)

  const cycle = () => onChange(options[(current + 1) % options.length])

  return (
    <TouchableOpacity style={cp.btn} onPress={cycle} activeOpacity={0.7}>
      <Text style={cp.label}>{currency}</Text>
      <Ionicons name="chevron-down" size={13} color={Colors.textSecondary} />
    </TouchableOpacity>
  )
}

const cp = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.borderLight,
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  label: { ...Typography.bodyMedium, color: Colors.text, fontWeight: '700', fontSize: 14 },
})

// ── Info row (chevron link) ────────────────────────────────────────

function InfoRow({ label, onPress, last = false }: {
  label: string
  onPress?: () => void
  last?: boolean
}) {
  return (
    <TouchableOpacity
      style={[ir.row, !last && ir.rowBorder]}
      onPress={onPress}
      activeOpacity={onPress ? 0.6 : 1}
    >
      <Text style={ir.label}>{label}</Text>
      {onPress && <Ionicons name="chevron-forward" size={16} color={Colors.textLight} />}
    </TouchableOpacity>
  )
}

const ir = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  label: { ...Typography.body, color: Colors.text },
})

// ── Section card ───────────────────────────────────────────────────

function SectionCard({ children }: { children: React.ReactNode }) {
  return <View style={sc.card}>{children}</View>
}

const sc = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
})

// ── Main screen ────────────────────────────────────────────────────

export default function ProfileScreen() {
  const router = useRouter()
  const { t, lang, setLang: setAppLang } = useLang()

  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [currency, setCurrency] = useState('EUR')
  const [notif, setNotif] = useState<NotifPrefs>(DEFAULT_NOTIF)

  useEffect(() => {
    getUser().then(u => {
      if (u) {
        setUserName(u.user_metadata?.full_name ?? u.email?.split('@')[0] ?? 'User')
        setUserEmail(u.email ?? '')
      }
    })
    AsyncStorage.getItem(CURRENCY_KEY).then(v => { if (v) setCurrency(v) })
    AsyncStorage.getItem(NOTIF_KEY).then(v => {
      if (v) {
        try { setNotif({ ...DEFAULT_NOTIF, ...JSON.parse(v) }) } catch {}
      }
    })
  }, [])

  const handleLangChange = useCallback(async (l: Language) => {
    await setAppLang(l)
  }, [setAppLang])

  const handleCurrencyChange = useCallback(async (c: string) => {
    setCurrency(c)
    await AsyncStorage.setItem(CURRENCY_KEY, c)
  }, [])

  const handleNotifChange = useCallback(async (key: keyof NotifPrefs, val: boolean) => {
    const next = { ...notif, [key]: val }
    setNotif(next)
    await AsyncStorage.setItem(NOTIF_KEY, JSON.stringify(next))
  }, [notif])

  const handleSignOut = useCallback(() => {
    Alert.alert(t.profile.signOut, t.profile.signOutConfirm, [
      { text: t.profile.cancel, style: 'cancel' },
      {
        text: t.profile.signOutAction,
        style: 'destructive',
        onPress: async () => {
          await setGuestMode(false)
          await signOut()
          // _layout.tsx watches auth state and redirects automatically
        },
      },
    ])
  }, [t])

  // Build avatar initials from name
  const initials = userName
    .split(' ')
    .slice(0, 2)
    .map(w => w[0] ?? '')
    .join('')
    .toUpperCase() || '?'

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t.profile.title}</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Avatar + identity ──────────────────────────────── */}
        <View style={s.identity}>
          <LinearGradient colors={Gradients.accentFade} style={s.avatar}>
            <Text style={s.initials}>{initials}</Text>
          </LinearGradient>
          {userName ? (
            <Text style={s.name}>{userName}</Text>
          ) : null}
          {userEmail ? (
            <Text style={s.email}>{userEmail}</Text>
          ) : null}
        </View>

        {/* ── Preferences ────────────────────────────────────── */}
        <Text style={s.sectionLabel}>{t.profile.preferences}</Text>
        <SectionCard>
          {/* Language */}
          <View style={s.prefRow}>
            <Text style={s.prefLabel}>{t.profile.language}</Text>
            <LangPill lang={lang} onChange={handleLangChange} />
          </View>
          <View style={s.prefDivider} />
          {/* Currency */}
          <View style={s.prefRow}>
            <Text style={s.prefLabel}>{t.profile.currency}</Text>
            <CurrencyPill currency={currency} onChange={handleCurrencyChange} />
          </View>
        </SectionCard>

        {/* ── Notifications ──────────────────────────────────── */}
        <Text style={s.sectionLabel}>{t.profile.notifications}</Text>
        <SectionCard>
          <View style={s.notifRow}>
            <Text style={s.prefLabel}>{t.profile.bookingConfirmations}</Text>
            <Toggle
              value={notif.bookingConfirmations}
              onChange={v => handleNotifChange('bookingConfirmations', v)}
            />
          </View>
          <View style={s.prefDivider} />
          <View style={s.notifRow}>
            <Text style={s.prefLabel}>{t.profile.checkinReminders}</Text>
            <Toggle
              value={notif.checkinReminders}
              onChange={v => handleNotifChange('checkinReminders', v)}
            />
          </View>
          <View style={s.prefDivider} />
          <View style={s.notifRow}>
            <Text style={s.prefLabel}>{t.profile.promoOffers}</Text>
            <Toggle
              value={notif.promoOffers}
              onChange={v => handleNotifChange('promoOffers', v)}
            />
          </View>
        </SectionCard>

        {/* ── Payment history + admin ─────────────────────────── */}
        <SectionCard>
          <InfoRow label={t.profile.paymentHistory} onPress={() => router.push('/payments')} />
          <InfoRow label="Knowledge Base (Admin)" onPress={() => router.push('/admin-knowledge')} last />
        </SectionCard>

        {/* ── Account links ──────────────────────────────────── */}
        <Text style={s.sectionLabel}>{t.profile.account}</Text>
        <SectionCard>
          <InfoRow label={t.profile.help} onPress={() => {}} />
          <InfoRow label={t.profile.terms} onPress={() => {}} />
          <InfoRow label={t.profile.privacy} onPress={() => {}} last />
        </SectionCard>

        {/* ── Sign out ───────────────────────────────────────── */}
        <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
          <Text style={s.signOutText}>{t.profile.signOut}</Text>
        </TouchableOpacity>

        {/* ── Version ────────────────────────────────────────── */}
        <Text style={s.version}>{t.profile.version} {APP_VERSION}</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

// ── Styles ─────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: Spacing.xxxl },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.surface,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: Radius.full,
    backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { ...Typography.h3, color: Colors.text },

  // Identity
  identity: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  avatar: {
    width: 80, height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  initials: {
    ...Typography.h1,
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
  },
  name: { ...Typography.h2, color: Colors.text, fontWeight: '700' },
  email: { ...Typography.body, color: Colors.textSecondary, marginTop: 4 },

  // Section label
  sectionLabel: {
    ...Typography.overline,
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },

  // Preference rows
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm + 2,
  },
  prefLabel: { ...Typography.body, color: Colors.text },
  prefDivider: { height: 1, backgroundColor: Colors.borderLight },

  // Sign out
  signOutBtn: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    ...Shadows.sm,
  },
  signOutText: { ...Typography.button, color: Colors.text },

  // Version
  version: {
    ...Typography.caption,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: Spacing.lg,
    fontSize: 12,
  },
})
