import { Tabs } from 'expo-router'
import { View, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors, Shadows, Spacing } from '../../constants/theme'

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textLight,
        tabBarLabelStyle: styles.label,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Plan',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrap}>
              <Ionicons name={focused ? 'airplane' : 'airplane-outline'} size={22} color={color} />
              {focused && <View style={styles.dot} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrap}>
              <Ionicons name={focused ? 'compass' : 'compass-outline'} size={22} color={color} />
              {focused && <View style={styles.dot} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: 'My Trips',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrap}>
              <Ionicons name={focused ? 'briefcase' : 'briefcase-outline'} size={22} color={color} />
              {focused && <View style={styles.dot} />}
            </View>
          ),
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderTopWidth: 0,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
    height: 64,
    ...Shadows.sm,
  },
  tabItem: {
    paddingTop: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 28,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
    marginTop: 3,
  },
})
