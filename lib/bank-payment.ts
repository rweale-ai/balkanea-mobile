// Simulated Macedonian bank payment module — real integration requires the
// bank/processor details Christian is confirming (see project memory:
// balkanea-mobile booking flow, call with Jasmina 2026-06-30).
//
// This is intentionally NOT Stripe. Macedonian banking regulations don't
// allow a single charge to be split between two parties in the same
// transaction, so the full amount lands in Balkanea's account and RateHawk
// is paid separately via a biweekly invoice — this module only models the
// bank charge itself.
//
// The PAN must never leave the card-capture component — real integration
// exchanges it for a bank-side token inside that component's native view.
// The `simulateDecline` flag is a demo-only signal derived from card digits
// inside the capture component — it is NOT the card number.

export type PaymentResult =
  | { success: true; transactionId: string }
  | { success: false; reason: 'declined' | 'network' }

export async function chargeCard(params: {
  amount: number
  currency: 'EUR' | 'MKD'
  simulateDecline?: boolean
}): Promise<PaymentResult> {
  // Simulate network latency
  await new Promise<void>(r => setTimeout(r, 1900))

  if (params.simulateDecline) {
    return { success: false, reason: 'declined' }
  }

  return {
    success: true,
    transactionId: 'txn_demo_' + Math.random().toString(36).slice(2, 10),
  }
}
