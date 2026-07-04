import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  Modal, View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, Animated,
  ActivityIndicator, ScrollView, Keyboard,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import type { Hotel, HotelSearchParams } from '../../lib/types'
import { sendMessage } from '../../lib/claude'
import { getViewedHotels } from '../../lib/session-store'
import { useLang } from '../../lib/i18n'
import { Colors, Spacing, Radius, Typography, Shadows, Gradients } from '../../constants/theme'

type SheetMsg = { role: 'user' | 'assistant'; content: string }

interface Props {
  hotel: Hotel
  searchParams: HotelSearchParams
  visible: boolean
  onClose: () => void
}

export function NeaBottomSheet({ hotel, visible, onClose }: Props) {
  const { t, lang } = useLang()
  // history[0] is the hidden initial user query; displayed messages start at index 1
  const [history, setHistory] = useState<SheetMsg[]>([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const slideAnim = useRef(new Animated.Value(600)).current
  const listRef = useRef<FlatList<SheetMsg>>(null)
  const loadedRef = useRef(false)

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        speed: 14,
        bounciness: 4,
      }).start()
      if (!loadedRef.current) {
        loadedRef.current = true
        loadReviewSummary()
      }
    } else {
      Keyboard.dismiss()
      Animated.timing(slideAnim, {
        toValue: 600,
        useNativeDriver: true,
        duration: 220,
      }).start(() => {
        setHistory([])
        setStreamingText('')
        setInputText('')
        loadedRef.current = false
      })
    }
  }, [visible])

  const loadReviewSummary = async () => {
    setLoading(true)
    const initialQuery = `What are guests saying about ${hotel.name}? Please search for reviews and give me an honest summary — what do guests love, and any watch-outs?`
    const msgs: SheetMsg[] = [{ role: 'user', content: initialQuery }]
    let streamed = ''
    try {
      const resp = await sendMessage(msgs as any, token => {
        streamed += token
        setStreamingText(streamed)
      }, lang)
      setHistory([...msgs, { role: 'assistant', content: resp.content }])
    } catch {
      setHistory([...msgs, { role: 'assistant', content: 'Ask me anything about this hotel!' }])
    } finally {
      setStreamingText('')
      setLoading(false)
    }
  }

  const sendUserMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return
    setInputText('')
    Keyboard.dismiss()
    const newHistory: SheetMsg[] = [...history, { role: 'user', content: trimmed }]
    setHistory(newHistory)
    setLoading(true)
    let streamed = ''
    try {
      const resp = await sendMessage(newHistory as any, token => {
        streamed += token
        setStreamingText(streamed)
      }, lang)
      setHistory([...newHistory, { role: 'assistant', content: resp.content }])
    } catch {
      setHistory([...newHistory, { role: 'assistant', content: 'Sorry, I had trouble with that. Please try again.' }])
    } finally {
      setStreamingText('')
      setLoading(false)
    }
  }, [history, loading, lang])

  const handleCompare = useCallback((other: Hotel) => {
    sendUserMessage(`Compare ${hotel.name} and ${other.name}. Which would you recommend and why?`)
  }, [hotel.name, sendUserMessage])

  const displayMessages = useMemo((): SheetMsg[] => {
    const base = history.length > 1 ? history.slice(1) : []
    if (streamingText) return [...base, { role: 'assistant', content: streamingText }]
    return base
  }, [history, streamingText])

  // Refresh viewed hotels list each time sheet opens (visible changes to true)
  const otherViewed = useMemo(
    () => getViewedHotels().filter(v => v.hotel.hotel_id !== hotel.hotel_id),
    [hotel.hotel_id, visible],
  )

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.kav}
          >
            {/* Handle */}
            <View style={styles.handleBar}>
              <View style={styles.handle} />
            </View>

            {/* Header */}
            <View style={styles.header}>
              <LinearGradient colors={Gradients.accentFade} style={styles.avatar}>
                <Text style={styles.avatarText}>N</Text>
              </LinearGradient>
              <View style={styles.headerText}>
                <Text style={styles.headerTitle}>Nea</Text>
                <Text style={styles.headerSub} numberOfLines={1}>{hotel.name}</Text>
              </View>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Compare chips — shown when ≥1 other hotel was viewed this session */}
            {otherViewed.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipsBar}
                contentContainerStyle={styles.chipsContent}
              >
                <Text style={styles.viewingLabel}>{t.hotel.viewing} </Text>
                {otherViewed.map(v => (
                  <TouchableOpacity
                    key={v.hotel.hotel_id}
                    style={styles.compareChip}
                    onPress={() => handleCompare(v.hotel)}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="git-compare-outline" size={11} color={Colors.primary} />
                    <Text style={styles.compareChipText}>
                      {t.hotel.compareWith} {v.hotel.name.split(' ')[0]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Messages */}
            {loading && displayMessages.length === 0 ? (
              <View style={styles.loadingCenter}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.loadingText}>Checking reviews…</Text>
              </View>
            ) : (
              <FlatList
                ref={listRef}
                data={displayMessages}
                keyExtractor={(_, i) => String(i)}
                contentContainerStyle={styles.msgList}
                onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
                renderItem={({ item }) => (
                  <View style={[
                    styles.bubble,
                    item.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant,
                  ]}>
                    <Text style={[
                      styles.bubbleText,
                      item.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextAssistant,
                    ]}>
                      {item.content}
                    </Text>
                  </View>
                )}
              />
            )}

            {/* Input row */}
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
        </Animated.View>
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
    maxHeight: '78%',
    ...Shadows.lg,
  },
  kav: {
    flex: 1,
  },
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
  avatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 17,
  },
  headerText: {
    flex: 1,
  },
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
  chipsBar: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.md,
    flexGrow: 0,
  },
  chipsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewingLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  compareChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: `${Colors.primary}33`,
  },
  compareChipText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
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
  bubbleTextUser: {
    color: '#fff',
  },
  bubbleTextAssistant: {
    color: Colors.text,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    gap: 8,
    backgroundColor: Colors.surface,
  },
  inputRowAndroid: {
    paddingBottom: Spacing.sm,
  },
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
  sendBtnDisabled: {
    opacity: 0.35,
  },
  sendGrad: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.textLight,
  },
})
