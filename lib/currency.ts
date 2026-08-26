import { useState, useEffect, useCallback } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { CurrencyCode } from './locale'

// Single shared, persisted currency preference — mirrors lib/i18n.ts's
// useLang() pattern exactly. Previously there were three disconnected
// currency states: the Search tab's own local useState (seeded from app
// language, changeable via its LocaleSelector), Profile's Currency pill
// (persisted to AsyncStorage under this same key, but nothing ever read
// it back), and Explore, which had no currency concept at all and always
// fell through to a hardcoded 'EUR' default several screens downstream.
// A guest could set MKD in one place and still get charged in EUR with no
// indication why. This is the one place that preference actually lives now.

const CURRENCY_KEY = 'balkanea_currency'

let _currency: CurrencyCode = 'EUR'
let _ready = false
const _listeners: Array<(c: CurrencyCode) => void> = []

AsyncStorage.getItem(CURRENCY_KEY).then(v => {
  if (v) _currency = v as CurrencyCode
  _ready = true
  _listeners.forEach(l => l(_currency))
})

export async function setAppCurrency(currency: CurrencyCode) {
  _currency = currency
  await AsyncStorage.setItem(CURRENCY_KEY, currency)
  _listeners.forEach(l => l(_currency))
}

export function useCurrency() {
  const [currency, setLocal] = useState<CurrencyCode>(_currency)
  const [ready, setReady] = useState(_ready)

  useEffect(() => {
    setLocal(_currency)
    if (_ready) setReady(true)
    const listener = (c: CurrencyCode) => { setLocal(c); setReady(true) }
    _listeners.push(listener)
    return () => {
      const idx = _listeners.indexOf(listener)
      if (idx !== -1) _listeners.splice(idx, 1)
    }
  }, [])

  const changeCurrency = useCallback(async (c: CurrencyCode) => {
    await setAppCurrency(c)
  }, [])

  return { currency, setCurrency: changeCurrency, ready }
}

/** For non-component code / route-param fallbacks that need the current
 * currency without the useCurrency() hook. */
export function getCurrency(): CurrencyCode {
  return _currency
}

// All hotel/room prices throughout the app (hotel-db.js's simulated
// pricing, generateHotels()'s fallback) are EUR-denominated numbers,
// regardless of the traveler's selected display currency — there's no
// live FX feed. formatPrice is the one place that converts for display.
// Only MKD has a real conversion rate wired up so far (matches the rate
// already used and tested in booking.tsx's payment-amount calculation,
// extracted here so every screen uses the identical number, not a
// re-typed copy that can drift). The other 6 supported currencies (USD,
// GBP, CHF, RSD, BAM, ALL, HRK) fall back to showing the EUR amount with
// that currency's code as a label — not a real conversion, but at least
// not silently wrong-looking the way a raw EUR number with a foreign
// symbol slapped on it would be. Extend RATES/symbols here if real FX
// support is needed for those.
const RATES: Partial<Record<CurrencyCode, number>> = {
  MKD: 61.5,
}

const SYMBOLS: Partial<Record<CurrencyCode, string>> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
}

/** Formats a EUR-denominated amount for display in the given currency. */
export function formatPrice(eurAmount: number, currency: CurrencyCode): string {
  const rate = RATES[currency]
  if (rate) {
    const converted = Math.round(eurAmount * rate)
    return currency === 'MKD' ? `${converted.toLocaleString('en-US')} ден` : `${converted.toLocaleString('en-US')} ${currency}`
  }
  const symbol = SYMBOLS[currency]
  return symbol ? `${symbol}${eurAmount}` : `${eurAmount} ${currency}`
}

/** The actual numeric amount to charge in the given currency (not a display string) — same EUR base, same rate table as formatPrice. */
export function convertPrice(eurAmount: number, currency: CurrencyCode): number {
  const rate = RATES[currency]
  return rate ? Math.round(eurAmount * rate) : eurAmount
}

// Bankart/NLB (the real payment gateway) only has an MKD merchant account —
// confirmed directly by Hristijan, 2026-08-25 — so every real charge is MKD
// regardless of what currency the traveler sees on screen. For a real
// RateHawk booking, the amount being converted is a REAL quote (EUR or USD,
// see Chat/api/hotel-rooms.js), NOT the app-wide simulated-EUR convention
// RATES/convertPrice above assume — so it needs its own rate per quote
// currency, not RATES.MKD. EUR uses the same peg as RATES.MKD (the denar is
// EUR-pegged, so that rate is stable); USD is a plain approximate market
// rate (no live FX feed here either) — using the wrong one silently over-
// or under-charges the guest by the EUR/USD spread, so callers must pass
// the room's actual quoted currency, never assume.
const MKD_RATE_FROM_QUOTE: Record<'EUR' | 'USD', number> = {
  EUR: 61.5,
  USD: 56.5,
}

/** Converts a REAL quoted amount (already EUR or USD from RateHawk, not the app's simulated-EUR convention) to the MKD amount actually charged via Bankart. */
export function convertQuoteToMKD(amount: number, quoteCurrency: 'EUR' | 'USD'): number {
  return Math.round(amount * MKD_RATE_FROM_QUOTE[quoteCurrency])
}
