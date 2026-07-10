import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import type { Booking } from './types'
import { getT } from './i18n'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false
  const { status: existing } = await Notifications.getPermissionsAsync()
  if (existing === 'granted') return true
  const { status } = await Notifications.requestPermissionsAsync()
  return status === 'granted'
}

export async function scheduleBookingNotifications(booking: Booking): Promise<void> {
  if (Platform.OS === 'web') return
  const granted = await requestNotificationPermissions()
  if (!granted) return

  const t = getT()

  // Immediate booking confirmation
  await Notifications.scheduleNotificationAsync({
    identifier: `confirm-${booking.id}`,
    content: {
      title: t.notifications.bookingConfirmedTitle,
      body: `${booking.hotel.name} · ${booking.confirmation_code}`,
      data: { bookingId: booking.id, screen: 'booking-detail' },
    },
    trigger: null, // immediately
  })

  // Check-in reminder at 8am the day before
  const checkinDate = new Date(booking.checkin + 'T08:00:00')
  const dayBefore = new Date(checkinDate)
  dayBefore.setDate(dayBefore.getDate() - 1)

  if (dayBefore > new Date()) {
    await Notifications.scheduleNotificationAsync({
      identifier: `checkin-${booking.id}`,
      content: {
        title: t.notifications.checkinTomorrowTitle,
        body: t.notifications.checkinTomorrowBody.replace('{{hotel}}', booking.hotel.name),
        data: { bookingId: booking.id, screen: 'booking-detail' },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: dayBefore },
    })
  }
}

export async function cancelBookingNotifications(bookingId: string): Promise<void> {
  if (Platform.OS === 'web') return
  try {
    await Notifications.cancelScheduledNotificationAsync(`checkin-${bookingId}`)
  } catch {
    // notification may not exist if check-in was in the past
  }
}
