import React, { useState, useMemo } from 'react'
import {
  View, Text, FlatList, Image, TouchableOpacity,
  ScrollView, StyleSheet, SafeAreaView, Dimensions,
} from 'react-native'
import { useRouter } from 'expo-router'
import { DESTINATIONS } from '../../lib/destinations'
import { setExploreIntent } from '../../lib/explore-intent'
import { Colors, Spacing, Radius } from '../../constants/theme'

const { width: W } = Dimensions.get('window')

const COUNTRIES = ['All', 'Croatia', 'Montenegro', 'North Macedonia', 'Bosnia & Herzegovina', 'Serbia']
const DEST_LIST = Object.values(DESTINATIONS)

export default function ExploreScreen() {
  const [filter, setFilter] = useState('All')
  const router = useRouter()

  const items = useMemo(
    () => filter === 'All' ? DEST_LIST : DEST_LIST.filter(d => d.country === filter),
    [filter]
  )

  const handlePlan = (destName: string) => {
    setExploreIntent(`Plan a trip to ${destName}`)
    router.navigate('/')
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>Explore Balkans</Text>
        <Text style={s.sub}>Tap a destination to start planning</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.filterScroll}
        contentContainerStyle={s.filterContent}
      >
        {COUNTRIES.map(c => (
          <TouchableOpacity
            key={c}
            style={[s.chip, filter === c && s.chipActive]}
            onPress={() => setFilter(c)}
            activeOpacity={0.7}
          >
            <Text style={[s.chipText, filter === c && s.chipTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={items}
        keyExtractor={d => d.id}
        numColumns={2}
        contentContainerStyle={s.grid}
        columnWrapperStyle={s.row}
        ItemSeparatorComponent={() => <View style={s.rowGap} />}
        renderItem={({ item: d }) => (
          <TouchableOpacity style={s.card} activeOpacity={0.88} onPress={() => handlePlan(d.name)}>
            <Image source={{ uri: d.imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            <View style={[StyleSheet.absoluteFill, s.cardScrim]} />
            <View style={s.cardBody}>
              <Text style={s.cardCountry}>{d.country.toUpperCase()}</Text>
              <Text style={s.cardName}>{d.name}</Text>
              <Text style={s.cardTagline} numberOfLines={1}>{d.tagline}</Text>
              <View style={s.planPill}>
                <Text style={s.planPillText}>Plan trip →</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  )
}

const CARD_H = Math.floor((W - Spacing.md * 2 - 12) / 2 * 1.25)

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

  filterScroll: { backgroundColor: Colors.surface, maxHeight: 52 },
  filterContent: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive:     { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText:       { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  chipTextActive: { color: '#fff' },

  grid:   { padding: Spacing.md },
  row:    { gap: 12 },
  rowGap: { height: 12 },

  card: {
    flex: 1,
    height: CARD_H,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: Colors.border,
  },
  cardScrim: { backgroundColor: 'rgba(0,0,0,0.35)' },
  cardBody: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.52)',
    gap: 3,
  },
  cardCountry:  { fontSize: 9, color: 'rgba(255,255,255,0.7)', fontWeight: '700', letterSpacing: 1.5 },
  cardName:     { fontSize: 17, color: '#fff', fontWeight: '800' },
  cardTagline:  { fontSize: 10, color: 'rgba(255,255,255,0.75)', fontStyle: 'italic', marginBottom: 4 },
  planPill: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  planPillText: { fontSize: 11, color: '#fff', fontWeight: '600' },
})
