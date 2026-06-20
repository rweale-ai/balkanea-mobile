import React, { useState } from 'react'
import {
  View, Text, TouchableOpacity, Modal, StyleSheet,
  Dimensions, Platform,
} from 'react-native'
import {
  COUNTRIES, CURRENCIES, DEFAULT_CURRENCY,
  type CountryCode, type CurrencyCode,
} from '../lib/locale'
import { Colors, Spacing, Radius } from '../constants/theme'

const { height: SCREEN_H } = Dimensions.get('window')

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
      {/* Trigger — matches booking.com pill style */}
      <TouchableOpacity style={s.trigger} onPress={() => setOpen(true)} activeOpacity={0.8}>
        <Text style={s.triggerCurrency}>{currency}</Text>
        <Text style={s.triggerFlag}>{flag}</Text>
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        {/* Backdrop tap to close */}
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={() => setOpen(false)} />

        {/* Bottom sheet */}
        <View style={s.sheet}>
          <View style={s.handle} />

          <Text style={s.sheetTitle}>Country & Currency</Text>

          {/* Country */}
          <Text style={s.sectionLabel}>COUNTRY</Text>
          {COUNTRIES.map(c => (
            <TouchableOpacity
              key={c.code}
              style={[s.option, country === c.code && s.optionSelected]}
              onPress={() => handleCountry(c.code)}
              activeOpacity={0.7}
            >
              <Text style={s.optionFlag}>{c.flag}</Text>
              <Text style={[s.optionLabel, country === c.code && s.optionLabelActive]}>
                {c.name}
              </Text>
              <View style={[s.radio, country === c.code && s.radioFilled]}>
                {country === c.code && <View style={s.radioDot} />}
              </View>
            </TouchableOpacity>
          ))}

          {/* Currency */}
          <Text style={[s.sectionLabel, { marginTop: Spacing.md }]}>CURRENCY</Text>
          {CURRENCIES.map(c => (
            <TouchableOpacity
              key={c.code}
              style={[s.option, currency === c.code && s.optionSelected]}
              onPress={() => onCurrencyChange(c.code)}
              activeOpacity={0.7}
            >
              <View style={s.symbolBox}>
                <Text style={s.symbol}>{c.symbol}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.optionLabel, currency === c.code && s.optionLabelActive]}>
                  {c.code}
                </Text>
                <Text style={s.optionSub}>{c.name}</Text>
              </View>
              <View style={[s.radio, currency === c.code && s.radioFilled]}>
                {currency === c.code && <View style={s.radioDot} />}
              </View>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={s.doneBtn} onPress={() => setOpen(false)} activeOpacity={0.85}>
            <Text style={s.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  )
}

const SHEET_RADIUS = 20

const s = StyleSheet.create({
  // Trigger pill — dark navy, like booking.com
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#003580',
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  triggerCurrency: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  triggerFlag: {
    fontSize: 18,
    lineHeight: 22,
  },

  // Modal
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
    // Keep sheet from filling the whole screen
    maxHeight: SCREEN_H * 0.65,
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

  // Section
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 1.5,
    marginBottom: 8,
    marginLeft: 4,
  },

  // Option row
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
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#003580',
  },
  optionFlag: { fontSize: 24 },
  optionLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
  },
  optionLabelActive: { color: '#003580', fontWeight: '700' },
  optionSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },

  // Currency symbol circle
  symbolBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#003580',
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbol: { fontSize: 16, color: '#fff', fontWeight: '700' },

  // Radio
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioFilled: { borderColor: '#003580' },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#003580',
  },

  // Done button
  doneBtn: {
    marginTop: Spacing.md,
    backgroundColor: '#003580',
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
