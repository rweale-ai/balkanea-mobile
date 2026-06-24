import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import type { Hotel } from '../../lib/types'
import { Colors, Spacing, Radius, Typography, Shadows, Gradients } from '../../constants/theme'

interface Props {
  hotel: Hotel
  nights: number
  onPress?: () => void
}

function Stars({ count }: { count: number }) {
  const stars = []
  for (let i = 0; i < 5; i++) {
    stars.push(
      <Ionicons
        key={i}
        name={i < count ? 'star' : 'star-outline'}
        size={12}
        color={i < count ? Colors.star : Colors.border}
      />
    )
  }
  return <View style={styles.starsRow}>{stars}</View>
}

export function HotelCard({ hotel, nights, onPress }: Props) {
  const hasImage = hotel.images && hotel.images.length > 0

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={onPress}>
      {hasImage ? (
        <Image source={{ uri: hotel.images[0] }} style={styles.image} resizeMode="cover" />
      ) : (
        <LinearGradient colors={Gradients.primaryLight} style={styles.image}>
          <Text style={styles.placeholderText}>{hotel.name.charAt(0)}</Text>
        </LinearGradient>
      )}

      <View style={styles.body}>
        <View style={styles.header}>
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>{hotel.name}</Text>
            <View style={styles.ratingRow}>
              <Stars count={hotel.stars} />
              {hotel.guest_rating > 0 && (
                <View style={styles.guestRating}>
                  <Text style={styles.guestRatingText}>{hotel.guest_rating.toFixed(1)}</Text>
                </View>
              )}
            </View>
            <Text style={styles.address} numberOfLines={1}>
              {hotel.address}
              {hotel.distance_to_center > 0 && ` · ${hotel.distance_to_center} km to centre`}
            </Text>
          </View>
          <View style={styles.priceBox}>
            <Text style={styles.price}>€{hotel.price_per_night}</Text>
            <Text style={styles.perNight}>/night</Text>
            <Text style={styles.total}>€{hotel.total_price} total</Text>
          </View>
        </View>

        <View style={styles.amenities}>
          {hotel.amenities.slice(0, 4).map(a => (
            <View key={a} style={styles.tag}>
              <Text style={styles.tagText}>{a}</Text>
            </View>
          ))}
        </View>

        <View style={styles.policyRow}>
          <Ionicons name="shield-checkmark-outline" size={12} color={Colors.success} />
          <Text style={styles.policyText} numberOfLines={1}>{hotel.cancellation_policy}</Text>
        </View>

        <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
          <LinearGradient
            colors={Gradients.primaryFade}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.bookBtn}
          >
            <Text style={styles.bookText}>View Rooms & Book</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    ...Shadows.md,
  },
  image: {
    height: 120,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    ...Typography.hero,
    color: Colors.primary,
    opacity: 0.2,
  },
  body: {
    padding: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  info: {
    flex: 1,
    marginRight: Spacing.md,
  },
  name: {
    ...Typography.h3,
    color: Colors.text,
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  guestRating: {
    backgroundColor: Colors.primary,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  guestRatingText: {
    ...Typography.caption,
    color: '#fff',
    fontWeight: '700',
    fontSize: 11,
  },
  address: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  priceBox: {
    alignItems: 'flex-end',
  },
  price: {
    ...Typography.h2,
    color: Colors.accent,
  },
  perNight: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  total: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  amenities: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: Spacing.sm,
  },
  tag: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '500',
    fontSize: 11,
  },
  policyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.sm,
  },
  policyText: {
    ...Typography.caption,
    color: Colors.success,
    fontSize: 11,
  },
  bookBtn: {
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm + 2,
    alignItems: 'center',
  },
  bookText: {
    color: '#fff',
    ...Typography.button,
  },
})
