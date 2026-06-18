import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import type { Hotel } from '../../lib/types'
import { Colors, Spacing, Radius } from '../../constants/theme'

interface Props {
  hotel: Hotel
  nights: number
}

function Stars({ count }: { count: number }) {
  return (
    <Text style={{ color: Colors.star, fontSize: 12 }}>
      {'★'.repeat(count)}{'☆'.repeat(Math.max(0, 5 - count))}
    </Text>
  )
}

export function HotelCard({ hotel, nights }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{hotel.name}</Text>
          <Stars count={hotel.stars} />
          <Text style={styles.address} numberOfLines={1}>{hotel.address}</Text>
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

      <TouchableOpacity style={styles.bookBtn} activeOpacity={0.8}>
        <Text style={styles.bookText}>View Hotel</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
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
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  address: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  priceBox: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
  },
  perNight: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  total: {
    fontSize: 12,
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
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '500',
  },
  bookBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm + 2,
    alignItems: 'center',
  },
  bookText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
})
