import React, { useState } from 'react'
import {
  View, Text, TouchableOpacity, Modal, StyleSheet,
  Dimensions, Platform, ScrollView,
} from 'react-native'
import {
  COUNTRIES, CURRENCIES, DEFAULT_CURRENCY,
  type CountryCode, type CurrencyCode,
} from '../lib/locale'
import { Colors, Spacing, Radius, Typography, Shadows } from '../constants/theme'

const { height: SCREEN_H } = Dimensions.get('window')

const NAVY = '#003580'
const NAVY_DARK = '#002a66'
const NAVY_LIGHT = '#EFF6FF'

interface Props {
  country: CountryCode
  currency: CurrencyCode
  onCountryChange: (c: CountryCode) => void
  onCurrencyChange: (c: CurrencyCode) => void
}

export function LocaleSelector({ country, currency, onCountryChange, onCurrencyChange }: Props) {
  const [open, setOpen] = useState(false)
  const flag = COUNTRIES.find(c => c.code === country)?.flag ?? '🌐'

  const handleCountry = (code: CountryCode) => {
    onCountryChange(code)
    onCurrencyChange(DEFAULT_CURRENCY[code])
  }

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={() => setOpen(true)} activeOpacity={0.8}>
        <Text style={styles.triggerCurrency}>{currency}</Text>
        <View style={styles.flagCircle}>
          <Text style={styles.triggerFlag}>{flag}</Text>
        </View>
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setOpen(false)} />

        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>Country & Currency</Text>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollArea}>
            <Text style={styles.sectionLabel}>COUNTRY</Text>
            {COUNTRIES.map(c => (
              <TouchableOpacity
                key={c.code}
                style={[styles.option, country === c.code && styles.optionSelected]}
                onPress={() => handleCountry(c.code)}
                activeOpacity={0.7}
              >
                <Text style={styles.optionFlag}>{c.flag}</Text>
                <Text style={[styles.optionLabel, country === c.code && styles.optionLabelActive]}>
                  {c.name}
                </Text>
                <View style={[styles.radio, country === c.code && styles.radioFilled]}>
                  {country === c.code && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            ))}

            <Text style={[styles.sectionLabel, { marginTop: Spacing.md }]}>CURRENCY</Text>
            {CURRENCIES.map(c => (
              <TouchableOpacity
                key={c.code}
                style={[styles.option, currency === c.code && styles.optionSelected]}
                onPress={() => onCurrencyChange(c.code)}
                activeOpacity={0.7}
              >
                <View style={styles.symbolBox}>
                  <Text style={styles.symbol}>{c.symbol}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionLabel, currency === c.code && styles.optionLabelActive]}>
                    {c.code}
                  </Text>
                  <Text style={styles.optionSub}>{c.name}</Text>
                </View>
                <View style={[styles.radio, currency === c.code && styles.radioFilled]}>
                  {currency === c.code && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            ))}

            <View style={{ height: Spacing.md }} />
          </ScrollView>

          <TouchableOpacity style={styles.doneBtn} activeOpacity={0.85} onPress={() => setOpen(false)}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  )
}

const SHEET_RADIUS = 20

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: NAVY,
    borderRadius: Radius.full,
    paddingLeft: 14,
    paddingRight: 5,
    paddingVertical: 5,
    marginRight: 8,
    ...Shadows.sm,
  },
  triggerCurrency: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  flagCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: NAVY_DARK,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  triggerFlag: {
    fontSize: 20,
    lineHeight: 24,
  },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: SHEET_RADIUS,
    borderTopRightRadius: SHEET_RADIUS,
    paddingHorizontal: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: SCREEN_H * 0.75,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: Spacing.md,
  },
  scrollArea: {
    flexGrow: 0,
  },

  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: Radius.md,
    marginBottom: 6,
    backgroundColor: '#F9FAFB',
  },
  optionSelected: {
    backgroundColor: NAVY_LIGHT,
    borderWidth: 1.5,
    borderColor: NAVY,
  },
  optionFlag: { fontSize: 24 },
  optionLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
  },
  optionLabelActive: { color: NAVY, fontWeight: '700' },
  optionSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },

  symbolBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbol: { fontSize: 16, color: '#fff', fontWeight: '700' },

  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioFilled: { borderColor: NAVY },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: NAVY,
  },

  doneBtn: {
    marginTop: Spacing.sm,
    backgroundColor: NAVY,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
})
