import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  Modal, View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, Dimensions,
  ActivityIndicator, Alert, Keyboard,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import type { Booking, ChatMessage } from '../../lib/types'
import { sendTopicMessage, extractItineraryItems, type ItineraryTopic } from '../../lib/claude'
import { addItineraryItems } from '../../lib/itinerary-store'
import { useLang } from '../../lib/i18n'
import { Colors, Spacing, Radius, Typography, Shadows, Gradients } from '../../constants/theme'
import { FormattedText } from '../planner/FormattedText'

export type { ItineraryTopic }

interface Msg { role: 'user' | 'assistant'; content: string }

interface Props {
  booking: Booking
  topic: ItineraryTopic | null
  onClose: () => void
}

function toApiHistory(msgs: Msg[]): ChatMessage[] {
  return msgs.map((m, i) => ({ id: String(i), timestamp: new Date(), role: m.role, content: m.content }))
}

export function ItineraryTopicSheet({ booking, topic, onClose }: Props) {
  const { t, lang } = useLang()
  const [history, setHistory] = useState<Msg[]>([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const listRef = useRef<FlatList<Msg>>(null)
  const loadedTopicRef = useRef<ItineraryTopic | null>(null)

  const city = booking.hotel.address?.split(',')[0] ?? booking.hotel.name
  const context = useMemo(() => ({
    hotelName: booking.hotel.name,
    city,
    checkin: booking.checkin,
    checkout: booking.checkout,
  }), [booking.hotel.name, city, booking.checkin, booking.checkout])

  useEffect(() => {
    if (topic && loadedTopicRef.current !== topic) {
      loadedTopicRef.current = topic
      loadOpening(topic)
    } else if (!topic) {
      Keyboard.dismiss()
      setHistory([])
      setStreamingText('')
      setInputText('')
      loadedTopicRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic])

  const loadOpening = useCallback(async (activeTopic: ItineraryTopic) => {
    setHistory([])
    setLoading(true)
    const openingQuery = activeTopic === 'restaurants'
      ? `What are the best restaurants I should try in ${city}? Give me 4-5 options across different price points.`
      : `What tours and activities should I book in ${city}?`
    const msgs: Msg[] = [{ role: 'user', content: openingQuery }]
    let streamed = ''
    try {
      const resp = await sendTopicMessage(toApiHistory(msgs), token => {
        streamed += token
        setStreamingText(streamed)
      }, activeTopic, context, lang)
      setHistory([...msgs, { role: 'assistant', content: resp.content }])
    } catch {
      setHistory([...msgs, { role: 'assistant', content: t.topicChat.errorReply }])
    } finally {
      setStreamingText('')
      setLoading(false)
    }
  }, [city, context, lang, t])

  const sendUserMessage = useCallback(async (text: string) => {
    if (!topic || loading) return
    const trimmed = text.trim()
    if (!trimmed) return
    setInputText('')
    Keyboard.dismiss()
    const newHistory: Msg[] = [...history, { role: 'user', content: trimmed }]
    setHistory(newHistory)
    setLoading(true)
    let streamed = ''
    try {
      const resp = await sendTopicMessage(toApiHistory(newHistory), token => {
        streamed += token
        setStreamingText(streamed)
      }, topic, context, lang)
      setHistory([...newHistory, { role: 'assistant', content: resp.content }])
    } catch {
      setHistory([...newHistory, { role: 'assistant', content: t.topicChat.errorReply }])
    } finally {
      setStreamingText('')
      setLoading(false)
    }
  }, [topic, history, loading, context, lang, t])

  const handleAddToTrip = useCallback(async () => {
    if (!topic || history.length === 0 || saving) return
    setSaving(true)
    try {
      const items = await extractItineraryItems(toApiHistory(history), lang)
      if (items.length === 0) {
        Alert.alert(t.topicChat.nothingToAdd, t.topicChat.nothingToAddBody)
        return
      }
      addItineraryItems(booking.id, items)
      Alert.alert(t.topicChat.addedTitle, t.topicChat.addedBody.replace('{{count}}', String(items.length)))
    } finally {
      setSaving(false)
    }
  }, [topic, history, saving, lang, booking.id, t])

  const displayMessages = useMemo((): Msg[] => {
    const base = history.length > 1 ? history.slice(1) : []
    if (streamingText) return [...base, { role: 'assistant', content: streamingText }]
    return base
  }, [history, streamingText])

  const title = topic === 'tours' ? t.dashboard.tours : t.dashboard.restaurants
  const loadingLabel = topic === 'tours' ? t.topicChat.loadingTours : t.topicChat.loadingRestaurants

  return (
    <Modal
      visible={!!topic}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.kav}
          >
            <View style={styles.handleBar}>
              <View style={styles.handle} />
            </View>

            <View style={styles.header}>
              <LinearGradient colors={Gradients.accentFade} style={styles.avatar}>
                <Ionicons name={topic === 'tours' ? 'map' : 'restaurant'} size={16} color="#fff" />
              </LinearGradient>
              <View style={styles.headerText}>
                <Text style={styles.headerTitle}>{title}</Text>
                <Text style={styles.headerSub} numberOfLines={1}>{city}</Text>
              </View>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {loading && displayMessages.length === 0 ? (
              <View style={styles.loadingCenter}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.loadingText}>{loadingLabel}</Text>
              </View>
            ) : (
              <FlatList
                ref={listRef}
                style={styles.msgListFlex}
                data={displayMessages}
                keyExtractor={(_, i) => String(i)}
                contentContainerStyle={styles.msgList}
                onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
                renderItem={({ item }) => (
                  <View style={[styles.bubble, item.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant]}>
                    {item.role === 'user' ? (
                      <Text style={[styles.bubbleText, styles.bubbleTextUser]}>{item.content}</Text>
                    ) : (
                      <FormattedText text={item.content} style={[styles.bubbleText, styles.bubbleTextAssistant]} />
                    )}
                  </View>
                )}
              />
            )}

            <TouchableOpacity
              style={[styles.addBar, (history.length === 0 || saving) && styles.addBarDisabled]}
              onPress={handleAddToTrip}
              disabled={history.length === 0 || saving}
              activeOpacity={0.85}
            >
              <LinearGradient colors={Gradients.primaryFade} style={styles.addBarInner}>
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="add-circle" size={16} color="#fff" />
                )}
                <Text style={styles.addBarText}>{t.topicChat.addToTrip}</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={[styles.inputRow, Platform.OS === 'android' && styles.inputRowAndroid]}>
              <TextInput
                style={styles.input}
                value={inputText}
                onChangeText={setInputText}
                placeholder={t.chat.messagePlaceholder}
                placeholderTextColor={Colors.textLight}
                onSubmitEditing={() => sendUserMessage(inputText)}
                returnKeyType="send"
                editable={!loading}
              />
              <TouchableOpacity
                style={[styles.sendBtn, (!inputText.trim() || loading) && styles.sendBtnDisabled]}
                onPress={() => sendUserMessage(inputText)}
                disabled={!inputText.trim() || loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <View style={styles.sendGrad}>
                    <ActivityIndicator size="small" color={Colors.textLight} />
                  </View>
                ) : (
                  <LinearGradient colors={Gradients.primaryFade} style={styles.sendGrad}>
                    <Ionicons name="send" size={15} color="#fff" />
                  </LinearGradient>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    height: Math.round(Dimensions.get('window').height * 0.78),
    ...Shadows.lg,
  },
  kav: { flex: 1 },
  handleBar: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: Spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  headerTitle: {
    ...Typography.bodyMedium,
    color: Colors.text,
    fontWeight: '700',
  },
  headerSub: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontSize: 12,
  },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: Spacing.xxl,
  },
  loadingText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontSize: 13,
  },
  msgListFlex: { flex: 1 },
  msgList: {
    padding: Spacing.md,
    paddingBottom: Spacing.sm,
    flexGrow: 1,
  },
  bubble: {
    maxWidth: '85%',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    marginBottom: Spacing.sm,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.accent,
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.background,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bubbleText: {
    ...Typography.body,
    lineHeight: 21,
    fontSize: 14,
  },
  bubbleTextUser: { color: '#fff' },
  bubbleTextAssistant: { color: Colors.text },
  addBar: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  addBarDisabled: { opacity: 0.5 },
  addBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm + 2,
    gap: 6,
  },
  addBarText: {
    ...Typography.button,
    color: '#fff',
    fontSize: 14,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
    gap: 8,
    backgroundColor: Colors.surface,
  },
  inputRowAndroid: { paddingBottom: Spacing.sm },
  input: {
    flex: 1,
    height: 40,
    backgroundColor: Colors.background,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    ...Typography.body,
    color: Colors.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  sendBtnDisabled: { opacity: 0.35 },
  sendGrad: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.textLight,
  },
})
