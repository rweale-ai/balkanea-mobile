import React, { useState, useMemo, useEffect, useRef } from 'react'
import {
  View, Text, ScrollView, Image, TouchableOpacity,
  StyleSheet, SafeAreaView, Share, Platform, NativeSyntheticEvent, NativeScrollEvent, Dimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { searchHotelsSync } from '../lib/hotels'
import { useLang } from '../lib/i18n'
import { Colors, Spacing, Radius, Typography, Shadows, Gradients } from '../constants/theme'
import type { Hotel, HotelSearchParams } from '../lib/types'
import { trackViewedHotel } from '../lib/session-store'
import { NeaBottomSheet } from '../components/hotel/NeaBottomSheet'

export default function HotelDetailScreen() {
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

  const [neaSheetVisible, setNeaSheetVisible] = useState(false)
  const [photoIndex, setPhotoIndex] = useState(0)
  const photoScrollRef = useRef<ScrollView>(null)

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

  const searchParams = useMemo<HotelSearchParams>(() => ({
    destination: params.destination || '',
    checkin: params.checkin || '',
    checkout: params.checkout || '',
    adults: parseInt(params.adults || '2', 10),
    children: parseInt(params.children || '0', 10),
    rooms: parseInt(params.rooms || '1', 10),
    currency: params.currency || 'EUR',
  }), [params.destination, params.checkin, params.checkout, params.adults, params.children, params.rooms, params.currency])

  // Track this hotel in session memory for Nea's compare feature
  useEffect(() => {
    if (hotel) trackViewedHotel(hotel, searchParams)
  }, [hotel?.hotel_id])

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

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${hotel.name} - ${currencySymbol}${hotel.price_per_night}/night`,
      })
    } catch (e) {
      // ignore
    }
  }

  const handleSelectRoom = () => {
    router.push({
      pathname: '/room-selection',
      params: {
        hotelId: hotel.hotel_id,
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
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Photo Carousel */}
        <View style={styles.heroContainer}>
          <ScrollView
            ref={photoScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / Dimensions.get('window').width)
              if (idx !== photoIndex) setPhotoIndex(idx)
            }}
            scrollEventThrottle={32}
          >
            {hotel.images.map((uri, i) => (
              <Image
                key={i}
                source={{ uri }}
                style={styles.heroImage}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
          <LinearGradient
            colors={Gradients.heroOverlay}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <SafeAreaView style={styles.heroOverlay} pointerEvents="box-none">
            <View style={styles.heroTopRow}>
              <TouchableOpacity style={styles.heroButton} onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={22} color="#fff" />
              </TouchableOpacity>
              <View style={styles.heroTopRight}>
                {hotel.images.length > 1 && (
                  <View style={styles.photoCount}>
                    <Text style={styles.photoCountText}>{photoIndex + 1} / {hotel.images.length}</Text>
                  </View>
                )}
                <TouchableOpacity style={styles.heroButton} onPress={handleShare}>
                  <Ionicons name="share-outline" size={22} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
          {hotel.images.length > 1 && (
            <View style={styles.photoDots}>
              {hotel.images.map((_, i) => (
                <View key={i} style={[styles.photoDot, i === photoIndex && styles.photoDotActive]} />
              ))}
            </View>
          )}
        </View>

        {/* Hotel Info */}
        <View style={styles.section}>
          <Text style={styles.hotelName}>{hotel.name}</Text>

          <View style={styles.ratingRow}>
            <View style={styles.starsRow}>
              {Array.from({ length: hotel.stars }).map((_, i) => (
                <View key={i} style={styles.starDot} />
              ))}
            </View>
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>{hotel.guest_rating}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.infoText}>{hotel.address}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="navigate-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.infoText}>{t.hotel.kmFromCentre.replace('{{distance}}', String(hotel.distance_to_center))}</Text>
          </View>

          <View style={styles.dateRow}>
            <View style={styles.dateChip}>
              <Ionicons name="calendar-outline" size={14} color={Colors.primary} />
              <Text style={styles.dateText}>{params.checkin} - {params.checkout}</Text>
            </View>
            <View style={styles.dateChip}>
              <Ionicons name="moon-outline" size={14} color={Colors.primary} />
              <Text style={styles.dateText}>{nights} night{nights !== 1 ? 's' : ''}</Text>
            </View>
          </View>
        </View>

        {/* Amenities */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.hotel.amenities}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.amenitiesScroll}>
            {hotel.amenities.map((amenity, i) => (
              <View key={i} style={styles.amenityChip}>
                <Ionicons
                  name={getAmenityIcon(amenity)}
                  size={14}
                  color={Colors.primary}
                />
                <Text style={styles.amenityText}>{amenity}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Ask Nea about reviews */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.reviewsBtn}
            activeOpacity={0.8}
            onPress={() => setNeaSheetVisible(true)}
          >
            <LinearGradient colors={['#FFF4E8', '#FFF8F2'] as const} style={styles.reviewsBtnInner}>
              <Ionicons name="sparkles" size={16} color={Colors.primary} />
              <Text style={styles.reviewsBtnText}>{t.hotel.askNeaAbout}</Text>
              <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Cancellation Policy */}
        <View style={styles.section}>
          <View style={styles.policyBanner}>
            <Ionicons
              name={hotel.cancellation_policy.toLowerCase().includes('free') ? 'checkmark-circle' : 'information-circle'}
              size={20}
              color={hotel.cancellation_policy.toLowerCase().includes('free') ? Colors.success : Colors.accent}
            />
            <View style={styles.policyContent}>
              <Text style={styles.policyLabel}>{t.hotel.cancellationPolicy}</Text>
              <Text style={styles.policyText}>{hotel.cancellation_policy}</Text>
            </View>
          </View>
        </View>

        {/* Room Selection */}
        <TouchableOpacity style={styles.section} onPress={handleSelectRoom} activeOpacity={0.8}>
          <Text style={styles.sectionTitle}>{t.hotel.selectRoom}</Text>
          <View style={styles.roomTeaser}>
            <View style={styles.roomTeaserText}>
              <Text style={styles.roomTeaserCount}>
                {hotel.room_types.length} {hotel.room_types.length === 1 ? 'room type' : 'room types'} available
              </Text>
              <Text style={styles.roomTeaserFrom}>
                {t.hotel.fromPrice} {currencySymbol}{hotel.price_per_night} {t.hotel.perNight}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
          </View>
        </TouchableOpacity>

        {/* Bottom spacer for fixed button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Fixed Select Room Button */}
      <View style={styles.bookBar}>
        <TouchableOpacity
          style={styles.bookButton}
          onPress={handleSelectRoom}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={Gradients.primaryFade}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.bookGradient}
          >
            <Ionicons name="bed-outline" size={20} color="#fff" />
            <Text style={styles.bookButtonText}>{t.hotel.selectRoom}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <NeaBottomSheet
        hotel={hotel}
        searchParams={searchParams}
        visible={neaSheetVisible}
        onClose={() => setNeaSheetVisible(false)}
      />
    </View>
  )
}

function getAmenityIcon(amenity: string): keyof typeof Ionicons.glyphMap {
  const lower = amenity.toLowerCase()
  if (lower.includes('wifi')) return 'wifi'
  if (lower.includes('pool')) return 'water'
  if (lower.includes('spa')) return 'flower'
  if (lower.includes('restaurant') || lower.includes('food')) return 'restaurant'
  if (lower.includes('fitness') || lower.includes('gym')) return 'barbell'
  if (lower.includes('parking')) return 'car'
  if (lower.includes('beach')) return 'umbrella'
  if (lower.includes('bar')) return 'wine'
  if (lower.includes('air')) return 'snow'
  if (lower.includes('room service')) return 'bed-outline'
  if (lower.includes('city') || lower.includes('centre')) return 'business'
  if (lower.includes('breakfast')) return 'cafe'
  if (lower.includes('concierge')) return 'person'
  if (lower.includes('sea') || lower.includes('view')) return 'eye'
  if (lower.includes('all-inclusive')) return 'star'
  if (lower.includes('kids')) return 'happy'
  if (lower.includes('mountain')) return 'triangle'
  if (lower.includes('terrace')) return 'sunny'
  if (lower.includes('garden')) return 'leaf'
  return 'checkmark-circle'
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.md,
  },

  /* Empty state */
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

  /* Hero */
  heroContainer: {
    height: 280,
    width: '100%',
  },
  heroImage: {
    width: Dimensions.get('window').width,
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-start',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Platform.OS === 'android' ? Spacing.xl : Spacing.sm,
  },
  heroTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  heroButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoCount: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 6,
  },
  photoCountText: {
    ...Typography.caption,
    color: '#fff',
    fontWeight: '700',
  },
  photoDots: {
    position: 'absolute',
    bottom: Spacing.sm,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  photoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  photoDotActive: {
    width: 16,
    backgroundColor: '#fff',
  },

  /* Hotel info */
  section: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
  },
  hotelName: {
    ...Typography.h1,
    color: Colors.text,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  starDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.star,
  },
  ratingBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  ratingText: {
    ...Typography.caption,
    color: '#fff',
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
    gap: Spacing.xs,
  },
  infoText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  dateRow: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    gap: 4,
  },
  dateText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '500',
  },

  /* Amenities */
  sectionTitle: {
    ...Typography.h3,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  amenitiesScroll: {
    marginHorizontal: -Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 4,
    ...Shadows.sm,
  },
  amenityText: {
    ...Typography.caption,
    color: Colors.text,
  },

  /* Policy */
  policyBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  policyContent: {
    flex: 1,
  },
  policyLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  policyText: {
    ...Typography.body,
    color: Colors.text,
    marginTop: 2,
  },

  /* Room teaser */
  roomTeaser: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  roomTeaserText: {
    flex: 1,
  },
  roomTeaserCount: {
    ...Typography.bodyMedium,
    color: Colors.text,
    fontWeight: '700',
  },
  roomTeaserFrom: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  /* Reviews button */
  reviewsBtn: {
    borderRadius: Radius.md,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  reviewsBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
  },
  reviewsBtnText: {
    ...Typography.bodyMedium,
    color: Colors.primary,
    fontWeight: '700',
    flex: 1,
  },

  /* Book bar */
  bookBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? Spacing.xl : Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    ...Shadows.lg,
  },
  bookButton: {
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  bookGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  bookButtonText: {
    ...Typography.button,
    color: '#fff',
    fontSize: 17,
  },
})
