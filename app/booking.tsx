import React, { useState, useMemo, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, TextInput, Alert, Platform, Image, KeyboardAvoidingView, Keyboard,
  ActivityIndicator,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { searchHotels } from '../lib/hotels'
import { useLang } from '../lib/i18n'
import { getCurrency, formatPrice, convertPrice } from '../lib/currency'
import type { CurrencyCode } from '../lib/locale'
import { addBooking, createPendingBooking, updateBookingStatus } from '../lib/bookings-store'
import { syncBookingToSalesforce } from '../lib/salesforce'
import { activeGateway } from '../lib/payment-gateway'
import { supabase } from '../lib/supabase'
import { getOrCreateIntent, updateIntent } from '../lib/payment-intent'
import { pollBookingPaymentState } from '../lib/payment-status'
import { lockRoom, reconfirmBooking, realLockRoom, createRealBookingForm, finishRealBooking } from '../lib/ratehawk'
import type { RoomLock, RealBookingForm } from '../lib/ratehawk'
import { PaymentWebView } from '../components/PaymentWebView'
import { PLACEHOLDER_CHECKOUT_URL } from '../lib/payment-link'
import { Colors, Spacing, Radius, Typography, Shadows, Gradients } from '../constants/theme'
import type { Hotel, RoomType, Booking } from '../lib/types'
import { validateRoomsConfig } from '../lib/rooms-config'

// ── Types ──────────────────────────────────────────────────────────

type PayState = 'idle' | 'processing' | 'confirming' | 'declined' | 'network' | 'unavailable' | 'bookingFailedAfterPayment'
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
    const expRef = useRef<TextInput>(null)
    const cvcRef = useRef<TextInput>(null)

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
      if (d.length === 16) expRef.current?.focus()
    }

    const handleExp = (raw: string) => {
      const d = raw.replace(/\D/g, '').slice(0, 4)
      const formatted = d.length > 2 ? d.slice(0, 2) + ' / ' + d.slice(2) : d
      setExp(formatted)
      onValidChange(digits.length >= 15 && formatted.length >= 5 && cvc.length >= 3)
      if (d.length === 4) cvcRef.current?.focus()
    }

    const handleCvc = (raw: string) => {
      const d = raw.replace(/\D/g, '').slice(0, 4)
      setCvc(d)
      onValidChange(digits.length >= 15 && exp.length >= 5 && d.length >= 3)
      if (d.length === 4) Keyboard.dismiss()
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
              returnKeyType="next"
              onSubmitEditing={() => expRef.current?.focus()}
              blurOnSubmit={false}
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
              ref={expRef}
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
              returnKeyType="next"
              onSubmitEditing={() => cvcRef.current?.focus()}
              blurOnSubmit={false}
            />
          </View>
          <View style={s.halfDivider} />
          <View style={s.halfField}>
            <Text style={s.cardLabel}>{t.booking.cvc}</Text>
            <TextInput
              ref={cvcRef}
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
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
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
              <Text style={[s.devBtnText, { color: Colors.success }]}>{t.booking.useTest}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.devBtn}
              onPress={() => { setCard('4000 0000 0000 0002'); setExp('12 / 27'); setCvc('123'); onValidChange(true) }}
            >
              <Text style={[s.devBtnText, { color: Colors.error }]}>{t.booking.useDecline}</Text>
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
    roomData: string
    checkin: string
    checkout: string
    adults: string
    children: string
    rooms: string
    roomsConfig: string
    additionalGuestNames: string
    currency: string
    destination: string
    maxPricePerNight: string
  }>()

  // Guarded -- a malformed route param must never crash this screen, just
  // fall back to the flat rooms count below.
  const roomsConfig = useMemo(() => {
    if (!params.roomsConfig) return undefined
    try {
      return validateRoomsConfig(JSON.parse(params.roomsConfig))
    } catch {
      return undefined
    }
  }, [params.roomsConfig])

  // Load-bearing for the actual charge amount: must stay `roomsConfig?.length
  // || parseInt(...)`, not `??` -- this is what keeps the total correct even
  // after the /auth detour (which preserves the flat `rooms` param but may
  // not carry `roomsConfig`). See project memory:
  // balkanea-multiroom-booking-gap for why this exists.
  const roomCount = roomsConfig?.length || parseInt(params.rooms ?? '1', 10)

  const [fullName, setFullName] = useState('')
  // One lead-guest name per room beyond the first -- room 1's name is
  // `fullName` above (unchanged from before multi-room support existed).
  // Restores whatever was typed before an /auth detour, if any (guarded --
  // a malformed param must not crash this screen).
  const [additionalGuestNames, setAdditionalGuestNames] = useState<string[]>(() => {
    const empty = Array(Math.max(0, roomCount - 1)).fill('')
    if (!params.additionalGuestNames) return empty
    try {
      const restored = JSON.parse(params.additionalGuestNames)
      return Array.isArray(restored) && restored.length === empty.length
        ? restored.map(n => String(n))
        : empty
    } catch {
      return empty
    }
  })
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [payState, setPayState] = useState<PayState>('idle')
  const [cardReady, setCardReady] = useState(false)
  const cardRef = useRef<CardCaptureHandle>(null)
  const [showWebViewPreview, setShowWebViewPreview] = useState(false)

  // Real hosted-webview payment flow (lib/payment-gateway.ts's
  // hostedWebviewGateway). pendingBookingRef survives retries within this
  // screen session so a decline doesn't leave orphaned duplicate booking
  // rows sharing the same payment_reference — see lib/bookings-store.ts.
  const [paymentWebViewVisible, setPaymentWebViewVisible] = useState(false)
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null)
  const pendingBookingRef = useRef<Booking | null>(null)
  const pollHandleRef = useRef<{ stop: () => void } | null>(null)

  // Set once the RateHawk booking FORM (room.book_hash path only) is opened,
  // before the guest is charged -- per RateHawk's Best Practices for API
  // guide, the guest is charged between form and finish, never before form.
  // Survives retries the same way pendingBookingRef does, so a decline-then-
  // retry reuses the same open order instead of opening a second one.
  const ratehawkFormRef = useRef<RealBookingForm | null>(null)

  // Set once the RateHawk order is actually COMMITTED (finishRealBooking
  // succeeded) -- only after the guest's payment has captured. Distinct from
  // ratehawkFormRef: a payment retry must never re-open a new form once one
  // already exists, and finish must never be re-attempted once it already
  // succeeded.
  const ratehawkOrderRef = useRef<string | null>(null)

  // finishRealBooking's poll can run up to ~150s. If the guest navigates
  // away mid-poll (e.g. router.back() off the unavailable banner, or just
  // backgrounding), this screen unmounts but the awaited call in handlePay
  // keeps running -- guard every state write after that await so it doesn't
  // fire on an unmounted screen.
  const isMountedRef = useRef(true)
  useEffect(() => () => { isMountedRef.current = false }, [])

  // ── RateHawk room lock (holds the room before the guest pays) ────
  const [lock, setLock] = useState<RoomLock | null>(null)
  const [lockState, setLockState] = useState<LockState>('locking')
  const [holdSeconds, setHoldSeconds] = useState(0)

  const currency = (params.currency ?? getCurrency()) as CurrencyCode

  // Real RateHawk rooms (book_hash present) can't be re-found by id -- every
  // screen calls searchHotels() independently, and a real hotelpage call
  // returns a fresh book_hash each time, so this screen's own re-search below
  // would never contain the id room-selection.tsx saw. room-selection.tsx
  // carries the exact selected room forward as JSON for that case (see its
  // handleBookRoom) -- prefer it over the id lookup when present. Guarded:
  // a malformed param must fall back to the id lookup, not crash.
  const passedRoom = useMemo<RoomType | null>(() => {
    if (!params.roomData) return null
    try {
      const parsed = JSON.parse(params.roomData)
      return parsed && typeof parsed === 'object' && parsed.room_id ? parsed as RoomType : null
    } catch {
      return null
    }
  }, [params.roomData])

  const [{ hotel, room }, setHotelRoom] = useState<{ hotel: Hotel | null; room: RoomType | null }>({ hotel: null, room: null })
  const [hotelLoading, setHotelLoading] = useState(true)
  useEffect(() => {
    let cancelled = false
    if (!params.hotelId || !params.checkin || !params.checkout) {
      setHotelLoading(false)
      return
    }
    setHotelLoading(true)
    searchHotels({
      destination: params.destination ?? 'Hotel',
      checkin: params.checkin,
      checkout: params.checkout,
      adults: parseInt(params.adults ?? '2', 10),
      children: parseInt(params.children ?? '0', 10),
      rooms: parseInt(params.rooms ?? '1', 10),
      currency,
      // Must match the original search's price filter — see hotel-detail.tsx
      maxPricePerNight: params.maxPricePerNight ? parseFloat(params.maxPricePerNight) : undefined,
    }).then((results) => {
      if (cancelled) return
      // Hotel identity (name/images/address/hotel_id) is stable across
      // re-searches even for real hotels -- only room_id (book_hash) is
      // ephemeral, so the hotel is always safe to re-derive here.
      const h = results.find(r => r.hotel_id === params.hotelId) ?? null
      const rm = passedRoom ?? h?.room_types.find(r => r.room_id === params.roomId) ?? null
      setHotelRoom({ hotel: h, room: rm })
      setHotelLoading(false)
    })
    return () => { cancelled = true }
  }, [params.hotelId, params.roomId, params.checkin, params.checkout, params.destination, params.adults, params.children, params.rooms, currency, params.maxPricePerNight])

  const nights = useMemo(() => {
    if (!params.checkin || !params.checkout) return 1
    return Math.max(1, Math.round(
      (new Date(params.checkout).getTime() - new Date(params.checkin).getTime()) / 86_400_000
    ))
  }, [params.checkin, params.checkout])

  const adults = parseInt(params.adults ?? '2', 10)
  const children = parseInt(params.children ?? '0', 10)

  // Hold the room with RateHawk as soon as the guest reaches this screen —
  // payment can't start until a lock exists (see lib/ratehawk.ts). Rooms with
  // a real book_hash (live RateHawk search, currently only Los Angeles) get a
  // real prebook call here -- cheap and non-committing, no order created yet.
  // Every other room keeps using the simulated stub, untouched.
  const doLock = useCallback((h: Hotel, r: RoomType) => (
    r.book_hash ? realLockRoom(r.book_hash) : lockRoom(h.hotel_id, r.room_id)
  ), [])

  useEffect(() => {
    if (!hotel || !room) return
    let cancelled = false
    setLockState('locking')
    doLock(hotel, room).then(l => {
      if (cancelled) return
      setLock(l)
      setLockState('held')
    })
    return () => { cancelled = true }
  }, [hotel?.hotel_id, room?.room_id])

  // Countdown the hold; silently renew it if it runs out before payment.
  // Frozen once a pay attempt is in flight (payState !== 'idle') -- for the
  // real path, renewing mid-attempt would replace lock.lockId (the book_hash)
  // with one from a fresh prebook call that has nothing to do with whatever
  // RateHawk order handlePay already confirmed against the old value. See
  // handlePay's bookHashForPay capture below for the other half of this fix.
  useEffect(() => {
    if (!lock) return
    const tick = () => {
      const remaining = Math.max(0, Math.round((lock.expiresAt - Date.now()) / 1000))
      setHoldSeconds(remaining)
      if (remaining === 0 && hotel && room && lockState !== 'renewing' && payState === 'idle') {
        setLockState('renewing')
        doLock(hotel, room).then(l => {
          setLock(l)
          setLockState('held')
        })
      }
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [lock, hotel, room, lockState, payState])

  if (hotelLoading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.errorWrap}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    )
  }

  if (!hotel || !room) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.errorWrap}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.textLight} />
          <Text style={s.errorText}>{t.bookingDetail.notFound}</Text>
          <TouchableOpacity style={s.errorBtn} onPress={() => router.back()}>
            <Text style={s.errorBtnText}>{t.bookingDetail.goBack}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  // The actual price for this booking -- room.total_price is priced for ONE
  // room (matches RateHawk's real model: a rate is per room, price for N
  // rooms = rate × N). Every place that used to read room.total_price
  // directly for display or the real charge amount must use this instead;
  // `grep -n "room.total_price" app/booking.tsx` should find nothing below
  // this line.
  const grandTotal = room.total_price * roomCount

  // Real RateHawk hotels price in their own real currency (see the payCurrency
  // comment in handlePay below) -- grandTotal/room.total_price for those are
  // already in hotel.currency, not the app's selected display currency, so
  // every display/storage of THIS booking's price must use this instead of
  // the bare `currency` state. formatPrice(amount, 'USD') happens to render
  // correctly as-is ($ prefix, no wrongful EUR->USD conversion) since 'USD'
  // isn't in lib/currency.ts's RATES table.
  const bookingCurrency = (room.book_hash ? hotel.currency : currency) as CurrencyCode

  // Card entry only happens in-app for the simulated demo gateway — the
  // real gateway collects the card on Bankart's own WebView page, so
  // there's nothing here for the guest to fill in or for canPay to gate on.
  const isSimulated = activeGateway.id === 'simulated'
  const allGuestNamesFilled = fullName.trim().length > 0 && additionalGuestNames.every(n => n.trim().length > 0)
  const canPay = (!isSimulated || cardReady) && allGuestNamesFilled && !!email.trim() && payState === 'idle' && lockState === 'held'
  const payLabel = t.booking.payNow + ' ' + formatPrice(grandTotal, bookingCurrency)
  const busy = payState === 'processing' || payState === 'confirming'
  const holdLabel = `${Math.floor(holdSeconds / 60)}:${String(holdSeconds % 60).padStart(2, '0')}`
  const roomGuestNames = [fullName.trim(), ...additionalGuestNames.map(n => n.trim())]

  // Shared tail for both gateways once the charge is actually confirmed:
  // tell RateHawk the hold is now a real booking, sync to Salesforce, navigate.
  // Real hotels (book_hash) commit the actual RateHawk order HERE, only now
  // that payment has captured -- per RateHawk's Best Practices for API
  // guide. If that commit fails, the guest has already been charged but the
  // hotel booking isn't confirmed; flagged distinctly (bookingFailedAfterPayment)
  // rather than silently treated as a normal confirmation, and the Supabase
  // row (already optimistically marked 'confirmed' by the caller) is walked
  // back to 'pending' so support can find it.
  const finalizeConfirmedBooking = async (booking: Booking) => {
    setPayState('confirming')

    if (room?.book_hash && ratehawkFormRef.current && !ratehawkOrderRef.current) {
      const finish = await finishRealBooking({
        partnerOrderId: ratehawkFormRef.current.partnerOrderId,
        paymentType: ratehawkFormRef.current.paymentType,
        leadGuestName: fullName.trim(),
        adultsCount: adults,
        email: email.trim(),
        phone: phone.trim(),
      })
      if (!isMountedRef.current) return
      if (!finish.ok) {
        await updateBookingStatus(booking.id, { status: 'pending' })
        setPayState('bookingFailedAfterPayment')
        return
      }
      ratehawkOrderRef.current = ratehawkFormRef.current.orderId
      await updateBookingStatus(booking.id, { ratehawk_order_id: ratehawkOrderRef.current })
    } else {
      await reconfirmBooking(lock!.lockId)
    }

    syncBookingToSalesforce({
      guestName: fullName.trim(),
      guestEmail: email.trim(),
      guestPhone: phone.trim(),
      hotelName: hotel!.name,
      destination: params.destination ?? '',
      checkin: params.checkin,
      checkout: params.checkout,
      totalPrice: grandTotal,
      currency: bookingCurrency,
      confirmationCode: booking.confirmation_code,
    }).catch(() => { /* fire-and-forget */ })

    router.replace({ pathname: '/booking-confirmed', params: { id: booking.id } })
  }

  const handlePay = async () => {
    if (!canPay || !lock) return

    // Captured now, before any async step -- renewal freezes once payState
    // leaves 'idle' (see the countdown effect above), but this closes the
    // gap between now and that first setPayState call, and gives both the
    // confirm-gate and the payment reference below the exact same value
    // instead of two separate reads of `lock.lockId` that a renewal could
    // have changed in between.
    const bookHashForPay = lock.lockId

    if (!allGuestNamesFilled) { Alert.alert(t.booking.missingInfo, t.booking.enterName); return }
    if (!email.trim() || !email.includes('@')) { Alert.alert(t.booking.missingInfo, t.booking.enterEmail); return }

    // The real gateway needs a Supabase row payment-notify.js can find and
    // update — a guest's pending booking only ever lives in on-device
    // AsyncStorage (lib/bookings-store.ts), which the webhook can't see, so
    // it would never resolve. Gate here, before anything is created —
    // navigating to /auth unmounts this screen, which would otherwise leave
    // an orphaned pending booking / half-consumed room lock behind.
    if (activeGateway.id === 'hosted-webview') {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push({
          pathname: '/auth',
          params: {
            returnTo: 'booking',
            prefillName: fullName.trim(),
            prefillEmail: email.trim(),
            hotelId: params.hotelId,
            roomId: params.roomId,
            checkin: params.checkin,
            checkout: params.checkout,
            adults: params.adults ?? '2',
            children: params.children ?? '0',
            rooms: params.rooms ?? '1',
            roomsConfig: params.roomsConfig || '',
            // Additional guest names entered so far survive the detour too
            // (fullName/email are already carried via prefillName/prefillEmail
            // above) -- otherwise a guest who filled in room 2's name, then
            // had to log in, would find it blank again.
            additionalGuestNames: additionalGuestNames.length > 0 ? JSON.stringify(additionalGuestNames) : '',
            currency: params.currency ?? getCurrency(),
            destination: params.destination ?? '',
          },
        })
        return
      }
    }

    // Open the RateHawk order FORM before charging -- per RateHawk's Best
    // Practices for API guide, the guest is charged between form and finish,
    // not before form (this doesn't commit anything with the hotel yet) and
    // not skipping straight to finish (which would charge before RateHawk
    // has even opened the order). Skipped on a retry that already has an
    // open form (ratehawkFormRef) so a decline-then-retry reuses it instead
    // of opening a second one.
    if (room.book_hash && !ratehawkFormRef.current) {
      setPayState('confirming')
      const form = await createRealBookingForm(bookHashForPay)
      if (!isMountedRef.current) return
      if (!form.ok) {
        setPayState('unavailable')
        return
      }
      ratehawkFormRef.current = form
    }

    setPayState('processing')

    // Bankart's merchant account is confirmed EUR/MKD only, not USD (see
    // docs/bankart-payment-config.md's error_code 1000 finding, 2026-08-24 --
    // sending USD for the real LA test hotel reproduced that exact error).
    // There's no live USD FX feed in this codebase; TEST_USD_TO_MKD is a
    // fixed placeholder to unblock testing the payment gateway itself, same
    // category as lib/currency.ts's EUR->MKD test rate -- replace with real
    // FX before this goes live. The guest still sees the real USD price
    // on-screen (payLabel/bookingCurrency use grandTotal, untouched below);
    // only the actual Bankart charge and the booking record's stored
    // total_price/currency switch to MKD, so payment-notify.js's
    // amount/currency reconciliation matches what Bankart actually relays
    // back instead of mismatching against a USD total_price it never charged.
    //
    // Every other hotel keeps today's behavior: other display currencies
    // fall back to EUR. Multiply by roomCount BEFORE converting (grandTotal
    // already does this) rather than converting room.total_price and
    // multiplying after -- converting per room and summing would round once
    // per room instead of once total.
    const TEST_USD_TO_MKD = 56.5
    const payCurrency = room.book_hash ? 'MKD' as const : (currency === 'MKD' ? 'MKD' : 'EUR')
    const amount = room.book_hash ? Math.round(grandTotal * TEST_USD_TO_MKD) : convertPrice(grandTotal, payCurrency)
    // Reference is derived from the room lock captured at the top of this
    // function, not a fresh lock.lockId read — a retry after this screen was
    // backgrounded reuses the same gateway transaction instead of risking a
    // double charge, and (for the real path) stays the same value the
    // RateHawk order above was actually confirmed against.
    const intent = await getOrCreateIntent(bookHashForPay, amount, payCurrency)

    const [firstName, ...lastParts] = fullName.trim().split(/\s+/)

    const result = await activeGateway.createCheckoutSession({
      reference: intent.reference,
      amount,
      currency: payCurrency,
      guest: { firstName, lastName: lastParts.join(' '), email: email.trim(), phone: phone.trim() },
      simulateDecline: cardRef.current?.isDeclineDemo() ?? false,
    })

    if (result.kind === 'hosted-webview') {
      if ('error' in result) {
        await updateIntent(intent.reference, { state: 'failed' })
        setPayState('network')
        return
      }

      try {
        // A booking row has to exist before opening the WebView so
        // api/payment-notify.js has something to find — see
        // docs/bankart-payment-config.md. Reused across retries on this
        // screen (pendingBookingRef) so a decline doesn't leave duplicate
        // rows sharing the same payment_reference.
        if (!pendingBookingRef.current) {
          pendingBookingRef.current = await createPendingBooking({
            hotel,
            room,
            checkin: params.checkin,
            checkout: params.checkout,
            guests: {
              adults: parseInt(params.adults ?? '2', 10),
              children: parseInt(params.children ?? '0', 10),
            },
            rooms: parseInt(params.rooms ?? '1', 10),
            roomsConfig,
            roomGuestNames,
            // Must match what's actually charged (amount/payCurrency), not
            // the displayed grandTotal/bookingCurrency -- payment-notify.js
            // reconciles Bankart's relayed amount/currency against this row.
            total_price: amount,
            currency: payCurrency,
            guest_name: fullName.trim(),
            guest_email: email.trim(),
            guest_phone: phone.trim(),
            payment_reference: intent.reference,
            payment_state: 'preauth_pending',
            ratehawk_order_id: ratehawkOrderRef.current ?? undefined,
          })
        } else {
          // The room lock auto-renews every 60s in the background (see the
          // holding-effect above), which changes lock.lockId and therefore
          // intent.reference (derived from it) -- a retry after a renewal
          // would otherwise sign a new link under a reference that doesn't
          // match what's stored on this row, and the webhook would never
          // find it. Always resync payment_reference alongside the state
          // reset so it matches whatever reference is actually in play.
          await updateBookingStatus(pendingBookingRef.current.id, {
            payment_state: 'preauth_pending',
            payment_reference: intent.reference,
          })
        }
      } catch {
        setPayState('idle')
        Alert.alert(t.common.error, t.common.somethingWentWrong)
        return
      }

      setCheckoutUrl(result.checkoutUrl)
      setPaymentWebViewVisible(true)

      const bookingId = pendingBookingRef.current.id
      pollHandleRef.current?.stop()
      pollHandleRef.current = pollBookingPaymentState(
        bookingId,
        async (state) => {
          if (state === 'captured') {
            pollHandleRef.current = null
            await updateIntent(intent.reference, { state: 'captured' })
            await updateBookingStatus(bookingId, { status: 'confirmed', payment_state: 'captured' })
            await finalizeConfirmedBooking({ ...pendingBookingRef.current!, status: 'confirmed', payment_state: 'captured' })
          } else if (state === 'failed') {
            pollHandleRef.current = null
            await updateIntent(intent.reference, { state: 'failed' })
            await updateBookingStatus(bookingId, { payment_state: 'failed' })
            setPaymentWebViewVisible(false)
            setPayState('declined')
          }
        },
        (message) => {
          pollHandleRef.current = null
          setPaymentWebViewVisible(false)
          setPayState('network')
          console.warn('payment poll error:', message)
        },
      )
      return
    }

    if (!result.success) {
      await updateIntent(intent.reference, { state: 'failed' })
      setPayState(result.reason === 'network' ? 'network' : 'declined')
      return
    }

    await updateIntent(intent.reference, { state: 'captured', gatewayTransactionId: result.transactionId })

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
        roomsConfig,
        roomGuestNames,
        total_price: grandTotal,
        currency: bookingCurrency,
        guest_name: fullName.trim(),
        guest_email: email.trim(),
        guest_phone: phone.trim(),
        payment_reference: intent.reference,
        payment_state: 'captured',
        gateway_transaction_id: result.transactionId,
        ratehawk_order_id: ratehawkOrderRef.current ?? undefined,
      })

      await finalizeConfirmedBooking(newBooking)
    } catch {
      setPayState('idle')
      Alert.alert(t.common.error, t.common.somethingWentWrong)
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
            <Text style={s.summaryGuests}>
              {adults} {t.bookingDetail.adults}{children > 0 ? `, ${children} ${t.bookingDetail.children}` : ''}{roomCount > 1 ? ` · ${roomCount} rooms` : ''}
            </Text>
          </View>
          <View style={s.summaryPriceCol}>
            <Text style={s.summaryPrice}>{formatPrice(grandTotal, bookingCurrency)}</Text>
            <Text style={s.summaryTaxes}>{t.booking.taxesIncl}</Text>
          </View>
        </View>

        {/* ── Guest details ────────────────────────────────────── */}
        <Text style={s.sectionTitle}>{t.booking.guestDetails}</Text>
        <View style={s.fields}>
          <Field label={roomCount > 1 ? t.booking.guestNameForRoom.replace('{{n}}', '1') : t.booking.fullName} icon="person-outline">
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
          {additionalGuestNames.map((name, idx) => (
            <Field key={`room-guest-${idx}`} label={t.booking.guestNameForRoom.replace('{{n}}', String(idx + 2))} icon="person-outline">
              <TextInput
                style={s.fieldInput}
                value={name}
                onChangeText={(text) => setAdditionalGuestNames(prev => prev.map((v, i) => i === idx ? text : v))}
                placeholder="Marko Petrov"
                placeholderTextColor={Colors.textLight}
                autoCapitalize="words"
                editable={!busy}
                textContentType="name"
                autoComplete="name"
              />
            </Field>
          ))}
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
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
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
        {/* Hidden once a pay attempt starts -- renewal is frozen then (see the
            countdown effect above), so this would otherwise sit at a stale
            "Room held · 0:00" for the ~90s a real RateHawk confirm-gate runs. */}
        {lockState === 'held' && payState === 'idle' && (
          <View style={s.holdBanner}>
            <Ionicons name="lock-closed-outline" size={14} color={Colors.success} />
            <Text style={s.holdBannerText}>
              {t.booking.roomHeld.replace('{{time}}', holdLabel)}
            </Text>
          </View>
        )}

        {/* Room unavailable banner -- real RateHawk booking failed before any
            charge was attempted (see the confirm-gate in handlePay). Sends
            the guest back to pick a different room rather than retry the
            same now-unavailable one. */}
        {payState === 'unavailable' && (
          <View style={s.errorBanner}>
            <Ionicons name="alert-circle" size={16} color={Colors.error} />
            <Text style={s.errorBannerText}>{t.booking.roomUnavailable}</Text>
            <TouchableOpacity onPress={() => router.back()} style={s.retryBtn}>
              <Text style={s.retryText}>{t.booking.chooseAnotherRoom}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Declined banner */}
        {payState === 'declined' && (
          <View style={s.errorBanner}>
            <Ionicons name="alert-circle" size={16} color={Colors.error} />
            <Text style={s.errorBannerText}>{t.booking.declined}</Text>
            <TouchableOpacity onPress={handleRetry} style={s.retryBtn}>
              <Text style={s.retryText}>{t.common.retry}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Payment succeeded but the RateHawk order couldn't be committed --
            real money already moved, so this must never offer a "retry"
            (would risk a second charge) or "choose another room" (implies
            nothing happened yet). Routes to the bookings dashboard, where
            the flagged 'pending' row and existing support/escalation
            channels live. */}
        {payState === 'bookingFailedAfterPayment' && (
          <View style={s.errorBanner}>
            <Ionicons name="alert-circle" size={16} color={Colors.error} />
            <Text style={s.errorBannerText}>{t.booking.bookingFailedAfterPayment}</Text>
            <TouchableOpacity onPress={() => router.replace('/(tabs)/trips')} style={s.retryBtn}>
              <Text style={s.retryText}>{t.booking.viewBookings}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Network error banner */}
        {payState === 'network' && (
          <View style={[s.errorBanner, s.networkBanner]}>
            <Ionicons name="wifi-outline" size={16} color="#92400E" />
            <Text style={[s.errorBannerText, s.networkBannerText]}>{t.booking.networkErr}</Text>
            <TouchableOpacity onPress={handleRetry} style={s.retryBtn}>
              <Text style={s.retryText}>{t.common.retry}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Card capture — demo-only. The real gateway collects the card on
            Bankart's own WebView page, opened after tapping Pay below. */}
        {isSimulated && (
          <CardCapture
            ref={cardRef}
            disabled={busy}
            onValidChange={setCardReady}
          />
        )}
        {!isSimulated && (
          <View style={s.realGatewayNotice}>
            <Ionicons name="shield-checkmark-outline" size={16} color={Colors.success} />
            <Text style={s.realGatewayNoticeText}>
              You'll enter your card details on the next screen, hosted securely by our payment provider.
            </Text>
          </View>
        )}

        {/* Dev-only preview of the WebView payment container against a
            placeholder URL — separate from the real instance below, which
            only opens once handlePay has a signed card_url. */}
        {__DEV__ && (
          <TouchableOpacity style={s.webviewPreviewBtn} onPress={() => setShowWebViewPreview(true)}>
            <Ionicons name="globe-outline" size={14} color={Colors.textSecondary} />
            <Text style={s.webviewPreviewBtnText}>Preview WebView payment (dev)</Text>
          </TouchableOpacity>
        )}

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

      <PaymentWebView
        visible={paymentWebViewVisible && !!checkoutUrl}
        checkoutUrl={checkoutUrl ?? PLACEHOLDER_CHECKOUT_URL}
        onClose={() => {
          // Guest closed manually before a terminal result arrived. The
          // Notify relay (server-side) will still resolve the booking even
          // without the app watching — this just stops polling and lets
          // them retry from this screen; retry reuses the same booking row.
          pollHandleRef.current?.stop()
          pollHandleRef.current = null
          setPaymentWebViewVisible(false)
          setPayState('idle')
        }}
        onError={(message) => {
          pollHandleRef.current?.stop()
          pollHandleRef.current = null
          setPaymentWebViewVisible(false)
          setPayState('network')
          console.warn('PaymentWebView load error:', message)
        }}
        onResult={() => {
          // UX-only bridge signal, not proof of payment (see
          // components/PaymentWebView.tsx) — dismiss the page and let the
          // poll (already running) drive the actual outcome.
          setPaymentWebViewVisible(false)
        }}
      />

      {__DEV__ && (
        <PaymentWebView
          visible={showWebViewPreview}
          checkoutUrl={PLACEHOLDER_CHECKOUT_URL}
          onClose={() => setShowWebViewPreview(false)}
          onError={(message) => {
            setShowWebViewPreview(false)
            Alert.alert('WebView preview — error', message)
          }}
        />
      )}
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
  summaryGuests: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
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
  realGatewayNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.sm + 2,
  },
  realGatewayNoticeText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    flex: 1,
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

  // Dev-only WebView payment preview trigger
  webviewPreviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.border,
  },
  webviewPreviewBtnText: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '600' },

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
