import React, { useState } from 'react'
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, SafeAreaView, Platform,
} from 'react-native'
import { WebView } from 'react-native-webview'
import { Ionicons } from '@expo/vector-icons'
import { Colors, Spacing, Typography } from '../constants/theme'

interface VoucherWebViewProps {
  visible: boolean
  url: string
  title: string
  onClose: () => void
}

// Displays the RateHawk voucher PDF in-app -- the WebView's own native PDF
// renderer (WKWebView on iOS, Chromium on Android) handles it directly, no
// separate PDF library needed. See lib/ratehawk.ts's checkVoucherAvailability
// for why this is only opened once the caller has confirmed the PDF is
// actually ready, not on every tap.
export function VoucherWebView({ visible, url, title, onClose }: VoucherWebViewProps) {
  const [loading, setLoading] = useState(true)

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <View style={s.headerTitleWrap}>
            <Ionicons name="document-text-outline" size={16} color={Colors.primary} />
            <Text style={s.headerTitle} numberOfLines={1}>{title}</Text>
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
          // react-native-webview has no web implementation -- same guard as
          // PaymentWebView.tsx.
          <View style={s.webUnsupported}>
            <Ionicons name="phone-portrait-outline" size={32} color={Colors.textLight} />
            <Text style={s.webUnsupportedText}>
              The voucher can only be viewed in an iOS or Android build.
            </Text>
          </View>
        ) : (
          <>
            <WebView
              source={{ uri: url }}
              style={s.webview}
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
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
  headerTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: Spacing.sm },
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
