import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, Image,
  StyleSheet, SafeAreaView, Alert, SectionList,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import {
  getBookings, getUpcomingBookings, getPastBookings,
  cancelBooking, subscribeToBookings,
} from '../../lib/bookings-store'
import type { Booking } from '../../lib/types'
import { useLang } from '../../lib/i18n'
import { Colors, Spacing, Radius, Typography, Shadows, Gradients } from '../../constants/theme'

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function nightCount(checkin: string, checkout: string): number {
  const a = new Date(checkin + 'T00:00:00')
  const b = new Date(checkout + 'T00:00:00')
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)))
}

export default function DashboardScreen() {
  const [upcoming, setUpcoming] = useState<Booking[]>(getUpcomingBookings())
  const [past, setPast] = useState<Booking[]>(getPastBookings())
  const router = useRouter()
  const { t } = useLang()

  useEffect(() => {
    const unsub = subscribeToBookings(() => {
      setUpcoming(getUpcomingBookings())
      setPast(getPastBookings())
    })
    return unsub
  }, [])

  const handleCancel = useCallback((booking: Booking) => {
    Alert.alert(
      t.dashboard.cancelBooking,
      t.dashboard.cancelConfirm.replace('{{hotel}}', booking.hotel.name),
      [
        { text: t.dashboard.keep, style: 'cancel' },
        {
          text: t.dashboard.cancelAction,
          style: 'destructive',
          onPress: () => cancelBooking(booking.id),
        },
      ]
    )
  }, [t])

  const handlePress = useCallback((id: string) => {
    router.push(`/booking-detail?id=${id}`)
  }, [router])

  const isEmpty = upcoming.length === 0 && past.length === 0

  if (isEmpty) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.headerSection}>
          <Text style={styles.title}>{t.dashboard.title}</Text>
          <Text style={styles.subtitle}>{t.dashboard.subtitle}</Text>
        </View>
        <View style={styles.emptyState}>
          <View style={styles.emptyVisual}>
            <Ionicons name="compass-outline" size={72} color={Colors.primaryLight} />
          </View>
          <Text style={styles.emptyTitle}>{t.dashboard.noBookings}</Text>
          <Text style={styles.emptyText}>
            {t.dashboard.chatWithBea}
          </Text>
          <TouchableOpacity onPress={() => router.navigate('/')} activeOpacity={0.8}>
            <LinearGradient
              colors={Gradients.primaryFade}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaBtn}
            >
              <Ionicons name="search" size={16} color="#fff" />
              <Text style={styles.ctaText}>{t.dashboard.findHotel}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const sections: { title: string; data: Booking[] }[] = []
  if (upcoming.length > 0) sections.push({ title: t.dashboard.upcoming, data: upcoming })
  if (past.length > 0) sections.push({ title: t.dashboard.past, data: past })

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerSection}>
        <Text style={styles.title}>{t.dashboard.title}</Text>
        <Text style={styles.subtitle}>{t.dashboard.subtitle}</Text>
      </View>
      <SectionList
        sections={sections}
        keyExtractor={b => b.id}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionTitle}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <BookingCard
            booking={item}
            onPress={handlePress}
            onCancel={handleCancel}
          />
        )}
      />
    </SafeAreaView>
  )
}

function BookingCard({
  booking,
  onPress,
  onCancel,
}: {
  booking: Booking
  onPress: (id: string) => void
  onCancel: (booking: Booking) => void
}) {
  const { t } = useLang()
  const imageUrl = booking.hotel.images?.[0] ?? null
  const nights = nightCount(booking.checkin, booking.checkout)
  const isConfirmed = booking.status === 'confirmed'
  const isCancelled = booking.status === 'cancelled'

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => onPress(booking.id)}
    >
      <View style={styles.imageSection}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <LinearGradient colors={Gradients.primaryFade} style={StyleSheet.absoluteFill} />
        )}
        <LinearGradient colors={Gradients.heroOverlay} style={StyleSheet.absoluteFill} />

        <View style={styles.imageBadgeRow}>
          <View style={[
            styles.statusBadge,
            isConfirmed && styles.statusConfirmed,
            isCancelled && styles.statusCancelled,
            !isConfirmed && !isCancelled && styles.statusPending,
          ]}>
            <Ionicons
              name={isConfirmed ? 'checkmark-circle' : isCancelled ? 'close-circle' : 'time'}
              size={12}
              color="#fff"
            />
            <Text style={styles.statusText}>
              {isConfirmed ? t.dashboard.confirmed : isCancelled ? t.dashboard.cancelled : t.dashboard.pending}
            </Text>
          </View>
        </View>

        <View style={styles.imageTitleWrap}>
          <Text style={styles.imageTitle} numberOfLines={2}>{booking.hotel.name}</Text>
          {booking.hotel.stars > 0 && (
            <View style={styles.starsRow}>
              {Array.from({ length: booking.hotel.stars }).map((_, i) => (
                <Ionicons key={i} name="star" size={12} color={Colors.star} />
              ))}
            </View>
          )}
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.dateText}>
            {formatDate(booking.checkin)} - {formatDate(booking.checkout)} ({nights} {nights === 1 ? 'night' : 'nights'})
          </Text>
        </View>

        <View style={styles.badgeRow}>
          <View style={styles.confirmBadge}>
            <Text style={styles.confirmText}>{booking.confirmation_code}</Text>
          </View>
          <Text style={styles.price}>
            {booking.currency === 'EUR' ? '€' : booking.currency} {booking.total_price.toLocaleString()}
          </Text>
        </View>

        {isConfirmed && (
          <View style={styles.footerRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => onCancel(booking)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-outline" size={14} color={Colors.error} />
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
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

  // Empty state
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

  // List
  list: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  sectionTitle: {
    ...Typography.h2,
    color: Colors.text,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },

  // Card
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  imageSection: {
    height: 140,
    justifyContent: 'flex-end',
  },
  imageBadgeRow: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    gap: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusConfirmed: {
    backgroundColor: Colors.success,
  },
  statusCancelled: {
    backgroundColor: Colors.error,
  },
  statusPending: {
    backgroundColor: Colors.accent,
  },
  statusText: {
    ...Typography.caption,
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
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
  starsRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },

  // Card body
  cardBody: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    ...Typography.body,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  confirmBadge: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  confirmText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  price: {
    ...Typography.h3,
    color: Colors.primary,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: Spacing.xs,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  cancelText: {
    ...Typography.caption,
    color: Colors.error,
    fontWeight: '600',
    fontSize: 12,
  },
})
