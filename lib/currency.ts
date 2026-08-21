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
