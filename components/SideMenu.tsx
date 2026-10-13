import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Animated, Dimensions, Modal, SafeAreaView, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors, Radius, Shadows, Spacing, Typography } from '../constants/theme'
import { useLang } from '../lib/i18n'
import { getUser } from '../lib/auth'

const SCREEN_WIDTH = Dimensions.get('window').width
const PANEL_WIDTH = Math.min(300, SCREEN_WIDTH * 0.8)

interface SideMenuProps {
  visible: boolean
  onClose: () => void
  onProfile: () => void
  onMyBookings: () => void
  onExploreDestinations: () => void
  onSignOut: () => void
}

// Slide-out navigation drawer — replaces the old Alert.alert action sheet,
// which read as a decision prompt rather than navigation. Dismisses on
// backdrop tap, the close button, or Android back, not just by picking an item.
export function SideMenu({ visible, onClose, onProfile, onMyBookings, onExploreDestinations, onSignOut }: SideMenuProps) {
  const { t } = useLang()
  const [mounted, setMounted] = useState(visible)
  const translateX = useRef(new Animated.Value(-PANEL_WIDTH)).current
  const backdropOpacity = useRef(new Animated.Value(0)).current
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')

  // Same name fallback as the Profile screen; re-read on each open so a
  // sign-in or name change since the last open shows up.
  useEffect(() => {
    if (!visible) return
    getUser().then(u => {
      setUserName(u ? (u.user_metadata?.full_name ?? u.email?.split('@')[0] ?? '') : '')
      setUserEmail(u?.email ?? '')
    }).catch(() => {})
  }, [visible])

  useEffect(() => {
    if (visible) {
      setMounted(true)
      Animated.parallel([
        Animated.timing(translateX, { toValue: 0, duration: 260, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(translateX, { toValue: -PANEL_WIDTH, duration: 200, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => setMounted(false))
    }
  }, [visible, translateX, backdropOpacity])

  const go = useCallback((action: () => void) => {
    onClose()
    action()
  }, [onClose])

  if (!mounted) return null

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.container}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdropOpacity }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        </Animated.View>

        <Animated.View style={[styles.panel, { transform: [{ translateX }] }]}>
          <SafeAreaView style={styles.safe}>
          <View style={styles.inner}>
            <View style={styles.header}>
              <Text style={styles.brand}>Balkanea</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {userEmail ? (
              <TouchableOpacity style={styles.account} activeOpacity={0.7} onPress={() => go(onProfile)}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{(userName || userEmail).charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.accountText}>
                  <Text style={styles.accountName} numberOfLines={1}>{userName}</Text>
                  <Text style={styles.accountEmail} numberOfLines={1}>{userEmail}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity style={styles.item} activeOpacity={0.7} onPress={() => go(onProfile)}>
              <Ionicons name="person-outline" size={20} color={Colors.text} />
              <Text style={styles.itemText}>{t.menu.profile}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.item} activeOpacity={0.7} onPress={() => go(onMyBookings)}>
              <Ionicons name="briefcase-outline" size={20} color={Colors.text} />
              <Text style={styles.itemText}>{t.menu.myBookings}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.item} activeOpacity={0.7} onPress={() => go(onExploreDestinations)}>
              <Ionicons name="compass-outline" size={20} color={Colors.text} />
              <Text style={styles.itemText}>{t.menu.exploreDestinations}</Text>
            </TouchableOpacity>

            <View style={styles.spacer} />

            <TouchableOpacity style={styles.item} activeOpacity={0.7} onPress={() => go(onSignOut)}>
              <Ionicons name="log-out-outline" size={20} color={Colors.error} />
              <Text style={[styles.itemText, styles.signOutText]}>{t.menu.signOut}</Text>
            </TouchableOpacity>
          </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    backgroundColor: Colors.overlay,
  },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: PANEL_WIDTH,
    backgroundColor: Colors.surface,
    borderTopRightRadius: Radius.lg,
    borderBottomRightRadius: Radius.lg,
    ...Shadows.lg,
  },
  // iOS SafeAreaView replaces any padding on itself with the safe-area
  // insets, so the side margins live on an inner View instead.
  safe: {
    flex: 1,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  brand: {
    ...Typography.h2,
    color: Colors.text,
  },
  account: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  avatarText: {
    ...Typography.bodyMedium,
    color: Colors.surface,
  },
  accountText: {
    flex: 1,
  },
  accountName: {
    ...Typography.bodyMedium,
    color: Colors.text,
  },
  accountEmail: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: Spacing.md,
  },
  itemText: {
    ...Typography.bodyMedium,
    color: Colors.text,
  },
  signOutText: {
    color: Colors.error,
  },
  spacer: {
    flex: 1,
  },
})
