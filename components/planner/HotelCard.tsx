import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import type { Hotel } from '../../lib/types'
import { Colors, Spacing, Radius, Typography, Shadows, Gradients } from '../../constants/theme'

interface Props {
  hotel: Hotel
  nights: number
}

function Stars({ count }: { count: number }) {
  const stars = []
  for (let i = 0; i < 5; i++) {
    stars.push(
      <View
        key={i}
        style={[styles.starDot, i < count ? styles.starFilled : styles.starEmpty]}
      />
    )
  }
  return <View style={styles.starsRow}>{stars}</View>
}

export function HotelCard({ hotel, nights }: Props) {
  return (
    <View style={styles.card}>
      <LinearGradient
        colors={Gradients.primaryLight}
        style={styles.imagePlaceholder}
      >
        <Text style={styles.placeholderText}>{hotel.name.charAt(0)}</Text>
      </LinearGradient>

      <View style={styles.body}>
        <View style={styles.header}>
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>{hotel.name}</Text>
            <Stars count={hotel.stars} />
            <Text style={styles.address} numberOfLines={1}>{hotel.address}</Text>
          </View>
          <View style={styles.priceBox}>
            <Text style={styles.price}>{'€'}{hotel.price_per_night}</Text>
            <Text style={styles.perNight}>/night</Text>
            <Text style={styles.total}>{'€'}{hotel.total_price} total</Text>
          </View>
        </View>

        <View style={styles.amenities}>
          {hotel.amenities.slice(0, 4).map(a => (
            <View key={a} style={styles.tag}>
              <Text style={styles.tagText}>{a}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity activeOpacity={0.8}>
          <LinearGradient
            colors={Gradients.primaryFade}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.bookBtn}
          >
            <Text style={styles.bookText}>View Hotel</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
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
  imagePlaceholder: {
    height: 80,
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
  starsRow: {
    flexDirection: 'row',
    gap: 3,
    marginBottom: 4,
  },
  starDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  starFilled: {
    backgroundColor: Colors.star,
  },
  starEmpty: {
    backgroundColor: Colors.border,
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
    marginBottom: Spacing.md,
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
