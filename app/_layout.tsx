import { useEffect, useState } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { View, Text } from 'react-native'
import { onAuthStateChange, getSession } from '../lib/auth'
import { isGuest, onGuestChange } from '../lib/guest'
import { hasChosenLanguage, useLang } from '../lib/i18n'
import { checkVersionGate } from '../lib/version-gate'
import type { AuthSession } from '../lib/auth'

export function ErrorBoundary({ error }: { error: Error }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FF6B6B', padding: 20 }}>
      <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 8 }}>App Error</Text>
      <Text style={{ color: '#fff', fontSize: 13, textAlign: 'center' }}>{error.message}</Text>
    </View>
  )
}

export default function RootLayout() {
  const [session, setSession] = useState<AuthSession | null | undefined>(undefined)
  const [guest, setGuest] = useState(isGuest())
  const [langChosen, setLangChosen] = useState<boolean | undefined>(undefined)
  const [ready, setReady] = useState(false)
  const { ready: langReady } = useLang()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    checkVersionGate().then(() =>
      Promise.all([
        getSession(),
        hasChosenLanguage(),
      ])
    ).then(([s, lc]) => {
      setSession(s)
      setGuest(isGuest())
      setLangChosen(lc)
      setReady(true)
    })
    const unsubAuth = onAuthStateChange(setSession)
    const unsubGuest = onGuestChange(setGuest)
    return () => { unsubAuth(); unsubGuest() }
  }, [])

  useEffect(() => {
    if (!ready || langChosen === undefined) return

    const inLang = segments[0] === 'language'
    const inAuth = segments[0] === 'auth'
    const authenticated = !!session || guest

    if (!langChosen && !inLang) {
      router.replace('/language')
    } else if (langChosen && !authenticated && !inAuth && !inLang) {
      router.replace('/auth')
    } else if (langChosen && authenticated && (inAuth || inLang)) {
      router.replace('/(tabs)')
    }
  }, [session, guest, langChosen, segments, ready])

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  )
}
