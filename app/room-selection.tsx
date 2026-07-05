import React, { useMemo } from 'react'
import {
  View, Text, ScrollView, Image, TouchableOpacity,
  StyleSheet, SafeAreaView, Platform,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { searchHotelsSync } from '../lib/hotels'
import { useLang } from '../lib/i18n'
import { Colors, Spacing, Radius, Typography, Shadows, Gradients } from '../constants/theme'
import type { Hotel, RoomType } from '../lib/types'

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
    currency: string
    destination: string
  }>()

  const hotel = useMemo<Hotel | null>(() => {
    if (!params.hotelId || !params.checkin || !params.checkout) return null
    const results = searchHotelsSync({
      destination: params.destination || 'Hotel',
      checkin: params.checkin,
      checkout: params.checkout,
      adults: parseInt(params.adults || '2', 10),
      children: parseInt(params.children || '0', 10),
      rooms: parseInt(params.rooms || '1', 10),
      currency: params.currency || 'EUR',
    })
    return results.find(h => h.hotel_id === params.hotelId) || null
  }, [params.hotelId, params.checkin, params.checkout, params.destination, params.adults, params.children, params.rooms, params.currency])

  const nights = useMemo(() => {
    if (!params.checkin || !params.checkout) return 1
    return Math.max(1, Math.round(
      (new Date(params.checkout).getTime() - new Date(params.checkin).getTime()) / 86400000
    ))
  }, [params.checkin, params.checkout])

  const currencySymbol = (params.currency || 'EUR') === 'EUR' ? '€'
    : (params.currency || 'EUR') === 'USD' ? '$'
    : (params.currency || 'EUR') === 'GBP' ? '£'
    : params.currency || 'EUR'

  const recommendedRoomId = useMemo(() => {
    if (!hotel) return null
    const freeCancel = hotel.room_types.filter(r =>
      r.cancellation.toLowerCase().includes('free')
    )
    if (freeCancel.length === 0) return hotel.room_types[0]?.room_id ?? null
    const sorted = [...freeCancel].sort((a, b) => a.price_per_night - b.price_per_night)
    return sorted[Math.floor(sorted.length / 2)].room_id
  }, [hotel])

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

  const handleBookRoom = (room: RoomType) => {
    router.push({
      pathname: '/booking',
      params: {
        hotelId: hotel.hotel_id,
        roomId: room.room_id,
        checkin: params.checkin,
        checkout: params.checkout,
        adults: params.adults,
        children: params.children,
        rooms: params.rooms,
        currency: params.currency || 'EUR',
        destination: params.destination || '',
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
            <Text style={styles.ctxPillText}>{params.adults || '2'} adults</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.hotelLine}>
          <Text style={styles.hotelLineBold}>{hotel.name}</Text> · {hotel.address.split(',')[0]} · ★ {hotel.guest_rating}
        </Text>

        {hotel.room_types.map(room => {
          const isRecommended = room.room_id === recommendedRoomId
          const isFree = room.cancellation.toLowerCase().includes('free')
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
                  <Ionicons name={isFree ? 'checkmark-circle' : 'close-circle'} size={13} color={isFree ? Colors.success : Colors.error} />
                  <Text style={[styles.rcCancelText, { color: isFree ? Colors.success : Colors.error }]}>
                    {isFree ? t.roomSelect.freeCancelUntil.replace('{{date}}', room.cancellation.replace(/^Free cancellation until\s*/i, '')) : t.roomSelect.nonRefundable}
                  </Text>
                </View>
              </View>

              <View style={styles.rcFooter}>
                <View>
                  <Text style={styles.rcPrice}>
                    {currencySymbol}{room.price_per_night}<Text style={styles.rcPriceUnit}> {t.hotel.perNight}</Text>
                  </Text>
                  <Text style={styles.rcTotal}>{currencySymbol}{room.total_price} {t.hotel.total.toLowerCase()}</Text>
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
