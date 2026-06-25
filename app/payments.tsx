import React, { useState, useEffect, useMemo } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { getBookings, subscribeToBookings } from '../lib/bookings-store'
import { useLang } from '../lib/i18n'
import { Colors, Spacing, Radius, Typography, Shadows } from '../constants/theme'
import type { Booking } from '../lib/types'

// ── Payment derived from Booking ───────────────────────────────────

type PaymentStatus = 'paid' | 'refunded' | 'pending'

interface Payment {
  id: string
  hotel: string
  date: string
  code: string
  amount: number
  currency: string
  status: PaymentStatus
}

function toPayment(b: Booking): Payment {
  return {
    id: b.id,
    hotel: b.hotel.name,
    date: formatDate(b.booked_at),
    code: b.confirmation_code,
    amount: b.total_price,
    currency: b.currency,
    status: b.status === 'confirmed' ? 'paid'
           : b.status === 'cancelled' ? 'refunded'
           : 'pending',
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatAmount(amount: number, currency: string): string {
  if (currency === 'MKD') return `${Math.round(amount).toLocaleString('en-US')} ден`
  if (currency === 'GBP') return `£${amount}`
  if (currency === 'USD') return `$${amount}`
  return `€${amount}`
}

// ── Payment row ────────────────────────────────────────────────────

function PaymentRow({ payment }: { payment: Payment }) {
  const { t } = useLang()

  const isRefunded = payment.status === 'refunded'
  const isPending = payment.status === 'pending'

  const statusLabel = isRefunded ? t.payments.refunded
    : isPending ? t.payments.pending
    : t.payments.paid

  const statusColor = isRefunded ? Colors.textLight
    : isPending ? Colors.star
    : Colors.success

  const amountColor = isRefunded ? Colors.textLight : Colors.text

  return (
    <View style={s.row}>
      {/* Card icon */}
      <View style={s.iconWrap}>
        <Ionicons name="card-outline" size={20} color={Colors.primary} />
      </View>

      {/* Hotel + date + code */}
      <View style={s.info}>
        <Text style={s.hotel} numberOfLines={1}>{payment.hotel}</Text>
        <Text style={s.meta}>{payment.date} · {payment.code}</Text>
      </View>

      {/* Amount + status */}
      <View style={s.right}>
        <Text style={[
          s.amount,
          { color: amountColor },
          isRefunded && s.strikethrough,
        ]}>
          {formatAmount(payment.amount, payment.currency)}
        </Text>
        <Text style={[s.status, { color: statusColor }]}>{statusLabel}</Text>
      </View>
    </View>
  )
}

// ── Empty state ────────────────────────────────────────────────────

function EmptyState() {
  const { t } = useLang()
  return (
    <View style={s.empty}>
      <View style={s.emptyIcon}>
        <Ionicons name="compass-outline" size={44} color={Colors.border} />
      </View>
      <Text style={s.emptyTitle}>{t.payments.noPayments}</Text>
      <Text style={s.emptySub}>{t.payments.noPaymentsSub}</Text>
    </View>
  )
}

// ── Main screen ────────────────────────────────────────────────────

export default function PaymentsScreen() {
  const router = useRouter()
  const { t } = useLang()

  const [bookings, setBookings] = useState<Booking[]>(() => getBookings())

  useEffect(() => {
    return subscribeToBookings(updated => setBookings([...updated]))
  }, [])

  // Derive payments from bookings, most recent first
  const payments: Payment[] = useMemo(() =>
    bookings
      .filter(b => b.status !== 'pending')
      .map(toPayment)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [bookings],
  )

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t.payments.title}</Text>
        <View style={{ width: 38 }} />
      </View>

      {payments.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={payments}
          keyExtractor={p => p.id}
          renderItem={({ item }) => <PaymentRow payment={item} />}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={s.separator} />}
        />
      )}
    </SafeAreaView>
  )
}

// ── Styles ─────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.surface,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: Radius.full,
    backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { ...Typography.h3, color: Colors.text },

  // List
  list: {
    padding: Spacing.md,
  },
  separator: {
    height: Spacing.sm,
  },

  // Payment row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.md,
    ...Shadows.sm,
  },
  iconWrap: {
    width: 44, height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  hotel: {
    ...Typography.bodyMedium,
    color: Colors.text,
    fontWeight: '700',
    fontSize: 15,
  },
  meta: {
    ...Typography.caption,
    color: Colors.textLight,
    marginTop: 3,
  },
  right: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  amount: {
    ...Typography.bodyMedium,
    fontWeight: '800',
    fontSize: 16,
  },
  strikethrough: {
    textDecorationLine: 'line-through',
  },
  status: {
    ...Typography.caption,
    fontWeight: '700',
    fontSize: 11,
    marginTop: 3,
  },

  // Empty state
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  emptyIcon: {
    width: 88, height: 88,
    borderRadius: 44,
    backgroundColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    ...Typography.h2,
    color: Colors.text,
    textAlign: 'center',
  },
  emptySub: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 22,
  },
})
