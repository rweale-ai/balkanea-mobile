import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { en } from './en'
import { mk } from './mk'
import type { TranslationKeys } from './en'

export type Language = 'en' | 'mk'

const LANG_KEY = 'balkanea_language'
const translations: Record<Language, TranslationKeys> = { en, mk }

let _lang: Language = 'en'
let _ready = false
const _listeners: Array<(lang: Language) => void> = []

AsyncStorage.getItem(LANG_KEY).then(v => {
  if (v === 'mk' || v === 'en') _lang = v
  _ready = true
  _listeners.forEach(l => l(_lang))
})

export function getLang(): Language {
  return _lang
}

export function isLangReady(): boolean {
  return _ready
}

export async function setLang(lang: Language) {
  _lang = lang
  await AsyncStorage.setItem(LANG_KEY, lang)
  _listeners.forEach(l => l(_lang))
}

export function onLangChange(listener: (lang: Language) => void): () => void {
  _listeners.push(listener)
  return () => {
    const idx = _listeners.indexOf(listener)
    if (idx !== -1) _listeners.splice(idx, 1)
  }
}

export function t(lang?: Language): TranslationKeys {
  return translations[lang ?? _lang]
}

export function useLang(): { lang: Language; setLang: (l: Language) => Promise<void>; t: TranslationKeys; ready: boolean } {
  const [lang, setLangState] = useState<Language>(_lang)
  const [ready, setReady] = useState(_ready)

  useEffect(() => {
    if (_ready && lang !== _lang) setLangState(_lang)
    if (_ready && !ready) setReady(true)
    return onLangChange(l => { setLangState(l); setReady(true) })
  }, [])

  const changeLang = useCallback(async (l: Language) => {
    await setLang(l)
  }, [])

  return { lang, setLang: changeLang, t: translations[lang], ready }
}

export async function hasChosenLanguage(): Promise<boolean> {
  const v = await AsyncStorage.getItem(LANG_KEY)
  return v !== null
}
