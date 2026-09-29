import AsyncStorage from '@react-native-async-storage/async-storage'

// The guest's residency for RateHawk pricing (Ray, 2026-09-29): the country
// they pick in the app's country selector, defaulting to 'mk' -- most
// Balkanea guests live in North Macedonia. Residency can change rates, and a
// book_hash is bound to it, so every pricing call (search, room rates, the
// booking screen's re-check, Nea's search) must send the same value.
//
// Saved ONLY when the guest actually picks a country (setResidency from the
// country selector) -- the chat screen's automatic default ('gb' for
// English) must not overwrite 'mk'.

const KEY = 'balkanea_residency'
let current = 'mk'

AsyncStorage.getItem(KEY).then(v => { if (v && /^[a-z]{2}$/.test(v)) current = v }).catch(() => {})

export function getResidency(): string {
  return current
}

export function setResidency(countryCode: string): void {
  const code = (countryCode || '').toLowerCase()
  if (!/^[a-z]{2}$/.test(code)) return
  current = code
  AsyncStorage.setItem(KEY, code).catch(() => {})
}
