import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, Image,
  StyleSheet, SafeAreaView, Alert, SectionList,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import {
  getUpcomingBookings, getPastBookings,
  cancelBooking, subscribeToBookings, isValidDate, addBooking,
} from '../../lib/bookings-store'
import { searchHotelsSync } from '../../lib/hotels'
import type { Booking } from '../../lib/types'
import { useLang } from '../../lib/i18n'
import { setReviewIntent } from '../../lib/explore-intent'
import { Colors, Spacing, Radius, Typography, Shadows, Gradients } from '../../constants/theme'

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function nightCount(checkin: string, checkout: string): number {
  const a = new Date(checkin + 'T00:00:00')
  const b = new Date(checkout + 'T00:00:00')
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)))
}

function daysUntil(checkin: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(checkin + 'T00:00:00')
  return Math.round((d.getTime() - today.getTime()) / 86400000)
}

// ── Trip Card (upcoming bookings) ──────────────────────────────────
function TripCard({
  booking,
  onPress,
  onCancel,
}: {
  booking: Booking
  onPress: (id: string) => void
  onCancel: (booking: Booking) => void
}) {
  const { t } = useLang()
  const router = useRouter()
  const imageUrl = booking.hotel.images?.[0] ?? null
  const nights = nightCount(booking.checkin, booking.checkout)
  const days = daysUntil(booking.checkin)
  const city = booking.hotel.address?.split(',')[0] ?? booking.hotel.name
  const currencySymbol = booking.currency === 'EUR' ? '€' : booking.currency === 'USD' ? '$' : booking.currency

  const handleAskNea = useCallback((type: string) => {
    const already = `I've already booked my hotel in ${city} (confirmation ${booking.confirmation_code}), staying ${formatDate(booking.checkin)} to ${formatDate(booking.checkout)} (${nights} ${nights === 1 ? 'night' : 'nights'}). Please don't ask me about hotels — that's decided.`
    const messages: Record<string, string> = {
      flights: `${already} Can you help me find flights from Skopje?`,
      restaurants: `${already} What are the best restaurants I should try?`,
      tours: `${already} What tours and activities should I book?`,
      plan: `${already} Help me plan my trip — top restaurants, must-see sights, and a daily itinerary.`,
    }
    setReviewIntent(messages[type] ?? messages.plan, booking.id)
    router.navigate('/')
  }, [city, booking.checkin, booking.checkout, booking.confirmation_code, booking.id, nights, router])

  const tripTiles = [
    { key: 'flights', icon: 'airplane' as const, label: t.dashboard.flights, active: true },
    { key: 'restaurants', icon: 'restaurant' as const, label: t.dashboard.restaurants, active: true },
    { key: 'tours', icon: 'map' as const, label: t.dashboard.tours, active: true },
    { key: 'carRental', icon: 'car' as const, label: t.dashboard.carRental, active: false },
    { key: 'insurance', icon: 'shield-checkmark' as const, label: t.dashboard.insurance, active: false },
    { key: 'more', icon: 'ellipsis-horizontal' as const, label: t.dashboard.more, active: false },
  ]

  return (
    <TouchableOpacity
      style={tripStyles.card}
      activeOpacity={0.92}
      onPress={() => onPress(booking.id)}
    >
      {/* Hero */}
      <View style={tripStyles.hero}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <LinearGradient colors={Gradients.primaryFade} style={StyleSheet.absoluteFill} />
        )}
        <LinearGradient colors={Gradients.heroOverlay} style={StyleSheet.absoluteFill} />

        {days > 0 && (
          <View style={tripStyles.countdownBadge}>
            <Ionicons name="time-outline" size={11} color="#fff" />
            <Text style={tripStyles.countdownText}>
              {t.dashboard.daysToGo.replace('{{count}}', String(days))}
            </Text>
          </View>
        )}
        {days === 0 && (
          <View style={[tripStyles.countdownBadge, tripStyles.countdownToday]}>
            <Ionicons name="star" size={11} color="#fff" />
            <Text style={tripStyles.countdownText}>{t.dashboard.today}</Text>
          </View>
        )}

        <View style={tripStyles.heroBottom}>
          <Text style={tripStyles.heroName} numberOfLines={2}>{booking.hotel.name}</Text>
          {booking.hotel.stars > 0 && (
            <View style={tripStyles.starsRow}>
              {Array.from({ length: booking.hotel.stars }).map((_, i) => (
                <Ionicons key={i} name="star" size={11} color={Colors.star} />
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Date + confirmation */}
      <View style={tripStyles.body}>
        <View style={tripStyles.infoRow}>
          <View style={tripStyles.infoLeft}>
            <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
            <Text style={tripStyles.infoText}>
              {formatDate(booking.checkin)} – {formatDate(booking.checkout)} · {nights}{nights === 1 ? ' night' : ' nights'}
            </Text>
          </View>
          <View style={tripStyles.confirmPill}>
            <Text style={tripStyles.confirmCode}>{booking.confirmation_code}</Text>
          </View>
        </View>
        <View style={tripStyles.priceRow}>
          <Text style={tripStyles.price}>{currencySymbol}{booking.total_price.toLocaleString()}</Text>
          {booking.status === 'confirmed' && (
            <TouchableOpacity
              style={tripStyles.cancelBtn}
              onPress={() => onCancel(booking)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-outline" size={13} color={Colors.error} />
              <Text style={tripStyles.cancelText}>{t.dashboard.cancelAction}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Add to trip grid */}
      <View style={tripStyles.addSection}>
        <Text style={tripStyles.addLabel}>{t.dashboard.addToTrip}</Text>
        <View style={tripStyles.grid}>
          {tripTiles.map(tile => (
            <TouchableOpacity
              key={tile.key}
              style={[tripStyles.tile, !tile.active && tripStyles.tileInactive]}
              onPress={() => tile.active ? handleAskNea(tile.key) : undefined}
              disabled={!tile.active}
              activeOpacity={0.75}
            >
              <Ionicons
                name={tile.icon}
                size={18}
                color={tile.active ? Colors.primary : Colors.textLight}
              />
              <Text style={[tripStyles.tileLabel, !tile.active && tripStyles.tileLabelDim]}>
                {tile.label}
              </Text>
              <Text style={[tripStyles.tileAction, !tile.active && tripStyles.tileActionDim]}>
                {tile.active ? `${t.dashboard.askNea} →` : t.dashboard.comingSoon}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Ask Nea to plan */}
      <TouchableOpacity
        style={tripStyles.planBar}
        onPress={() => handleAskNea('plan')}
        activeOpacity={0.8}
      >
        <LinearGradient colors={Gradients.primaryFade} style={tripStyles.planBarInner}>
          <Ionicons name="sparkles" size={15} color="#fff" />
          <Text style={tripStyles.planBarText}>{t.dashboard.askNeaPlan}</Text>
          <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.8)" />
        </LinearGradient>
      </TouchableOpacity>
    </TouchableOpacity>
  )
}

export default function DashboardScreen() {
  const [upcoming, setUpcoming] = useState<Booking[]>(getUpcomingBookings())
  const [past, setPast] = useState<Booking[]>(getPastBookings())
  const router = useRouter()
  const { t } = useLang()

  useEffect(() => {
    const unsub = subscribeToBookings(() => {
      setUpcoming(getUpcomingBookings())
      setPast(getPastBookings())
    })
    return unsub
  }, [])

  const handleCancel = useCallback((booking: Booking) => {
    Alert.alert(
      t.dashboard.cancelBooking,
      t.dashboard.cancelConfirm.replace('{{hotel}}', booking.hotel.name),
      [
        { text: t.dashboard.keep, style: 'cancel' },
        {
          text: t.dashboard.cancelAction,
          style: 'destructive',
          onPress: () => cancelBooking(booking.id),
        },
      ]
    )
  }, [t])

  const handlePress = useCallback((id: string) => {
    router.push(`/booking-detail?id=${id}`)
  }, [router])

  // TEMPORARY — lets us verify the past/upcoming dashboard split on device.
  // Remove once that's confirmed working.
  const handleAddTestPastBooking = useCallback(async () => {
    const checkinDate = new Date()
    checkinDate.setDate(checkinDate.getDate() - 10)
    const checkoutDate = new Date(checkinDate)
    checkoutDate.setDate(checkoutDate.getDate() + 3)
    const checkin = checkinDate.toISOString().split('T')[0]
    const checkout = checkoutDate.toISOString().split('T')[0]

    const results = searchHotelsSync({
      destination: 'santorini', checkin, checkout, adults: 2, children: 0, rooms: 1, currency: 'EUR',
    })
    const hotel = results[0]
    const room = hotel.room_types[0]

    await addBooking({
      hotel, room, checkin, checkout,
      guests: { adults: 2, children: 0 },
      rooms: 1,
      total_price: room.total_price,
      currency: 'EUR',
      guest_name: 'Test Guest',
      guest_email: 'test@example.com',
      guest_phone: '',
    })
  }, [])

  const isEmpty = upcoming.length === 0 && past.length === 0

  if (isEmpty) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.headerSection}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>{t.dashboard.title}</Text>
              <Text style={styles.subtitle}>{t.dashboard.subtitle}</Text>
            </View>
            <TouchableOpacity style={styles.avatarBtn} onPress={() => router.push('/profile')}>
              <LinearGradient colors={['#00332A', '#001a15'] as const} style={styles.avatar}>
                <Ionicons name="person" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={handleAddTestPastBooking} style={styles.testBtn}>
            <Text style={styles.testBtnText}>🧪 Add test past booking (temporary)</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.emptyState}>
          <View style={styles.emptyVisual}>
            <Ionicons name="compass-outline" size={72} color={Colors.primaryLight} />
          </View>
          <Text style={styles.emptyTitle}>{t.dashboard.noBookings}</Text>
          <Text style={styles.emptyText}>
            {t.dashboard.chatWithBea}
          </Text>
          <TouchableOpacity onPress={() => router.navigate('/')} activeOpacity={0.8}>
            <LinearGradient
              colors={Gradients.primaryFade}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaBtn}
            >
              <Ionicons name="search" size={16} color="#fff" />
              <Text style={styles.ctaText}>{t.dashboard.findHotel}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const sections: { title: string; data: Booking[] }[] = []
  if (upcoming.length > 0) sections.push({ title: t.dashboard.upcoming, data: upcoming })
  if (past.length > 0) sections.push({ title: t.dashboard.past, data: past })

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerSection}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>{t.dashboard.title}</Text>
            <Text style={styles.subtitle}>{t.dashboard.subtitle}</Text>
          </View>
          <TouchableOpacity style={styles.avatarBtn} onPress={() => router.push('/profile')}>
            <LinearGradient colors={['#00332A', '#001a15'] as const} style={styles.avatar}>
              <Ionicons name="person" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={handleAddTestPastBooking} style={styles.testBtn}>
          <Text style={styles.testBtnText}>🧪 Add test past booking (temporary)</Text>
        </TouchableOpacity>
      </View>
      <SectionList
        sections={sections}
        keyExtractor={b => b.id}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionTitle}>{section.title}</Text>
        )}
        renderItem={({ item, section }) => {
          // Trust the section the item is already sorted into (from
          // getUpcomingBookings/getPastBookings) instead of re-deriving
          // "past" from a raw date-string comparison here too.
          if (section.title === t.dashboard.past) {
            return <BookingCard booking={item} onPress={handlePress} onCancel={handleCancel} />
          }
          return <TripCard booking={item} onPress={handlePress} onCancel={handleCancel} />
        }}
      />
    </SafeAreaView>
  )
}

function BookingCard({
  booking,
  onPress,
  onCancel,
}: {
  booking: Booking
  onPress: (id: string) => void
  onCancel: (booking: Booking) => void
}) {
  const { t } = useLang()
  const router = useRouter()
  const imageUrl = booking.hotel.images?.[0] ?? null
  const nights = nightCount(booking.checkin, booking.checkout)
  const isConfirmed = booking.status === 'confirmed'
  const isCancelled = booking.status === 'cancelled'
  const today = new Date().toISOString().split('T')[0]
  const isPast = isValidDate(booking.checkout) && booking.checkout < today

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => onPress(booking.id)}
    >
      <View style={styles.imageSection}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <LinearGradient colors={Gradients.primaryFade} style={StyleSheet.absoluteFill} />
        )}
        <LinearGradient colors={Gradients.heroOverlay} style={StyleSheet.absoluteFill} />

        <View style={styles.imageBadgeRow}>
          <View style={[
            styles.statusBadge,
            isConfirmed && styles.statusConfirmed,
            isCancelled && styles.statusCancelled,
            !isConfirmed && !isCancelled && styles.statusPending,
          ]}>
            <Ionicons
              name={isConfirmed ? 'checkmark-circle' : isCancelled ? 'close-circle' : 'time'}
              size={12}
              color="#fff"
            />
            <Text style={styles.statusText}>
              {isConfirmed ? t.dashboard.confirmed : isCancelled ? t.dashboard.cancelled : t.dashboard.pending}
            </Text>
          </View>
        </View>

        <View style={styles.imageTitleWrap}>
          <Text style={styles.imageTitle} numberOfLines={2}>{booking.hotel.name}</Text>
          {booking.hotel.stars > 0 && (
            <View style={styles.starsRow}>
              {Array.from({ length: booking.hotel.stars }).map((_, i) => (
                <Ionicons key={i} name="star" size={12} color={Colors.star} />
              ))}
            </View>
          )}
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.dateText}>
            {formatDate(booking.checkin)} - {formatDate(booking.checkout)} ({nights} {nights === 1 ? 'night' : 'nights'})
          </Text>
        </View>

        <View style={styles.badgeRow}>
          <View style={styles.confirmBadge}>
            <Text style={styles.confirmText}>{booking.confirmation_code}</Text>
          </View>
          <Text style={styles.price}>
            {booking.currency === 'EUR' ? '€' : booking.currency} {booking.total_price.toLocaleString()}
          </Text>
        </View>

        {isConfirmed && !isPast && (
          <View style={styles.footerRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => onCancel(booking)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-outline" size={14} color={Colors.error} />
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
        {isConfirmed && isPast && (
          <TouchableOpacity
            style={styles.feedbackBtn}
            onPress={() => router.push({
              pathname: '/feedback-chat',
              params: {
                hotelName: booking.hotel.name,
                destination: booking.hotel.address?.split(',')[0] ?? '',
                checkin: booking.checkin,
                checkout: booking.checkout,
                bookingId: booking.id,
              },
            })}
            activeOpacity={0.8}
          >
            <Ionicons name="sparkles-outline" size={14} color={Colors.primary} />
            <Text style={styles.feedbackBtnText}>{t.feedback.howWasYourTrip}</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  headerSection: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  testBtn: {
    marginTop: Spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
  },
  testBtnText: {
    ...Typography.caption,
    color: '#92400E',
    fontWeight: '600',
    fontSize: 11,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  avatarBtn: {},
  avatar: {
    width: 44, height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...Typography.hero,
    color: Colors.text,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  emptyVisual: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    ...Typography.h1,
    color: Colors.text,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 4,
    gap: 8,
    ...Shadows.md,
  },
  ctaText: {
    ...Typography.button,
    color: '#fff',
  },

  // List
  list: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  sectionTitle: {
    ...Typography.h2,
    color: Colors.text,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },

  // Card
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  imageSection: {
    height: 140,
    justifyContent: 'flex-end',
  },
  imageBadgeRow: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    gap: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusConfirmed: {
    backgroundColor: Colors.success,
  },
  statusCancelled: {
    backgroundColor: Colors.error,
  },
  statusPending: {
    backgroundColor: Colors.accent,
  },
  statusText: {
    ...Typography.caption,
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  imageTitleWrap: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  imageTitle: {
    ...Typography.h1,
    color: '#fff',
    fontSize: 20,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },

  // Card body
  cardBody: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    ...Typography.body,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  confirmBadge: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  confirmText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  price: {
    ...Typography.h3,
    color: Colors.primary,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: Spacing.xs,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  cancelText: {
    ...Typography.caption,
    color: Colors.error,
    fontWeight: '600',
    fontSize: 12,
  },
  feedbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryLight,
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
  },
  feedbackBtnText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
})

// ── Trip Card styles ───────────────────────────────────────────────
const tripStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  hero: {
    height: 170,
    justifyContent: 'flex-end',
  },
  countdownBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.accent,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countdownToday: {
    backgroundColor: Colors.primary,
  },
  countdownText: {
    ...Typography.caption,
    color: '#fff',
    fontWeight: '700',
    fontSize: 11,
  },
  heroBottom: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  heroName: {
    ...Typography.h2,
    color: '#fff',
    fontSize: 20,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  body: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    gap: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  infoText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontSize: 12,
    flex: 1,
  },
  confirmPill: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  confirmCode: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: {
    ...Typography.h3,
    color: Colors.text,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  cancelText: {
    ...Typography.caption,
    color: Colors.error,
    fontWeight: '600',
    fontSize: 11,
  },
  addSection: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  addLabel: {
    ...Typography.overline,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  tile: {
    width: '30%',
    flexGrow: 1,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    alignItems: 'center',
    gap: 4,
  },
  tileInactive: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.border,
  },
  tileLabel: {
    ...Typography.caption,
    color: Colors.text,
    fontWeight: '600',
    fontSize: 11,
    textAlign: 'center',
  },
  tileLabelDim: {
    color: Colors.textLight,
  },
  tileAction: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 10,
    textAlign: 'center',
  },
  tileActionDim: {
    color: Colors.textLight,
    fontWeight: '400',
  },
  planBar: {
    margin: Spacing.md,
    marginTop: 0,
    borderRadius: Radius.md,
    overflow: 'hidden',
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
})
