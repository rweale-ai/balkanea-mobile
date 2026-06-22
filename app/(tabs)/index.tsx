import React, { useState, useRef, useCallback, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, Animated,
  SafeAreaView, Image,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from 'expo-router'
import { ChatBubble } from '../../components/planner/ChatBubble'
import { TripCard } from '../../components/planner/TripCard'
import { VoiceButton } from '../../components/VoiceButton'
import { VoiceHUD } from '../../components/VoiceHUD'
import { sendMessage } from '../../lib/claude'
import { startVoiceCall, stopVoiceCall } from '../../lib/voice'
import type { CallStatus, TranscriptEntry, AgentLang } from '../../lib/voice'
import type { ChatMessage, TripPlan } from '../../lib/types'
import { saveTrip } from '../../lib/trips-store'
import { consumeExploreIntent } from '../../lib/explore-intent'
import { LocaleSelector } from '../../components/LocaleSelector'
import type { CountryCode, CurrencyCode } from '../../lib/locale'
import { Colors, Spacing, Radius, Typography, Shadows, Gradients } from '../../constants/theme'

const WELCOME: ChatMessage = {
  id:        'welcome',
  role:      'assistant',
  content:   "Hi! I'm Bea, your Balkans travel expert.\n\nTell me about your dream trip — where are you thinking, or would you like some inspiration?",
  timestamp: new Date(),
}

const QUICK_PROMPTS = [
  'Plan a romantic week in the Balkans',
  'Best destinations for first-time visitors',
  'Budget-friendly 5-day trip',
  'Family holiday with beaches',
]

function TypingIndicator() {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current]

  useEffect(() => {
    dots.forEach((dot, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 200),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay((2 - i) * 200),
        ])
      ).start()
    })
  }, [])

  return (
    <View style={styles.typingRow}>
      <View style={styles.typingBubble}>
        {dots.map((dot, i) => (
          <Animated.View
            key={i}
            style={[styles.typingDot, { opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }), transform: [{ scale: dot.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.2] }) }] }]}
          />
        ))}
      </View>
    </View>
  )
}

export default function PlannerScreen() {
  const [messages, setMessages]         = useState<ChatMessage[]>([WELCOME])
  const [input, setInput]               = useState('')
  const [loading, setLoading]           = useState(false)
  const [callStatus, setCallStatus]     = useState<CallStatus>('idle')
  const [agentTalking, setAgentTalking] = useState(false)
  const [transcript, setTranscript]     = useState<TranscriptEntry[]>([])
  const [lang, setLang]                 = useState<AgentLang>('en')
  const [country, setCountry]           = useState<CountryCode>('us')
  const [currency, setCurrency]         = useState<CurrencyCode>('USD')
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null)
  const [inputFocused, setInputFocused] = useState(false)
  const listRef                         = useRef<FlatList>(null)
  const handleSendRef = useRef<(text: string) => void>(() => {})

  const scrollToEnd = () => setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100)

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
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: msg,
          timestamp: new Date(),
        }])
      },
    })
  }, [callStatus, lang])

  const handleSend = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userMsg: ChatMessage = {
      id:        Date.now().toString(),
      role:      'user',
      content:   trimmed,
      timestamp: new Date(),
    }

    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setLoading(true)
    scrollToEnd()

    const response = await sendMessage(next)

    const assistantMsg: ChatMessage = {
      id:        (Date.now() + 1).toString(),
      role:      'assistant',
      content:   response.content,
      tripPlan:  response.type === 'plan' ? response.plan : undefined,
      timestamp: new Date(),
    }

    setMessages(prev => [
      ...prev,
      {
        ...assistantMsg,
        ...(response.type === 'plan' ? { hotels: (response as any).hotels } : {}),
      },
    ])
    setLoading(false)
    scrollToEnd()
  }, [messages, loading])

  useEffect(() => { handleSendRef.current = handleSend }, [handleSend])

  const handleSaveTrip = useCallback((plan: TripPlan) => {
    saveTrip(plan)
  }, [])

  const renderItem = ({ item }: { item: ChatMessage & { hotels?: any[] } }) => (
    <View>
      <ChatBubble message={item} />
      {item.tripPlan && item.hotels && (
        <TripCard plan={item.tripPlan} hotels={item.hotels} onSave={handleSaveTrip} />
      )}
    </View>
  )

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Image
              source={require('../../assets/balkanea-logo.png')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
            <Text style={styles.headerSub}>AI Travel Planner</Text>
          </View>

          <VoiceButton size={44} status={callStatus} agentTalking={agentTalking} onPress={handleVoicePress} />

          <LocaleSelector
            country={country}
            currency={currency}
            onCountryChange={setCountry}
            onCurrencyChange={setCurrency}
          />

          <View style={styles.langToggle}>
            {(['en', 'mk'] as AgentLang[]).map(l => (
              <TouchableOpacity
                key={l}
                onPress={() => setLang(l)}
                disabled={callStatus !== 'idle'}
                activeOpacity={0.75}
              >
                <View style={[styles.langBtn, lang === l && styles.langBtnActive]}>
                  <Text style={[styles.langText, lang === l && styles.langTextActive]}>{l.toUpperCase()}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={m => m.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onLayout={scrollToEnd}
        />

        {loading && <TypingIndicator />}

        {messages.length === 1 && !loading && (
          <View style={styles.quickPrompts}>
            {QUICK_PROMPTS.map(p => (
              <TouchableOpacity key={p} onPress={() => handleSend(p)} activeOpacity={0.7}>
                <LinearGradient
                  colors={Gradients.primaryFade}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.quickBtn}
                >
                  <Text style={styles.quickText}>{p}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, inputFocused && styles.inputFocused]}
            value={input}
            onChangeText={setInput}
            placeholder="Ask Bea anything about the Balkans..."
            placeholderTextColor={Colors.textLight}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={() => handleSend(input)}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
          />
          <TouchableOpacity
            onPress={() => handleSend(input)}
            disabled={!input.trim() || loading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={(!input.trim() || loading) ? [Colors.border, Colors.border] : Gradients.primaryFade}
              style={styles.sendBtn}
            >
              <Ionicons name="arrow-up" size={18} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm + 2,
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  headerText: { flex: 1 },
  headerLogo: {
    width: 120,
    height: 32,
  },
  headerSub: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  langToggle: {
    flexDirection: 'row',
    gap: 4,
    marginRight: Spacing.sm,
  },
  langBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  langBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  langText: {
    ...Typography.overline,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  langTextActive: { color: '#fff' },
  listContent: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  typingRow: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.assistantBubble,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    alignSelf: 'flex-start',
    gap: 6,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  quickPrompts: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: 6,
  },
  quickBtn: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  quickText: {
    ...Typography.caption,
    color: '#fff',
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    gap: 8,
    ...Shadows.sm,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.body,
    color: Colors.text,
    maxHeight: 100,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
  },
  inputFocused: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
