import React, { useMemo, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, Modal, FlatList, StyleSheet, Dimensions, Platform, Keyboard } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { PHONE_COUNTRIES, POPULAR_PHONE_ISOS, flagEmoji, phoneCountryFor, splitInternational, type PhoneCountry } from '../lib/phone-countries'
import { Colors, Spacing, Radius, Typography } from '../constants/theme'

const { height: SCREEN_H } = Dimensions.get('window')

// Phone input in the usual app layout: a country-code button (flag + "+389")
// that opens a searchable list, then the number itself. The parent keeps the
// country and the local number; lib/phone-countries.ts toInternational()
// joins them into "+389 70123456" for RateHawk, Salesforce and Supabase.
interface Props {
  iso: string
  local: string
  onChangeIso: (iso: string) => void
  onChangeLocal: (local: string) => void
  placeholder: string
  title: string
  searchPlaceholder: string
  editable?: boolean
  inputStyle?: object
}

export function PhoneNumberField({ iso, local, onChangeIso, onChangeLocal, placeholder, title, searchPlaceholder, editable = true, inputStyle }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const country = phoneCountryFor(iso)

  const list = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^\+/, '')
    if (q) {
      return PHONE_COUNTRIES.filter(c => c.name.toLowerCase().includes(q) || c.dial.startsWith(q) || c.iso === q)
    }
    const popular = POPULAR_PHONE_ISOS.map(i => PHONE_COUNTRIES.find(c => c.iso === i)).filter(Boolean) as PhoneCountry[]
    return [...popular, ...PHONE_COUNTRIES.filter(c => !POPULAR_PHONE_ISOS.includes(c.iso))]
  }, [query])

  const onType = (text: string) => {
    // A pasted or autofilled international number picks its own country.
    const split = splitInternational(text, iso)
    if (split) {
      onChangeIso(split.iso)
      onChangeLocal(split.local)
      return
    }
    onChangeLocal(text.replace(/[^\d ]/g, ''))
  }

  const close = () => { setOpen(false); setQuery('') }

  return (
    <>
      <TouchableOpacity
        style={styles.codeBtn}
        onPress={() => { if (editable) { Keyboard.dismiss(); setOpen(true) } }}
        activeOpacity={0.7}
        disabled={!editable}
        accessibilityRole="button"
        accessibilityLabel={`${country.name} +${country.dial}`}
      >
        <Text style={styles.flag}>{flagEmoji(country.iso)}</Text>
        <Text style={styles.codeText}>+{country.dial}</Text>
        <Ionicons name="chevron-down" size={14} color={Colors.textLight} />
      </TouchableOpacity>
      <View style={styles.divider} />
      <TextInput
        style={[styles.input, inputStyle]}
        value={local}
        onChangeText={onType}
        placeholder={placeholder}
        placeholderTextColor={Colors.textLight}
        keyboardType="phone-pad"
        returnKeyType="done"
        onSubmitEditing={() => Keyboard.dismiss()}
        editable={editable}
        textContentType="telephoneNumber"
        autoComplete="tel"
      />

      <Modal visible={open} transparent animationType="slide" statusBarTranslucent onRequestClose={close}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={close} />
        <View style={styles.sheet}>
          <View style={styles.handleBar}><View style={styles.handle} /></View>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={close}>
              <Ionicons name="close" size={22} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={16} color={Colors.textLight} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder={searchPlaceholder}
              placeholderTextColor={Colors.textLight}
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />
          </View>
          <FlatList
            data={list}
            keyExtractor={c => c.iso}
            keyboardShouldPersistTaps="handled"
            style={styles.scrollArea}
            contentContainerStyle={styles.list}
            initialNumToRender={24}
            renderItem={({ item }) => {
              const selected = item.iso === iso
              return (
                <TouchableOpacity
                  style={[styles.row, selected && styles.rowSelected]}
                  onPress={() => { onChangeIso(item.iso); close() }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.rowFlag}>{flagEmoji(item.iso)}</Text>
                  <Text style={[styles.rowLabel, selected && styles.rowLabelSelected]} numberOfLines={1}>{item.name}</Text>
                  <Text style={[styles.rowDial, selected && styles.rowLabelSelected]}>+{item.dial}</Text>
                </TouchableOpacity>
              )
            }}
          />
        </View>
      </Modal>
    </>
  )
}

const SHEET_RADIUS = 20

const styles = StyleSheet.create({
  codeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 12, paddingRight: 6 },
  flag: { fontSize: 18 },
  codeText: { ...Typography.bodyMedium, color: Colors.text },
  divider: { width: 1, alignSelf: 'stretch', marginVertical: 10, backgroundColor: Colors.border, marginRight: 8 },
  input: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 13 : 11,
    ...Typography.body,
    color: Colors.text,
    fontSize: 15,
  },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: SHEET_RADIUS,
    borderTopRightRadius: SHEET_RADIUS,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    height: SCREEN_H * 0.75,
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
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.background,
  },
  searchInput: { flex: 1, paddingVertical: 10, ...Typography.body, color: Colors.text, fontSize: 15 },
  scrollArea: { flex: 1 },
  list: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.xl },
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
  rowFlag: { fontSize: 20 },
  rowLabel: { ...Typography.bodyMedium, color: Colors.text, flex: 1 },
  rowDial: { ...Typography.bodyMedium, color: Colors.textSecondary },
  rowLabelSelected: { color: Colors.primary, fontWeight: '700' },
})
