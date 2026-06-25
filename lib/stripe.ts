// Stripe payment stub — real integration requires:
//   1. expo install @stripe/stripe-react-native (native dev-build)
//   2. Backend POST /api/create-payment-intent → returns { clientSecret }
//   3. <StripeProvider publishableKey={...}> in app/_layout.tsx
//   4. Replace confirmPayment body with:
//        const { paymentIntent, error } = await stripe.confirmPayment(clientSecret, { type: 'Card' })
//
// The PAN must never enter this function — real Stripe's CardField captures it
// inside the SDK's native view and exchanges it for a PaymentMethod ID.
// The `simulateDecline` flag is a demo-only signal derived from card digits
// inside the capture component — it is NOT the card number.

export type PaymentResult =
  | { success: true; paymentIntentId: string }
  | { success: false; reason: 'declined' | 'network' }

export async function confirmPayment(params: {
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
    paymentIntentId: 'pi_demo_' + Math.random().toString(36).slice(2, 10),
  }
}
