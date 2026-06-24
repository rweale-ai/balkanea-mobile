import React, { useMemo } from 'react'
import {
  View, Text, TouchableOpacity,
  StyleSheet, SafeAreaView, Platform,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { getBooking } from '../lib/bookings-store'
import { Colors, Spacing, Radius, Typography, Shadows, Gradients } from '../constants/theme'

export default function BookingConfirmedScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()

  const booking = useMemo(() => {
    if (!id) return null
    return getBooking(id) || null
  }, [id])

  const currencySymbol = booking
    ? booking.currency === 'EUR' ? '€'
      : booking.currency === 'USD' ? '$'
      : booking.currency === 'GBP' ? '£'
      : booking.currency
    : '€'

  const nights = useMemo(() => {
    if (!booking) return 0
    return Math.max(1, Math.round(
      (new Date(booking.checkout).getTime() - new Date(booking.checkin).getTime()) / 86400000
    ))
  }, [booking])

  if (!booking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.textLight} />
          <Text style={styles.errorText}>Booking not found</Text>
          <TouchableOpacity style={styles.errorBtn} onPress={() => router.replace('/(tabs)')}>
            <Text style={styles.errorBtnText}>Go Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.centerContent}>
        {/* Success Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="checkmark-circle" size={96} color={Colors.success} />
        </View>

        {/* Heading */}
        <Text style={styles.heading}>Booking Confirmed!</Text>

        {/* Confirmation Code Badge */}
        <View style={styles.codeBadge}>
          <Text style={styles.codeLabel}>Confirmation Code</Text>
          <Text style={styles.codeValue}>{booking.confirmation_code}</Text>
        </View>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Ionicons name="business-outline" size={16} color={Colors.primary} />
            <Text style={styles.summaryText}>{booking.hotel.name}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
            <Text style={styles.summaryText}>
              {booking.checkin} to {booking.checkout}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Ionicons name="moon-outline" size={16} color={Colors.primary} />
            <Text style={styles.summaryText}>{nights} night{nights !== 1 ? 's' : ''}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Paid</Text>
            <Text style={styles.totalPrice}>{currencySymbol}{booking.total_price}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.replace('/(tabs)/trips')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={Gradients.primaryFade}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtnGradient}
            >
              <Ionicons name="grid-outline" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>View in Dashboard</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.replace('/(tabs)')}
            activeOpacity={0.8}
          >
            <Ionicons name="search-outline" size={18} color={Colors.primary} />
            <Text style={styles.secondaryBtnText}>Book Another</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },

  /* Error state */
  errorText: {
    ...Typography.h2,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  errorBtn: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
  },
  errorBtnText: {
    ...Typography.button,
    color: '#fff',
  },

  /* Success icon */
  iconContainer: {
    marginBottom: Spacing.md,
  },

  /* Heading */
  heading: {
    ...Typography.h1,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },

  /* Code badge */
  codeBadge: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  codeLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  codeValue: {
    ...Typography.hero,
    color: Colors.primary,
    letterSpacing: 2,
  },

  /* Summary card */
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    width: '100%',
    marginBottom: Spacing.lg,
    ...Shadows.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs + 2,
  },
  summaryText: {
    ...Typography.body,
    color: Colors.text,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.sm,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    ...Typography.h3,
    color: Colors.text,
  },
  totalPrice: {
    ...Typography.h2,
    color: Colors.primary,
  },

  /* Action buttons */
  actions: {
    width: '100%',
    gap: Spacing.sm,
  },
  primaryBtn: {
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  primaryBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  primaryBtnText: {
    ...Typography.button,
    color: '#fff',
    fontSize: 16,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    gap: Spacing.sm,
  },
  secondaryBtnText: {
    ...Typography.button,
    color: Colors.primary,
    fontSize: 16,
  },
})
