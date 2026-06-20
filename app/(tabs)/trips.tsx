import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, SafeAreaView, Alert,
} from 'react-native'
import { getTrips, deleteTrip, subscribeToTrips, type SavedTrip } from '../../lib/trips-store'
import { Colors, Spacing, Radius } from '../../constants/theme'

export default function TripsScreen() {
  const [trips, setTrips] = useState<SavedTrip[]>(getTrips())

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

  if (trips.length === 0) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <Text style={s.title}>My Trips</Text>
          <Text style={s.sub}>Your saved itineraries</Text>
        </View>
        <View style={s.empty}>
          <Text style={s.emptyIcon}>🗺️</Text>
          <Text style={s.emptyTitle}>No trips saved yet</Text>
          <Text style={s.emptyText}>
            Chat with Bea in the Plan tab to create a personalised itinerary,
            then tap "Save to My Trips" to keep it here.
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>My Trips</Text>
        <Text style={s.sub}>{trips.length} saved {trips.length === 1 ? 'itinerary' : 'itineraries'}</Text>
      </View>
      <FlatList
        data={trips}
        keyExtractor={t => t.id}
        contentContainerStyle={s.list}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item: t }) => (
          <TripRow trip={t} onDelete={handleDelete} />
        )}
      />
    </SafeAreaView>
  )
}

function TripRow({ trip, onDelete }: { trip: SavedTrip; onDelete: (id: string, title: string) => void }) {
  const { plan } = trip
  const tierLabel = plan.estimatedBudget.tier === 'budget' ? 'Budget'
    : plan.estimatedBudget.tier === 'mid' ? 'Mid-range' : 'Luxury'
  const savedDate = trip.savedAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <View style={s.card}>
      <View style={s.cardTop}>
        <View style={s.cardTitleBlock}>
          <Text style={s.cardTitle} numberOfLines={2}>{plan.title}</Text>
          <Text style={s.cardMeta}>{plan.destination} · {plan.duration} days · {tierLabel}</Text>
        </View>
        <TouchableOpacity
          onPress={() => onDelete(trip.id, plan.title)}
          style={s.delBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={s.delIcon}>🗑</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.summary} numberOfLines={3}>{plan.summary}</Text>

      <View style={s.dayRow}>
        {plan.days.slice(0, 3).map(d => (
          <View key={d.day} style={s.dayChip}>
            <Text style={s.dayNum}>Day {d.day}</Text>
            <Text style={s.dayTitle} numberOfLines={1}>{d.title}</Text>
          </View>
        ))}
        {plan.days.length > 3 && (
          <View style={[s.dayChip, s.dayChipMore]}>
            <Text style={s.dayMore}>+{plan.days.length - 3} more</Text>
          </View>
        )}
      </View>

      <View style={s.footer}>
        <Text style={s.price}>€{plan.estimatedBudget.perPersonPerNight} / person / night</Text>
        <Text style={s.date}>Saved {savedDate}</Text>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: { fontSize: 22, fontWeight: '700', color: Colors.primary },
  sub:   { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  emptyIcon:  { fontSize: 52, marginBottom: Spacing.md },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm, textAlign: 'center' },
  emptyText:  { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },

  list: { padding: Spacing.md },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTop:        { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  cardTitleBlock: { flex: 1 },
  cardTitle:      { fontSize: 16, fontWeight: '700', color: Colors.text, lineHeight: 22 },
  cardMeta:       { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  delBtn:         { padding: 2 },
  delIcon:        { fontSize: 18 },

  summary: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },

  dayRow:  { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  dayChip: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flex: 1,
    minWidth: 80,
    maxWidth: '32%',
  },
  dayChipMore: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  dayNum:      { fontSize: 9, color: Colors.primary, fontWeight: '700', letterSpacing: 0.5 },
  dayTitle:    { fontSize: 11, color: Colors.text, fontWeight: '600', marginTop: 2 },
  dayMore:     { fontSize: 11, color: Colors.textSecondary, fontStyle: 'italic', textAlign: 'center', paddingTop: 6 },

  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price:  { fontSize: 13, color: Colors.primary, fontWeight: '700' },
  date:   { fontSize: 11, color: Colors.textLight },
})
