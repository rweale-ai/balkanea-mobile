// Decouples booking.tsx from a specific payment implementation. Two adapters:
//
//   - simulatedGateway    — today's demo flow (lib/bank-payment.ts), no network call
//   - hostedWebviewGateway — asks the backend (balkanea-lead-webhook) to create a
//     WooCommerce order and returns the "Balkanea Mobile Payment Bridge" URLs
//     (see lib/bank-payment-webview.ts + lib/payment-status.ts)
//
// hostedWebviewGateway is NOT usable yet: the backend's order-creation step
// (api/create-mobile-order.js -> lib/mobile-bridge.js's createOrder()) throws
// OrderCreationUnconfirmedError — the bridge plugin's documentation assumes an
// order already exists and doesn't say how the app/backend should create one.
// Asked Hristijan 2026-08-13; activeGateway stays 'simulated' until that's answered.

import { chargeCard } from './bank-payment'
import { referenceForLock } from './payment-intent'

export interface CheckoutSessionParams {
  reference: string
  amount: number
  currency: 'EUR' | 'MKD'
  /** Demo-only: routes to a decline in the simulated adapter. Ignored by real adapters. */
  simulateDecline?: boolean
}

export type CheckoutSessionResult =
  // Simulated adapter resolves immediately — no redirect required.
  | { kind: 'inline'; success: true; transactionId: string }
  | { kind: 'inline'; success: false; reason: 'declined' | 'network' }
  // Hosted-checkout adapter returns URLs to load in PaymentWebView / poll with
  // lib/payment-status.ts — the actual result arrives via polling, not here.
  | { kind: 'hosted-webview'; checkoutUrl: string; statusUrl: string }
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

const BACKEND_URL = 'https://balkanea-lead-webhook.vercel.app'

export const hostedWebviewGateway: PaymentGateway = {
  id: 'hosted-webview',
  async createCheckoutSession({ reference, amount, currency }) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/create-mobile-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference, amount, currency }),
      })
      const body = await res.json()
      if (!res.ok || !body.checkoutUrl || !body.statusUrl) {
        return { kind: 'hosted-webview', error: body.error || 'Order creation failed' }
      }
      return { kind: 'hosted-webview', checkoutUrl: body.checkoutUrl, statusUrl: body.statusUrl }
    } catch (e: any) {
      return { kind: 'hosted-webview', error: e?.message || 'Network error' }
    }
  },
}

// Swap to hostedWebviewGateway once order creation is implemented on the
// backend (see docs/bankart-payment-config.md in the Chat repo).
export const activeGateway: PaymentGateway = simulatedGateway

export { referenceForLock }
