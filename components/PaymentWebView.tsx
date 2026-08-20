import React, { useState } from 'react'
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, SafeAreaView, Platform,
} from 'react-native'
import { WebView, WebViewMessageEvent } from 'react-native-webview'
import { Ionicons } from '@expo/vector-icons'
import { Colors, Spacing, Typography } from '../constants/theme'

// Shape of the JS bridge payload the payment page posts via
// window.ReactNativeWebView.postMessage(...) — "Balkanea Payment Bridge"
// plugin doc §5. camelCase, not snake_case — trips people up per the doc.
export interface PaymentBridgeResult {
  orderId: string
  bridgeStatus: 'success' | 'failed'
  errorCode?: number
  message?: string
}

interface PaymentWebViewProps {
  visible: boolean
  checkoutUrl: string
  /** Guest taps close before a terminal result arrives. */
  onClose: () => void
  /** The WebView itself failed to load (network/DNS) — not a payment outcome. */
  onError: (message: string) => void
  /**
   * Same-device bridge callback — UX feedback only, per doc §5-6. Do NOT
   * treat this as proof of payment: it can be spoofed, delayed, or never
   * fire. The caller should already be polling lib/payment-status.ts in
   * parallel and treat that as the actual source of truth.
   */
  onResult?: (result: PaymentBridgeResult) => void
}

// Hosts the payment page in-app. The page owns card entry, 3-D Secure, and
// tokenization entirely (Bankart's payment.js) — this component never sees
// card data.
export function PaymentWebView({ visible, checkoutUrl, onClose, onError, onResult }: PaymentWebViewProps) {
  const [loading, setLoading] = useState(true)

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const payload: PaymentBridgeResult = JSON.parse(event.nativeEvent.data)
      if (payload.bridgeStatus === 'success' || payload.bridgeStatus === 'failed') {
        onResult?.(payload)
      }
    } catch {
      // Not a bridge message we understand — ignore, don't crash the WebView.
    }
  }

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
              javaScriptEnabled
              domStorageEnabled
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
              onError={(e) => onError(e.nativeEvent.description || 'Failed to load payment page')}
              onMessage={handleMessage}
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
