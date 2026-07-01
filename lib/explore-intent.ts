let pendingReview: string | null = null

export function setReviewIntent(query: string): void {
  pendingReview = query
}

export function consumeReviewIntent(): string | null {
  const val = pendingReview
  pendingReview = null
  return val
}

let pending: string | null = null

export function setExploreIntent(prompt: string): void {
  pending = prompt
}

export function consumeExploreIntent(): string | null {
  const val = pending
  pending = null
  return val
}

let pendingHotelSearch: { destination: string; regionId: number } | null = null

export function setHotelSearchIntent(intent: { destination: string; regionId: number }): void {
  pendingHotelSearch = intent
}

export function consumeHotelSearchIntent(): { destination: string; regionId: number } | null {
  const intent = pendingHotelSearch
  pendingHotelSearch = null
  return intent
}
