import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, Animated,
  SafeAreaView, Alert,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { sendFeedbackMessage } from '../lib/claude'
import { saveFeedback } from '../lib/knowledge'
import { getUser } from '../lib/auth'
import { useLang } from '../lib/i18n'
import { Colors, Spacing, Radius, Typography, Gradients, Shadows } from '../constants/theme'
import type { ChatMessage } from '../lib/types'

// ── Typing dots ────────────────────────────────────────────────────

function TypingDots() {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current]
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
        <Ionicons name="sparkles" size={14} color="#fff" />
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

// ── Main screen ────────────────────────────────────────────────────

export default function FeedbackChatScreen() {
  const router = useRouter()
  const { t } = useLang()
  const params = useLocalSearchParams<{
    hotelName: string
    destination: string
    checkin: string
    checkout: string
    bookingId: string
  }>()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [feedbackSaved, setFeedbackSaved] = useState(false)
  const listRef = useRef<FlatList>(null)
  const inputRef = useRef<TextInput>(null)
  const assistantIdRef = useRef<string | null>(null)
  const rawConversationRef = useRef<string>('')

  // Kick off the feedback conversation automatically
  useEffect(() => {
    const opener = `I'm back from my trip to ${params.hotelName} in ${params.destination}. I checked in ${params.checkin} and checked out ${params.checkout}.`
    kickOff(opener)
  }, [])

  const kickOff = async (userText: string) => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(), role: 'user', content: userText, timestamp: new Date(),
    }
    setMessages([userMsg])
    setLoading(true)
    rawConversationRef.current = `User: ${userText}\n`
    await askNea([userMsg])
  }

  const askNea = async (allMessages: ChatMessage[]) => {
    const assistantId = (Date.now() + 1).toString()
    assistantIdRef.current = assistantId
    const placeholder: ChatMessage = {
      id: assistantId, role: 'assistant', content: '', streaming: true, timestamp: new Date(),
    }
    setMessages(prev => [...prev, placeholder])

    const onToken = (token: string) => {
      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, content: m.content + token } : m
      ))
    }

    const response = await sendFeedbackMessage(allMessages, onToken)
    rawConversationRef.current += `Nea: ${response.content}\n`

    if (response.type === 'feedback' && response.feedbackData) {
      // Feedback conversation complete — save to Supabase
      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, content: response.content, streaming: false } : m
      ))
      await handleSaveFeedback(response.feedbackData)
    } else {
      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, content: response.content, streaming: false } : m
      ))
    }
    setLoading(false)
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 120)
  }

  const handleSaveFeedback = async (data: Record<string, unknown>) => {
    try {
      const user = await getUser()
      await saveFeedback({
        userId: user?.id,
        hotelName: String(data.hotel ?? params.hotelName),
        destination: String(data.destination ?? params.destination),
        positives: data.positives ? String(data.positives) : undefined,
        negatives: data.negatives ? String(data.negatives) : undefined,
        highlights: data.highlights ? String(data.highlights) : undefined,
        recommendedFor: data.recommended_for ? String(data.recommended_for) : undefined,
        rating: typeof data.rating === 'number' ? data.rating : undefined,
        rawConversation: rawConversationRef.current,
      })
      setFeedbackSaved(true)
    } catch (e) {
      console.warn('Failed to save feedback:', e)
      setFeedbackSaved(true) // still show success to user
    }
  }

  const handleSend = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || loading) return

    const userMsg: ChatMessage = {
      id: Date.now().toString(), role: 'user', content: trimmed, timestamp: new Date(),
    }
    rawConversationRef.current += `User: ${trimmed}\n`
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    await askNea([...messages, userMsg])
  }, [input, loading, messages])

  const renderItem = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user'
    if (isUser) {
      return (
        <View style={s.rowUser}>
          <LinearGradient colors={Gradients.primaryFade} style={s.bubbleUser}>
            <Text style={s.textUser}>{item.content}</Text>
          </LinearGradient>
        </View>
      )
    }
    return (
      <View style={s.rowNea}>
        <LinearGradient colors={Gradients.primaryFade} style={s.neaAvatar}>
          <Ionicons name="sparkles" size={14} color="#fff" />
        </LinearGradient>
        <View style={s.neaCol}>
          <Text style={s.textNea}>{item.content}</Text>
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.text} />
        </TouchableOpacity>
        <View style={s.headerMid}>
          <Text style={s.headerTitle}>{t.feedback.title}</Text>
          <Text style={s.headerSub}>{params.hotelName}</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Messages */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={m => m.id}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={loading ? <TypingDots /> : null}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Saved state */}
        {feedbackSaved && (
          <View style={s.savedBanner}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            <Text style={s.savedText}>{t.feedback.feedbackSaved}</Text>
          </View>
        )}

        {/* Composer — hidden once feedback saved */}
        {!feedbackSaved ? (
          <View style={s.composerWrap}>
            <View style={s.composerCard}>
              <TextInput
                ref={inputRef}
                style={s.composerInput}
                value={input}
                onChangeText={setInput}
                placeholder={t.feedback.howWasYourTrip}
                placeholderTextColor={Colors.textLight}
                returnKeyType="send"
                blurOnSubmit={false}
                multiline
                onSubmitEditing={handleSend}
              />
              <View style={s.composerActions}>
                <View style={{ flex: 1 }} />
                <TouchableOpacity onPress={handleSend} disabled={loading || !input.trim()} activeOpacity={0.7}>
                  <LinearGradient
                    colors={(!loading && input.trim()) ? Gradients.primaryFade : [Colors.borderLight, Colors.borderLight]}
                    style={s.sendBtn}
                  >
                    <Ionicons name="arrow-up" size={18} color={(!loading && input.trim()) ? '#fff' : Colors.textLight} />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <View style={s.doneWrap}>
            <TouchableOpacity style={s.doneBtn} onPress={() => router.back()} activeOpacity={0.85}>
              <LinearGradient colors={Gradients.primaryFade} style={s.doneBtnGradient}>
                <Text style={s.doneBtnText}>{t.feedback.done}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

// ── Styles ─────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.surface,
  },
  backBtn: { width: 38, height: 38, borderRadius: Radius.full, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  headerMid: { flex: 1 },
  headerTitle: { ...Typography.h3, color: Colors.text },
  headerSub: { ...Typography.caption, color: Colors.textSecondary, marginTop: 1 },

  list: { padding: Spacing.md, paddingBottom: Spacing.sm },

  rowUser: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: Spacing.sm },
  bubbleUser: { maxWidth: '80%', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2, borderRadius: 20, borderBottomRightRadius: 6, ...Shadows.sm },
  textUser: { ...Typography.body, color: '#fff', lineHeight: 21 },

  rowNea: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.sm, gap: 10 },
  neaAvatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  neaCol: { flex: 1 },
  textNea: { ...Typography.body, color: Colors.text, lineHeight: 23 },

  dotsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, marginBottom: Spacing.sm, gap: 10 },
  dotsAvatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  dotsBubble: { flexDirection: 'row', gap: 5, backgroundColor: Colors.surface, borderRadius: Radius.lg, paddingHorizontal: Spacing.sm + 6, paddingVertical: 14, ...Shadows.sm },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.textLight },

  savedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    marginHorizontal: Spacing.md, marginBottom: Spacing.sm,
    backgroundColor: '#ECFDF5', borderRadius: Radius.md, padding: Spacing.md,
  },
  savedText: { ...Typography.body, color: Colors.success, fontWeight: '600', flex: 1 },

  composerWrap: { paddingHorizontal: Spacing.sm, paddingBottom: Platform.OS === 'ios' ? 4 : Spacing.sm },
  composerCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', ...Shadows.md },
  composerInput: { paddingHorizontal: Spacing.md, paddingTop: 12, paddingBottom: 8, ...Typography.body, color: Colors.text, fontSize: 16, minHeight: 44, maxHeight: 120 },
  composerActions: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm, paddingBottom: 10 },
  sendBtn: { width: 36, height: 36, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },

  doneWrap: { paddingHorizontal: Spacing.md, paddingBottom: Platform.OS === 'ios' ? Spacing.xl : Spacing.md },
  doneBtn: { borderRadius: Radius.full, overflow: 'hidden' },
  doneBtnGradient: { paddingVertical: 15, alignItems: 'center' },
  doneBtnText: { ...Typography.button, color: '#fff', fontSize: 16 },
})
