// Client for the backend's create-payment-link endpoint — see
// docs/bankart-payment-config.md (Chat repo). The backend signs the link
// server-side (LINK_SECRET never ships in the app); this just asks for one
// and returns whatever card_url it gets back.

const BACKEND_URL = 'https://balkanea-lead-webhook.vercel.app'

export interface PaymentLinkGuest {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
}

export interface PaymentLinkResult {
  success: true
  cardUrl: string
}

export interface PaymentLinkError {
  success: false
  error: string
}

export async function createPaymentLink(params: {
  reference: string
  amount: number
  currency: 'EUR' | 'MKD'
  guest?: PaymentLinkGuest
}): Promise<PaymentLinkResult | PaymentLinkError> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/create-payment-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
    const body = await res.json()
    if (!res.ok || !body.card_url) {
      return { success: false, error: body.error || 'Failed to create payment link' }
    }
    return { success: true, cardUrl: body.card_url }
  } catch (e: any) {
    return { success: false, error: e?.message || 'Network error' }
  }
}

// Dev-only preview target for PaymentWebView — there's no real order to
// build a link for outside an actual booking flow.
export const PLACEHOLDER_CHECKOUT_URL = 'https://example.com/balkanea-payment-placeholder'
