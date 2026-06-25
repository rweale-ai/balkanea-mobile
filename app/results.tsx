import React, {
  useState, useRef, useMemo, useCallback, useEffect,
} from 'react'
import {
  View, Text, ScrollView, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, Animated, PanResponder, Platform, Image,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { searchHotelsSync } from '../lib/hotels'
import { useLang } from '../lib/i18n'
import { Colors, Spacing, Radius, Typography, Shadows, Gradients } from '../constants/theme'
import type { Hotel, HotelSearchParams } from '../lib/types'

// ── Constants ──────────────────────────────────────────────────────

const PRICE_MIN = 0
const PRICE_MAX = 250
const THUMB_R = 12
const AMENITY_KEYS = ['wifi', 'pool', 'spa', 'beach', 'parking', 'restaurant'] as const
type SortKey = 'recommended' | 'priceLow' | 'priceHigh' | 'guestRating'
type MealFilter = 'any' | 'breakfast' | 'halfBoard' | 'allInclusive'

interface Filters {
  priceMin: number
  priceMax: number
  stars: number[]
  amenities: string[]
  mealPlan: MealFilter
}

const DEFAULT_FILTERS: Filters = {
  priceMin: PRICE_MIN,
  priceMax: PRICE_MAX,
  stars: [],
  amenities: [],
  mealPlan: 'any',
}

function hasActiveFilters(f: Filters) {
  return (
    f.priceMin > PRICE_MIN || f.priceMax < PRICE_MAX ||
    f.stars.length > 0 || f.amenities.length > 0 || f.mealPlan !== 'any'
  )
}

// ── Dual price slider ──────────────────────────────────────────────

function PriceSlider({
  min, max, onChange,
}: {
  min: number; max: number
  onChange: (min: number, max: number) => void
}) {
  const trackWidthRef = useRef(0)
  const minRef = useRef(min)
  const maxRef = useRef(max)
  useEffect(() => { minRef.current = min }, [min])
  useEffect(() => { maxRef.current = max }, [max])

  const toX = (val: number) =>
    trackWidthRef.current > 0
      ? ((val - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * trackWidthRef.current
      : 0

  const makePR = (isMin: boolean) => {
    let startVal = 0
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startVal = isMin ? minRef.current : maxRef.current
      },
      onPanResponderMove: (_, { dx }) => {
        const w = trackWidthRef.current
        if (w === 0) return
        const delta = Math.round((dx / w) * (PRICE_MAX - PRICE_MIN) / 10) * 10
        const raw = startVal + delta
        if (isMin) {
          onChange(Math.max(PRICE_MIN, Math.min(maxRef.current - 20, raw)), maxRef.current)
        } else {
          onChange(minRef.current, Math.min(PRICE_MAX, Math.max(minRef.current + 20, raw)))
        }
      },
    })
  }

  const minPR = useRef(makePR(true)).current
  const maxPR = useRef(makePR(false)).current

  const minPct = (min - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)
  const maxPct = (max - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)

  return (
    <View>
      <View style={sl.rangeLabels}>
        <Text style={sl.rangeVal}>€{min}</Text>
        <Text style={sl.rangeVal}>€{max}{max === PRICE_MAX ? '+' : ''}</Text>
      </View>
      <View
        style={sl.track}
        onLayout={e => { trackWidthRef.current = e.nativeEvent.layout.width }}
      >
        {/* Background rail */}
        <View style={sl.rail} />
        {/* Active fill */}
        <View style={[sl.fill, { left: `${minPct * 100}%`, right: `${(1 - maxPct) * 100}%` }]} />
        {/* Min thumb */}
        <View
          style={[sl.thumb, { left: `${minPct * 100}%`, marginLeft: -THUMB_R }]}
          {...minPR.panHandlers}
        />
        {/* Max thumb */}
        <View
          style={[sl.thumb, { left: `${maxPct * 100}%`, marginLeft: -THUMB_R }]}
          {...maxPR.panHandlers}
        />
      </View>
    </View>
  )
}

const sl = StyleSheet.create({
  rangeLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  rangeVal: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '600' },
  track: { height: THUMB_R * 2, justifyContent: 'center', marginBottom: 4 },
  rail: { position: 'absolute', left: 0, right: 0, height: 4, backgroundColor: Colors.borderLight, borderRadius: 2 },
  fill: { position: 'absolute', height: 4, backgroundColor: Colors.primary, borderRadius: 2 },
  thumb: {
    position: 'absolute',
    width: THUMB_R * 2, height: THUMB_R * 2,
    borderRadius: THUMB_R,
    backgroundColor: '#fff',
    borderWidth: 2.5, borderColor: Colors.primary,
    ...Shadows.sm,
  },
})

// ── Filter chip ────────────────────────────────────────────────────

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[fc.chip, active && fc.chipActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[fc.chipText, active && fc.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  )
}

const fc = StyleSheet.create({
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginRight: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  chipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  chipText: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '600' },
  chipTextActive: { color: Colors.primary },
})

// ── Hotel result card ──────────────────────────────────────────────

function HotelCard({
  hotel, currency, onPress,
}: {
  hotel: Hotel; currency: string; onPress: () => void
}) {
  const { t } = useLang()
  const price = currency === 'MKD'
    ? `${Math.round(hotel.price_per_night * 61.5).toLocaleString('en-US')} ден`
    : `€${hotel.price_per_night}`

  return (
    <TouchableOpacity style={hc.card} onPress={onPress} activeOpacity={0.85}>
      {/* Image area */}
      <View style={hc.imgWrap}>
        {hotel.images?.[0] ? (
          <Image source={{ uri: hotel.images[0] }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={['#8fc6e6', '#27567a'] as const}
            style={StyleSheet.absoluteFill}
          />
        )}
        {/* City label */}
        <Text style={hc.cityLabel} numberOfLines={1}>
          {hotel.address.split(',')[0]?.toUpperCase()}
        </Text>
        {/* Rating badge */}
        <View style={hc.ratingBadge}>
          <Ionicons name="star" size={11} color={Colors.star} />
          <Text style={hc.ratingText}>{hotel.guest_rating.toFixed(1)}</Text>
        </View>
      </View>

      {/* Body */}
      <View style={hc.body}>
        <View style={hc.nameRow}>
          <Text style={hc.name} numberOfLines={1}>{hotel.name}</Text>
          <View style={hc.priceCol}>
            <Text style={hc.price}>{price}</Text>
            <Text style={hc.perNight}>{t.results.perNight}</Text>
          </View>
        </View>
        <Text style={hc.blurb} numberOfLines={2}>
          {hotel.amenities.slice(0, 4).join(' · ')}
        </Text>
        <Text style={hc.reviews}>
          {hotel.stars}★ · {Math.round(hotel.guest_rating * 100)} {t.results.reviews}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

const hc = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadows.md,
    marginBottom: Spacing.sm,
  },
  imgWrap: { height: 150, position: 'relative', backgroundColor: Colors.border },
  cityLabel: {
    position: 'absolute',
    top: 11, left: 13,
    ...Typography.overline,
    color: 'rgba(255,255,255,0.92)',
    fontSize: 10,
  },
  ratingBadge: {
    position: 'absolute',
    top: 10, right: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: Radius.full,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  ratingText: { ...Typography.caption, color: Colors.text, fontWeight: '800', fontSize: 12 },
  body: { padding: Spacing.md },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: 6 },
  name: { ...Typography.h3, color: Colors.text, flex: 1 },
  priceCol: { alignItems: 'flex-end', flexShrink: 0 },
  price: { ...Typography.h3, color: Colors.primary, fontWeight: '800' },
  perNight: { ...Typography.caption, color: Colors.textSecondary, fontSize: 11 },
  blurb: { ...Typography.caption, color: Colors.textSecondary, lineHeight: 18, marginBottom: 5 },
  reviews: { ...Typography.caption, color: Colors.textLight, fontSize: 11 },
})

// ── Skeleton card ──────────────────────────────────────────────────

function SkeletonCard() {
  const opacity = useRef(new Animated.Value(0.4)).current
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
    ])).start()
  }, [])
  return (
    <Animated.View style={[sk.card, { opacity }]}>
      <View style={sk.img} />
      <View style={sk.body}>
        <View style={sk.lineWide} />
        <View style={sk.lineMid} />
        <View style={sk.lineNarrow} />
      </View>
    </Animated.View>
  )
}

const sk = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, overflow: 'hidden', marginBottom: Spacing.sm, ...Shadows.sm },
  img: { height: 150, backgroundColor: Colors.borderLight },
  body: { padding: Spacing.md, gap: Spacing.sm },
  lineWide: { height: 16, backgroundColor: Colors.borderLight, borderRadius: 4, width: '80%' },
  lineMid: { height: 13, backgroundColor: Colors.borderLight, borderRadius: 4, width: '60%' },
  lineNarrow: { height: 11, backgroundColor: Colors.borderLight, borderRadius: 4, width: '40%' },
})

// ── Filter sheet ───────────────────────────────────────────────────

function FilterSheet({
  visible, filters, resultCount, onClose, onChange,
}: {
  visible: boolean
  filters: Filters
  resultCount: number
  onClose: () => void
  onChange: (f: Filters) => void
}) {
  const { t } = useLang()
  const slideY = useRef(new Animated.Value(600)).current

  useEffect(() => {
    Animated.spring(slideY, {
      toValue: visible ? 0 : 600,
      useNativeDriver: true,
      tension: 60,
      friction: 12,
    }).start()
  }, [visible])

  const toggle = <T,>(arr: T[], item: T) =>
    arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item]

  const AMENITY_LABELS: Record<typeof AMENITY_KEYS[number], string> = {
    wifi: 'Free WiFi', pool: 'Pool', spa: 'Spa',
    beach: 'Beach', parking: 'Parking', restaurant: 'Restaurant',
  }

  if (!visible) return null

  return (
    <>
      <TouchableOpacity style={fs.backdrop} onPress={onClose} activeOpacity={1} />
      <Animated.View style={[fs.sheet, { transform: [{ translateY: slideY }] }]}>
        <View style={fs.handle} />
        <View style={fs.sheetHeader}>
          <Text style={fs.sheetTitle}>{t.results.filters}</Text>
          <TouchableOpacity onPress={() => onChange(DEFAULT_FILTERS)}>
            <Text style={fs.clearText}>{t.results.clearFilters}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={fs.scroll} showsVerticalScrollIndicator={false}>
          {/* Price range */}
          <Text style={fs.filterLabel}>{t.results.priceRange}</Text>
          <PriceSlider
            min={filters.priceMin}
            max={filters.priceMax}
            onChange={(mn, mx) => onChange({ ...filters, priceMin: mn, priceMax: mx })}
          />

          {/* Star rating */}
          <Text style={fs.filterLabel}>{t.results.starRating}</Text>
          <View style={fs.chipRow}>
            {[3, 4, 5].map(n => (
              <Chip
                key={n}
                label={`${n}★`}
                active={filters.stars.includes(n)}
                onPress={() => onChange({ ...filters, stars: toggle(filters.stars, n) })}
              />
            ))}
          </View>

          {/* Amenities */}
          <Text style={fs.filterLabel}>{t.results.amenitiesFilter}</Text>
          <View style={fs.chipRow}>
            {AMENITY_KEYS.map(k => (
              <Chip
                key={k}
                label={AMENITY_LABELS[k]}
                active={filters.amenities.includes(k)}
                onPress={() => onChange({ ...filters, amenities: toggle(filters.amenities, k) })}
              />
            ))}
          </View>

          {/* Meal plan */}
          <Text style={fs.filterLabel}>{t.results.mealPlanFilter}</Text>
          <View style={fs.chipRow}>
            {(['any', 'breakfast', 'halfBoard', 'allInclusive'] as MealFilter[]).map(m => (
              <Chip
                key={m}
                label={t.results[m === 'any' ? 'anyMeal' : m === 'breakfast' ? 'breakfast' : m === 'halfBoard' ? 'halfBoard' : 'allInclusive']}
                active={filters.mealPlan === m}
                onPress={() => onChange({ ...filters, mealPlan: m })}
              />
            ))}
          </View>

          <View style={{ height: Spacing.md }} />
        </ScrollView>

        {/* Apply */}
        <View style={fs.applyWrap}>
          <TouchableOpacity onPress={onClose} activeOpacity={0.85}>
            <LinearGradient colors={Gradients.primaryFade} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={fs.applyBtn}>
              <Text style={fs.applyText}>
                {t.results.apply.replace('{{count}}', String(resultCount))}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </>
  )
}

const fs = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 40 },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 41,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xxl, borderTopRightRadius: Radius.xxl,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? Spacing.xl + 4 : Spacing.lg,
    maxHeight: '82%',
    ...Shadows.lg,
  },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: Colors.border, alignSelf: 'center', marginTop: Spacing.sm, marginBottom: Spacing.md },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sheetTitle: { ...Typography.h2, color: Colors.text },
  clearText: { ...Typography.bodyMedium, color: Colors.primary, fontWeight: '700' },
  scroll: { flexGrow: 0 },
  filterLabel: { ...Typography.bodyMedium, color: Colors.text, fontWeight: '700', marginBottom: Spacing.sm, marginTop: Spacing.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  applyWrap: { marginTop: Spacing.md },
  applyBtn: { borderRadius: Radius.full, paddingVertical: 15, alignItems: 'center' },
  applyText: { ...Typography.button, color: '#fff', fontSize: 16 },
})

// ── Sort chip row ──────────────────────────────────────────────────

function SortChips({ active, onChange }: { active: SortKey; onChange: (k: SortKey) => void }) {
  const { t } = useLang()
  const options: { key: SortKey; label: string }[] = [
    { key: 'recommended', label: t.results.recommended },
    { key: 'priceLow', label: t.results.priceLow },
    { key: 'priceHigh', label: t.results.priceHigh },
    { key: 'guestRating', label: t.results.guestRating },
  ]
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={sc.row}>
      {options.map(o => (
        <TouchableOpacity
          key={o.key}
          style={[sc.chip, active === o.key && sc.chipActive]}
          onPress={() => onChange(o.key)}
          activeOpacity={0.7}
        >
          <Text style={[sc.text, active === o.key && sc.textActive]}>{o.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  )
}

const sc = StyleSheet.create({
  row: { paddingHorizontal: Spacing.md, gap: Spacing.sm, paddingVertical: 4 },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: 7, borderRadius: Radius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.text, borderColor: Colors.text },
  text: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '600' },
  textActive: { color: '#fff' },
})

// ── Main screen ────────────────────────────────────────────────────

export default function ResultsScreen() {
  const router = useRouter()
  const { t } = useLang()
  const params = useLocalSearchParams<{
    destination: string
    checkin?: string
    checkout?: string
    adults?: string
    children?: string
    rooms?: string
    currency?: string
  }>()

  const currency = params.currency ?? 'EUR'
  const today = new Date()
  const defaultCheckin = today.toISOString().split('T')[0]
  const defaultCheckout = new Date(today.getTime() + 3 * 86_400_000).toISOString().split('T')[0]

  const searchParams: HotelSearchParams = {
    destination: params.destination ?? '',
    checkin: params.checkin ?? defaultCheckin,
    checkout: params.checkout ?? defaultCheckout,
    adults: parseInt(params.adults ?? '2', 10),
    children: parseInt(params.children ?? '0', 10),
    rooms: parseInt(params.rooms ?? '1', 10),
    currency,
  }

  // Load hotels once on mount — searchHotelsSync is deterministic per destination
  const [allHotels] = useState<Hotel[]>(() =>
    params.destination ? searchHotelsSync(searchParams) : []
  )
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    // Simulate a brief search delay for UX
    const t = setTimeout(() => setLoading(false), 600)
    return () => clearTimeout(t)
  }, [])

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [sort, setSort] = useState<SortKey>('recommended')
  const [showFilters, setShowFilters] = useState(false)

  // Apply filters + sort
  const filtered = useMemo(() => {
    let list = allHotels.slice()

    if (filters.priceMin > PRICE_MIN)
      list = list.filter(h => h.price_per_night >= filters.priceMin)
    if (filters.priceMax < PRICE_MAX)
      list = list.filter(h => h.price_per_night <= filters.priceMax)
    if (filters.stars.length > 0)
      list = list.filter(h => filters.stars.some(n => h.stars >= n))
    if (filters.amenities.length > 0) {
      list = list.filter(h =>
        filters.amenities.every(a => h.amenities.some(am => am.toLowerCase().includes(a)))
      )
    }
    if (filters.mealPlan !== 'any') {
      const keyword = filters.mealPlan === 'breakfast' ? 'breakfast'
        : filters.mealPlan === 'halfBoard' ? 'half board'
        : 'all-inclusive'
      list = list.filter(h =>
        h.room_types.some(r => r.meal_plan.toLowerCase().includes(keyword))
      )
    }

    if (sort === 'priceLow') list.sort((a, b) => a.price_per_night - b.price_per_night)
    else if (sort === 'priceHigh') list.sort((a, b) => b.price_per_night - a.price_per_night)
    else if (sort === 'guestRating') list.sort((a, b) => b.guest_rating - a.guest_rating)

    return list
  }, [allHotels, filters, sort])

  const handleHotelPress = useCallback((hotel: Hotel) => {
    router.push({
      pathname: '/hotel-detail',
      params: {
        hotelId: hotel.hotel_id,
        checkin: searchParams.checkin,
        checkout: searchParams.checkout,
        adults: String(searchParams.adults),
        children: String(searchParams.children),
        rooms: String(searchParams.rooms),
        currency,
        destination: params.destination ?? '',
      },
    })
  }, [router, searchParams, currency, params.destination])

  const clearFilters = useCallback(() => setFilters(DEFAULT_FILTERS), [])
  const activeFilters = hasActiveFilters(filters)

  const destTitle = params.destination
    ? params.destination.charAt(0).toUpperCase() + params.destination.slice(1)
    : 'Hotels'

  return (
    <View style={s.root}>
      <SafeAreaView style={s.safe}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={Colors.text} />
          </TouchableOpacity>
          <View style={s.headerMid}>
            <Text style={s.headerTitle}>{destTitle}</Text>
            {!loading && (
              <Text style={s.headerSub}>
                {t.results.hotelsFound.replace('{{count}}', String(filtered.length))}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={[s.filterBtn, activeFilters && s.filterBtnActive]}
            onPress={() => setShowFilters(true)}
          >
            <Ionicons name="options-outline" size={16} color={activeFilters ? Colors.primary : Colors.text} />
            <Text style={[s.filterBtnText, activeFilters && s.filterBtnTextActive]}>
              {t.results.filters}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sort chips */}
        <SortChips active={sort} onChange={setSort} />

        {/* Results */}
        {loading ? (
          <ScrollView contentContainerStyle={s.listContent} showsVerticalScrollIndicator={false}>
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
          </ScrollView>
        ) : filtered.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="search-outline" size={48} color={Colors.border} />
            <Text style={s.emptyTitle}>{t.results.noResults}</Text>
            <Text style={s.emptySub}>{t.results.noResultsSub}</Text>
            {activeFilters && (
              <TouchableOpacity style={s.clearBtn} onPress={clearFilters}>
                <Text style={s.clearBtnText}>{t.results.clearFilters}</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={h => h.hotel_id}
            renderItem={({ item }) => (
              <HotelCard hotel={item} currency={currency} onPress={() => handleHotelPress(item)} />
            )}
            contentContainerStyle={s.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>

      {/* Filter sheet rendered outside SafeAreaView so it covers everything */}
      <FilterSheet
        visible={showFilters}
        filters={filters}
        resultCount={filtered.length}
        onClose={() => setShowFilters(false)}
        onChange={setFilters}
      />
    </View>
  )
}

// ── Styles ─────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.background,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
    ...Shadows.sm,
  },
  headerMid: { flex: 1 },
  headerTitle: { ...Typography.h3, color: Colors.text },
  headerSub: { ...Typography.caption, color: Colors.textSecondary, marginTop: 1 },
  filterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: Spacing.sm + 4, paddingVertical: 8,
    backgroundColor: Colors.surface, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border,
    ...Shadows.sm,
  },
  filterBtnActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  filterBtnText: { ...Typography.caption, color: Colors.text, fontWeight: '700' },
  filterBtnTextActive: { color: Colors.primary },

  // List
  listContent: { padding: Spacing.md },

  // Empty
  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxl,
  },
  emptyTitle: { ...Typography.h2, color: Colors.text, marginTop: Spacing.lg, textAlign: 'center' },
  emptySub: { ...Typography.body, color: Colors.textSecondary, marginTop: Spacing.sm, textAlign: 'center' },
  clearBtn: {
    marginTop: Spacing.lg, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    backgroundColor: Colors.primaryLight, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.primary,
  },
  clearBtnText: { ...Typography.button, color: Colors.primary },
})
