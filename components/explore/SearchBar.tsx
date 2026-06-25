import React, { useState } from 'react'
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors, Spacing, Radius, Typography, Shadows } from '../../constants/theme'

interface Props {
  value: string
  onChangeText: (text: string) => void
  placeholder?: string
}

export function SearchBar({ value, onChangeText, placeholder = 'Search destinations...' }: Props) {
  const [focused, setFocused] = useState(false)

  return (
    <View style={[styles.container, focused && styles.containerFocused]}>
      <Ionicons name="search" size={18} color={focused ? Colors.primary : Colors.textLight} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textLight}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={() => onChangeText('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close-circle" size={18} color={Colors.textLight} />
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    gap: 8,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  containerFocused: {
    borderColor: Colors.primary,
  },
  input: {
    flex: 1,
    ...Typography.body,
    color: Colors.text,
    padding: 0,
  },
})
