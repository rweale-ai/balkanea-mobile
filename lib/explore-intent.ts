// Module-level handoff: Explore tab sets an intent, Plan tab consumes it on focus.

let pending: string | null = null

export function setExploreIntent(prompt: string): void {
  pending = prompt
}

export function consumeExploreIntent(): string | null {
  const val = pending
  pending = null
  return val
}
