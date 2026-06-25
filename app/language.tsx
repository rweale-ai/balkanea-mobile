import React from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Image,
} from 'react-native'
import { useRouter } from 'expo-router'
import { setLang } from '../lib/i18n'
import type { Language } from '../lib/i18n'
import { Colors, Spacing, Radius, Typography, Shadows } from '../constants/theme'

export default function LanguageScreen() {
  const router = useRouter()

  const handleSelect = async (lang: Language) => {
    await setLang(lang)
    router.replace('/auth')
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Image source={require('../assets/balkanea-logo.png')} style={styles.logo} resizeMode="contain" />

        <View style={styles.buttons}>
          <TouchableOpacity style={styles.langBtn} activeOpacity={0.8} onPress={() => handleSelect('mk')}>
            <Image source={{ uri: 'https://flagcdn.com/w80/mk.png' }} style={styles.flag} />
            <View style={styles.langInfo}>
              <Text style={styles.langName}>Македонски</Text>
              <Text style={styles.langSub}>Македонија</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.langBtn} activeOpacity={0.8} onPress={() => handleSelect('en')}>
            <Image source={{ uri: 'https://flagcdn.com/w80/gb.png' }} style={styles.flag} />
            <View style={styles.langInfo}>
              <Text style={styles.langName}>English</Text>
              <Text style={styles.langSub}>United Kingdom</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  logo: { width: 160, height: 48, marginBottom: Spacing.xxl },
  buttons: { width: '100%', gap: Spacing.md },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadows.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  flag: { width: 40, height: 28, borderRadius: 4 },
  langInfo: { flex: 1 },
  langName: { ...Typography.h2, color: Colors.text, fontSize: 18 },
  langSub: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
})
