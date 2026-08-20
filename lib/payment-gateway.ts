// Decouples booking.tsx from a specific payment implementation. Two adapters:
//
//   - simulatedGateway    — today's demo flow (lib/bank-payment.ts), no network call
//   - hostedWebviewGateway — asks the backend (balkanea-lead-webhook) to sign a
//     payment link via the "Balkanea Payment Bridge" plugin (lib/payment-link.ts)
//
// hostedWebviewGateway is real code but not yet verified end-to-end: it needs
// BANKART_LINK_SECRET set on the backend and a Notify URL registered on
// Hristijan's plugin (see docs/bankart-payment-config.md in the Chat repo,
// "Still open"). Flip activeGateway below once that call confirms both.

import { chargeCard } from './bank-payment'
import { referenceForLock } from './payment-intent'
import { createPaymentLink, type PaymentLinkGuest } from './payment-link'

export interface CheckoutSessionParams {
  reference: string
  amount: number
  currency: 'EUR' | 'MKD'
  guest?: PaymentLinkGuest
  /** Demo-only: routes to a decline in the simulated adapter. Ignored by real adapters. */
  simulateDecline?: boolean
}

export type CheckoutSessionResult =
  // Simulated adapter resolves immediately — no redirect required.
  | { kind: 'inline'; success: true; transactionId: string }
  | { kind: 'inline'; success: false; reason: 'declined' | 'network' }
  // Hosted-checkout adapter returns a card_url to load in PaymentWebView —
  // the actual result arrives via lib/payment-status.ts polling the
  // booking's own payment_state, not from this call.
  | { kind: 'hosted-webview'; checkoutUrl: string }
  | { kind: 'hosted-webview'; error: string }

export interface PaymentGateway {
  id: 'simulated' | 'hosted-webview'
  createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutSessionResult>
}

export const simulatedGateway: PaymentGateway = {
  id: 'simulated',
  async createCheckoutSession({ amount, currency, simulateDecline }) {
    const result = await chargeCard({ amount, currency, simulateDecline })
    if (result.success) {
      return { kind: 'inline', success: true, transactionId: result.transactionId }
    }
    return { kind: 'inline', success: false, reason: result.reason }
  },
}

export const hostedWebviewGateway: PaymentGateway = {
  id: 'hosted-webview',
  async createCheckoutSession({ reference, amount, currency, guest }) {
    const result = await createPaymentLink({ reference, amount, currency, guest })
    if (!result.success) {
      return { kind: 'hosted-webview', error: result.error }
    }
    return { kind: 'hosted-webview', checkoutUrl: result.cardUrl }
  },
}

// Flip to hostedWebviewGateway once BANKART_LINK_SECRET + the Notify URL
// are confirmed with Hristijan (see docs/bankart-payment-config.md).
export const activeGateway: PaymentGateway = simulatedGateway

export { referenceForLock }
