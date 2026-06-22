import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import type { ChatMessage } from '../../lib/types'
import { Colors, Spacing, Radius, Typography, Shadows, Gradients } from '../../constants/theme'

interface Props {
  message: ChatMessage
}

export function ChatBubble({ message }: Props) {
  const isUser = message.role === 'user'

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      {!isUser && (
        <LinearGradient
          colors={Gradients.primaryFade}
          style={styles.avatar}
        >
          <Text style={styles.avatarText}>B</Text>
        </LinearGradient>
      )}
      {isUser ? (
        <LinearGradient
          colors={Gradients.primaryFade}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.bubble, styles.bubbleUser]}
        >
          <Text style={[styles.text, styles.textUser]}>{message.content}</Text>
        </LinearGradient>
      ) : (
        <View style={[styles.bubble, styles.bubbleAssistant]}>
          <Text style={[styles.text, styles.textAssistant]}>{message.content}</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: 'flex-end',
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  rowAssistant: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.xs,
    marginBottom: 2,
    ...Shadows.sm,
  },
  avatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.lg,
  },
  bubbleUser: {
    borderBottomRightRadius: 4,
    ...Shadows.sm,
  },
  bubbleAssistant: {
    backgroundColor: Colors.assistantBubble,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  text: {
    ...Typography.body,
  },
  textUser: {
    color: '#fff',
  },
  textAssistant: {
    color: Colors.text,
  },
})
