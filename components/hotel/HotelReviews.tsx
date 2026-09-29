import React, { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { fetchHotelReviews, type HotelReviews as Reviews } from '../../lib/hotels'
import { useLang } from '../../lib/i18n'
import { Colors, Spacing, Radius, Typography } from '../../constants/theme'

// Guest reviews section on the hotel page (Ray, 2026-09-29): RateHawk's own
// guest rating, category scores and a few reviews. Hidden when the hotel has
// none. Review text is guest-written: shown as plain text (never
// FormattedText, so links/markdown don't render) and without author names.
// Reviews arrive in their original language (mostly English).

const CATEGORY_KEYS = ['cleanness', 'location', 'price', 'services', 'room', 'meal', 'wifi', 'hygiene'] as const
const COLLAPSED_COUNT = 3

export function HotelReviews({ hotelId }: { hotelId: string }) {
  const { t } = useLang()
  const [data, setData] = useState<Reviews | null>(null)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchHotelReviews(hotelId).then(r => { if (!cancelled) setData(r) })
    return () => { cancelled = true }
  }, [hotelId])

  if (!data || (data.rating == null && data.reviews.length === 0)) return null

  const categories = CATEGORY_KEYS
    .map(k => [k, data.detailed_ratings?.[k]] as const)
    .filter((e): e is readonly [typeof CATEGORY_KEYS[number], number] => typeof e[1] === 'number')
  const shown = showAll ? data.reviews : data.reviews.slice(0, COLLAPSED_COUNT)

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t.hotel.guestReviews}</Text>

      {data.rating != null && (
        <View style={styles.scoreRow}>
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreText}>{data.rating.toFixed(1)}</Text>
          </View>
          <Text style={styles.scoreMeta}>
            / 10{data.review_count > 0 ? ` · ${t.hotel.reviewsCount.replace('{{count}}', String(data.review_count))}` : ''} · RateHawk
          </Text>
        </View>
      )}

      {categories.length > 0 && (
        <View style={styles.chips}>
          {categories.map(([k, v]) => (
            <View key={k} style={styles.chip}>
              <Text style={styles.chipText}>{t.hotel.reviewCategories[k]} {v.toFixed(1)}</Text>
            </View>
          ))}
        </View>
      )}

      {shown.map((r, i) => (
        <View key={r.id ?? i} style={styles.review}>
          <Text style={styles.reviewMeta}>
            {r.rating != null ? `${r.rating}/10` : ''}{r.created ? `${r.rating != null ? ' · ' : ''}${String(r.created).slice(0, 7)}` : ''}
          </Text>
          {r.review_plus ? (
            <View style={styles.reviewLine}>
              <Ionicons name="thumbs-up-outline" size={13} color={Colors.success} />
              <Text style={styles.reviewText}>{r.review_plus}</Text>
            </View>
          ) : null}
          {r.review_minus ? (
            <View style={styles.reviewLine}>
              <Ionicons name="thumbs-down-outline" size={13} color={Colors.error} />
              <Text style={styles.reviewText}>{r.review_minus}</Text>
            </View>
          ) : null}
        </View>
      ))}

      {data.reviews.length > COLLAPSED_COUNT && (
        <TouchableOpacity onPress={() => setShowAll(v => !v)} activeOpacity={0.7}>
          <Text style={styles.toggle}>
            {showAll ? t.hotel.showFewerReviews : t.hotel.seeAllReviews.replace('{{count}}', String(data.reviews.length))}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: Spacing.md, paddingTop: Spacing.lg },
  sectionTitle: { ...Typography.h3, color: Colors.text, marginBottom: Spacing.sm },
  scoreRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  scoreBadge: { backgroundColor: Colors.primary, borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs },
  scoreText: { ...Typography.bodyMedium, color: Colors.surface, fontWeight: '700' },
  scoreMeta: { ...Typography.caption, color: Colors.textSecondary, marginLeft: Spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.sm },
  chip: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs },
  chipText: { ...Typography.caption, color: Colors.text },
  review: { borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingVertical: Spacing.sm },
  reviewMeta: { ...Typography.caption, color: Colors.textSecondary, marginBottom: Spacing.xs },
  reviewLine: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.xs, marginBottom: Spacing.xs },
  reviewText: { ...Typography.body, color: Colors.text, flex: 1 },
  toggle: { ...Typography.bodyMedium, color: Colors.primary, paddingVertical: Spacing.sm },
})
