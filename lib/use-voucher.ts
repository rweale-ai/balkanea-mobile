import { useState } from 'react'
import { Alert } from 'react-native'
import { checkVoucherAvailability, voucherUrl } from './ratehawk'

// Shared by booking-confirmed.tsx and booking-detail.tsx -- both need the
// same "check it's actually ready, then show it" flow. Keyed by
// payment_reference, NOT ratehawk_order_id: RateHawk's voucher endpoint
// wants the partner_order_id we sent them, and since the 2026-08-25 fix
// unifying that with the Bankart reference (lib/payment-intent.ts), those
// are now the same value -- payment_reference is what's actually stored.
export function useVoucher() {
  const [checking, setChecking] = useState(false)
  const [visible, setVisible] = useState(false)
  const [url, setUrl] = useState<string | null>(null)

  const open = async (paymentReference: string, messages: { pending: string; unavailable: string }) => {
    if (checking) return
    setChecking(true)
    const result = await checkVoucherAvailability(paymentReference)
    setChecking(false)
    if (result.ok) {
      setUrl(voucherUrl(paymentReference))
      setVisible(true)
      return
    }
    Alert.alert('', result.error === 'pending' ? messages.pending : messages.unavailable)
  }

  const close = () => setVisible(false)

  return { checking, visible, url, open, close }
}
