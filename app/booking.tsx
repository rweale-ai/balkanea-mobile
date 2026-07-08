import React, { useState, useMemo, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, TextInput, Alert, Platform, Image, KeyboardAvoidingView,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { searchHotelsSync } from '../lib/hotels'
import { useLang } from '../lib/i18n'
import { addBooking } from '../lib/bookings-store'
import { syncBookingToSalesforce } from '../lib/salesforce'
import { chargeCard } from '../lib/bank-payment'
import { lockRoom, reconfirmBooking } from '../lib/ratehawk'
import type { RoomLock } from '../lib/ratehawk'
import { Colors, Spacing, Radius, Typography, Shadows, Gradients } from '../constants/theme'
import type { Hotel, RoomType } from '../lib/types'

// ── Types ──────────────────────────────────────────────────────────

type PayState = 'idle' | 'processing' | 'confirming' | 'declined' | 'network'
type LockState = 'locking' | 'held' | 'renewing'
type CardBrand = 'visa' | 'mc' | null

// ── Card capture handle (PAN stays here, never lifted) ─────────────

interface CardCaptureHandle {
  isValid(): boolean
  /** Demo-only: derived from entered digits, never the raw PAN */
  isDeclineDemo(): boolean
}

interface CardCaptureProps {
  disabled: boolean
  onValidChange: (valid: boolean) => void
}

// Demo test number that triggers a decline in lib/bank-payment.ts.
// In production this component is replaced by the bank's own card-capture SDK.
const DECLINE_SUFFIX = '0002'

const CardCapture = forwardRef<CardCaptureHandle, CardCaptureProps>(
  function CardCapture({ disabled, onValidChange }, ref) {
    const { t } = useLang()
    const [card, setCard] = useState('')
    const [exp, setExp] = useState('')
    const [cvc, setCvc] = useState('')

    const digits = card.replace(/\s/g, '')
    const brand: CardBrand = digits.startsWith('4') ? 'visa' : digits.startsWith('5') ? 'mc' : null
    const valid = digits.length >= 15 && exp.length >= 5 && cvc.length >= 3

    useImperativeHandle(ref, () => ({
      isValid: () => valid,
      isDeclineDemo: () => digits.endsWith(DECLINE_SUFFIX),
    }))

    const handleCard = (raw: string) => {
      const d = raw.replace(/\D/g, '').slice(0, 16)
      const spaced = d.replace(/(.{4})/g, '$1 ').trim()
      const next = valid !== (d.length >= 15 && exp.length >= 5 && cvc.length >= 3)
      setCard(spaced)
      if (next !== undefined) onValidChange(d.length >= 15 && exp.length >= 5 && cvc.length >= 3)
    }

    const handleExp = (raw: string) => {
      const d = raw.replace(/\D/g, '').slice(0, 4)
      const formatted = d.length > 2 ? d.slice(0, 2) + ' / ' + d.slice(2) : d
      setExp(formatted)
      onValidChange(digits.length >= 15 && formatted.length >= 5 && cvc.length >= 3)
    }

    const handleCvc = (raw: string) => {
      const d = raw.replace(/\D/g, '').slice(0, 4)
      setCvc(d)
      onValidChange(digits.length >= 15 && exp.length >= 5 && d.length >= 3)
    }

    return (
      <View style={s.cardBox}>
        {/* Card number row */}
        <View style={s.cardRow}>
          <Text style={s.cardLabel}>{t.booking.cardNumber}</Text>
          <View style={s.cardFieldWrap}>
            <TextInput
              style={s.cardInput}
              value={card}
              onChangeText={handleCard}
              placeholder="1234 5678 9012 3456"
              placeholderTextColor={Colors.textLight}
              keyboardType="number-pad"
              maxLength={19}
              editable={!disabled}
              textContentType="creditCardNumber"
              autoComplete="cc-number"
            />
            {brand === 'visa' && (
              <Text style={s.brandVisa}>VISA</Text>
            )}
            {brand === 'mc' && (
              <View style={s.brandMcWrap}>
                <View style={[s.brandMcCircle, { backgroundColor: '#EB001B', marginRight: -6 }]} />
                <View style={[s.brandMcCircle, { backgroundColor: '#F79E1B', opacity: 0.9 }]} />
              </View>
            )}
          </View>
          <View style={s.cardDivider} />
        </View>

        {/* Expiry + CVC */}
        <View style={s.cardRowHalf}>
          <View style={s.halfField}>
            <Text style={s.cardLabel}>{t.booking.expiry}</Text>
            <TextInput
              style={[s.cardInput, s.halfInput]}
              value={exp}
              onChangeText={handleExp}
              placeholder="MM / YY"
              placeholderTextColor={Colors.textLight}
              keyboardType="number-pad"
              maxLength={7}
              editable={!disabled}
              textContentType="creditCardExpiration"
              autoComplete="cc-exp"
            />
          </View>
          <View style={s.halfDivider} />
          <View style={s.halfField}>
            <Text style={s.cardLabel}>{t.booking.cvc}</Text>
            <TextInput
              style={[s.cardInput, s.halfInput]}
              value={cvc}
              onChangeText={handleCvc}
              placeholder="123"
              placeholderTextColor={Colors.textLight}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              editable={!disabled}
              textContentType="creditCardSecurityCode"
              autoComplete="cc-csc"
            />
          </View>
        </View>

        {/* Accepted cards */}
        <View style={s.acceptedRow}>
          <Text style={s.acceptedLabel}>{t.booking.acceptedCards}</Text>
          <Text style={s.acceptedVisa}>VISA</Text>
          <View style={s.brandMcWrap}>
            <View style={[s.brandMcCircle, s.brandMcSm, { backgroundColor: '#EB001B', marginRight: -5 }]} />
            <View style={[s.brandMcCircle, s.brandMcSm, { backgroundColor: '#F79E1B', opacity: 0.9 }]} />
          </View>
        </View>

        {/* Demo helpers — visible only in development builds */}
        {__DEV__ && (
          <View style={s.devRow}>
            <TouchableOpacity
              style={s.devBtn}
              onPress={() => { setCard('4242 4242 4242 4242'); setExp('12 / 27'); setCvc('123'); onValidChange(true) }}
            >
              <Text style={[s.devBtnText, { color: Colors.success }]}>Fill test card</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.devBtn}
              onPress={() => { setCard('4000 0000 0000 0002'); setExp('12 / 27'); setCvc('123'); onValidChange(true) }}
            >
              <Text style={[s.devBtnText, { color: Colors.error }]}>Decline card</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    )
  }
)

// ── Main screen ────────────────────────────────────────────────────

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
  const [payState, setPayState] = useState<PayState>('idle')
  const [cardReady, setCardReady] = useState(false)
  const cardRef = useRef<CardCaptureHandle>(null)

  // ── RateHawk room lock (holds the room before the guest pays) ────
  const [lock, setLock] = useState<RoomLock | null>(null)
  const [lockState, setLockState] = useState<LockState>('locking')
  const [holdSeconds, setHoldSeconds] = useState(0)

  const currency = params.currency ?? 'EUR'
  const isMKD = currency === 'MKD'
  const MKD_RATE = 61.5

  const formatPrice = useCallback((eur: number) => {
    if (isMKD) return `${Math.round(eur * MKD_RATE).toLocaleString('en-US')} ден`
    return `€${eur}`
  }, [isMKD])

  const { hotel, room } = useMemo<{ hotel: Hotel | null; room: RoomType | null }>(() => {
    if (!params.hotelId || !params.checkin || !params.checkout) return { hotel: null, room: null }
    const results = searchHotelsSync({
      destination: params.destination ?? 'Hotel',
      checkin: params.checkin,
      checkout: params.checkout,
      adults: parseInt(params.adults ?? '2', 10),
      children: parseInt(params.children ?? '0', 10),
      rooms: parseInt(params.rooms ?? '1', 10),
      currency,
    })
    const h = results.find(r => r.hotel_id === params.hotelId) ?? null
    const rm = h?.room_types.find(r => r.room_id === params.roomId) ?? null
    return { hotel: h, room: rm }
  }, [params.hotelId, params.roomId, params.checkin, params.checkout, params.destination, params.adults, params.children, params.rooms, currency])

  const nights = useMemo(() => {
    if (!params.checkin || !params.checkout) return 1
    return Math.max(1, Math.round(
      (new Date(params.checkout).getTime() - new Date(params.checkin).getTime()) / 86_400_000
    ))
  }, [params.checkin, params.checkout])

  // Hold the room with RateHawk as soon as the guest reaches this screen —
  // payment can't start until a lock exists (see lib/ratehawk.ts).
  useEffect(() => {
    if (!hotel || !room) return
    let cancelled = false
    setLockState('locking')
    lockRoom(hotel.hotel_id, room.room_id).then(l => {
      if (cancelled) return
      setLock(l)
      setLockState('held')
    })
    return () => { cancelled = true }
  }, [hotel?.hotel_id, room?.room_id])

  // Countdown the hold; silently renew it if it runs out before payment.
  useEffect(() => {
    if (!lock) return
    const tick = () => {
      const remaining = Math.max(0, Math.round((lock.expiresAt - Date.now()) / 1000))
      setHoldSeconds(remaining)
      if (remaining === 0 && hotel && room && lockState !== 'renewing') {
        setLockState('renewing')
        lockRoom(hotel.hotel_id, room.room_id).then(l => {
          setLock(l)
          setLockState('held')
        })
      }
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [lock, hotel, room, lockState])

  if (!hotel || !room) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.errorWrap}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.textLight} />
          <Text style={s.errorText}>Booking details not found</Text>
          <TouchableOpacity style={s.errorBtn} onPress={() => router.back()}>
            <Text style={s.errorBtnText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const canPay = cardReady && !!fullName.trim() && !!email.trim() && payState === 'idle' && lockState === 'held'
  const payLabel = t.booking.payNow + ' ' + formatPrice(room.total_price)
  const busy = payState === 'processing' || payState === 'confirming'
  const holdLabel = `${Math.floor(holdSeconds / 60)}:${String(holdSeconds % 60).padStart(2, '0')}`

  const handlePay = async () => {
    if (!canPay || !lock) return

    if (!fullName.trim()) { Alert.alert(t.booking.missingInfo, t.booking.enterName); return }
    if (!email.trim() || !email.includes('@')) { Alert.alert(t.booking.missingInfo, t.booking.enterEmail); return }

    setPayState('processing')

    const result = await chargeCard({
      amount: isMKD ? Math.round(room.total_price * MKD_RATE) : room.total_price,
      currency: isMKD ? 'MKD' : 'EUR',
      simulateDecline: cardRef.current?.isDeclineDemo() ?? false,
    })

    if (result.success === false) {
      setPayState(result.reason === 'network' ? 'network' : 'declined')
      return
    }

    // Bank charge succeeded — tell RateHawk the hold is now a real booking
    // before creating the local record and syncing to Salesforce.
    setPayState('confirming')
    await reconfirmBooking(lock.lockId)

    try {
      const newBooking = await addBooking({
        hotel,
        room,
        checkin: params.checkin,
        checkout: params.checkout,
        guests: {
          adults: parseInt(params.adults ?? '2', 10),
          children: parseInt(params.children ?? '0', 10),
        },
        rooms: parseInt(params.rooms ?? '1', 10),
        total_price: room.total_price,
        currency,
        guest_name: fullName.trim(),
        guest_email: email.trim(),
        guest_phone: phone.trim(),
      })

      syncBookingToSalesforce({
        guestName: fullName.trim(),
        guestEmail: email.trim(),
        guestPhone: phone.trim(),
        hotelName: hotel.name,
        destination: params.destination ?? '',
        checkin: params.checkin,
        checkout: params.checkout,
        totalPrice: room.total_price,
        currency,
        confirmationCode: newBooking.confirmation_code,
      }).catch(() => { /* fire-and-forget */ })

      router.replace({ pathname: '/booking-confirmed', params: { id: newBooking.id } })
    } catch {
      setPayState('idle')
      Alert.alert('Error', 'Something went wrong. Please try again.')
    }
  }

  const handleRetry = () => setPayState('idle')

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.headerBack} onPress={() => router.back()} disabled={busy}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t.booking.completeBooking}</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={s.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Booking summary ─────────────────────────────────── */}
        <View style={s.summaryCard}>
          {hotel.images?.[0] ? (
            <Image source={{ uri: hotel.images[0] }} style={s.summaryThumb} resizeMode="cover" />
          ) : (
            <LinearGradient colors={Gradients.primaryFade} style={s.summaryThumb} />
          )}
          <View style={s.summaryInfo}>
            <Text style={s.summaryHotel} numberOfLines={1}>{hotel.name}</Text>
            <Text style={s.summaryRoom} numberOfLines={1}>{room.name}</Text>
            <Text style={s.summaryDates}>
              {params.checkin} → {params.checkout} · {nights} {t.booking.nights}
            </Text>
          </View>
          <View style={s.summaryPriceCol}>
            <Text style={s.summaryPrice}>{formatPrice(room.total_price)}</Text>
            <Text style={s.summaryTaxes}>{t.booking.taxesIncl}</Text>
          </View>
        </View>

        {/* ── Guest details ────────────────────────────────────── */}
        <Text style={s.sectionTitle}>{t.booking.guestDetails}</Text>
        <View style={s.fields}>
          <Field label={t.booking.fullName} icon="person-outline">
            <TextInput
              style={s.fieldInput}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Marko Petrov"
              placeholderTextColor={Colors.textLight}
              autoCapitalize="words"
              editable={!busy}
              textContentType="name"
              autoComplete="name"
            />
          </Field>
          <Field label={t.booking.emailAddress} icon="mail-outline">
            <TextInput
              style={s.fieldInput}
              value={email}
              onChangeText={setEmail}
              placeholder="marko@example.com"
              placeholderTextColor={Colors.textLight}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!busy}
              textContentType="emailAddress"
              autoComplete="email"
            />
          </Field>
          <Field label={t.booking.phoneNumber} icon="call-outline">
            <TextInput
              style={s.fieldInput}
              value={phone}
              onChangeText={setPhone}
              placeholder="+389 70 123 456"
              placeholderTextColor={Colors.textLight}
              keyboardType="phone-pad"
              editable={!busy}
              textContentType="telephoneNumber"
              autoComplete="tel"
            />
          </Field>
        </View>

        {/* ── Payment ─────────────────────────────────────────── */}
        <View style={s.payHeader}>
          <Text style={s.sectionTitle}>{t.booking.payTitle}</Text>
          <View style={s.secureTag}>
            <Ionicons name="lock-closed" size={11} color={Colors.success} />
            <Text style={s.secureTagText}>{t.booking.securedPayment}</Text>
          </View>
        </View>

        {/* Room hold status */}
        {(lockState === 'locking' || lockState === 'renewing') && (
          <View style={s.holdBanner}>
            <Ionicons name="time-outline" size={14} color={Colors.primary} />
            <Text style={s.holdBannerText}>
              {lockState === 'locking' ? t.booking.holdingRoom : t.booking.renewingHold}
            </Text>
          </View>
        )}
        {lockState === 'held' && (
          <View style={s.holdBanner}>
            <Ionicons name="lock-closed-outline" size={14} color={Colors.success} />
            <Text style={s.holdBannerText}>
              {t.booking.roomHeld.replace('{{time}}', holdLabel)}
            </Text>
          </View>
        )}

        {/* Declined banner */}
        {payState === 'declined' && (
          <View style={s.errorBanner}>
            <Ionicons name="alert-circle" size={16} color={Colors.error} />
            <Text style={s.errorBannerText}>{t.booking.declined}</Text>
          </View>
        )}

        {/* Network error banner */}
        {payState === 'network' && (
          <View style={[s.errorBanner, s.networkBanner]}>
            <Ionicons name="wifi-outline" size={16} color="#92400E" />
            <Text style={[s.errorBannerText, s.networkBannerText]}>{t.booking.networkErr}</Text>
            <TouchableOpacity onPress={handleRetry} style={s.retryBtn}>
              <Text style={s.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Card capture — PAN stays inside this component */}
        <CardCapture
          ref={cardRef}
          disabled={busy}
          onValidChange={setCardReady}
        />

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* ── Fixed pay bar ────────────────────────────────────── */}
      <View style={s.payBar}>
        <TouchableOpacity
          style={[s.payBtn, !canPay && s.payBtnDisabled]}
          onPress={handlePay}
          disabled={!canPay}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={canPay ? Gradients.primaryFade : [Colors.borderLight, Colors.borderLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.payBtnGradient}
          >
            {busy ? (
              <>
                <Ionicons name="reload" size={18} color={Colors.textSecondary} />
                <Text style={[s.payBtnText, { color: Colors.textSecondary }]}>
                  {payState === 'confirming' ? t.booking.confirming : t.booking.processing}
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="lock-closed" size={16} color={canPay ? '#fff' : Colors.textLight} />
                <Text style={[s.payBtnText, !canPay && s.payBtnTextDisabled]}>
                  {payLabel}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

// ── Field wrapper ──────────────────────────────────────────────────

function Field({ label, icon, children }: {
  label: string
  icon: React.ComponentProps<typeof Ionicons>['name']
  children: React.ReactNode
}) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={s.fieldWrap}>
        <Ionicons name={icon} size={17} color={Colors.textLight} style={s.fieldIcon} />
        {children}
      </View>
    </View>
  )
}

// ── Styles ─────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  keyboardAvoid: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: Spacing.md },

  // Error state
  errorWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  errorText: { ...Typography.h2, color: Colors.textSecondary, marginTop: Spacing.md },
  errorBtn: { marginTop: Spacing.lg, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, backgroundColor: Colors.primary, borderRadius: Radius.md },
  errorBtnText: { ...Typography.button, color: '#fff' },

  // Header
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
  headerBack: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...Typography.h3, color: Colors.text },

  // Summary card
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    ...Shadows.md,
  },
  summaryThumb: {
    width: 62, height: 62,
    borderRadius: Radius.md,
    flexShrink: 0,
  },
  summaryInfo: { flex: 1, minWidth: 0 },
  summaryHotel: { ...Typography.bodyMedium, color: Colors.text, fontWeight: '700', fontSize: 15 },
  summaryRoom: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  summaryDates: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  summaryPriceCol: { alignItems: 'flex-end', flexShrink: 0 },
  summaryPrice: { ...Typography.h2, color: Colors.primary },
  summaryTaxes: { ...Typography.caption, color: Colors.textLight, fontSize: 10, marginTop: 2 },

  // Section title
  sectionTitle: { ...Typography.h3, color: Colors.text, marginHorizontal: Spacing.md, marginTop: Spacing.md, marginBottom: Spacing.sm },

  // Guest fields
  fields: { paddingHorizontal: Spacing.md, gap: Spacing.sm },
  field: {},
  fieldLabel: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '600', marginBottom: 5 },
  fieldWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
  },
  fieldIcon: { marginRight: 7 },
  fieldInput: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 13 : 11,
    ...Typography.body,
    color: Colors.text,
    fontSize: 15,
  },

  // Payment header row
  payHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  secureTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  secureTagText: {
    ...Typography.caption,
    color: Colors.success,
    fontWeight: '600',
    fontSize: 11,
  },

  // Room hold banner
  holdBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.sm - 1,
  },
  holdBannerText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 12,
  },

  // Error banners
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: Radius.md,
    padding: Spacing.sm + 2,
  },
  errorBannerText: {
    ...Typography.caption,
    color: '#B91C1C',
    fontWeight: '600',
    flex: 1,
  },
  networkBanner: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  networkBannerText: { color: '#92400E' },
  retryBtn: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#FDE68A', borderRadius: Radius.sm },
  retryText: { ...Typography.caption, color: '#92400E', fontWeight: '700' },

  // Card capture box
  cardBox: {
    marginHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  cardRow: {},
  cardLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: 5,
  },
  cardFieldWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardInput: {
    flex: 1,
    ...Typography.body,
    color: Colors.text,
    fontSize: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    letterSpacing: 0.5,
  },
  halfInput: {
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
  },
  cardDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.sm,
  },
  cardRowHalf: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-start',
  },
  halfField: { flex: 1 },
  halfDivider: {
    width: 1,
    backgroundColor: Colors.borderLight,
    marginTop: 22,
    height: 32,
  },

  // Card brand icons
  brandVisa: {
    fontSize: 13,
    fontWeight: '900',
    fontStyle: 'italic',
    color: '#1A1F71',
    marginLeft: Spacing.sm,
  },
  brandMcWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  brandMcCircle: {
    width: 18, height: 18,
    borderRadius: 9,
  },
  brandMcSm: {
    width: 14, height: 14, borderRadius: 7,
  },

  // Accepted cards row
  acceptedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm + 4,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  acceptedLabel: {
    ...Typography.caption,
    color: Colors.textLight,
    fontSize: 11,
  },
  acceptedVisa: {
    fontSize: 11,
    fontWeight: '900',
    fontStyle: 'italic',
    color: '#1A1F71',
  },

  // Dev helpers
  devRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  devBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: Colors.borderLight,
    borderRadius: Radius.sm,
  },
  devBtnText: { ...Typography.caption, fontWeight: '700', fontSize: 11 },

  // Pay bar
  payBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? Spacing.xl : Spacing.md,
    backgroundColor: 'rgba(248,249,250,0.96)',
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    ...Shadows.lg,
  },
  payBtn: { borderRadius: Radius.full, overflow: 'hidden' },
  payBtnDisabled: { opacity: 0.7 },
  payBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: Spacing.sm,
  },
  payBtnText: {
    ...Typography.button,
    color: '#fff',
    fontSize: 17,
  },
  payBtnTextDisabled: { color: Colors.textLight },
})
