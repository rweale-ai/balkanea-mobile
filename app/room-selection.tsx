import React, { useMemo, useState, useEffect } from 'react'
import {
  View, Text, ScrollView, Image, TouchableOpacity,
  StyleSheet, SafeAreaView, Platform, ActivityIndicator, Alert,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { searchHotels, fetchRealRoomTypes } from '../lib/hotels'
import { useLang } from '../lib/i18n'
import { getCurrency, formatPrice } from '../lib/currency'
import type { CurrencyCode } from '../lib/locale'
import { Colors, Spacing, Radius, Typography, Shadows, Gradients } from '../constants/theme'
import type { Hotel, RoomType } from '../lib/types'
import { validateRoomsConfig } from '../lib/rooms-config'
import { currentCancellationStatus, formatCancellationDate } from '../lib/cancellation'

// Real rooms (book_hash present) carry the actual RateHawk penalty schedule
// via cancellation_policy -- use that instead of sniffing the display
// string, which only ever said "free" or not and can't tell a room that's
// still cancellable-with-a-penalty from a genuinely non-refundable one.
// Simulated/DB-content rooms have no cancellation_policy at all, so they
// keep the old string check as their only option.
function roomIsFreeRightNow(room: RoomType): boolean {
  if (room.cancellation_policy) return !!currentCancellationStatus(room.cancellation_policy).isFreeRightNow
  return room.cancellation.toLowerCase().includes('free')
}

export default function RoomSelectionScreen() {
  const router = useRouter()
  const { t } = useLang()
  const params = useLocalSearchParams<{
    hotelId: string
    checkin: string
    checkout: string
    adults: string
    children: string
    rooms: string
    roomsConfig: string
    currency: string
    destination: string
    maxPricePerNight: string
  }>()

  // Guarded -- a malformed route param must never crash this screen, just
  // fall back to the flat rooms count below.
  const roomsConfig = useMemo(() => {
    if (!params.roomsConfig) return undefined
    try {
      return validateRoomsConfig(JSON.parse(params.roomsConfig))
    } catch {
      return undefined
    }
  }, [params.roomsConfig])

  // Load-bearing for pricing: this must stay `roomsConfig?.length ||
  // parseInt(...)`, not `??`, so a lost/invalid roomsConfig still falls back
  // to the flat rooms count rather than pricing as a single room.
  const roomCount = roomsConfig?.length || parseInt(params.rooms || '1', 10)

  const [hotel, setHotel] = useState<Hotel | null>(null)
  const [hotelLoading, setHotelLoading] = useState(true)
  useEffect(() => {
    let cancelled = false
    if (!params.hotelId || !params.checkin || !params.checkout) {
      setHotelLoading(false)
      return
    }
    setHotelLoading(true)
    searchHotels({
      destination: params.destination || 'Hotel',
      checkin: params.checkin,
      checkout: params.checkout,
      adults: parseInt(params.adults || '2', 10),
      children: parseInt(params.children || '0', 10),
      rooms: parseInt(params.rooms || '1', 10),
      currency: params.currency || getCurrency(),
      // Must match the original search's price filter — see hotel-detail.tsx
      maxPricePerNight: params.maxPricePerNight ? parseFloat(params.maxPricePerNight) : undefined,
    }).then(async (results) => {
      if (cancelled) return
      const h = results.find(h => h.hotel_id === params.hotelId) || null
      // Real rooms are fetched here, lazily, for this one hotel only -- see
      // lib/hotels.ts's searchHotels for why the search itself never does
      // this for all results (RateHawk hotelpage rate-limit risk). Skipped
      // when room_types is already populated -- the Los Angeles special case
      // in search-hotels.js returns real rooms directly, so re-fetching here
      // would just be a second, redundant hotelpage call.
      if (h?.hasLiveRates && h.room_types.length === 0) {
        const selectedCurrency = params.currency || getCurrency()
        const { roomTypes, currency: quotedCurrency } = await fetchRealRoomTypes(h.hotel_id, params.checkin, params.checkout, parseInt(params.adults || '2', 10), selectedCurrency)
        if (cancelled) return
        // Empty means the real fetch failed or this hotel has no bookable
        // rates right now -- fall to the existing "not found" screen rather
        // than render a room list with nothing in it. currency is
        // overwritten with whatever RateHawk actually quoted in (EUR or
        // USD -- see fetchRealRoomTypes) -- h.currency from the search
        // step was only ever a placeholder default, never a real quote.
        setHotel(roomTypes.length > 0 ? { ...h, room_types: roomTypes, currency: quotedCurrency } : null)
      } else {
        setHotel(h)
      }
      setHotelLoading(false)
    })
    return () => { cancelled = true }
  }, [params.hotelId, params.checkin, params.checkout, params.destination, params.adults, params.children, params.rooms, params.currency, params.maxPricePerNight])

  const nights = useMemo(() => {
    if (!params.checkin || !params.checkout) return 1
    return Math.max(1, Math.round(
      (new Date(params.checkout).getTime() - new Date(params.checkin).getTime()) / 86400000
    ))
  }, [params.checkin, params.checkout])

  const recommendedRoomId = useMemo(() => {
    if (!hotel) return null
    const freeCancel = hotel.room_types.filter(roomIsFreeRightNow)
    if (freeCancel.length === 0) return hotel.room_types[0]?.room_id ?? null
    const sorted = [...freeCancel].sort((a, b) => a.price_per_night - b.price_per_night)
    return sorted[Math.floor(sorted.length / 2)].room_id
  }, [hotel])

  if (hotelLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    )
  }

  if (!hotel) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.textLight} />
          <Text style={styles.emptyText}>{t.hotel.notFound}</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>{t.hotel.goBack}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  // Always the traveler's selected display currency, real hotels included.
  // This works because Chat/api/hotel-rooms.js only ever quotes USD when
  // the traveler selected USD (EUR otherwise, including for MKD) -- so
  // formatPrice's existing EUR-base conversion is already correct: EUR
  // selected -> EUR quote, shown directly; USD selected -> USD quote, shown
  // directly (USD isn't in RATES, no conversion applied); MKD selected ->
  // EUR quote, converted via RATES.MKD. Using hotel.currency here instead
  // would show the raw quote currency and ignore the traveler's actual
  // selection -- confirmed 2026-08-26, that's why this page kept showing
  // USD/EUR regardless of what was picked.
  const activeCurrency = (params.currency || getCurrency()) as CurrencyCode

  const handleBookRoom = (room: RoomType) => {
    // Real (book_hash) bookings only ever commit ONE room with RateHawk --
    // realLockRoom takes a single book_hash, and Chat lib/ratehawk.js's
    // finishBooking hardcodes `rooms: [{ guests: roomsGuests }]`, a single
    // entry, regardless of roomCount. Multi-room selection still works for
    // simulated/DB-content hotels (each "room" there is fake, roomCount is
    // just a price multiplier), but for a real hotel it would charge the
    // guest for N rooms via Bankart while RateHawk's actual reservation
    // reflects only 1 -- confirmed reachable 2026-08-27 (this screen
    // multiplies price by roomCount for hasLiveRates hotels same as any
    // other). Blocked here until real multi-room RateHawk booking (separate
    // prebook/order per room) is built, rather than shipping the overcharge.
    if (room.book_hash && roomCount > 1) {
      Alert.alert(t.roomSelect.multiRoomUnavailableTitle, t.roomSelect.multiRoomUnavailableBody)
      return
    }
    router.push({
      pathname: '/booking',
      params: {
        hotelId: hotel.hotel_id,
        roomId: room.room_id,
        // Real RateHawk rooms (book_hash present) can't be re-found by id --
        // every screen calls searchHotels() independently, and a real
        // hotelpage call returns a fresh book_hash each time, so booking.tsx's
        // own re-search would never contain the id set here. Carry the exact
        // selected room forward instead of re-deriving it. Simulated/
        // DB-content rooms keep using roomId only, unchanged.
        roomData: room.book_hash ? JSON.stringify(room) : '',
        // Same problem as roomData above, for the same reason: booking.tsx's
        // own independent searchHotels() re-search gets a fresh hotel object
        // whose currency is just whatever the search step defaults to (not
        // a real quote), not what THIS screen actually got back from
        // fetchRealRoomTypes. Without this, booking.tsx's bookingCurrency
        // silently reverts to that stale default -- confirmed 2026-08-26,
        // this is why "confirm and pay" kept showing USD regardless of the
        // traveler's selection. Empty for simulated rooms, which still
        // follow the traveler's selected display currency as before.
        hotelCurrency: room.book_hash ? hotel.currency : '',
        checkin: params.checkin,
        checkout: params.checkout,
        adults: params.adults,
        children: params.children,
        rooms: params.rooms,
        roomsConfig: params.roomsConfig || '',
        currency: params.currency || getCurrency(),
        destination: params.destination || '',
        maxPricePerNight: params.maxPricePerNight || '',
      },
    })
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backBtnCircle} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={18} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t.roomSelect.title}</Text>
        </View>
        <View style={styles.ctxRow}>
          <View style={styles.ctxPill}>
            <Ionicons name="calendar-outline" size={12} color={Colors.primary} />
            <Text style={styles.ctxPillText}>
              {params.checkin} – {params.checkout} · {nights}{nights === 1 ? ' night' : ' nights'}
            </Text>
          </View>
          <View style={styles.ctxPill}>
            <Ionicons name="people-outline" size={12} color={Colors.primary} />
            <Text style={styles.ctxPillText}>
              {params.adults || '2'} adults{roomCount > 1 ? ` · ${roomCount} rooms` : ''}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.hotelLine}>
          <Text style={styles.hotelLineBold}>{hotel.name}</Text> · {hotel.address.split(',')[0]} · ★ {hotel.guest_rating}
        </Text>

        {hotel.room_types.map(room => {
          const isRecommended = room.room_id === recommendedRoomId
          const cxStatus = room.cancellation_policy ? currentCancellationStatus(room.cancellation_policy) : null
          const isFree = cxStatus ? !!cxStatus.isFreeRightNow : room.cancellation.toLowerCase().includes('free')
          // Three real states for a real room: free right now, still
          // cancellable but with a penalty, or genuinely non-refundable.
          // Simulated rooms only ever have the old two (free / non-refundable).
          const cxLabel = cxStatus
            ? cxStatus.isNonRefundable
              ? t.roomSelect.nonRefundable
              : cxStatus.isFreeRightNow
                ? t.roomSelect.freeCancelUntil.replace('{{date}}', cxStatus.freeCancellationBefore ? formatCancellationDate(cxStatus.freeCancellationBefore) : '')
                : t.roomSelect.cancellationPenalty.replace('{{amount}}', `${cxStatus.penaltyAmount?.toFixed(2)}`)
            : isFree
              ? t.roomSelect.freeCancelUntil.replace('{{date}}', room.cancellation.replace(/^Free cancellation until\s*/i, ''))
              : t.roomSelect.nonRefundable
          const cxColor = cxStatus && !cxStatus.isFreeRightNow && !cxStatus.isNonRefundable ? Colors.accent : (isFree ? Colors.success : Colors.error)
          const cxIcon = cxStatus && !cxStatus.isFreeRightNow && !cxStatus.isNonRefundable ? 'alert-circle' : (isFree ? 'checkmark-circle' : 'close-circle')
          return (
            <View key={room.room_id} style={[styles.roomCard, isRecommended && styles.roomCardRecommended]}>
              {isRecommended && (
                <View style={styles.recBanner}>
                  <Ionicons name="sparkles" size={12} color="#fff" />
                  <Text style={styles.recBannerText}>{t.roomSelect.neaRecommendsReason}</Text>
                </View>
              )}
              <View style={styles.rcBody}>
                <View style={styles.rcTop}>
                  <View style={styles.rcTopText}>
                    <Text style={styles.rcName}>{room.name}</Text>
                    <Text style={styles.rcSpecs}>{room.beds} · {t.hotel.maxGuests.replace('{{count}}', String(room.max_guests))}</Text>
                  </View>
                  <Image source={{ uri: hotel.images[0] }} style={styles.rcPhoto} resizeMode="cover" />
                </View>

                <View style={styles.rcChips}>
                  <View style={styles.rcChip}>
                    <Ionicons name="restaurant-outline" size={11} color={Colors.primary} />
                    <Text style={styles.rcChipText}>{room.meal_plan}</Text>
                  </View>
                </View>

                <View style={styles.rcCancel}>
                  <Ionicons name={cxIcon} size={13} color={cxColor} />
                  <Text style={[styles.rcCancelText, { color: cxColor }]}>
                    {cxLabel}
                  </Text>
                </View>
              </View>

              <View style={styles.rcFooter}>
                <View>
                  <Text style={styles.rcPrice}>
                    {formatPrice(room.price_per_night, activeCurrency)}<Text style={styles.rcPriceUnit}> {t.hotel.perNight}</Text>
                  </Text>
                  <Text style={styles.rcTotal}>
                    {formatPrice(room.total_price * roomCount, activeCurrency)} {t.hotel.total.toLowerCase()}
                    {roomCount > 1 ? ` (× ${roomCount} rooms)` : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.rcBookBtn, !isRecommended && styles.rcBookBtnOutline]}
                  onPress={() => handleBookRoom(room)}
                  activeOpacity={0.85}
                >
                  {isRecommended ? (
                    <LinearGradient colors={Gradients.primaryFade} style={styles.rcBookGradient}>
                      <Text style={styles.rcBookText}>{t.roomSelect.bookThisRoom}</Text>
                    </LinearGradient>
                  ) : (
                    <Text style={[styles.rcBookText, styles.rcBookTextOutline]}>{t.roomSelect.bookThisRoom}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )
        })}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  emptyText: {
    ...Typography.h2,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  backBtn: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
  },
  backBtnText: {
    ...Typography.button,
    color: '#fff',
  },

  header: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  backBtnCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.h3,
    color: Colors.text,
  },
  ctxRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  ctxPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 6,
  },
  ctxPillText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 11,
  },

  body: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  hotelLine: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  hotelLineBold: {
    color: Colors.text,
    fontWeight: '800',
  },

  roomCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  roomCardRecommended: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  recBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  recBannerText: {
    ...Typography.caption,
    color: '#fff',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.3,
  },
  rcBody: {
    padding: Spacing.md,
  },
  rcTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  rcTopText: {
    flex: 1,
  },
  rcName: {
    ...Typography.h3,
    color: Colors.text,
  },
  rcSpecs: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 3,
  },
  rcPhoto: {
    width: 72,
    height: 56,
    borderRadius: Radius.sm,
  },
  rcChips: {
    flexDirection: 'row',
    gap: 6,
    marginTop: Spacing.sm,
  },
  rcChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  rcChipText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 11,
  },
  rcCancel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: Spacing.sm,
  },
  rcCancelText: {
    ...Typography.caption,
    fontWeight: '600',
    fontSize: 12,
  },
  rcFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    padding: Spacing.md,
  },
  rcPrice: {
    ...Typography.h3,
    color: Colors.primary,
  },
  rcPriceUnit: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '400',
  },
  rcTotal: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  rcBookBtn: {
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  rcBookBtnOutline: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  rcBookGradient: {
    paddingHorizontal: Spacing.md + 2,
    paddingVertical: Spacing.sm + 2,
  },
  rcBookText: {
    ...Typography.caption,
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
  rcBookTextOutline: {
    color: Colors.primary,
    paddingHorizontal: Spacing.md + 2,
    paddingVertical: Spacing.sm + 2,
  },
})
