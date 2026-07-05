import React, { useState, useMemo } from 'react'
import { View, Text, StyleSheet, FlatList, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { DestinationCard } from '../../components/explore/DestinationCard'
import { SearchBar } from '../../components/explore/SearchBar'
import { CATEGORIES, filterDestinations } from '../../lib/destinations'
import type { DestinationCategory, Destination } from '../../lib/destinations'
import { setExploreIntent } from '../../lib/explore-intent'
import { useLang } from '../../lib/i18n'
import { Colors, Spacing, Radius, Typography, Gradients } from '../../constants/theme'

export default function ExploreScreen() {
  const [category, setCategory] = useState<DestinationCategory | 'all'>('all')
  const [search, setSearch] = useState('')
  const router = useRouter()
  const { t } = useLang()

  const destinations = useMemo(() => filterDestinations(category, search), [category, search])

  const featured = destinations[0]
  const grid = destinations.slice(1)

  const handlePress = (dest: Destination) => {
    router.push({
      pathname: '/results',
      params: { destination: dest.name.toLowerCase() },
    })
  }

  const pairs: Destination[][] = []
  for (let i = 0; i < grid.length; i += 2) {
    pairs.push(grid.slice(i, i + 2))
  }

  const renderGridPair = ({ item }: { item: Destination[] }) => (
    <View style={styles.gridRow}>
      {item.map(dest => (
        <DestinationCard
          key={dest.id}
          destination={dest}
          variant="grid"
          onPress={() => handlePress(dest)}
        />
      ))}
      {item.length === 1 && <View style={styles.gridSpacer} />}
    </View>
  )

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerSection}>
        <Text style={styles.title}>{t.explore.title}</Text>
        <Text style={styles.subtitle}>{t.explore.subtitle}</Text>
      </View>

      <SearchBar value={search} onChangeText={setSearch} placeholder={t.explore.searchPlaceholder} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        style={styles.chipScroll}
      >
        {CATEGORIES.map(cat => {
          const active = category === cat.id
          return (
            <TouchableOpacity
              key={cat.id}
              onPress={() => setCategory(cat.id)}
              activeOpacity={0.7}
            >
              {active ? (
                <LinearGradient
                  colors={Gradients.primaryFade}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.chip}
                >
                  <Text style={styles.chipIcon}>{cat.icon}</Text>
                  <Text style={[styles.chipLabel, styles.chipLabelActive]}>{cat.label}</Text>
                </LinearGradient>
              ) : (
                <View style={[styles.chip, styles.chipInactive]}>
                  <Text style={styles.chipIcon}>{cat.icon}</Text>
                  <Text style={styles.chipLabel}>{cat.label}</Text>
                </View>
              )}
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {destinations.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>{t.explore.noDestinations}</Text>
          <Text style={styles.emptyText}>{t.explore.tryDifferent}</Text>
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={pairs}
          keyExtractor={(_, i) => i.toString()}
          renderItem={renderGridPair}
          ListHeaderComponent={
            featured ? (
              <DestinationCard
                destination={featured}
                variant="hero"
                onPress={() => handlePress(featured)}
              />
            ) : null
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
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
  chipScroll: {
    flexGrow: 0,
    marginBottom: Spacing.md,
  },
  chipRow: {
    paddingHorizontal: Spacing.md,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 4,
  },
  chipInactive: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  chipIcon: {
    fontSize: 14,
  },
  chipLabel: {
    ...Typography.bodyMedium,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  chipLabelActive: {
    color: '#fff',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: Spacing.xxxl,
  },
  gridRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  gridSpacer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: Spacing.xxxl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    ...Typography.h2,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
})
