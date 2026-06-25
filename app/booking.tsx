import React, { useState, useMemo } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, TextInput, Alert, Platform,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { searchHotelsSync } from '../lib/hotels'
import { useLang } from '../lib/i18n'
import { addBooking } from '../lib/bookings-store'
import { syncBookingToSalesforce } from '../lib/salesforce'
import { Colors, Spacing, Radius, Typography, Shadows, Gradients } from '../constants/theme'
import type { Hotel, RoomType } from '../lib/types'

export default function BookingScreen() {
  const router = useRouter()
  const { t } = useLang()
  const params = useLocalSearchParams<{
    hotelId: string
    roomId: string
    checkin: string
    checkout: string
    adults: string
    children: string
    rooms: string
    currency: string
    destination: string
  }>()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { hotel, room } = useMemo<{ hotel: Hotel | null; room: RoomType | null }>(() => {
    if (!params.hotelId || !params.checkin || !params.checkout) return { hotel: null, room: null }
    const results = searchHotelsSync({
      destination: params.destination || 'Hotel',
      checkin: params.checkin,
      checkout: params.checkout,
      adults: parseInt(params.adults || '2', 10),
      children: parseInt(params.children || '0', 10),
      rooms: parseInt(params.rooms || '1', 10),
      currency: params.currency || 'EUR',
    })
    const h = results.find(r => r.hotel_id === params.hotelId) || null
    const rm = h?.room_types.find(r => r.room_id === params.roomId) || null
    return { hotel: h, room: rm }
  }, [params.hotelId, params.roomId, params.checkin, params.checkout, params.destination, params.adults, params.children, params.rooms, params.currency])

  const nights = useMemo(() => {
    if (!params.checkin || !params.checkout) return 1
    return Math.max(1, Math.round(
      (new Date(params.checkout).getTime() - new Date(params.checkin).getTime()) / 86400000
    ))
  }, [params.checkin, params.checkout])

  const currencySymbol = (params.currency || 'EUR') === 'EUR' ? '€'
    : (params.currency || 'EUR') === 'USD' ? '$'
    : (params.currency || 'EUR') === 'GBP' ? '£'
    : params.currency || 'EUR'

  if (!hotel || !room) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.textLight} />
          <Text style={styles.emptyText}>Booking details not found</Text>
          <TouchableOpacity style={styles.goBackBtn} onPress={() => router.back()}>
            <Text style={styles.goBackBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const handleConfirm = async () => {
    if (!fullName.trim()) {
      Alert.alert(t.booking.missingInfo, t.booking.enterName)
      return
    }
    if (!email.trim() || !email.includes('@')) {
      Alert.alert(t.booking.missingInfo, t.booking.enterEmail)
      return
    }

    setIsSubmitting(true)

    try {
      const newBooking = addBooking({
        hotel,
        room,
        checkin: params.checkin,
        checkout: params.checkout,
        guests: {
          adults: parseInt(params.adults || '2', 10),
          children: parseInt(params.children || '0', 10),
        },
        rooms: parseInt(params.rooms || '1', 10),
        total_price: room.total_price,
        currency: params.currency || 'EUR',
        guest_name: fullName.trim(),
        guest_email: email.trim(),
        guest_phone: phone.trim(),
      })

      // Fire-and-forget Salesforce sync
      syncBookingToSalesforce({
        guestName: fullName.trim(),
        guestEmail: email.trim(),
        guestPhone: phone.trim(),
        hotelName: hotel.name,
        destination: params.destination || '',
        checkin: params.checkin,
        checkout: params.checkout,
        totalPrice: room.total_price,
        currency: params.currency || 'EUR',
        confirmationCode: newBooking.confirmation_code,
      }).catch(() => { /* fire-and-forget */ })

      router.replace({
        pathname: '/booking-confirmed',
        params: { id: newBooking.id },
      })
    } catch (e) {
      Alert.alert('Error', 'Something went wrong. Please try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.booking.completeBooking}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Booking Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>{t.booking.bookingSummary}</Text>

          <View style={styles.summaryRow}>
            <Ionicons name="business-outline" size={16} color={Colors.primary} />
            <Text style={styles.summaryText}>{hotel.name}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Ionicons name="bed-outline" size={16} color={Colors.primary} />
            <Text style={styles.summaryText}>{room.name}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
            <Text style={styles.summaryText}>{params.checkin} to {params.checkout}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Ionicons name="moon-outline" size={16} color={Colors.primary} />
            <Text style={styles.summaryText}>{nights} night{nights !== 1 ? 's' : ''}</Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryTotalRow}>
            <Text style={styles.summaryTotalLabel}>Total</Text>
            <Text style={styles.summaryTotalPrice}>{currencySymbol}{room.total_price}</Text>
          </View>
        </View>

        {/* Guest Details */}
        <View style={styles.formSection}>
          <Text style={styles.formSectionTitle}>{t.booking.guestDetails}</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t.booking.fullName}</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={18} color={Colors.textLight} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="John Smith"
                placeholderTextColor={Colors.textLight}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t.booking.emailAddress}</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={18} color={Colors.textLight} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="john@example.com"
                placeholderTextColor={Colors.textLight}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t.booking.phoneNumber}</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={18} color={Colors.textLight} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="+1 234 567 890"
                placeholderTextColor={Colors.textLight}
                keyboardType="phone-pad"
              />
            </View>
          </View>
        </View>

        {/* Payment Section */}
        <View style={styles.formSection}>
          <Text style={styles.formSectionTitle}>{t.booking.payment}</Text>

          <View style={styles.paymentCard}>
            <View style={styles.paymentHeader}>
              <Ionicons name="card-outline" size={22} color={Colors.primary} />
              <Text style={styles.paymentTitle}>Credit Card</Text>
            </View>

            <View style={styles.paymentInputContainer}>
              <Ionicons name="lock-closed-outline" size={16} color={Colors.textLight} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.paymentInput]}
                value="**** **** **** 0000"
                editable={false}
                placeholderTextColor={Colors.textLight}
              />
            </View>

            <View style={styles.paymentNotice}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.accent} />
              <Text style={styles.paymentNoticeText}>{t.booking.simulatedPayment}</Text>
            </View>
          </View>
        </View>

        {/* Bottom spacer */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Confirm Button */}
      <View style={styles.confirmBar}>
        <TouchableOpacity
          style={[styles.confirmButton, isSubmitting && styles.confirmButtonDisabled]}
          onPress={handleConfirm}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={Gradients.primaryFade}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.confirmGradient}
          >
            <Ionicons name={isSubmitting ? 'hourglass-outline' : 'checkmark-circle'} size={20} color="#fff" />
            <Text style={styles.confirmButtonText}>
              {isSubmitting ? t.booking.confirming : t.booking.confirmBooking}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.md,
  },

  /* Empty */
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  emptyText: {
    ...Typography.h2,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  goBackBtn: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
  },
  goBackBtnText: {
    ...Typography.button,
    color: '#fff',
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.surface,
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.h3,
    color: Colors.text,
  },

  /* Summary Card */
  summaryCard: {
    margin: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    ...Shadows.md,
  },
  summaryLabel: {
    ...Typography.overline,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
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
  summaryDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.sm,
  },
  summaryTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryTotalLabel: {
    ...Typography.h3,
    color: Colors.text,
  },
  summaryTotalPrice: {
    ...Typography.h2,
    color: Colors.primary,
  },

  /* Form */
  formSection: {
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.md,
  },
  formSectionTitle: {
    ...Typography.h3,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
  },
  inputIcon: {
    marginRight: Spacing.xs,
  },
  input: {
    flex: 1,
    ...Typography.body,
    color: Colors.text,
    paddingVertical: Platform.OS === 'ios' ? Spacing.sm + 2 : Spacing.sm,
  },

  /* Payment */
  paymentCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  paymentTitle: {
    ...Typography.h3,
    color: Colors.text,
  },
  paymentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.borderLight,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
  },
  paymentInput: {
    color: Colors.textSecondary,
  },
  paymentNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    backgroundColor: Colors.accentLight,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
  },
  paymentNoticeText: {
    ...Typography.caption,
    color: Colors.accentDark,
    fontWeight: '500',
  },

  /* Confirm bar */
  confirmBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? Spacing.xl : Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    ...Shadows.lg,
  },
  confirmButton: {
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  confirmButtonText: {
    ...Typography.button,
    color: '#fff',
    fontSize: 17,
  },
})
