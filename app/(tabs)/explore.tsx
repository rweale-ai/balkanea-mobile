import React from 'react'
import { View, Text, StyleSheet, SafeAreaView } from 'react-native'
import { Colors, Spacing } from '../../constants/theme'

export default function ExploreScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Explore</Text>
        <Text style={styles.sub}>Destination guides coming soon</Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  title:     { fontSize: 24, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm },
  sub:       { fontSize: 15, color: Colors.textSecondary, textAlign: 'center' },
})
