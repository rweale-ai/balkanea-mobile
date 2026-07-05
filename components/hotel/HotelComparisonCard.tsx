import React from 'react'
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import type { Hotel } from '../../lib/types'
import { useLang } from '../../lib/i18n'
import { Colors, Spacing, Radius, Typography, Shadows, Gradients } from '../../constants/theme'

interface Props {
  hotelA: Hotel
  hotelB: Hotel
  nights: number
  currency: string
  verdict: string
  loadingVerdict?: boolean
  onBook: (hotel: Hotel) => void
}

function currencySymbol(code: string): string {
  return code === 'EUR' ? '€' : code === 'USD' ? '$' : code === 'GBP' ? '£' : code
}

function Row({ label, a, b, winnerIsA, winnerIsB }: {
  label: string
  a: string
  b: string
  winnerIsA?: boolean
  winnerIsB?: boolean
}) {
  return (
    <>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.row}>
        <Text style={[styles.cell, winnerIsA && styles.cellWin]}>{a}</Text>
        <Text style={[styles.cell, styles.cellRight, winnerIsB && styles.cellWin]}>{b}</Text>
      </View>
    </>
  )
}

export function HotelComparisonCard({ hotelA, hotelB, nights, currency, verdict, loadingVerdict, onBook }: Props) {
  const { t } = useLang()
  const sym = currencySymbol(currency)

  const cheaperA = hotelA.total_price < hotelB.total_price
  const cheaperB = hotelB.total_price < hotelA.total_price
  const closerA = hotelA.distance_to_center < hotelB.distance_to_center
  const closerB = hotelB.distance_to_center < hotelA.distance_to_center
  const freeA = hotelA.cancellation_policy.toLowerCase().includes('free')
  const freeB = hotelB.cancellation_policy.toLowerCase().includes('free')

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="swap-horizontal" size={13} color={Colors.primary} />
        <Text style={styles.headerText}>
          {t.hotel.comparisonTitle} · {nights}{nights === 1 ? ' night' : ' nights'}
        </Text>
      </View>

      <View style={styles.hotelsRow}>
        {[hotelA, hotelB].map((h, i) => (
          <View key={h.hotel_id} style={[styles.hotelCol, i === 0 && styles.hotelColBorder]}>
            <Image source={{ uri: h.images[0] }} style={styles.photo} resizeMode="cover" />
            <Text style={styles.hotelName} numberOfLines={2}>{h.name}</Text>
            <View style={styles.ratingPill}>
              <Ionicons name="star" size={10} color={Colors.primary} />
              <Text style={styles.ratingText}>{h.guest_rating}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.rows}>
        <Row
          label={t.hotel.priceLabel.replace('{{nights}}', String(nights))}
          a={`${sym}${hotelA.price_per_night}/night\n${sym}${hotelA.total_price} total`}
          b={`${sym}${hotelB.price_per_night}/night\n${sym}${hotelB.total_price} total`}
          winnerIsA={cheaperA}
          winnerIsB={cheaperB}
        />
        <Row
          label={t.hotel.locationLabel}
          a={`${hotelA.address}\n${hotelA.distance_to_center}km ${t.hotel.distanceCenter}`}
          b={`${hotelB.address}\n${hotelB.distance_to_center}km ${t.hotel.distanceCenter}`}
          winnerIsA={closerA}
          winnerIsB={closerB}
        />
        <Row
          label={t.hotel.mealsLabel}
          a={hotelA.meal_plan}
          b={hotelB.meal_plan}
        />
        <Row
          label={t.hotel.cancellationLabel}
          a={hotelA.cancellation_policy}
          b={hotelB.cancellation_policy}
          winnerIsA={freeA && !freeB}
          winnerIsB={freeB && !freeA}
        />
      </View>

      <View style={styles.verdictBox}>
        <Text style={styles.verdictText}>
          💡 <Text style={styles.verdictLabel}>{t.hotel.neaVerdict}</Text>{' '}
          {loadingVerdict ? '…' : verdict}
        </Text>
      </View>

      <View style={styles.ctas}>
        <TouchableOpacity style={styles.ctaBtn} onPress={() => onBook(hotelA)} activeOpacity={0.85}>
          <LinearGradient colors={Gradients.primaryFade} style={styles.ctaGradient}>
            <Text style={styles.ctaText} numberOfLines={1}>{t.hotel.bookThisHotel} {hotelA.name.split(' ')[0]}</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.ctaBtn, styles.ctaBtnOutline]} onPress={() => onBook(hotelB)} activeOpacity={0.85}>
          <Text style={[styles.ctaText, styles.ctaTextOutline]} numberOfLines={1}>{t.hotel.bookThisHotel} {hotelB.name.split(' ')[0]}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginLeft: 34,
    marginBottom: Spacing.sm,
    ...Shadows.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  headerText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '800',
    fontSize: 11,
  },
  hotelsRow: {
    flexDirection: 'row',
  },
  hotelCol: {
    flex: 1,
    padding: Spacing.sm + 2,
    alignItems: 'center',
  },
  hotelColBorder: {
    borderRightWidth: 1,
    borderRightColor: Colors.borderLight,
  },
  photo: {
    width: '100%',
    height: 56,
    borderRadius: Radius.sm,
    marginBottom: 6,
  },
  hotelName: {
    ...Typography.caption,
    color: Colors.text,
    fontWeight: '800',
    textAlign: 'center',
    fontSize: 12,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 4,
  },
  ratingText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '800',
    fontSize: 11,
  },
  rows: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  rowLabel: {
    backgroundColor: Colors.background,
    ...Typography.caption,
    color: Colors.textLight,
    fontWeight: '700',
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  cell: {
    flex: 1,
    ...Typography.caption,
    color: Colors.text,
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm - 1,
    borderRightWidth: 1,
    borderRightColor: Colors.borderLight,
  },
  cellRight: {
    borderRightWidth: 0,
  },
  cellWin: {
    color: Colors.success,
    fontWeight: '700',
  },
  verdictBox: {
    backgroundColor: Colors.primaryLight,
    margin: Spacing.sm + 2,
    borderRadius: Radius.md,
    padding: Spacing.sm + 2,
  },
  verdictText: {
    ...Typography.caption,
    color: Colors.text,
    fontSize: 12,
    lineHeight: 18,
  },
  verdictLabel: {
    color: Colors.primary,
    fontWeight: '800',
  },
  ctas: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm + 2,
    paddingBottom: Spacing.sm + 2,
  },
  ctaBtn: {
    flex: 1,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  ctaBtnOutline: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  ctaGradient: {
    paddingVertical: Spacing.sm + 2,
    alignItems: 'center',
  },
  ctaText: {
    ...Typography.caption,
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
  },
  ctaTextOutline: {
    color: Colors.primary,
    paddingVertical: Spacing.sm + 2,
    textAlign: 'center',
  },
})
