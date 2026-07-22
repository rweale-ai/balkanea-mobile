import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, Alert, Image, Linking, Platform,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router'
import { getBooking, cancelBooking, subscribeToBookings, isValidDate } from '../lib/bookings-store'
import { getItinerary, removeItineraryItem, type ItineraryItemType } from '../lib/itinerary-store'
import { setReviewIntent } from '../lib/explore-intent'
import { useLang } from '../lib/i18n'
import { Colors, Spacing, Radius, Typography, Shadows, Gradients } from '../constants/theme'
import type { Booking, HotelSearchParams } from '../lib/types'
import { NeaBottomSheet } from '../components/hotel/NeaBottomSheet'
import { ItineraryTopicSheet, type ItineraryTopic } from '../components/trip/ItineraryTopicSheet'

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
  const [itinerary, setItinerary] = useState(() => (id ? getItinerary(id) : undefined))
  const [topicSheet, setTopicSheet] = useState<ItineraryTopic | null>(null)

  // Refresh whenever this screen regains focus — an itinerary saved from
  // the chat tab should show up immediately on returning here.
  useFocusEffect(useCallback(() => {
    if (id) setItinerary(getItinerary(id))
  }, [id]))

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
  // Once a hotel is booked, that decision is made — reviews/Q&A only make
  // sense while the booking is still being finalized (pending/locked).
  const showHotelQA = !!booking && !isConfirmed && !isCancelled

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

  const handleRefineItinerary = useCallback(() => {
    if (!booking) return
    const city = booking.hotel.address?.split(',')[0] ?? booking.hotel.name
    const prior = itinerary && itinerary.items.length > 0
      ? `\n\nHere's what we planned before:\n${itinerary.items.map(i => `- ${i.title}${i.date ? ` (${formatDate(i.date)})` : ''}`).join('\n')}`
      : ''
    setReviewIntent(
      `I've already booked my hotel in ${city} (confirmation ${booking.confirmation_code}). I'd like to continue refining my trip itinerary.${prior}`,
      booking.id,
    )
    router.navigate('/')
  }, [booking, itinerary, router])

  const handleRemoveItem = useCallback((itemId: string) => {
    if (!booking) return
    removeItineraryItem(booking.id, itemId)
    setItinerary(getItinerary(booking.id))
  }, [booking])

  const handleAskNeaPlan = useCallback(() => {
    if (!booking) return
    const city = booking.hotel.address?.split(',')[0] ?? booking.hotel.name
    const already = `I've already booked my hotel in ${city} (confirmation ${booking.confirmation_code}), staying ${formatDate(booking.checkin)} to ${formatDate(booking.checkout)} (${nights} ${nights === 1 ? 'night' : 'nights'}). Please don't ask me about hotels — that's decided.`
    setReviewIntent(`${already} Help me plan my trip — top restaurants, must-see sights, and a daily itinerary.`, booking.id)
    router.navigate('/')
  }, [booking, nights, router])

  const tripTiles = [
    { key: 'flights', icon: 'airplane' as const, label: t.dashboard.flights, active: false },
    { key: 'restaurants', icon: 'restaurant' as const, label: t.dashboard.restaurants, active: true },
    { key: 'tours', icon: 'map' as const, label: t.dashboard.tours, active: true },
    { key: 'carRental', icon: 'car' as const, label: t.dashboard.carRental, active: false },
    { key: 'insurance', icon: 'shield-checkmark' as const, label: t.dashboard.insurance, active: false },
    { key: 'more', icon: 'ellipsis-horizontal' as const, label: t.dashboard.more, active: false },
  ]

  const itemIcon = (type: ItineraryItemType): React.ComponentProps<typeof Ionicons>['name'] => {
    if (type === 'restaurant') return 'restaurant'
    if (type === 'tour') return 'map'
    if (type === 'sight') return 'location'
    return 'sparkles'
  }

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

          {/* ── Ask Nea about this hotel — only while still deciding ── */}
          {showHotelQA && (
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
          )}

          {/* ── Add to trip ──────────────────────────────────────── */}
          {!isCancelled && (
            <>
              <Text style={s.sectionTitle}>{t.dashboard.addToTrip}</Text>
              <View style={s.addGrid}>
                {tripTiles.map(tile => (
                  <TouchableOpacity
                    key={tile.key}
                    style={[s.addTile, !tile.active && s.addTileInactive]}
                    onPress={() => {
                      if (tile.key === 'restaurants' || tile.key === 'tours') setTopicSheet(tile.key)
                    }}
                    disabled={!tile.active}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name={tile.icon}
                      size={18}
                      color={tile.active ? Colors.primary : Colors.textLight}
                    />
                    <Text style={[s.addTileLabel, !tile.active && s.addTileLabelDim]}>
                      {tile.label}
                    </Text>
                    <Text style={[s.addTileAction, !tile.active && s.addTileActionDim]}>
                      {tile.active ? `${t.dashboard.askNea} →` : t.dashboard.comingSoon}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={s.planBar} onPress={handleAskNeaPlan} activeOpacity={0.8}>
                <LinearGradient colors={Gradients.primaryFade} style={s.planBarInner}>
                  <Ionicons name="sparkles" size={15} color="#fff" />
                  <Text style={s.planBarText}>{t.dashboard.askNeaPlan}</Text>
                  <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.8)" />
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}

          {/* ── Trip plan — structured itinerary, not a chat transcript ── */}
          {!isCancelled && (
            <View style={s.itineraryCard}>
              <View style={s.itineraryHeader}>
                <Ionicons name="map-outline" size={16} color={Colors.primary} />
                <Text style={s.itineraryTitle}>{t.bookingDetail.savedItinerary}</Text>
              </View>

              {itinerary && itinerary.items.length > 0 ? (
                <>
                  {itinerary.items
                    .slice()
                    .sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999'))
                    .map(item => (
                      <View key={item.id} style={s.itineraryItemRow}>
                        <Ionicons name={itemIcon(item.type)} size={15} color={Colors.primary} style={s.itineraryItemIcon} />
                        <View style={s.itineraryItemBody}>
                          <Text style={s.itineraryItemTitle}>{item.title}</Text>
                          {!!item.description && (
                            <Text style={s.itineraryItemDesc}>{item.description}</Text>
                          )}
                          <Text style={s.itineraryItemDate}>
                            {item.date ? formatDate(item.date) : t.bookingDetail.itineraryUnscheduled}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleRemoveItem(item.id)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="close" size={16} color={Colors.textLight} />
                        </TouchableOpacity>
                      </View>
                    ))}
                </>
              ) : (
                <>
                  <Text style={s.itineraryEmptyTitle}>{t.bookingDetail.itineraryEmpty}</Text>
                  <Text style={s.itineraryPreview}>{t.bookingDetail.itineraryEmptySub}</Text>
                </>
              )}

              <TouchableOpacity style={s.itineraryBtn} activeOpacity={0.8} onPress={handleRefineItinerary}>
                <Text style={s.itineraryBtnText}>{t.bookingDetail.viewRefineItinerary}</Text>
                <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          )}

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
      <ItineraryTopicSheet booking={booking} topic={topicSheet} onClose={() => setTopicSheet(null)} />
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
    backgroundColor: 'rgba(0,0,0,0.4)',
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
  addGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  addTile: {
    width: '30%',
    flexGrow: 1,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    alignItems: 'center',
    gap: 4,
  },
  addTileInactive: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.border,
  },
  addTileLabel: {
    ...Typography.caption,
    color: Colors.text,
    fontWeight: '600',
    fontSize: 11,
    textAlign: 'center',
  },
  addTileLabelDim: {
    color: Colors.textLight,
  },
  addTileAction: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 10,
    textAlign: 'center',
  },
  addTileActionDim: {
    color: Colors.textLight,
    fontWeight: '400',
  },
  planBar: {
    borderRadius: Radius.md,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  planBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    gap: 8,
  },
  planBarText: {
    ...Typography.button,
    color: '#fff',
    flex: 1,
    textAlign: 'center',
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
  itineraryCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.xs,
  },
  itineraryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  itineraryTitle: {
    ...Typography.bodyMedium,
    color: Colors.text,
    fontWeight: '700',
  },
  itineraryPreview: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  itineraryEmptyTitle: {
    ...Typography.bodyMedium,
    color: Colors.text,
    fontWeight: '600',
    fontSize: 13,
  },
  itineraryItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs + 2,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  itineraryItemIcon: {
    marginTop: 2,
  },
  itineraryItemBody: {
    flex: 1,
    gap: 1,
  },
  itineraryItemTitle: {
    ...Typography.bodyMedium,
    color: Colors.text,
    fontWeight: '600',
    fontSize: 14,
  },
  itineraryItemDesc: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  itineraryItemDate: {
    ...Typography.caption,
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  itineraryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  itineraryBtnText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 13,
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
