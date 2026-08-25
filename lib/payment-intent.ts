import AsyncStorage from '@react-native-async-storage/async-storage'

// Local record of a payment attempt against the gateway, keyed by a
// deterministic reference derived from the RateHawk room lock (lib/ratehawk.ts).
// Exists so a retry (app killed mid-payment, network drop between preauth and
// capture, etc.) reuses the same merchant reference instead of creating a new
// gateway transaction — the room lock is already the thing that scopes "this
// attempt to book this room," so it doubles as the idempotency key rather
// than inventing a separate one.

export type PaymentIntentState =
  | 'preauth_pending'
  | 'preauth_done'
  | 'captured'
  | 'voided'
  | 'failed'

export interface PaymentIntent {
  reference: string
  lockId: string
  amount: number
  currency: string
  state: PaymentIntentState
  gatewayTransactionId?: string
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = 'balkanea_payment_intents'

async function loadAll(): Promise<Record<string, PaymentIntent>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

async function saveAll(intents: Record<string, PaymentIntent>): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(intents))
  } catch (e) {
    console.warn('payment-intent: persist failed', e)
  }
}

// Bankart's own merchantTransactionId cap is 50 chars, and Hristijan's
// plugin appends its own "-<ms-timestamp>" suffix (14 chars) to whatever
// reference we send before submitting to Bankart -- a step that happens
// entirely on his side, invisible to us (his Notify webhook only relays a
// generic error_code/message, never Bankart's actual validation error).
// Confirmed 2026-08-25 via the raw errorMessage Hristijan pulled from his
// own logs: our real-hotel references (`pay_p-<book_hash uuid>`, 42 chars)
// plus his suffix hit 56 chars and got rejected outright; the shorter
// simulated-stub references (`pay_lock_demo_*`, 22 chars) always stayed
// under the cap, which is why only real bookings ever failed this way.
// Stripping non-alphanumerics and truncating keeps this well under budget
// (<=28 chars here, +14 for his suffix = 42, an 8-char margin) while
// staying deterministic per lockId -- same retry-idempotency property as
// before, just shorter. A 20-hex-char slice of a random UUID still carries
// ~80 bits of entropy, far more than this needs for collision safety.
export function referenceForLock(lockId: string): string {
  const compact = lockId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 24)
  return `pay_${compact}`
}

// Returns the existing intent for this lock if one is already in flight
// (e.g. the guest backgrounded the app after preauth), otherwise creates a
// fresh 'preauth_pending' record. Never creates a second reference for the
// same lock — that's what would let the same lock double-charge.
export async function getOrCreateIntent(
  lockId: string,
  amount: number,
  currency: string,
): Promise<PaymentIntent> {
  const reference = referenceForLock(lockId)
  const intents = await loadAll()
  const existing = intents[reference]
  if (existing) return existing

  const now = new Date().toISOString()
  const intent: PaymentIntent = {
    reference,
    lockId,
    amount,
    currency,
    state: 'preauth_pending',
    createdAt: now,
    updatedAt: now,
  }
  intents[reference] = intent
  await saveAll(intents)
  return intent
}

export async function updateIntent(
  reference: string,
  patch: Partial<Pick<PaymentIntent, 'state' | 'gatewayTransactionId'>>,
): Promise<PaymentIntent | null> {
  const intents = await loadAll()
  const existing = intents[reference]
  if (!existing) return null

  const updated: PaymentIntent = { ...existing, ...patch, updatedAt: new Date().toISOString() }
  intents[reference] = updated
  await saveAll(intents)
  return updated
}

export async function getIntent(reference: string): Promise<PaymentIntent | null> {
  const intents = await loadAll()
  return intents[reference] ?? null
}

// Clears intents older than 24h in a terminal state (captured/voided/failed) —
// pending/preauth_done are left alone since those still need reconciling.
export async function pruneOldIntents(): Promise<void> {
  const intents = await loadAll()
  const cutoff = Date.now() - 24 * 60 * 60 * 1000
  const terminal: PaymentIntentState[] = ['captured', 'voided', 'failed']
  let changed = false

  for (const [ref, intent] of Object.entries(intents)) {
    if (terminal.includes(intent.state) && new Date(intent.updatedAt).getTime() < cutoff) {
      delete intents[ref]
      changed = true
    }
  }

  if (changed) await saveAll(intents)
}
