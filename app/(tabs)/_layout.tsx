import { Tabs } from 'expo-router'
import { Colors } from '../../constants/theme'

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {
          borderTopColor: Colors.border,
          backgroundColor: Colors.surface,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Plan', tabBarIcon: ({ color }) => <TabIcon label="✈️" color={color} /> }}
      />
      <Tabs.Screen
        name="explore"
        options={{ title: 'Explore', tabBarIcon: ({ color }) => <TabIcon label="🗺️" color={color} /> }}
      />
      <Tabs.Screen
        name="trips"
        options={{ title: 'My Trips', tabBarIcon: ({ color }) => <TabIcon label="📋" color={color} /> }}
      />
    </Tabs>
  )
}

function TabIcon({ label, color }: { label: string; color: string }) {
  const { Text } = require('react-native')
  return <Text style={{ fontSize: 20, opacity: color === Colors.primary ? 1 : 0.5 }}>{label}</Text>
}
