import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import type { TripPlan, Hotel } from '../../lib/types'
import { HotelCard } from './HotelCard'
import { Colors, Spacing, Radius, Typography, Shadows, Gradients } from '../../constants/theme'

interface Props {
  plan: TripPlan
  hotels: Hotel[]
  onSave?: (plan: TripPlan) => void
}

const ACTIVITY_ICONS: Record<string, string> = {
  sightseeing: '🏛️',
  food:        '🍽️',
  adventure:   '🧗',
  relaxation:  '🌊',
  culture:     '🎭',
  transport:   '🚌',
}

const DAY_COLORS = [
  Colors.primary,
  Colors.accent,
  '#6366F1',
  '#EC4899',
  '#14B8A6',
  '#8B5CF6',
  '#F97316',
]

export function TripCard({ plan, hotels, onSave }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    if (!saved) { onSave?.(plan); setSaved(true) }
  }
  const nights = plan.hotelSearch
    ? Math.round((new Date(plan.hotelSearch.checkout).getTime() - new Date(plan.hotelSearch.checkin).getTime()) / 86400000)
    : plan.duration

  return (
    <View style={styles.wrapper}>
      <LinearGradient
        colors={Gradients.primaryFade}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.title}>{plan.title}</Text>
        <View style={styles.meta}>
          <View style={styles.badge}><Text style={styles.badgeText}>{plan.duration} days</Text></View>
          <View style={styles.badge}><Text style={styles.badgeText}>{plan.destination}</Text></View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{'€'}{plan.estimatedBudget.perPersonPerNight}/night</Text>
          </View>
        </View>
        <Text style={styles.summary}>{plan.summary}</Text>

        {onSave && (
          <TouchableOpacity
            onPress={handleSave}
            activeOpacity={0.8}
            disabled={saved}
          >
            <LinearGradient
              colors={saved ? ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)'] : Gradients.accentFade}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.saveBtn, saved && styles.saveBtnDone]}
            >
              <Text style={styles.saveBtnText}>{saved ? '✓ Saved to My Trips' : '+ Save to My Trips'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </LinearGradient>

      <TouchableOpacity style={styles.toggleBtn} onPress={() => setExpanded(!expanded)} activeOpacity={0.7}>
        <Text style={styles.toggleText}>{expanded ? '▲ Hide itinerary' : '▼ View day-by-day itinerary'}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.itinerary}>
          {plan.days.map((day, idx) => (
            <View
              key={day.day}
              style={[styles.dayCard, { borderLeftColor: DAY_COLORS[idx % DAY_COLORS.length] }]}
            >
              <Text style={[styles.dayLabel, { color: DAY_COLORS[idx % DAY_COLORS.length] }]}>
                Day {day.day} — {day.title}
              </Text>
              <Text style={styles.dayDesc}>{day.description}</Text>
              {day.activities.map((a, i) => (
                <View key={i} style={styles.activity}>
                  <View style={[styles.activityIconWrap, { backgroundColor: `${DAY_COLORS[idx % DAY_COLORS.length]}15` }]}>
                    <Text style={styles.activityIcon}>{ACTIVITY_ICONS[a.type] ?? '📍'}</Text>
                  </View>
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

      {plan.tips.length > 0 && (
        <View style={styles.tips}>
          <Text style={styles.tipsTitle}>Travel Tips</Text>
          {plan.tips.map((tip, i) => (
            <Text key={i} style={styles.tipText}>• {tip}</Text>
          ))}
        </View>
      )}

      {hotels.length > 0 && (
        <View style={styles.hotels}>
          <Text style={styles.hotelsTitle}>Suggested Hotels</Text>
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
    ...Shadows.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
  },
  header: {
    padding: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  title: {
    ...Typography.h2,
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
    paddingVertical: 4,
  },
  badgeText: {
    ...Typography.caption,
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  summary: {
    ...Typography.body,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
  },
  saveBtn: {
    marginTop: Spacing.sm,
    alignSelf: 'flex-start',
    borderRadius: Radius.full,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveBtnDone: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  saveBtnText: {
    ...Typography.caption,
    color: '#fff',
    fontWeight: '600',
  },
  toggleBtn: {
    backgroundColor: Colors.primaryLight,
    paddingVertical: Spacing.sm + 2,
    alignItems: 'center',
  },
  toggleText: {
    ...Typography.bodyMedium,
    color: Colors.primary,
    fontSize: 14,
  },
  itinerary: {
    padding: Spacing.md,
    paddingTop: Spacing.sm,
  },
  dayCard: {
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderLeftWidth: 3,
  },
  dayLabel: {
    ...Typography.h3,
    fontSize: 14,
    marginBottom: 4,
  },
  dayDesc: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  activity: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  activityIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  activityIcon: {
    fontSize: 14,
  },
  activityInfo: {
    flex: 1,
  },
  activityName: {
    ...Typography.bodyMedium,
    fontSize: 13,
    color: Colors.text,
  },
  activityDesc: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontSize: 12,
  },
  tips: {
    backgroundColor: Colors.accentLight,
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
    margin: Spacing.md,
    marginTop: 0,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  tipsTitle: {
    ...Typography.h3,
    fontSize: 14,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  tipText: {
    ...Typography.body,
    color: Colors.text,
    fontSize: 13,
    marginBottom: 4,
  },
  hotels: {
    padding: Spacing.md,
    paddingTop: 0,
  },
  hotelsTitle: {
    ...Typography.h3,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
})
