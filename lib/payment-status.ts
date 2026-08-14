// Polls the "Balkanea Mobile Payment Bridge" status endpoint. This is the
// documented reliable channel for learning a payment's outcome — see
// lib/bank-payment-webview.ts for why WebView navigation events aren't
// sufficient on their own.
//
// Confirmed response shape (balkanea-mobile-bridge-documentation.txt §9,
// verified live 2026-08-13 against stage.staging.balkanea.com order #20592682):
//   { order_id, wc_status, bridge_status: 'pending'|'success'|'failed', is_terminal, total, currency, invoice_num }

export interface OrderStatus {
  order_id: number
  wc_status: string
  bridge_status: 'pending' | 'success' | 'failed'
  is_terminal: boolean
  total: string
  currency: string
  invoice_num: string
}

const POLL_MS = 3000
const MAX_TRIES = 200 // ~10 min ceiling, matches the plugin doc's own recommendation

export function buildStatusUrl(baseUrl: string, orderId: number | string, orderKey: string): string {
  return `${baseUrl}/wp-json/balkanea/v1/order-status?order_id=${orderId}&key=${encodeURIComponent(orderKey)}`
}

async function fetchStatus(statusUrl: string): Promise<OrderStatus | null> {
  const res = await fetch(statusUrl)
  if (res.status === 404) return null // bad order id / key mismatch
  if (!res.ok) throw new Error(`Status check failed: ${res.status}`)
  return res.json()
}

export interface PollHandle {
  stop: () => void
}

// Polls until is_terminal, onUpdate fires on every tick (including
// non-terminal ones) so the caller can show a "still processing" state.
// Returns a handle so the caller can cancel early (e.g. guest closes the
// WebView manually).
export function pollOrderStatus(
  statusUrl: string,
  onUpdate: (status: OrderStatus) => void,
  onError: (message: string) => void,
): PollHandle {
  let cancelled = false
  let tries = 0

  const tick = async () => {
    if (cancelled) return
    tries += 1

    try {
      const status = await fetchStatus(statusUrl)
      if (cancelled) return

      if (!status) {
        onError('Payment link is invalid or expired')
        return
      }

      onUpdate(status)
      if (status.is_terminal) return

      if (tries >= MAX_TRIES) {
        onError('Timed out waiting for payment confirmation')
        return
      }

      setTimeout(tick, POLL_MS)
    } catch (e: any) {
      if (cancelled) return
      onError(e?.message || 'Network error while checking payment status')
    }
  }

  tick()

  return { stop: () => { cancelled = true } }
}
