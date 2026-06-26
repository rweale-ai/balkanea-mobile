import React, {
  useState, useRef, useCallback, useEffect,
} from 'react'
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, Animated,
  SafeAreaView, Linking, Alert, Keyboard, ScrollView,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router'
import { VoiceHUD } from '../../components/VoiceHUD'
import { sendMessage } from '../../lib/claude'
import { startVoiceCall, stopVoiceCall } from '../../lib/voice'
import type { CallStatus, TranscriptEntry, AgentLang } from '../../lib/voice'
import type { ChatMessage, ChatBlock, Hotel, HotelSearchParams } from '../../lib/types'
import { consumeExploreIntent } from '../../lib/explore-intent'
import { LocaleSelector } from '../../components/LocaleSelector'
import type { CountryCode, CurrencyCode } from '../../lib/locale'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getUser, signOut } from '../../lib/auth'
import { useLang } from '../../lib/i18n'
import { setGuestMode } from '../../lib/guest'
import { Colors, Spacing, Radius, Typography, Shadows, Gradients } from '../../constants/theme'

const BALKANEA_PHONE = '+38923100200'

// ── Nea avatar icon ────────────────────────────────────────────────
function NeaIcon({ size = 17 }: { size?: number }) {
  return (
    <Ionicons name="sparkles" size={size} color="#fff" />
  )
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
    <View style={s.dotsRow}>
      <LinearGradient colors={Gradients.primaryFade} style={s.dotsAvatar}>
        <NeaIcon size={14} />
      </LinearGradient>
      <View style={s.dotsBubble}>
        {dots.map((d, i) => (
          <Animated.View key={i} style={[s.dot, {
            opacity: d.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
            transform: [{ translateY: d.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
          }]} />
        ))}
      </View>
    </View>
  )
}

// ── Streaming caret ────────────────────────────────────────────────
function Caret() {
  const opacity = useRef(new Animated.Value(1)).current
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ])).start()
  }, [])
  return (
    <Animated.View style={[s.caret, { opacity }]} />
  )
}

// ── Inline hotel card (prototype horizontal thumbnail style) ───────
function InlineHotelCard({
  hotel, currency, onPress,
}: {
  hotel: Hotel
  currency: CurrencyCode
  onPress: () => void
}) {
  const price = currency === 'EUR'
    ? `€${hotel.price_per_night}`
    : `${Math.round(hotel.price_per_night * 61.5).toLocaleString('en-US')} ден`

  return (
    <TouchableOpacity style={s.hotelCard} activeOpacity={0.85} onPress={onPress}>
      {/* Thumbnail */}
      <LinearGradient
        colors={['#8fc6e6', '#27567a'] as const}
        style={s.hotelThumb}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={s.hotelCity} numberOfLines={1}>{hotel.address.split(',')[0]?.toUpperCase()}</Text>
      </LinearGradient>

      {/* Details */}
      <View style={s.hotelBody}>
        <Text style={s.hotelName} numberOfLines={1}>{hotel.name}</Text>
        <View style={s.hotelMeta}>
          <Ionicons name="star" size={10} color={Colors.star} />
          <Text style={s.hotelRating}>{hotel.guest_rating > 0 ? hotel.guest_rating.toFixed(1) : '—'}</Text>
          {hotel.guest_rating > 0 && (
            <Text style={s.hotelReviews}> · {hotel.stars}★</Text>
          )}
        </View>
        <Text style={s.hotelBlurb} numberOfLines={2}>
          {hotel.amenities.slice(0, 3).join(' · ')}
        </Text>
        <Text style={s.hotelPrice}>
          {price} <Text style={s.hotelPerNight}>/ night</Text>
        </Text>
      </View>
    </TouchableOpacity>
  )
}

// ── Escalation inline ──────────────────────────────────────────────
function EscalationInline() {
  const { t } = useLang()
  return (
    <View style={s.escRow}>
      <TouchableOpacity
        style={s.escBtnPrimary}
        activeOpacity={0.8}
        onPress={() => Linking.openURL(`tel:${BALKANEA_PHONE}`)}
      >
        <LinearGradient colors={Gradients.primaryFade} style={s.escBtnFill}>
          <Ionicons name="call-outline" size={13} color="#fff" />
          <Text style={s.escBtnLightText}>{t.actions.callAgent}</Text>
        </LinearGradient>
      </TouchableOpacity>
      <TouchableOpacity
        style={s.escBtnOut}
        activeOpacity={0.8}
        onPress={() => Alert.alert(
          t.actions.callbackRequested,
          t.actions.callbackMessage,
          [{ text: t.actions.ok }],
        )}
      >
        <Ionicons name="time-outline" size={13} color={Colors.primary} />
        <Text style={s.escBtnDarkText}>{t.actions.callback}</Text>
      </TouchableOpacity>
    </View>
  )
}

// ── Message bubble (user + assistant with blocks) ──────────────────
function MessageBubble({
  message,
  currency,
  onHotelPress,
}: {
  message: ChatMessage
  currency: CurrencyCode
  onHotelPress: (h: Hotel, params?: HotelSearchParams) => void
}) {
  const { t } = useLang()
  const router = useRouter()
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <View style={s.rowUser}>
        <LinearGradient
          colors={Gradients.primaryFade}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.bubbleUser}
        >
          <Text style={s.textUser}>{message.content}</Text>
        </LinearGradient>
      </View>
    )
  }

  // Assistant message — render blocks if present, else plain content
  const blocks: ChatBlock[] = message.blocks ?? [{ type: 'text', content: message.content }]

  return (
    <View style={s.rowAssistant}>
      <LinearGradient colors={Gradients.primaryFade} style={s.neaAvatar}>
        <NeaIcon size={14} />
      </LinearGradient>
      <View style={s.assistantCol}>
        {blocks.map((block, i) => {
          if (block.type === 'text') {
            return (
              <View key={i}>
                <Text style={s.textAssistant}>
                  {block.content}
                  {message.streaming && i === blocks.length - 1 && <Caret />}
                </Text>
              </View>
            )
          }

          if (block.type === 'hotel-list') {
            const total = block.totalCount ?? block.hotels.length
            const label = t.chat.viewAll.replace('{{count}}', String(total))
            return (
              <View key={i} style={s.hotelBlock}>
                {block.hotels.slice(0, 3).map(h => (
                  <InlineHotelCard
                    key={h.hotel_id}
                    hotel={h}
                    currency={currency}
                    onPress={() => onHotelPress(h, block.searchParams)}
                  />
                ))}
                {total > 3 && (
                  <TouchableOpacity
                    style={s.viewAllPill}
                    activeOpacity={0.7}
                    onPress={() => router.push({
                      pathname: '/results',
                      params: {
                        destination: block.searchParams?.destination ?? '',
                        checkin: block.searchParams?.checkin ?? '',
                        checkout: block.searchParams?.checkout ?? '',
                        adults: String(block.searchParams?.adults ?? 2),
                        children: String(block.searchParams?.children ?? 0),
                        rooms: String(block.searchParams?.rooms ?? 1),
                        currency: block.searchParams?.currency ?? 'EUR',
                      },
                    })}
                  >
                    <Text style={s.viewAllText}>{label} →</Text>
                  </TouchableOpacity>
                )}
              </View>
            )
          }

          if (block.type === 'escalation') {
            return <EscalationInline key={i} />
          }

          return null
        })}
      </View>
    </View>
  )
}

// ── Empty state ────────────────────────────────────────────────────
function EmptyState({ onSuggest }: { onSuggest: (text: string) => void }) {
  const { t } = useLang()
  const suggestions = [t.chat.introSample1, t.chat.introSample2, t.chat.introSample3]

  return (
    <View style={s.empty}>
      <LinearGradient colors={Gradients.primaryFade} style={s.emptyIcon}>
        <Ionicons name="sparkles" size={38} color="#fff" />
      </LinearGradient>
      <Text style={s.emptyTitle}>{t.chat.greeting}</Text>
      <Text style={s.emptySub}>{t.chat.greetingSub}</Text>
      <View style={s.suggestions}>
        {suggestions.map(sug => (
          <TouchableOpacity
            key={sug}
            style={s.suggestionBtn}
            activeOpacity={0.7}
            onPress={() => onSuggest(sug)}
          >
            <Text style={s.suggestionText}>{sug}</Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

// ── Main screen ────────────────────────────────────────────────────
export default function SearchScreen() {
  const router = useRouter()
  // appLang is the source of truth — set on language screen and auth screen
  const { t, lang: appLang, setLang: setAppLang } = useLang()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [callStatus, setCallStatus] = useState<CallStatus>('idle')
  const [agentTalking, setAgentTalking] = useState(false)
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  // Initialise country from the persisted app language so LocaleSelector
  // flag matches the language the user already selected
  const [country, setCountry] = useState<CountryCode>(() => appLang === 'mk' ? 'mk' : 'gb')
  const [currency, setCurrency] = useState<CurrencyCode>(() => appLang === 'mk' ? 'MKD' : 'EUR')
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null)

  // Keep country in sync if language changes from profile/auth while app is open
  useEffect(() => {
    setCountry(appLang === 'mk' ? 'mk' : 'gb')
  }, [appLang])

  // Use appLang directly for Nea — don't derive from country so language
  // is always consistent with what the user selected on the language screen
  const lang: AgentLang = appLang

  const listRef = useRef<FlatList>(null)
  const inputRef = useRef<TextInput>(null)
  const handleSendRef = useRef<(text: string) => void>(() => {})

  // Scroll to bottom — used on new messages and when keyboard appears
  const scrollToEnd = useCallback((animated = true) => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated }), 50)
  }, [])


  // Accept a review query passed from hotel-detail via route params
  const params = useLocalSearchParams<{ reviewQuery?: string }>()
  useEffect(() => {
    if (params.reviewQuery) setPendingPrompt(params.reviewQuery)
  }, [params.reviewQuery])

  useFocusEffect(useCallback(() => {
    const intent = consumeExploreIntent()
    if (intent) setPendingPrompt(intent)
  }, []))

  useEffect(() => {
    if (pendingPrompt && !loading) {
      const text = pendingPrompt
      setPendingPrompt(null)
      handleSendRef.current(text)
    }
  }, [pendingPrompt, loading])

  const handleSend = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    Keyboard.dismiss()

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    scrollToEnd()

    // Create the assistant placeholder with streaming: true immediately
    // so the caret appears while the API responds
    const assistantId = (Date.now() + 1).toString()
    const placeholder: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      streaming: true,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, placeholder])
    scrollToEnd()

    const onToken = (token: string) => {
      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, content: m.content + token } : m
      ))
    }

    const allMessages = [...messages, userMsg]
    const response = await sendMessage(allMessages, onToken, lang)

    const blocks: ChatBlock[] = []
    if (response.type === 'hotels') {
      blocks.push({ type: 'text', content: response.content })
      blocks.push({
        type: 'hotel-list',
        hotels: response.hotels,
        searchParams: response.searchParams,
        totalCount: response.hotels.length,
      })
    } else if (response.type === 'escalation') {
      blocks.push({ type: 'text', content: response.content })
      blocks.push({ type: 'escalation' })
    } else {
      blocks.push({ type: 'text', content: response.content })
    }

    setMessages(prev => prev.map(m =>
      m.id === assistantId
        ? { ...m, content: response.content, blocks, streaming: false }
        : m
    ))
    setLoading(false)
    scrollToEnd()
  }, [messages, loading, scrollToEnd])

  useEffect(() => { handleSendRef.current = handleSend }, [handleSend])

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
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: translated,
          timestamp: new Date(),
        }])
      },
    })
  }, [callStatus, lang, t])

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

  type ListItem = { key: string } & (
    | { kind: 'message'; message: ChatMessage }
    | { kind: 'typing' }
  )

  const listData: ListItem[] = [
    ...messages.map(m => ({ key: m.id, kind: 'message' as const, message: m })),
    ...(loading ? [{ key: '__typing', kind: 'typing' as const }] : []),
  ]

  const renderItem = useCallback(({ item }: { item: ListItem }) => {
    if (item.kind === 'typing') return <TypingDots />
    return (
      <MessageBubble
        message={item.message}
        currency={currency}
        onHotelPress={handleHotelPress}
      />
    )
  }, [currency, handleHotelPress])

  const hasMessages = messages.length > 0

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Top bar */}
        <View style={s.topBar}>
          <TouchableOpacity
            style={s.topBtn}
            activeOpacity={0.7}
            onPress={() => {
              Alert.alert(t.menu.title, undefined, [
                { text: t.menu.myBookings, onPress: () => router.navigate('/trips') },
                { text: t.menu.exploreDestinations, onPress: () => router.navigate('/explore') },
                { text: t.menu.signOut, style: 'destructive', onPress: async () => { await setGuestMode(false); await signOut() } },
                { text: t.menu.cancel, style: 'cancel' },
              ])
            }}
          >
            <Ionicons name="menu-outline" size={22} color={Colors.text} />
          </TouchableOpacity>
          <View style={s.topRight}>
            <LocaleSelector
              country={country}
              currency={currency}
              onCountryChange={(c) => {
                setCountry(c)
                setAppLang(c === 'mk' ? 'mk' : 'en')
              }}
              onCurrencyChange={setCurrency}
            />
          </View>
        </View>

        {/* Message list or empty state */}
        {hasMessages ? (
          <FlatList
            ref={listRef}
            data={listData}
            keyExtractor={item => item.key}
            renderItem={renderItem}
            style={s.flex}
            contentContainerStyle={s.listContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          />
        ) : (
          <ScrollView
            contentContainerStyle={s.emptyScroll}
            keyboardShouldPersistTaps="handled"
          >
            <EmptyState onSuggest={(text) => handleSendRef.current(text)} />
          </ScrollView>
        )}

        {/* Composer */}
        <View style={s.composerWrap}>
          <View style={s.composerCard}>
            <TextInput
              ref={inputRef}
              style={s.composerInput}
              value={input}
              onChangeText={setInput}
              placeholder={t.chat.messagePlaceholder}
              placeholderTextColor={Colors.textLight}
              maxLength={500}
              returnKeyType="send"
              blurOnSubmit={false}
              multiline
              onSubmitEditing={() => handleSend(input)}
            />
            <View style={s.composerActions}>
              <TouchableOpacity style={s.actionBtn} activeOpacity={0.7} onPress={() => router.navigate('/explore')}>
                <Ionicons name="compass-outline" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity style={s.actionBtn} activeOpacity={0.7} onPress={() => router.navigate('/trips')}>
                <Ionicons name="briefcase-outline" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity style={s.actionBtn} activeOpacity={0.7} onPress={handleVoicePress}>
                <Ionicons
                  name={callStatus === 'active' ? 'stop-circle' : 'mic-outline'}
                  size={20}
                  color={callStatus === 'active' ? Colors.error : Colors.textSecondary}
                />
              </TouchableOpacity>
              <View style={{ flex: 1 }} />
              <TouchableOpacity
                onPress={() => handleSend(input)}
                disabled={loading || !input.trim()}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={(loading || !input.trim()) ? [Colors.borderLight, Colors.borderLight] : Gradients.primaryFade}
                  style={s.sendBtn}
                >
                  <Ionicons name="arrow-up" size={18} color={(loading || !input.trim()) ? Colors.textLight : '#fff'} />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={s.disclaimer}>{t.chat.disclaimer}</Text>
        </View>

      </KeyboardAvoidingView>
      <VoiceHUD
        transcript={transcript}
        agentTalking={agentTalking}
        callStatus={callStatus}
        onEndCall={handleVoicePress}
      />
    </SafeAreaView>
  )
}

// ── Styles ─────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  topBtn: {
    width: 38, height: 38, borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
    ...Shadows.sm,
  },
  topRight: { flexDirection: 'row', alignItems: 'center' },

  // Empty state
  emptyScroll: { flexGrow: 1 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    ...Shadows.glow,
  },
  emptyTitle: {
    ...Typography.hero,
    color: Colors.text,
    marginTop: Spacing.lg,
    letterSpacing: -0.6,
  },
  emptySub: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 22,
    maxWidth: 260,
  },
  suggestions: {
    width: '100%',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
  },
  suggestionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  suggestionText: {
    ...Typography.body,
    color: Colors.text,
    flex: 1,
    marginRight: Spacing.sm,
  },

  // Message list
  listContent: {
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    flexGrow: 1,
  },

  // User bubble
  rowUser: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  bubbleUser: {
    maxWidth: '80%',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: 20,
    borderBottomRightRadius: 6,
    ...Shadows.sm,
  },
  textUser: {
    ...Typography.body,
    color: '#fff',
    lineHeight: 21,
  },

  // Assistant row
  rowAssistant: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    gap: 10,
  },
  neaAvatar: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  assistantCol: {
    flex: 1,
    minWidth: 0,
  },
  textAssistant: {
    ...Typography.body,
    color: Colors.text,
    lineHeight: 23,
  },

  // Streaming caret
  caret: {
    display: 'flex',
    width: 8,
    height: 16,
    backgroundColor: Colors.primary,
    borderRadius: 2,
    marginLeft: 2,
    verticalAlign: 'middle',
  } as any,

  // Typing dots
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    gap: 10,
  },
  dotsAvatar: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  dotsBubble: {
    flexDirection: 'row',
    gap: 5,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.sm + 6,
    paddingVertical: 14,
    ...Shadows.sm,
  },
  dot: {
    width: 7, height: 7,
    borderRadius: 4,
    backgroundColor: Colors.textLight,
  },

  // Inline hotel cards (inside Nea message)
  hotelBlock: {
    marginTop: Spacing.sm,
    gap: Spacing.sm - 2,
  },
  hotelCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    overflow: 'hidden',
    ...Shadows.md,
  },
  hotelThumb: {
    width: 92,
    flexShrink: 0,
    justifyContent: 'flex-end',
    padding: 7,
  },
  hotelCity: {
    ...Typography.overline,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 8,
  },
  hotelBody: {
    flex: 1,
    padding: Spacing.sm + 4,
    justifyContent: 'center',
    gap: 3,
  },
  hotelName: {
    ...Typography.bodyMedium,
    color: Colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  hotelMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  hotelRating: {
    ...Typography.caption,
    color: Colors.text,
    fontWeight: '700',
    fontSize: 12,
  },
  hotelReviews: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontSize: 11,
  },
  hotelBlurb: {
    ...Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 16,
    fontSize: 11,
  },
  hotelPrice: {
    ...Typography.bodyMedium,
    color: Colors.primary,
    fontWeight: '800',
    fontSize: 13,
    marginTop: 2,
  },
  hotelPerNight: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '400',
    fontSize: 10,
  },
  viewAllPill: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm + 6,
    paddingVertical: 7,
    marginTop: 2,
  },
  viewAllText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },

  // Escalation
  escRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  escBtnPrimary: { flex: 1, borderRadius: Radius.sm, overflow: 'hidden' },
  escBtnFill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: Radius.sm,
  },
  escBtnLightText: { ...Typography.button, color: '#fff', fontSize: 12 },
  escBtnOut: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  escBtnDarkText: { ...Typography.button, color: Colors.primary, fontSize: 12 },

  // Composer
  composerWrap: {
    paddingHorizontal: Spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? 4 : Spacing.sm,
  },
  composerCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadows.md,
  },
  composerInput: {
    paddingHorizontal: Spacing.md,
    paddingTop: 12,
    paddingBottom: 8,
    ...Typography.body,
    color: Colors.text,
    fontSize: 16,
    minHeight: 44,
    maxHeight: 120,
  },
  composerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingBottom: 10,
    gap: 4,
  },
  actionBtn: { padding: 6 },
  sendBtn: {
    width: 36, height: 36,
    borderRadius: Radius.full,
    alignItems: 'center', justifyContent: 'center',
  },
  disclaimer: {
    ...Typography.caption,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: 7,
    paddingHorizontal: Spacing.md,
    lineHeight: 16,
    fontSize: 11,
  },
})
