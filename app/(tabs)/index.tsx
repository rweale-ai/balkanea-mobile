import React, { useState, useRef, useCallback, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, Animated,
  SafeAreaView, Linking, Alert, Keyboard, ScrollView, Image,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useRouter } from 'expo-router'
import { VoiceHUD } from '../../components/VoiceHUD'
import { sendMessage } from '../../lib/claude'
import { startVoiceCall, stopVoiceCall } from '../../lib/voice'
import type { CallStatus, TranscriptEntry, AgentLang } from '../../lib/voice'
import type { ChatMessage, Hotel, HotelSearchParams } from '../../lib/types'
import { consumeExploreIntent } from '../../lib/explore-intent'
import { LocaleSelector } from '../../components/LocaleSelector'
import type { CountryCode, CurrencyCode } from '../../lib/locale'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getUser, signOut } from '../../lib/auth'
import { useLang } from '../../lib/i18n'
import { setGuestMode } from '../../lib/guest'
import { Colors, Spacing, Radius, Typography, Shadows, Gradients } from '../../constants/theme'

const BALKANEA_PHONE = '+38923100200'

type ChatItem = ChatMessage & {
  searchParams?: HotelSearchParams
  escalation?: boolean
  hotels?: Hotel[]
}

// ── Typing dots ────────────────────────────────────────────────────

function TypingDots() {
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ]
  useEffect(() => {
    dots.forEach((d, i) => {
      Animated.loop(Animated.sequence([
        Animated.delay(i * 180),
        Animated.timing(d, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.timing(d, { toValue: 0, duration: 280, useNativeDriver: true }),
        Animated.delay((2 - i) * 180),
      ])).start()
    })
  }, [])
  return (
    <View style={styles.dotsRow}>
      <View style={styles.dotsBubble}>
        {dots.map((d, i) => (
          <Animated.View key={i} style={[styles.dot, {
            opacity: d.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] }),
            transform: [{ translateY: d.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
          }]} />
        ))}
      </View>
    </View>
  )
}

// ── Hotel carousel ─────────────────────────────────────────────────

function HotelCarousel({ hotels, onPress }: { hotels: Hotel[]; onPress: (h: Hotel) => void }) {
  return (
    <View style={styles.carouselWrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carouselScroll} decelerationRate="fast" snapToInterval={232}>
        {hotels.slice(0, 6).map(h => (
          <TouchableOpacity key={h.hotel_id} style={styles.hCard} activeOpacity={0.85} onPress={() => onPress(h)}>
            <Image source={{ uri: h.images?.[0] ?? `https://picsum.photos/seed/${h.hotel_id}/400/300` }} style={styles.hCardImg} />
            <View style={styles.hCardBody}>
              <Text style={styles.hCardName} numberOfLines={1}>{h.name}</Text>
              <View style={styles.hCardMeta}>
                <View style={styles.starsRow}>
                  {Array.from({ length: h.stars }).map((_, i) => <Ionicons key={i} name="star" size={9} color={Colors.star} />)}
                </View>
                {h.guest_rating > 0 && <View style={styles.ratingPill}><Text style={styles.ratingText}>{h.guest_rating.toFixed(1)}</Text></View>}
              </View>
              <View style={styles.hCardPriceRow}>
                <Text style={styles.hCardPrice}>€{h.price_per_night}</Text>
                <Text style={styles.hCardPerNight}>/night</Text>
                <View style={styles.hCardGo}><Ionicons name="arrow-forward" size={11} color={Colors.primary} /></View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )
}

// ── Escalation buttons ─────────────────────────────────────────────

function EscalationInline() {
  const { t } = useLang()
  return (
    <View style={styles.escRow}>
      <TouchableOpacity style={styles.escBtn} activeOpacity={0.8} onPress={() => Linking.openURL(`tel:${BALKANEA_PHONE}`)}>
        <LinearGradient colors={Gradients.primaryFade} style={styles.escBtnFill}>
          <Ionicons name="call-outline" size={13} color="#fff" />
          <Text style={styles.escBtnLight}>{t.actions.callAgent}</Text>
        </LinearGradient>
      </TouchableOpacity>
      <TouchableOpacity style={styles.escBtnOut} activeOpacity={0.8} onPress={() => Alert.alert(t.actions.callbackRequested, t.actions.callbackMessage, [{ text: t.actions.ok }])}>
        <Ionicons name="time-outline" size={13} color={Colors.primary} />
        <Text style={styles.escBtnDark}>{t.actions.callback}</Text>
      </TouchableOpacity>
    </View>
  )
}

// ── Bubble ──────────────────────────────────────────────────────────

function Bubble({ item, onHotelPress }: { item: ChatItem; onHotelPress: (h: Hotel) => void }) {
  const isUser = item.role === 'user'
  return (
    <View style={[styles.bubbleRow, isUser && styles.bubbleRowUser]}>
      {!isUser && (
        <LinearGradient colors={Gradients.primaryFade} style={styles.bubbleAvatar}>
          <Text style={styles.bubbleAvatarText}>B</Text>
        </LinearGradient>
      )}
      <View style={[styles.bubbleCol, isUser && styles.bubbleColUser]}>
        {isUser ? (
          <LinearGradient colors={Gradients.primaryFade} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.bubble, styles.bubbleUser]}>
            <Text style={styles.textUser}>{item.content}</Text>
          </LinearGradient>
        ) : (
          <View style={[styles.bubble, styles.bubbleBot]}>
            <Text style={styles.textBot}>{item.content}</Text>
          </View>
        )}
        {item.hotels && item.hotels.length > 0 && (
          <HotelCarousel hotels={item.hotels} onPress={onHotelPress} />
        )}
        {item.escalation && <EscalationInline />}
      </View>
    </View>
  )
}

// ── Main screen ────────────────────────────────────────────────────

export default function SearchScreen() {
  const router = useRouter()
  const { t, setLang: setAppLang } = useLang()
  const [userName, setUserName] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatItem[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [callStatus, setCallStatus] = useState<CallStatus>('idle')
  const [agentTalking, setAgentTalking] = useState(false)
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const [country, setCountry] = useState<CountryCode>('mk')
  const [currency, setCurrency] = useState<CurrencyCode>('EUR')
  const lang: AgentLang = country === 'mk' ? 'mk' : 'en'
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null)
  const listRef = useRef<FlatList>(null)
  const inputRef = useRef<TextInput>(null)
  const handleSendRef = useRef<(text: string) => void>(() => {})

  const [showIntro, setShowIntro] = useState(false)
  const hasMessages = messages.length > 0

  const scrollToEnd = () => setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 120)

  useEffect(() => {
    getUser().then(u => {
      if (u?.user_metadata?.full_name) {
        const first = u.user_metadata.full_name.split(' ')[0]
        setUserName(first)
      }
    })
    AsyncStorage.getItem('balkanea_intro_seen').then(v => {
      if (v !== 'true') setShowIntro(true)
    })
  }, [])

  useFocusEffect(useCallback(() => {
    const intent = consumeExploreIntent()
    if (intent) setPendingPrompt(intent)
    const t1 = setTimeout(() => inputRef.current?.focus(), 100)
    const t2 = setTimeout(() => inputRef.current?.focus(), 400)
    const t3 = setTimeout(() => inputRef.current?.focus(), 800)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, []))

  useEffect(() => {
    if (pendingPrompt && !loading) {
      const text = pendingPrompt
      setPendingPrompt(null)
      handleSendRef.current(text)
    }
  }, [pendingPrompt, loading])

  const handleVoicePress = useCallback(async () => {
    if (callStatus === 'active' || callStatus === 'connecting') {
      setCallStatus('ending')
      stopVoiceCall()
      setAgentTalking(false)
      setTranscript([])
      return
    }
    await startVoiceCall(lang, {
      onStatusChange: setCallStatus,
      onAgentTalking: setAgentTalking,
      onTranscriptUpdate: setTranscript,
      onError: (msg) => {
        setCallStatus('idle')
        setAgentTalking(false)
        setTranscript([])
        const translated = msg.includes('not available') ? t.chat.voiceNotAvailable
          : msg.includes('failed') ? t.chat.voiceFailed
          : t.chat.voiceError
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: translated, timestamp: new Date() }])
      },
    })
  }, [callStatus, lang, t])

  const handleSend = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    if (showIntro) {
      AsyncStorage.setItem('balkanea_intro_seen', 'true')
      setShowIntro(false)
    }

    const userMsg: ChatItem = { id: Date.now().toString(), role: 'user', content: trimmed, timestamp: new Date() }
    const allMessages = [...messages, userMsg]
    setMessages(allMessages)
    setInput('')
    setLoading(true)
    scrollToEnd()

    const response = await sendMessage(allMessages)
    const hasVisual = response.type === 'hotels' || response.type === 'escalation'
    if (hasVisual) Keyboard.dismiss()

    setMessages(prev => [...prev, {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: response.content,
      timestamp: new Date(),
      hotels: response.type === 'hotels' ? response.hotels : undefined,
      searchParams: response.type === 'hotels' ? response.searchParams : undefined,
      escalation: response.type === 'escalation',
    }])
    setLoading(false)
    scrollToEnd()
    if (!hasVisual) setTimeout(() => inputRef.current?.focus(), 150)
  }, [messages, loading])

  useEffect(() => { handleSendRef.current = handleSend }, [handleSend])

  const handleHotelPress = useCallback((hotel: Hotel, params?: HotelSearchParams) => {
    router.push({
      pathname: '/hotel-detail',
      params: {
        hotelId: hotel.hotel_id,
        checkin: params?.checkin ?? '2026-08-10',
        checkout: params?.checkout ?? '2026-08-15',
        adults: String(params?.adults ?? 2),
        children: String(params?.children ?? 0),
        rooms: String(params?.rooms ?? 1),
        currency: params?.currency ?? currency,
        destination: params?.destination ?? '',
      },
    })
  }, [currency, router])

  const renderItem = useCallback(({ item }: { item: ChatItem }) => (
    <Bubble item={item} onHotelPress={(h) => handleHotelPress(h, item.searchParams)} />
  ), [handleHotelPress])

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 30}>

        {/* Top bar — menu left, locale right */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.topBtn} activeOpacity={0.7} onPress={() => {
            Alert.alert(t.menu.title, undefined, [
              { text: t.menu.myBookings, onPress: () => router.navigate('/trips') },
              { text: t.menu.exploreDestinations, onPress: () => router.navigate('/explore') },
              { text: t.menu.signOut, style: 'destructive', onPress: async () => { await setGuestMode(false); await signOut() } },
              { text: t.menu.cancel, style: 'cancel' },
            ])
          }}>
            <Ionicons name="menu-outline" size={22} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.topRight}>
            <LocaleSelector country={country} currency={currency} onCountryChange={(c) => { setCountry(c); setAppLang(c === 'mk' ? 'mk' : 'en') }} onCurrencyChange={setCurrency} />
          </View>
        </View>

        {hasMessages ? (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={m => m.id}
            renderItem={renderItem}
            style={styles.flex}
            contentContainerStyle={styles.list}
            onContentSizeChange={scrollToEnd}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            ListFooterComponent={loading ? <TypingDots /> : null}
          />
        ) : (
          <ScrollView contentContainerStyle={styles.greetingScroll} keyboardShouldPersistTaps="handled">
            <View style={styles.greeting}>
              <Image source={require('../../assets/balkanea-logo.png')} style={styles.greetingLogo} resizeMode="contain" />
              <Text style={styles.greetingText}>{userName ? t.chat.greetingPersonal.replace('{{name}}', userName) : t.chat.greeting}</Text>
            </View>
            {showIntro && (
              <View style={styles.introSection}>
                <View style={styles.introBubble}>
                  <LinearGradient colors={Gradients.primaryFade} style={styles.introAvatar}>
                    <Text style={styles.introAvatarText}>B</Text>
                  </LinearGradient>
                  <Text style={styles.introText}>{t.chat.introMessage}</Text>
                </View>
                <View style={styles.introSamples}>
                  {[t.chat.introSample1, t.chat.introSample2, t.chat.introSample3].map(s => (
                    <TouchableOpacity key={s} style={styles.introSampleBtn} activeOpacity={0.7} onPress={() => {
                      AsyncStorage.setItem('balkanea_intro_seen', 'true')
                      setShowIntro(false)
                      handleSend(s)
                    }}>
                      <Text style={styles.introSampleText}>{s}</Text>
                      <Ionicons name="arrow-forward" size={12} color={Colors.primary} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        )}

        {/* Input card */}
        <View style={styles.inputCard}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={t.chat.messagePlaceholder}
            placeholderTextColor={Colors.textLight}
            maxLength={500}
            returnKeyType="send"
            blurOnSubmit={false}
            autoFocus
            onSubmitEditing={() => handleSend(input)}
          />
          <View style={styles.inputActions}>
            <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={() => router.navigate('/explore')}>
              <Ionicons name="compass-outline" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={() => router.navigate('/trips')}>
              <Ionicons name="briefcase-outline" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={handleVoicePress}>
              <Ionicons
                name={callStatus === 'active' ? 'stop-circle' : 'mic-outline'}
                size={20}
                color={callStatus === 'active' ? Colors.error : Colors.textSecondary}
              />
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            {input.trim() ? (
              <TouchableOpacity onPress={() => handleSend(input)} disabled={loading} activeOpacity={0.7}>
                <LinearGradient colors={loading ? [Colors.border, Colors.border] : Gradients.primaryFade} style={styles.sendBtn}>
                  <Ionicons name="arrow-up" size={18} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

      </KeyboardAvoidingView>
      <VoiceHUD transcript={transcript} agentTalking={agentTalking} callStatus={callStatus} onEndCall={handleVoicePress} />
    </SafeAreaView>
  )
}

// ── Styles ─────────────────────────────────────────────────────────

const CARD_W = 220

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    gap: Spacing.sm,
  },
  topBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  topRight: { flexDirection: 'row', alignItems: 'center' },

  // Greeting
  greetingScroll: { flexGrow: 1, justifyContent: 'center' },
  greeting: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  greetingLogo: {
    width: 120,
    height: 36,
    marginBottom: Spacing.sm,
  },
  greetingText: {
    ...Typography.h1,
    color: Colors.text,
    fontSize: 22,
  },

  // Messages list
  list: { paddingTop: Spacing.sm, paddingBottom: Spacing.sm, flexGrow: 1 },

  // Bubbles
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: Spacing.sm, marginBottom: 6 },
  bubbleRowUser: { justifyContent: 'flex-end' },
  bubbleAvatar: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginTop: 2, marginRight: 6 },
  bubbleAvatarText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  bubbleCol: { maxWidth: '82%' },
  bubbleColUser: { alignItems: 'flex-end' },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 2 },
  bubbleUser: { borderBottomRightRadius: 4 },
  bubbleBot: { backgroundColor: Colors.surface, borderBottomLeftRadius: 4 },
  textUser: { ...Typography.body, color: '#fff', fontSize: 14 },
  textBot: { ...Typography.body, color: Colors.text, fontSize: 14 },

  // Typing
  dotsRow: { paddingHorizontal: Spacing.sm + 26 + 6, marginBottom: 6 },
  dotsBubble: { flexDirection: 'row', gap: 5, backgroundColor: Colors.surface, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12, alignSelf: 'flex-start' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.primary },

  // Hotel carousel
  carouselWrap: { marginTop: 6, marginBottom: 2 },
  carouselScroll: { paddingRight: Spacing.md, gap: 8 },
  hCard: { width: CARD_W, backgroundColor: Colors.surface, borderRadius: Radius.md, overflow: 'hidden', ...Shadows.sm },
  hCardImg: { width: CARD_W, height: 100 },
  hCardBody: { padding: 8 },
  hCardName: { ...Typography.bodyMedium, color: Colors.text, fontSize: 12, marginBottom: 3 },
  hCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  starsRow: { flexDirection: 'row', gap: 1 },
  ratingPill: { backgroundColor: Colors.accent, borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1 },
  ratingText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  hCardPriceRow: { flexDirection: 'row', alignItems: 'baseline' },
  hCardPrice: { ...Typography.h3, color: Colors.primary, fontSize: 15 },
  hCardPerNight: { ...Typography.caption, color: Colors.textSecondary, fontSize: 10, marginLeft: 2 },
  hCardGo: { marginLeft: 'auto', width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },

  // Escalation
  escRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  escBtn: { flex: 1, borderRadius: Radius.sm, overflow: 'hidden' },
  escBtnFill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: Radius.sm },
  escBtnLight: { ...Typography.button, color: '#fff', fontSize: 12 },
  escBtnOut: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: Radius.sm, borderWidth: 1.5, borderColor: Colors.primary },
  escBtnDark: { ...Typography.button, color: Colors.primary, fontSize: 12 },

  // Input card
  inputCard: {
    marginHorizontal: Spacing.sm,
    marginBottom: Platform.OS === 'ios' ? 4 : Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  input: {
    paddingHorizontal: Spacing.md,
    paddingTop: Platform.OS === 'ios' ? 12 : 10,
    paddingBottom: 8,
    ...Typography.body,
    color: Colors.text,
    fontSize: 15,
    minHeight: 42,
  },
  inputActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingBottom: 8,
    gap: 4,
  },
  actionBtn: { padding: 6 },
  sendBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

  // Intro (first time)
  introSection: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
  introBubble: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md,
    marginBottom: Spacing.md, ...Shadows.sm,
  },
  introAvatar: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm,
  },
  introAvatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  introText: { ...Typography.body, color: Colors.text, fontSize: 14, lineHeight: 22 },
  introSamples: { gap: 6 },
  introSampleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 4,
    borderWidth: 1, borderColor: Colors.border,
  },
  introSampleText: { ...Typography.body, color: Colors.text, fontSize: 14, flex: 1, marginRight: 8 },
})
