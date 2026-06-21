import React, { useState } from 'react'
import {
  View, Text, ScrollView, Image, TouchableOpacity,
  StyleSheet, SafeAreaView, Share, Platform,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { getTrip } from '../lib/trips-store'
import { DESTINATIONS } from '../lib/destinations'
import { Colors, Spacing, Radius, Typography, Shadows, Gradients } from '../constants/theme'

const ACTIVITY_ICONS: Record<string, string> = {
  sightseeing: '🏛️',
  food:        '🍽️',
  adventure:   '🧗',
  relaxation:  '🌊',
  culture:     '🎭',
  transport:   '🚌',
}

const TIMELINE_COLORS = [
  Colors.primary, Colors.accent, '#6366F1', '#EC4899', '#14B8A6', '#8B5CF6', '#F97316',
]

function findDestImage(destination: string): string | null {
  const lower = destination.toLowerCase()
  for (const d of Object.values(DESTINATIONS)) {
    if (d.name.toLowerCase() === lower || d.aliases.some(a => lower.includes(a))) {
      return d.imageUrl
    }
  }
  return null
}

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const trip = getTrip(id ?? '')
  const [expandedDays, setExpandedDays] = useState<Record<number, boolean>>({})

  if (!trip) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Trip not found</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backLink}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const { plan } = trip
  const imageUrl = findDestImage(plan.destination)
  const tierLabel = plan.estimatedBudget.tier === 'budget' ? 'Budget'
    : plan.estimatedBudget.tier === 'mid' ? 'Mid-range' : 'Luxury'

  const toggleDay = (day: number) => {
    setExpandedDays(prev => ({ ...prev, [day]: !prev[day] }))
  }

  const handleShare = async () => {
    const daysSummary = plan.days.map(d =>
      `Day ${d.day}: ${d.title}\n${d.activities.map(a => `  - ${a.name}`).join('\n')}`
    ).join('\n\n')

    const text = `${plan.title}\n${plan.destination} · ${plan.duration} days · ${tierLabel}\n\n${plan.summary}\n\n${daysSummary}\n\nPlanned with Balkanea AI`

    if (Platform.OS === 'web') {
      try {
        if (navigator.share) {
          await navigator.share({ title: plan.title, text })
        } else {
          await navigator.clipboard.writeText(text)
          alert('Trip copied to clipboard!')
        }
      } catch {}
    } else {
      await Share.share({ message: text, title: plan.title })
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <LinearGradient colors={Gradients.primaryFade} style={StyleSheet.absoluteFill} />
          )}
          <LinearGradient colors={Gradients.heroOverlay} style={StyleSheet.absoluteFill} />

          <View style={styles.heroNav}>
            <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleShare} style={styles.navBtn}>
              <Ionicons name="share-outline" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>{plan.title}</Text>
            <View style={styles.heroBadges}>
              <View style={styles.heroBadge}><Text style={styles.heroBadgeText}>{plan.destination}</Text></View>
              <View style={styles.heroBadge}><Text style={styles.heroBadgeText}>{plan.duration} days</Text></View>
              <View style={styles.heroBadge}><Text style={styles.heroBadgeText}>{tierLabel}</Text></View>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>{'€'}{plan.estimatedBudget.perPersonPerNight}/night</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.summaryText}>{plan.summary}</Text>

          <Text style={styles.sectionTitle}>Itinerary</Text>

          {plan.days.map((day, idx) => {
            const color = TIMELINE_COLORS[idx % TIMELINE_COLORS.length]
            const isExpanded = expandedDays[day.day] !== false
            const isLast = idx === plan.days.length - 1

            return (
              <View key={day.day} style={styles.timelineItem}>
                <View style={styles.timelineRail}>
                  <View style={[styles.timelineDot, { backgroundColor: color }]}>
                    <Text style={styles.timelineDotText}>{day.day}</Text>
                  </View>
                  {!isLast && <View style={[styles.timelineLine, { backgroundColor: `${color}30` }]} />}
                </View>

                <View style={styles.timelineContent}>
                  <TouchableOpacity onPress={() => toggleDay(day.day)} activeOpacity={0.7}>
                    <View style={styles.dayHeader}>
                      <Text style={[styles.dayTitle, { color }]}>{day.title}</Text>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color={Colors.textLight}
                      />
                    </View>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.dayBody}>
                      <Text style={styles.dayDesc}>{day.description}</Text>
                      {day.activities.map((a, i) => (
                        <View key={i} style={styles.activity}>
                          <View style={[styles.activityIconWrap, { backgroundColor: `${color}15` }]}>
                            <Text style={styles.activityIcon}>{ACTIVITY_ICONS[a.type] ?? '📍'}</Text>
                          </View>
                          <View style={styles.activityInfo}>
                            <Text style={styles.activityName}>
                              {a.name}{a.duration ? ` · ${a.duration}` : ''}
                            </Text>
                            <Text style={styles.activityDesc}>{a.description}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            )
          })}

          {plan.tips.length > 0 && (
            <View style={styles.tipsSection}>
              <Text style={styles.sectionTitle}>Travel Tips</Text>
              {plan.tips.map((tip, i) => (
                <View key={i} style={styles.tipRow}>
                  <Ionicons name="bulb-outline" size={14} color={Colors.accent} />
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: Spacing.xxl }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },

  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  notFoundText: {
    ...Typography.h2,
    color: Colors.textSecondary,
  },
  backLink: {
    ...Typography.button,
    color: Colors.primary,
  },

  heroSection: {
    height: 280,
    justifyContent: 'space-between',
  },
  heroNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContent: {
    padding: Spacing.md,
  },
  heroTitle: {
    ...Typography.hero,
    color: '#fff',
    fontSize: 26,
    marginBottom: Spacing.sm,
  },
  heroBadges: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  heroBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  heroBadgeText: {
    ...Typography.caption,
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },

  body: {
    padding: Spacing.md,
  },
  summaryText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.h2,
    color: Colors.text,
    marginBottom: Spacing.md,
  },

  timelineItem: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
  },
  timelineRail: {
    width: 36,
    alignItems: 'center',
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotText: {
    ...Typography.caption,
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
    marginBottom: 4,
  },
  timelineContent: {
    flex: 1,
    marginLeft: Spacing.sm,
    marginBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    ...Shadows.sm,
    overflow: 'hidden',
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  dayTitle: {
    ...Typography.h3,
    flex: 1,
    marginRight: Spacing.sm,
  },
  dayBody: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
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
    width: 30,
    height: 30,
    borderRadius: 15,
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

  tipsSection: {
    marginTop: Spacing.lg,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.accentLight,
    borderRadius: Radius.md,
    padding: Spacing.sm + 2,
  },
  tipText: {
    ...Typography.body,
    color: Colors.text,
    fontSize: 13,
    flex: 1,
  },
})
