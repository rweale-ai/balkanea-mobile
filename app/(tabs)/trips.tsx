import React from 'react'
import { View, Text, StyleSheet, SafeAreaView } from 'react-native'
import { Colors, Spacing } from '../../constants/theme'

export default function TripsScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>My Trips</Text>
        <Text style={styles.sub}>Your saved trips will appear here</Text>
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
