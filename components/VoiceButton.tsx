import React, { useEffect, useRef } from 'react'
import { TouchableOpacity, Animated, StyleSheet, View, Text } from 'react-native'
import type { CallStatus } from '../lib/voice'
import { Colors, Radius } from '../constants/theme'

interface Props {
  status: CallStatus
  agentTalking: boolean
  onPress: () => void
}

export function VoiceButton({ status, agentTalking, onPress }: Props) {
  const pulse = useRef(new Animated.Value(1)).current
  const ring  = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (status === 'active') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.15, duration: 600, useNativeDriver: true }),
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

  const label = isConnecting ? 'Connecting…'
    : isActive && agentTalking ? 'Bea is speaking'
    : isActive ? 'Listening…'
    : 'Talk to Bea'

  return (
    <View style={styles.wrapper}>
      {/* Expanding ring when active */}
      {isActive && (
        <Animated.View
          style={[
            styles.ring,
            { opacity: ringOpacity, transform: [{ scale: ringScale }] },
          ]}
        />
      )}

      <Animated.View style={{ transform: [{ scale: pulse }] }}>
        <TouchableOpacity
          style={[styles.btn, isActive && styles.btnActive, isConnecting && styles.btnConnecting]}
          onPress={onPress}
          activeOpacity={0.85}
          disabled={isConnecting}
        >
          <Text style={styles.icon}>{isActive ? '⏹' : '🎙️'}</Text>
        </TouchableOpacity>
      </Animated.View>

      <Text style={[styles.label, isActive && styles.labelActive]}>{label}</Text>
    </View>
  )
}

const BTN = 52

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 4,
  },
  ring: {
    position: 'absolute',
    width: BTN,
    height: BTN,
    borderRadius: BTN / 2,
    borderWidth: 2,
    borderColor: Colors.accent,
  },
  btn: {
    width: BTN,
    height: BTN,
    borderRadius: BTN / 2,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  btnActive: {
    backgroundColor: Colors.accent,
  },
  btnConnecting: {
    backgroundColor: Colors.textLight,
  },
  disabled: {
    opacity: 0.35,
  },
  icon: {
    fontSize: 22,
  },
  label: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  labelActive: {
    color: Colors.accent,
  },
})
