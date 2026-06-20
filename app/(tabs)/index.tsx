import React, { useState, useRef, useCallback, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
  SafeAreaView,
} from 'react-native'
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
import { Colors, Spacing, Radius } from '../../constants/theme'

const WELCOME: ChatMessage = {
  id:        'welcome',
  role:      'assistant',
  content:   "Hi! I'm Bea, your Balkans travel expert 🌍\n\nTell me about your dream trip — where are you thinking, or would you like some inspiration?",
  timestamp: new Date(),
}

const QUICK_PROMPTS = [
  'Plan a romantic week in the Balkans',
  'Best destinations for first-time visitors',
  'Budget-friendly 5-day trip',
  'Family holiday with beaches',
]

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
  const listRef                         = useRef<FlatList>(null)

  // Keep a live ref to handleSend so useFocusEffect can call it without stale closures
  const handleSendRef = useRef<(text: string) => void>(() => {})

  const scrollToEnd = () => setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100)

  // Consume an explore intent when this tab gains focus
  useFocusEffect(useCallback(() => {
    const intent = consumeExploreIntent()
    if (intent) setPendingPrompt(intent)
  }, []))

  // Fire the pending prompt once loading is idle and handleSend is current
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(response.type === 'plan' ? { hotels: (response as any).hotels } : {}),
      },
    ])
    setLoading(false)
    scrollToEnd()
  }, [messages, loading])

  // Keep ref in sync
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
        {/* Header — title + lang toggle */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Balkanea</Text>
            <Text style={styles.headerSub}>AI Travel Planner</Text>
          </View>

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
                style={[styles.langBtn, lang === l && styles.langBtnActive]}
                onPress={() => setLang(l)}
                disabled={callStatus !== 'idle'}
                activeOpacity={0.75}
              >
                <Text style={[styles.langText, lang === l && styles.langTextActive]}>
                  {l.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Voice hero — large centered mic button */}
        <View style={styles.voiceHero}>
          <VoiceButton size={104} status={callStatus} agentTalking={agentTalking} onPress={handleVoicePress} />
        </View>

        {/* Messages */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={m => m.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onLayout={scrollToEnd}
        />

        {/* Loading indicator */}
        {loading && (
          <View style={styles.loadingRow}>
            <View style={styles.loadingBubble}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.loadingText}>Bea is planning...</Text>
            </View>
          </View>
        )}

        {/* Quick prompts — only on first message */}
        {messages.length === 1 && !loading && (
          <View style={styles.quickPrompts}>
            {QUICK_PROMPTS.map(p => (
              <TouchableOpacity key={p} style={styles.quickBtn} onPress={() => handleSend(p)} activeOpacity={0.7}>
                <Text style={styles.quickText}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Input bar */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask Bea anything about the Balkans..."
            placeholderTextColor={Colors.textLight}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={() => handleSend(input)}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
            onPress={() => handleSend(input)}
            disabled={!input.trim() || loading}
            activeOpacity={0.8}
          >
            <Text style={styles.sendIcon}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Iron Man HUD — full-screen overlay during voice calls */}
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
  safe:   { flex: 1, backgroundColor: Colors.background },
  flex:   { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  headerText: { flex: 1 },
  voiceHero: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.primary,
  },
  headerSub: {
    fontSize: 12,
    color: Colors.textSecondary,
  },

  langToggle: {
    flexDirection: 'row',
    gap: 4,
    marginRight: Spacing.sm,
  },
  langBtn: {
    paddingHorizontal: 9,
    paddingVertical: 4,
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
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  langTextActive: { color: '#fff' },

  listContent: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  loadingRow: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.assistantBubble,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    alignSelf: 'flex-start',
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  quickPrompts: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickBtn: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  quickText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 15,
    color: Colors.text,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: Colors.border,
  },
  sendIcon: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
})
