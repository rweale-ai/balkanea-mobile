// Which RateHawk environment the Chat backend should use for this app's
// requests (Chat lib/ratehawk-env.js reads the X-Ratehawk-Env header).
//
// For now the app runs ENTIRELY on the RateHawk sandbox -- search pricing,
// room rates and the whole booking chain (Ray, 2026-09-23). "Test
// production" is balkanea-web's proof of concept. To test the app against
// production data later, set EXPO_PUBLIC_RATEHAWK_ENV=test-production:
// the header is then omitted and the backend uses its test-production
// path, with no backend change needed.
//
// Sandbox note: only Los Angeles, Paris and Dubai have sandbox hotels;
// any other destination gets an explicit "test mode" message back.
export const RATEHAWK_ENV: 'sandbox' | 'test-production' =
  process.env.EXPO_PUBLIC_RATEHAWK_ENV === 'test-production' ? 'test-production' : 'sandbox'

// Spread into every fetch to a RateHawk-backed Chat endpoint
// (search-hotels, hotel-rooms, ratehawk-book, ratehawk-prebook,
// ratehawk-book-status).
export function ratehawkHeaders(): Record<string, string> {
  return RATEHAWK_ENV === 'sandbox' ? { 'X-Ratehawk-Env': 'sandbox' } : {}
}
