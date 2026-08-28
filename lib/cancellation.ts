import type { CancellationPolicy } from './types'

// Mirrors Chat/lib/cancellation.js -- same logic, same source (a live
// sandbox call, not RateHawk's public docs, which 403 automated fetches).
// Kept as a second copy rather than shared code because this repo and the
// Chat backend are separate deployables with no shared package today; if
// that changes, this is the first candidate to de-duplicate.

export interface CancellationStatus {
  known: boolean
  isFreeRightNow?: boolean
  isNonRefundable?: boolean
  penaltyAmount?: number
  freeCancellationBefore?: string | null
}

export function currentCancellationStatus(
  policy: CancellationPolicy | null | undefined,
  now: Date = new Date(),
): CancellationStatus {
  if (!policy || !Array.isArray(policy.policies) || policy.policies.length === 0) {
    return { known: false }
  }

  const nowTime = now.getTime()
  const active =
    policy.policies.find(p => {
      const afterStart = !p.start_at || nowTime >= new Date(p.start_at).getTime()
      const beforeEnd = !p.end_at || nowTime < new Date(p.end_at).getTime()
      return afterStart && beforeEnd
    }) ?? policy.policies[policy.policies.length - 1]

  const penaltyAmount = parseFloat(active.amount_show ?? active.amount_charge ?? '0')
  const isFreeRightNow = penaltyAmount === 0
  // Non-refundable: no free window was ever offered, not just "no free
  // window remains" -- a rate that HAD a free window but it's now passed
  // is still cancellable, just with a penalty.
  const isNonRefundable = !policy.free_cancellation_before

  return {
    known: true,
    isFreeRightNow,
    isNonRefundable,
    penaltyAmount,
    freeCancellationBefore: policy.free_cancellation_before ?? null,
  }
}

// Formats a RateHawk cancellation-terms date (e.g. "2026-10-04T00:00:00")
// for guest display -- shared so room-selection.tsx and booking-detail.tsx
// show the same "4 Oct 2026" style rather than the raw ISO string.
export function formatCancellationDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function describeCancellationPolicy(
  policy: CancellationPolicy | null | undefined,
  currency?: string,
  now: Date = new Date(),
): string {
  const status = currentCancellationStatus(policy, now)
  if (!status.known) return 'Cancellation terms unavailable'
  if (status.isNonRefundable) return 'Non-refundable'
  if (status.isFreeRightNow) {
    return status.freeCancellationBefore
      ? `Free cancellation until ${formatCancellationDate(status.freeCancellationBefore)}`
      : 'Free cancellation'
  }
  return `Cancelling now charges ${status.penaltyAmount!.toFixed(2)} ${currency ?? ''}`.trim()
}
