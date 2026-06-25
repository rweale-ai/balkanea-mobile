import React, { useState } from 'react'
import {
  View, Text, TouchableOpacity, Modal, StyleSheet,
  Dimensions, Platform, ScrollView, Image,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import {
  COUNTRIES, CURRENCIES,
  type CountryCode, type CurrencyCode,
} from '../lib/locale'
import { Colors, Spacing, Radius, Typography } from '../constants/theme'

const { height: SCREEN_H } = Dimensions.get('window')

interface Props {
  country: CountryCode
  currency: CurrencyCode
  onCountryChange: (c: CountryCode) => void
  onCurrencyChange: (c: CurrencyCode) => void
}

export function LocaleSelector({ country, currency, onCountryChange, onCurrencyChange }: Props) {
  const [countryOpen, setCountryOpen] = useState(false)
  const [currencyOpen, setCurrencyOpen] = useState(false)

  const countryData = COUNTRIES.find(c => c.code === country)
  const currSymbol = CURRENCIES.find(c => c.code === currency)?.symbol ?? '$'

  return (
    <>
      <View style={styles.row}>
        {/* Country / language button — shows flag */}
        <TouchableOpacity style={styles.btn} onPress={() => setCountryOpen(true)} activeOpacity={0.7}>
          {countryData ? (
            <Image source={{ uri: countryData.flagUrl }} style={styles.btnFlagImg} />
          ) : (
            <Ionicons name="globe-outline" size={20} color={Colors.text} />
          )}
        </TouchableOpacity>

        {/* Currency button — shows symbol */}
        <TouchableOpacity style={styles.btn} onPress={() => setCurrencyOpen(true)} activeOpacity={0.7}>
          <Text style={styles.btnSymbol}>{currSymbol}</Text>
        </TouchableOpacity>
      </View>

      {/* Country modal */}
      <Modal visible={countryOpen} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setCountryOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setCountryOpen(false)} />
        <View style={styles.sheet}>
          <View style={styles.handleBar}><View style={styles.handle} /></View>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Language</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setCountryOpen(false)}>
              <Ionicons name="close" size={22} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollArea}>
            <View style={styles.grid}>
              {COUNTRIES.map(c => {
                const selected = country === c.code
                return (
                  <TouchableOpacity
                    key={c.code}
                    style={[styles.gridItem, selected && styles.gridItemSelected]}
                    onPress={() => { onCountryChange(c.code); setCountryOpen(false) }}
                    activeOpacity={0.7}
                  >
                    <Image source={{ uri: c.flagUrl }} style={styles.gridFlagImg} />
                    <Text style={[styles.gridLabel, selected && styles.gridLabelSelected]} numberOfLines={1}>
                      {c.name}
                    </Text>
                    {selected && (
                      <View style={styles.checkBadge}>
                        <Ionicons name="checkmark" size={12} color="#fff" />
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

      {/* Currency modal */}
      <Modal visible={currencyOpen} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setCurrencyOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setCurrencyOpen(false)} />
        <View style={styles.sheet}>
          <View style={styles.handleBar}><View style={styles.handle} /></View>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Currency</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setCurrencyOpen(false)}>
              <Ionicons name="close" size={22} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollArea}>
            <View style={styles.currencyList}>
              {CURRENCIES.map(c => {
                const selected = currency === c.code
                return (
                  <TouchableOpacity
                    key={c.code}
                    style={[styles.currencyRow, selected && styles.currencyRowSelected]}
                    onPress={() => { onCurrencyChange(c.code); setCurrencyOpen(false) }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.currencyCircle, selected && styles.currencyCircleSelected]}>
                      <Text style={[styles.currencyCircleText, selected && styles.currencyCircleTextSelected]}>{c.symbol}</Text>
                    </View>
                    <View style={styles.currencyInfo}>
                      <Text style={[styles.currencyCode, selected && styles.currencyCodeSelected]}>{c.code}</Text>
                      <Text style={styles.currencyName}>{c.name}</Text>
                    </View>
                    {selected && (
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
  row: {
    flexDirection: 'row',
    gap: 4,
  },

  btn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  btnFlagImg: {
    width: 22,
    height: 15,
    borderRadius: 2,
  },
  btnSymbol: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: SHEET_RADIUS,
    borderTopRightRadius: SHEET_RADIUS,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: SCREEN_H * 0.75,
  },
  handleBar: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  sheetTitle: {
    ...Typography.h2,
    color: Colors.text,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scrollArea: {
    flexGrow: 0,
  },

  // Country grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    gap: 8,
  },
  gridItem: {
    width: '31%',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.xs,
    borderRadius: Radius.md,
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: 'transparent',
    position: 'relative',
  },
  gridItemSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  gridFlagImg: {
    width: 36,
    height: 24,
    borderRadius: 3,
    marginBottom: 4,
  },
  gridLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
    fontSize: 11,
    textAlign: 'center',
  },
  gridLabelSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  checkBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Currency list
  currencyList: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  currencyRow: {
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
  currencyRowSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  currencyCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyCircleSelected: {
    backgroundColor: Colors.primary,
  },
  currencyCircleText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  currencyCircleTextSelected: {
    color: '#fff',
  },
  currencyInfo: {
    flex: 1,
  },
  currencyCode: {
    ...Typography.bodyMedium,
    fontSize: 15,
    color: Colors.text,
  },
  currencyCodeSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  currencyName: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 1,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
