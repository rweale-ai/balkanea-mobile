import React, { useRef } from 'react'
import { View, Text, StyleSheet, Image, Animated, TouchableWithoutFeedback } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import type { Destination } from '../../lib/types'
import { Colors, Spacing, Radius, Typography, Shadows, Gradients } from '../../constants/theme'

interface Props {
  destination: Destination
  variant: 'hero' | 'grid'
  onPress: () => void
}

export function DestinationCard({ destination, variant, onPress }: Props) {
  const scale = useRef(new Animated.Value(1)).current

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 40, bounciness: 4 }).start()
  }
  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 4 }).start()
  }

  const isHero = variant === 'hero'
  const height = isHero ? 220 : 180

  return (
    <TouchableWithoutFeedback onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[styles.card, { height, transform: [{ scale }] }, isHero ? styles.heroCard : styles.gridCard]}>
        <Image source={{ uri: destination.imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <LinearGradient
          colors={isHero ? Gradients.heroOverlay : Gradients.cardOverlay}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.content}>
          <Text style={styles.overline}>{destination.country}</Text>
          <Text style={[styles.name, isHero && styles.heroName]}>{destination.name}</Text>
          {isHero && <Text style={styles.tagline}>{destination.tagline}</Text>}
          <View style={styles.bottomRow}>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={12} color={Colors.star} />
              <Text style={styles.rating}>{destination.rating}</Text>
              <Text style={styles.reviews}>({destination.reviewCount.toLocaleString()})</Text>
            </View>
            {isHero && (
              <View style={styles.explorePill}>
                <Text style={styles.exploreText}>Find hotels</Text>
                <Ionicons name="arrow-forward" size={12} color="#fff" />
              </View>
            )}
          </View>
        </View>
      </Animated.View>
    </TouchableWithoutFeedback>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadows.md,
  },
  heroCard: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  gridCard: {
    flex: 1,
    marginBottom: Spacing.sm,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: Spacing.md,
  },
  overline: {
    ...Typography.overline,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 2,
  },
  name: {
    ...Typography.h2,
    color: '#fff',
    fontSize: 18,
  },
  heroName: {
    ...Typography.hero,
    color: '#fff',
    fontSize: 28,
  },
  tagline: {
    ...Typography.body,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    marginTop: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    ...Typography.bodyMedium,
    color: '#fff',
    fontSize: 13,
  },
  reviews: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
  },
  explorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  exploreText: {
    ...Typography.caption,
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
})
