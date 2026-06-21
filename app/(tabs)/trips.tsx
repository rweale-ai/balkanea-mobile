import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, Image,
  StyleSheet, SafeAreaView, Alert,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { getTrips, deleteTrip, subscribeToTrips, type SavedTrip } from '../../lib/trips-store'
import { DESTINATIONS } from '../../lib/destinations'
import { Colors, Spacing, Radius, Typography, Shadows, Gradients } from '../../constants/theme'

const DAY_ACCENT_COLORS = [Colors.primary, Colors.accent, '#6366F1', '#EC4899', '#14B8A6']

function findDestImage(destination: string): string | null {
  const lower = destination.toLowerCase()
  for (const d of Object.values(DESTINATIONS)) {
    if (d.name.toLowerCase() === lower || d.aliases.some(a => lower.includes(a))) {
      return d.imageUrl
    }
  }
  return null
}

export default function TripsScreen() {
  const [trips, setTrips] = useState<SavedTrip[]>(getTrips())
  const router = useRouter()

  useEffect(() => subscribeToTrips(setTrips), [])

  const handleDelete = useCallback((id: string, title: string) => {
    Alert.alert(
      'Remove trip?',
      `Remove "${title}" from My Trips?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => deleteTrip(id) },
      ]
    )
  }, [])

  const handlePress = useCallback((id: string) => {
    router.push(`/trip-detail?id=${id}`)
  }, [router])

  if (trips.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.headerSection}>
          <Text style={styles.title}>My Trips</Text>
          <Text style={styles.subtitle}>Your saved itineraries</Text>
        </View>
        <View style={styles.emptyState}>
          <View style={styles.emptyVisual}>
            <Ionicons name="compass-outline" size={72} color={Colors.primaryLight} />
          </View>
          <Text style={styles.emptyTitle}>Start Your First Adventure</Text>
          <Text style={styles.emptyText}>
            Chat with Bea in the Plan tab to create a personalised itinerary, then save it here.
          </Text>
          <TouchableOpacity onPress={() => router.navigate('/')} activeOpacity={0.8}>
            <LinearGradient
              colors={Gradients.primaryFade}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaBtn}
            >
              <Ionicons name="airplane" size={16} color="#fff" />
              <Text style={styles.ctaText}>Plan a Trip</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerSection}>
        <Text style={styles.title}>My Trips</Text>
        <Text style={styles.subtitle}>
          {trips.length} saved {trips.length === 1 ? 'itinerary' : 'itineraries'}
        </Text>
      </View>
      <FlatList
        data={trips}
        keyExtractor={t => t.id}
        contentContainerStyle={styles.list}
        renderItem={({ item: t }) => (
          <TripRow trip={t} onDelete={handleDelete} onPress={handlePress} />
        )}
      />
    </SafeAreaView>
  )
}

function TripRow({ trip, onDelete, onPress }: {
  trip: SavedTrip
  onDelete: (id: string, title: string) => void
  onPress: (id: string) => void
}) {
  const { plan } = trip
  const imageUrl = findDestImage(plan.destination)
  const tierLabel = plan.estimatedBudget.tier === 'budget' ? 'Budget'
    : plan.estimatedBudget.tier === 'mid' ? 'Mid-range' : 'Luxury'
  const savedDate = trip.savedAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={() => onPress(trip.id)}>
      <View style={styles.imageSection}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <LinearGradient colors={Gradients.primaryFade} style={StyleSheet.absoluteFill} />
        )}
        <LinearGradient colors={Gradients.heroOverlay} style={StyleSheet.absoluteFill} />
        <View style={styles.imageTitleWrap}>
          <Text style={styles.imageTitle} numberOfLines={2}>{plan.title}</Text>
        </View>
        <TouchableOpacity
          onPress={() => onDelete(trip.id, plan.title)}
          style={styles.delBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <View style={styles.delCircle}>
            <Ionicons name="trash-outline" size={16} color="#fff" />
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.summary} numberOfLines={2}>{plan.summary}</Text>

        <View style={styles.badgeRow}>
          <View style={styles.badge}><Text style={styles.badgeText}>{plan.destination}</Text></View>
          <View style={styles.badge}><Text style={styles.badgeText}>{plan.duration} days</Text></View>
          <View style={styles.badge}><Text style={styles.badgeText}>{tierLabel}</Text></View>
        </View>

        <View style={styles.dayRow}>
          {plan.days.slice(0, 3).map((d, i) => (
            <View key={d.day} style={[styles.dayChip, { borderLeftColor: DAY_ACCENT_COLORS[i % DAY_ACCENT_COLORS.length] }]}>
              <Text style={styles.dayNum}>Day {d.day}</Text>
              <Text style={styles.dayTitle} numberOfLines={1}>{d.title}</Text>
            </View>
          ))}
          {plan.days.length > 3 && (
            <View style={[styles.dayChip, styles.dayChipMore]}>
              <Text style={styles.dayMore}>+{plan.days.length - 3} more</Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.price}>{'€'}{plan.estimatedBudget.perPersonPerNight} / person / night</Text>
          <Text style={styles.date}>Saved {savedDate}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  headerSection: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  title: {
    ...Typography.hero,
    color: Colors.text,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  emptyVisual: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    ...Typography.h1,
    color: Colors.text,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 4,
    gap: 8,
    ...Shadows.md,
  },
  ctaText: {
    ...Typography.button,
    color: '#fff',
  },

  list: {
    padding: Spacing.md,
    gap: Spacing.md,
  },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadows.md,
  },
  imageSection: {
    height: 140,
    justifyContent: 'flex-end',
  },
  imageTitleWrap: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  imageTitle: {
    ...Typography.h1,
    color: '#fff',
    fontSize: 20,
  },
  delBtn: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
  },
  delCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardBody: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  summary: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontSize: 13,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  badge: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 11,
  },
  dayRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  dayChip: {
    backgroundColor: Colors.background,
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderLeftWidth: 3,
    flex: 1,
    minWidth: 80,
    maxWidth: '32%',
  },
  dayChipMore: {
    borderLeftWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNum: {
    ...Typography.overline,
    color: Colors.primary,
    fontSize: 9,
  },
  dayTitle: {
    ...Typography.bodyMedium,
    fontSize: 11,
    color: Colors.text,
    marginTop: 2,
  },
  dayMore: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    fontSize: 11,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.xs,
  },
  price: {
    ...Typography.bodyMedium,
    color: Colors.primary,
    fontSize: 13,
  },
  date: {
    ...Typography.caption,
    color: Colors.textLight,
    fontSize: 11,
  },
})
