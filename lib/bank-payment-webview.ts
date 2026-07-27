// WebView-based bank payment — container for the hosted Bankart/NLB checkout
// page. This is scaffolding: the real checkout URL, the return-URL shape,
// and the webhook contract are not yet confirmed by Balkanea's web team
// (see project memory: Bankart gateway docs review, 2026-07-27). Replace
// PLACEHOLDER_CHECKOUT_URL and the matching in parsePaymentReturnUrl() once
// those are known — nothing here is wired to a real payment yet.

// Deep-link path the WebView watches for once the hosted checkout redirects
// back into the app. `scheme` in app.json is "balkanea". The actual
// successUrl/errorUrl/cancelUrl shape Bankart expects still needs confirming
// against the raw API docs — this guesses at simple path segments.
export const PAYMENT_RETURN_SCHEME = 'balkanea://payment'

// Stands in for the staging Bankart/NLB hosted checkout page until the web
// team provides one. Not a real payment page — safe to load in a WebView.
export const PLACEHOLDER_CHECKOUT_URL = 'https://example.com/balkanea-payment-placeholder'

export type PaymentReturn =
  | { kind: 'success'; raw: string }
  | { kind: 'cancel'; raw: string }
  | { kind: 'error'; raw: string }
  | { kind: 'other' }

// Classifies a URL the WebView is about to navigate to. The redirect is a
// UI cue only — the bank's webhook to the backend is the source of truth
// for whether payment actually succeeded, not this classification.
export function parsePaymentReturnUrl(url: string): PaymentReturn {
  if (!url.startsWith(PAYMENT_RETURN_SCHEME)) return { kind: 'other' }
  if (url.includes('/success')) return { kind: 'success', raw: url }
  if (url.includes('/cancel')) return { kind: 'cancel', raw: url }
  if (url.includes('/error')) return { kind: 'error', raw: url }
  return { kind: 'other' }
}
