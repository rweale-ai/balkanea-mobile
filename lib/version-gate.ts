import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'
import { signOut } from './auth'
import { setGuestMode } from './guest'

const KEY = 'balkanea_last_seen_version'

// Forces a fresh install or an update to a new version to land on the auth
// screen — signs out any persisted session/guest mode so app/_layout.tsx's
// auth gate routes to /auth instead of skipping straight into the tabs.
export async function checkVersionGate(): Promise<void> {
  const currentVersion = Constants.expoConfig?.version ?? 'unknown'
  const lastSeen = await AsyncStorage.getItem(KEY)
  if (lastSeen !== currentVersion) {
    await Promise.all([
      signOut().catch(() => {}),
      setGuestMode(false),
    ])
    await AsyncStorage.setItem(KEY, currentVersion)
  }
}
