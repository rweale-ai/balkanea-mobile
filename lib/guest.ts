import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY = 'balkanea_guest_mode'

let _guest = false
const _listeners: Array<(v: boolean) => void> = []

AsyncStorage.getItem(KEY).then(v => {
  _guest = v === 'true'
  _listeners.forEach(l => l(_guest))
})

export function isGuest(): boolean {
  return _guest
}

export async function setGuestMode(enabled: boolean) {
  _guest = enabled
  if (enabled) {
    await AsyncStorage.setItem(KEY, 'true')
  } else {
    await AsyncStorage.removeItem(KEY)
  }
  _listeners.forEach(l => l(_guest))
}

export function onGuestChange(listener: (v: boolean) => void): () => void {
  _listeners.push(listener)
  return () => {
    const idx = _listeners.indexOf(listener)
    if (idx !== -1) _listeners.splice(idx, 1)
  }
}
