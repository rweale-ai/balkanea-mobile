import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import type { TripPlan, Hotel } from '../../lib/types'
import { HotelCard } from './HotelCard'
import { Colors, Spacing, Radius } from '../../constants/theme'

interface Props {
  plan: TripPlan
  hotels: Hotel[]
}

const ACTIVITY_ICONS: Record<string, string> = {
  sightseeing: '🏛️',
  food:        '🍽️',
  adventure:   '🧗',
  relaxation:  '🌊',
  culture:     '🎭',
  transport:   '🚌',
}

export function TripCard({ plan, hotels }: Props) {
  const [expanded, setExpanded] = useState(false)
  const nights = plan.hotelSearch
    ? Math.round((new Date(plan.hotelSearch.checkout).getTime() - new Date(plan.hotelSearch.checkin).getTime()) / 86400000)
    : plan.duration

  return (
    <View style={styles.wrapper}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{plan.title}</Text>
        <View style={styles.meta}>
          <View style={styles.badge}><Text style={styles.badgeText}>{plan.duration} days</Text></View>
          <View style={styles.badge}><Text style={styles.badgeText}>{plan.destination}</Text></View>
          <View style={styles.badge}><Text style={styles.badgeText}>€{plan.estimatedBudget.perPersonPerNight}/night</Text></View>
        </View>
        <Text style={styles.summary}>{plan.summary}</Text>
      </View>

      {/* Day-by-day itinerary */}
      <TouchableOpacity style={styles.toggleBtn} onPress={() => setExpanded(!expanded)}>
        <Text style={styles.toggleText}>{expanded ? '▲ Hide itinerary' : '▼ View day-by-day itinerary'}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.itinerary}>
          {plan.days.map(day => (
            <View key={day.day} style={styles.dayCard}>
              <Text style={styles.dayLabel}>Day {day.day} — {day.title}</Text>
              <Text style={styles.dayDesc}>{day.description}</Text>
              {day.activities.map((a, i) => (
                <View key={i} style={styles.activity}>
                  <Text style={styles.activityIcon}>{ACTIVITY_ICONS[a.type] ?? '📍'}</Text>
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityName}>{a.name}{a.duration ? ` · ${a.duration}` : ''}</Text>
                    <Text style={styles.activityDesc}>{a.description}</Text>
                  </View>
                </View>
              ))}
            </View>
          ))}
        </View>
      )}

      {/* Tips */}
      {plan.tips.length > 0 && (
        <View style={styles.tips}>
          <Text style={styles.tipsTitle}>✈️ Travel Tips</Text>
          {plan.tips.map((tip, i) => (
            <Text key={i} style={styles.tipText}>• {tip}</Text>
          ))}
        </View>
      )}

      {/* Hotels */}
      {hotels.length > 0 && (
        <View style={styles.hotels}>
          <Text style={styles.hotelsTitle}>🏨 Suggested Hotels</Text>
          {hotels.map(h => (
            <HotelCard key={h.hotel_id} hotel={h} nights={nights} />
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  header: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: Spacing.sm,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  summary: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    lineHeight: 20,
  },
  toggleBtn: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  toggleText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  itinerary: {
    marginBottom: Spacing.sm,
  },
  dayCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
  },
  dayDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  activity: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  activityIcon: {
    fontSize: 16,
    marginRight: 8,
    marginTop: 1,
  },
  activityInfo: {
    flex: 1,
  },
  activityName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  activityDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  tips: {
    backgroundColor: '#FFF8E7',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  tipText: {
    fontSize: 13,
    color: Colors.text,
    lineHeight: 20,
    marginBottom: 4,
  },
  hotels: {
    marginTop: Spacing.sm,
  },
  hotelsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
})
