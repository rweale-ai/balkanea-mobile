import { Alert, Platform } from 'react-native'

// Alert.alert is a no-op on react-native-web, so on web every message went
// silently missing ("Check your email", sign-in errors...). Use this for
// simple one-button messages; web gets window.alert, then onOk runs.
export function showMessage(title: string, message?: string, onOk?: () => void) {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title)
    onOk?.()
    return
  }
  Alert.alert(title, message, onOk ? [{ text: 'OK', onPress: onOk }] : undefined)
}
