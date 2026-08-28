import React, { useState } from 'react'
import { View, Text, TouchableOpacity, Modal, StyleSheet, Dimensions, Platform, ScrollView, Image } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COUNTRIES, type CountryCode } from '../lib/locale'
import { Colors, Spacing, Radius, Typography } from '../constants/theme'

const { height: SCREEN_H } = Dimensions.get('window')

// A single-purpose country picker for form fields (billing address, etc.) --
// distinct from components/LocaleSelector.tsx, which bundles country +
// currency behind a small icon button in the header and isn't a form field.
// Reuses the same COUNTRIES list and modal-grid visual language.
interface Props {
  value: CountryCode | ''
  onChange: (c: CountryCode) => void
  placeholder: string
  title: string
  disabled?: boolean
}

export function CountryPickerField({ value, onChange, placeholder, title, disabled }: Props) {
  const [open, setOpen] = useState(false)
  const selected = COUNTRIES.find(c => c.code === value)

  return (
    <>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => !disabled && setOpen(true)}
        activeOpacity={0.7}
        disabled={disabled}
      >
        {selected ? (
          <>
            <Image source={{ uri: selected.flagUrl }} style={styles.flag} />
            <Text style={styles.triggerText}>{selected.name}</Text>
          </>
        ) : (
          <Text style={styles.placeholder}>{placeholder}</Text>
        )}
        <Ionicons name="chevron-down" size={16} color={Colors.textLight} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setOpen(false)} />
        <View style={styles.sheet}>
          <View style={styles.handleBar}><View style={styles.handle} /></View>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setOpen(false)}>
              <Ionicons name="close" size={22} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollArea}>
            <View style={styles.list}>
              {COUNTRIES.map(c => {
                const isSelected = value === c.code
                return (
                  <TouchableOpacity
                    key={c.code}
                    style={[styles.row, isSelected && styles.rowSelected]}
                    onPress={() => { onChange(c.code); setOpen(false) }}
                    activeOpacity={0.7}
                  >
                    <Image source={{ uri: c.flagUrl }} style={styles.rowFlag} />
                    <Text style={[styles.rowLabel, isSelected && styles.rowLabelSelected]}>{c.name}</Text>
                    {isSelected && (
                      <View style={styles.checkCircle}>
                        <Ionicons name="checkmark" size={14} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                )
              })}
            </View>
            <View style={{ height: Spacing.xl }} />
          </ScrollView>
        </View>
      </Modal>
    </>
  )
}

const SHEET_RADIUS = 20

const styles = StyleSheet.create({
  trigger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  flag: { width: 22, height: 15, borderRadius: 2 },
  triggerText: { ...Typography.bodyMedium, color: Colors.text, flex: 1 },
  placeholder: { ...Typography.bodyMedium, color: Colors.textLight, flex: 1 },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: SHEET_RADIUS,
    borderTopRightRadius: SHEET_RADIUS,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: SCREEN_H * 0.75,
  },
  handleBar: { alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB' },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  sheetTitle: { ...Typography.h2, color: Colors.text },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center',
  },
  scrollArea: { flexGrow: 0 },
  list: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: Radius.md,
    marginBottom: 4,
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  rowSelected: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  rowFlag: { width: 28, height: 19, borderRadius: 3 },
  rowLabel: { ...Typography.bodyMedium, color: Colors.text, flex: 1 },
  rowLabelSelected: { color: Colors.primary, fontWeight: '700' },
  checkCircle: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
})
