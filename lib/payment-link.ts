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
  // Real billing address, collected in app/booking.tsx -- until 2026-08-27
  // these were never sent at all, so the backend (Chat api/create-payment-link.js)
  // silently fell back to a hardcoded Skopje/MK placeholder for every real
  // card payment. country is an uppercase ISO 3166-1 alpha-2 code (matching
  // the backend's 'MK' fallback), not lib/locale.ts's lowercase CountryCode.
  address1?: string
  city?: string
  postcode?: string
  country?: string
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
  // USD is real-RateHawk-hotel-only (see booking.tsx's book_hash branch) --
  // both verified test hotels price in USD regardless of requested currency,
  // and there's no real USD->EUR conversion in lib/currency.ts, so those
  // bookings charge in the hotel's actual currency instead of converting.
  currency: 'EUR' | 'MKD' | 'USD'
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
