import React, { useState } from 'react'
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, SafeAreaView, Platform,
} from 'react-native'
import { WebView } from 'react-native-webview'
import { Ionicons } from '@expo/vector-icons'
import { Colors, Spacing, Typography } from '../constants/theme'

interface PaymentWebViewProps {
  visible: boolean
  checkoutUrl: string
  /** Guest taps close before the bridge status endpoint reports a terminal result. */
  onClose: () => void
  /** The WebView itself failed to load (network/DNS) — not a payment outcome. */
  onError: (message: string) => void
}

// Hosts the bank's checkout page in-app. The bank owns the card fields
// entirely — this component never sees card data.
//
// This does NOT detect payment success/failure itself. The confirmed bridge
// contract (see lib/bank-payment-webview.ts) redirects through several
// same-domain WooCommerce pages with no custom URL scheme to intercept — the
// caller is responsible for polling lib/payment-status.ts's status endpoint
// in parallel and closing this modal once that reports a terminal result.
export function PaymentWebView({ visible, checkoutUrl, onClose, onError }: PaymentWebViewProps) {
  const [loading, setLoading] = useState(true)

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <View style={s.headerTitleWrap}>
            <Ionicons name="lock-closed" size={14} color={Colors.success} />
            <Text style={s.headerTitle}>Secure Payment</Text>
          </View>
          <TouchableOpacity
            style={s.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {Platform.OS === 'web' ? (
          // react-native-webview has no web implementation (iOS/Android/macOS/
          // Windows only — confirmed against the installed package, no
          // WebView.web.js exists). Mounting <WebView> on web throws at
          // render time, not at bundle time, so this has to be an explicit
          // guard rather than letting Metro's platform resolution handle it.
          <View style={s.webUnsupported}>
            <Ionicons name="phone-portrait-outline" size={32} color={Colors.textLight} />
            <Text style={s.webUnsupportedText}>
              WebView payment can only be previewed in an iOS or Android dev build — react-native-webview doesn't support web.
            </Text>
          </View>
        ) : (
          <>
            <WebView
              source={{ uri: checkoutUrl }}
              style={s.webview}
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
              onError={(e) => onError(e.nativeEvent.description || 'Failed to load payment page')}
            />

            {loading && (
              <View style={[StyleSheet.absoluteFill, s.loadingOverlay]} pointerEvents="none">
                <ActivityIndicator size="large" color={Colors.primary} />
              </View>
            )}
          </>
        )}
      </SafeAreaView>
    </Modal>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { ...Typography.bodyMedium, color: Colors.text, fontWeight: '700' },
  closeBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  webview: { flex: 1 },
  loadingOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  webUnsupported: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  webUnsupportedText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
})
