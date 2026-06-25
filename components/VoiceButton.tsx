import React, { useEffect, useRef } from 'react'
import { TouchableOpacity, Animated, StyleSheet, View, Text } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import type { CallStatus } from '../lib/voice'
import { Colors, Radius, Shadows, Typography, Gradients } from '../constants/theme'

interface Props {
  status: CallStatus
  agentTalking: boolean
  onPress: () => void
  size?: number
}

const BASE = 52

export function VoiceButton({ status, agentTalking, onPress, size = BASE }: Props) {
  const pulse = useRef(new Animated.Value(1)).current
  const ring  = useRef(new Animated.Value(0)).current
  const scale = size / BASE

  useEffect(() => {
    if (status === 'active') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.12, duration: 600, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1,    duration: 600, useNativeDriver: true }),
        ])
      ).start()
      Animated.loop(
        Animated.sequence([
          Animated.timing(ring, { toValue: 1, duration: 1200, useNativeDriver: true }),
          Animated.timing(ring, { toValue: 0, duration: 0,    useNativeDriver: true }),
        ])
      ).start()
    } else {
      pulse.stopAnimation()
      ring.stopAnimation()
      pulse.setValue(1)
      ring.setValue(0)
    }
  }, [status])

  const ringOpacity = ring.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.4, 0, 0] })
  const ringScale   = ring.interpolate({ inputRange: [0, 1], outputRange: [1, 2] })

  const isActive     = status === 'active'
  const isConnecting = status === 'connecting'

  const label = isConnecting ? 'Connecting...'
    : isActive && agentTalking ? 'Nea is speaking'
    : isActive ? 'Listening...'
    : 'Talk to Nea'

  const r = size / 2
  const iconSize = Math.round(22 * scale)

  const gradientColors = isActive
    ? Gradients.accentFade
    : isConnecting
      ? [Colors.textLight, Colors.textSecondary] as const
      : Gradients.primaryFade

  return (
    <View style={styles.wrapper}>
      {isActive && (
        <Animated.View
          style={[
            styles.ring,
            {
              width: size,
              height: size,
              borderRadius: r,
              opacity: ringOpacity,
              transform: [{ scale: ringScale }],
            },
          ]}
        />
      )}

      <Animated.View style={{ transform: [{ scale: pulse }] }}>
        <TouchableOpacity onPress={onPress} activeOpacity={0.85} disabled={isConnecting}>
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.btn,
              { width: size, height: size, borderRadius: r },
              isActive && Shadows.glow,
              !isActive && !isConnecting && Shadows.md,
            ]}
          >
            <Ionicons
              name={isActive ? 'stop' : 'mic'}
              size={iconSize}
              color="#fff"
            />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      <Text style={[styles.label, isActive && styles.labelActive, { fontSize: Math.round(11 * scale) }]}>
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 4,
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: Colors.accent,
  },
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  labelActive: { color: Colors.accent },
})
