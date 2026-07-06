import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, Alert, Image, Linking, Platform,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { getBooking, cancelBooking, subscribeToBookings, isValidDate } from '../lib/bookings-store'
import { useLang } from '../lib/i18n'
import { Colors, Spacing, Radius, Typography, Shadows, Gradients } from '../constants/theme'
import type { Booking, HotelSearchParams } from '../lib/types'
import { NeaBottomSheet } from '../components/hotel/NeaBottomSheet'

const BALKANEA_PHONE = '+38923100200'

// ── Helpers ────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function nightCount(checkin: string, checkout: string): number {
  const a = new Date(checkin + 'T00:00:00')
  const b = new Date(checkout + 'T00:00:00')
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86_400_000))
}

// ── Row component for detail cards ─────────────────────────────────

function DetailRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[s.detailRow, !last && s.detailRowBorder]}>
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={s.detailValue}>{value}</Text>
    </View>
  )
}

// ── Main screen ────────────────────────────────────────────────────

export default function BookingDetailScreen() {
  const router = useRouter()
  const { t } = useLang()
  const { id } = useLocalSearchParams<{ id: string }>()

  const [booking, setBooking] = useState<Booking | undefined>(() => (id ? getBooking(id) : undefined))
  const [neaSheetVisible, setNeaSheetVisible] = useState(false)

  const searchParams = useMemo<HotelSearchParams>(() => ({
    destination: booking?.hotel.address.split(',')[0] ?? '',
    checkin: booking?.checkin ?? '',
    checkout: booking?.checkout ?? '',
    adults: booking?.guests.adults ?? 2,
    children: booking?.guests.children ?? 0,
    rooms: booking?.rooms ?? 1,
    currency: booking?.currency ?? 'EUR',
  }), [booking])

  // Keep in sync with cancellation updates from trips.tsx or anywhere else
  useEffect(() => {
    return subscribeToBookings(() => {
      if (id) setBooking(getBooking(id))
    })
  }, [id])

  const nights = useMemo(
    () => booking ? nightCount(booking.checkin, booking.checkout) : 0,
    [booking],
  )

  const formatPrice = useCallback((eur: number) => {
    if (!booking) return ''
    if (booking.currency === 'MKD') return `${Math.round(eur * 61.5).toLocaleString('en-US')} ден`
    if (booking.currency === 'GBP') return `£${eur}`
    if (booking.currency === 'USD') return `$${eur}`
    return `€${eur}`
  }, [booking])

  const today = new Date().toISOString().split('T')[0]
  const isConfirmed = booking?.status === 'confirmed'
  const isCancelled = booking?.status === 'cancelled'
  const isUpcoming = isConfirmed && !!booking && (!isValidDate(booking.checkin) || booking.checkin >= today)
  const isPast = isConfirmed && !isUpcoming

  // Status badge
  const statusLabel = isCancelled
    ? t.bookingDetail.statusCancelled
    : isUpcoming
      ? t.bookingDetail.statusConfirmed
      : t.bookingDetail.statusPast

  const statusBg = isCancelled
    ? 'rgba(0,0,0,0.45)'
    : isUpcoming
      ? 'rgba(16,185,129,0.92)'
      : 'rgba(0,0,0,0.35)'

  const handleCancel = useCallback(() => {
    if (!booking) return
    Alert.alert(
      t.bookingDetail.cancelBooking,
      t.bookingDetail.cancelConfirm.replace('{{hotel}}', booking.hotel.name),
      [
        { text: t.bookingDetail.cancelKeep, style: 'cancel' },
        {
          text: t.bookingDetail.cancelAction,
          style: 'destructive',
          onPress: () => cancelBooking(booking.id),
        },
      ],
    )
  }, [booking, t])

  const handleContact = useCallback(() => {
    Linking.openURL(`tel:${BALKANEA_PHONE}`)
  }, [])

  // ── Not found ──────────────────────────────────────────────────
  if (!booking) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.notFound}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.textLight} />
          <Text style={s.notFoundTitle}>{t.bookingDetail.notFound}</Text>
          <Text style={s.notFoundSub}>{t.bookingDetail.notFoundSub}</Text>
          <TouchableOpacity style={s.notFoundBtn} onPress={() => router.back()}>
            <Text style={s.notFoundBtnText}>{t.bookingDetail.goBack}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const pricePerNight = nights > 0 ? Math.round(booking.total_price / nights) : booking.total_price

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ──────────────────────────────────────────────── */}
        <View style={s.hero}>
          {booking.hotel.images?.[0] ? (
            <Image source={{ uri: booking.hotel.images[0] }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <LinearGradient colors={Gradients.primaryFade} style={StyleSheet.absoluteFill} />
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0.22)', 'transparent', 'rgba(0,0,0,0.48)']}
            style={StyleSheet.absoluteFill}
          />

          {/* Back button */}
          <TouchableOpacity style={s.heroBack} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>

          {/* Status badge */}
          <View style={[s.statusBadge, { backgroundColor: statusBg }]}>
            <Text style={s.statusText}>{statusLabel}</Text>
          </View>

          {/* Hotel name + city at bottom of hero */}
          <View style={s.heroBottom}>
            <Text style={s.heroName}>{booking.hotel.name}</Text>
            <Text style={s.heroCity}>{booking.hotel.address.split(',')[0]}</Text>
          </View>
        </View>

        <View style={s.body}>
          {/* ── Confirmation code badge ──────────────────────────── */}
          <View style={s.codeBadge}>
            <Text style={s.codeLabel}>{t.bookingDetail.confirmationCode}</Text>
            <Text style={s.codeValue}>{booking.confirmation_code}</Text>
          </View>

          {/* ── Stay details ─────────────────────────────────────── */}
          <Text style={s.sectionTitle}>{t.bookingDetail.stayDetails}</Text>
          <View style={s.detailCard}>
            <DetailRow label={t.bookingDetail.checkIn} value={formatDate(booking.checkin)} />
            <DetailRow label={t.bookingDetail.checkOut} value={formatDate(booking.checkout)} />
            <DetailRow label={t.bookingDetail.roomType} value={booking.room.name} />
            <DetailRow
              label={t.bookingDetail.guests}
              value={`${booking.guests.adults} ${t.bookingDetail.adults}${booking.guests.children > 0 ? `, ${booking.guests.children} ${t.bookingDetail.children}` : ''}`}
            />
            <DetailRow
              label={t.bookingDetail.mealPlan}
              value={booking.room.meal_plan}
              last
            />
          </View>

          {/* ── Ask Nea about this hotel ──────────────────────────── */}
          <TouchableOpacity
            style={s.neaBtn}
            activeOpacity={0.8}
            onPress={() => setNeaSheetVisible(true)}
          >
            <LinearGradient colors={['#FFF4E8', '#FFF8F2'] as const} style={s.neaBtnInner}>
              <Ionicons name="sparkles" size={16} color={Colors.primary} />
              <Text style={s.neaBtnText}>{t.hotel.askNeaAbout}</Text>
              <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
            </LinearGradient>
          </TouchableOpacity>

          {/* ── Price breakdown ──────────────────────────────────── */}
          <Text style={s.sectionTitle}>{t.bookingDetail.priceBreakdown}</Text>
          <View style={s.detailCard}>
            <DetailRow
              label={`${formatPrice(pricePerNight)} × ${nights} ${t.bookingDetail.nights}`}
              value={formatPrice(booking.total_price)}
            />
            <DetailRow
              label={t.bookingDetail.totalPaid}
              value={formatPrice(booking.total_price)}
              last
            />
          </View>

          {/* ── State-specific bottom section ────────────────────── */}
          {isCancelled && (
            <View style={s.cancelledBanner}>
              <Ionicons name="close-circle" size={18} color={Colors.error} />
              <Text style={s.cancelledText}>{t.bookingDetail.statusCancelled}</Text>
            </View>
          )}

          {isUpcoming && (
            <>
              <View style={s.freeCancelBanner}>
                <Ionicons name="checkmark-circle" size={18} color={Colors.accent} />
                <Text style={s.freeCancelText}>{t.bookingDetail.freeCancel}</Text>
              </View>
              <TouchableOpacity style={s.cancelBtn} onPress={handleCancel} activeOpacity={0.8}>
                <Ionicons name="close-circle-outline" size={18} color={Colors.error} />
                <Text style={s.cancelBtnText}>{t.bookingDetail.cancelBooking}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.contactBtn} onPress={handleContact} activeOpacity={0.8}>
                <Ionicons name="call-outline" size={18} color="#fff" />
                <Text style={s.contactBtnText}>{t.bookingDetail.contactBalkanea}</Text>
              </TouchableOpacity>
            </>
          )}

          {isPast && !isCancelled && (
            <TouchableOpacity style={s.contactBtn} onPress={handleContact} activeOpacity={0.8}>
              <Ionicons name="call-outline" size={18} color="#fff" />
              <Text style={s.contactBtnText}>{t.bookingDetail.contactBalkanea}</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <NeaBottomSheet
        hotel={booking.hotel}
        searchParams={searchParams}
        visible={neaSheetVisible}
        onClose={() => setNeaSheetVisible(false)}
      />
    </SafeAreaView>
  )
}

// ── Styles ─────────────────────────────────────────────────────────

const HERO_H = 220

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: Spacing.xxl },

  // Not found
  notFound: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  notFoundTitle: { ...Typography.h2, color: Colors.text, marginTop: Spacing.md, textAlign: 'center' },
  notFoundSub: { ...Typography.body, color: Colors.textSecondary, marginTop: Spacing.sm, textAlign: 'center' },
  notFoundBtn: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary, borderRadius: Radius.md,
  },
  notFoundBtnText: { ...Typography.button, color: '#fff' },

  // Hero
  hero: {
    height: HERO_H,
    position: 'relative',
    backgroundColor: Colors.border,
  },
  heroBack: {
    position: 'absolute',
    top: Platform.OS === 'android' ? Spacing.xl : Spacing.lg,
    left: Spacing.md,
    width: 40, height: 40,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.88)',
    alignItems: 'center', justifyContent: 'center',
    ...Shadows.sm,
  },
  statusBadge: {
    position: 'absolute',
    top: Platform.OS === 'android' ? Spacing.xl + 8 : Spacing.lg + 8,
    right: Spacing.md,
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  statusText: { ...Typography.caption, color: '#fff', fontWeight: '700', fontSize: 12 },
  heroBottom: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    bottom: Spacing.md,
  },
  heroName: {
    ...Typography.h1,
    color: '#fff',
    letterSpacing: -0.4,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroCity: {
    ...Typography.body,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // Body
  body: { padding: Spacing.md },

  // Confirmation code badge
  codeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primaryLight,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    marginBottom: Spacing.lg,
  },
  codeLabel: {
    ...Typography.overline,
    color: Colors.primary,
    fontSize: 10,
  },
  codeValue: {
    ...Typography.h2,
    color: Colors.text,
    letterSpacing: 1.5,
    fontSize: 22,
  },

  // Section title
  sectionTitle: {
    ...Typography.bodyMedium,
    color: Colors.text,
    fontWeight: '700',
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },

  // Detail card
  detailCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  neaBtn: {
    borderRadius: Radius.md,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  neaBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
  },
  neaBtnText: {
    ...Typography.bodyMedium,
    color: Colors.primary,
    fontWeight: '700',
    flex: 1,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 3,
  },
  detailRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  detailLabel: { ...Typography.body, color: Colors.textSecondary, fontSize: 14 },
  detailValue: { ...Typography.bodyMedium, color: Colors.text, fontSize: 14, fontWeight: '600' },

  // Cancelled banner
  cancelledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.borderLight,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  cancelledText: { ...Typography.bodyMedium, color: Colors.textSecondary, fontWeight: '600' },

  // Free cancel banner
  freeCancelBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accentLight,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  freeCancelText: { ...Typography.bodyMedium, color: Colors.accent, fontWeight: '600', flex: 1 },

  // Action buttons
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: '#FECACA',
    backgroundColor: Colors.surface,
  },
  cancelBtnText: { ...Typography.button, color: Colors.error, fontSize: 15 },

  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.accent,
  },
  contactBtnText: { ...Typography.button, color: '#fff', fontSize: 15 },
})
