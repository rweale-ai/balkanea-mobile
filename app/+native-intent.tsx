// Incoming deep links, before Expo Router matches them to a route
// (2026-09-29). Supabase's email-confirmation and password-reset links (and
// the Google sign-in redirect) come back as
//   balkanea://auth/callback#access_token=...&refresh_token=...&type=...
// The tokens are in the URL fragment, which route params don't include --
// turn the fragment into query params so app/auth/callback.tsx can read them
// with useLocalSearchParams. Every other link passes through unchanged.
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    if (path.includes('auth/callback') && path.includes('#')) {
      const [base, fragment] = path.split('#')
      return `${base}${base.includes('?') ? '&' : '?'}${fragment}`
    }
  } catch {
    // fall through to the original path
  }
  return path
}
