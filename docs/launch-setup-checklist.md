# Sandbox launch — setup that has to be done by hand (2026-09-29)

This is everything for the complete sandbox build that code can't do from here. Each item needs dashboard or console access.

## 1. Supabase (project cwohhfrupyeznbexjyaq) — do first
1. **Run migration `supabase/migrations/008_booking_source.sql`, then `009_booking_source_concierge.sql`, in SQL Editor.**
   - Without 008, account deletion fails safely: nothing is deleted and the user sees "could not delete".
2. **Authentication → URL Configuration:**
   - Site URL: the web app origin.
   - Redirect URLs: add `balkanea://**` and `<web origin>/**`.
   - Without these, confirmation and reset emails land on the Site URL instead of the app.
3. **Authentication → Providers → Email:** keep "Confirm email" on. Confirmation links now open the app at `/auth/callback`.

## 2. Test account deletion before the app update goes out
1. Sign up in the app with a throwaway email and confirm the link. The app should open signed in.
2. Profile → Delete account → confirm twice. You should land on the sign-in screen.
3. Supabase → Authentication → Users: the user is gone. Any booking rows remain, with `user_id` null.
4. Only then publish the OTA update to production and preview.

## 3. Sign in with Apple (currently NOT enabled in Supabase)
The app already shows the native Apple button on iOS. Apple guideline 4.8 requires it because Google sign-in is offered.
1. Apple Developer → Identifiers → App ID `com.marraglobal.balkanea` → enable **Sign In with Apple**.
2. **For the web / Android OAuth flow:**
   - Identifiers → **Services ID** (e.g. `com.marraglobal.balkanea.web`) → enable Sign In with Apple.
   - Domain: `cwohhfrupyeznbexjyaq.supabase.co`.
   - Return URL: `https://cwohhfrupyeznbexjyaq.supabase.co/auth/v1/callback`.
3. Keys → new key with Sign In with Apple → download the `.p8` (downloadable once). Note the **Key ID** and **Team ID**.
4. Supabase → Providers → Apple → enable:
   - **Client IDs:** Services ID first, then `com.marraglobal.balkanea`, comma-separated.
   - **Secret key:** generate it from the .p8 with Supabase's generator. It expires after at most 6 months, so put a calendar reminder to rotate it. The native iOS path doesn't need the secret; web and Android OAuth do.
5. Open item: Apple expects Sign in with Apple tokens to be **revoked** on account deletion. We don't store Apple refresh tokens yet, so deletion does not revoke them. This is low risk for sandbox but must be fixed before App Store review.

## 4. Google Play (Android production build)
1. **Play Console → Create app** (Balkanea, free).
   - If the developer account is a *personal* account created after Nov 2023, production needs 14 days of closed testing with 12+ testers first. An *organization* account is exempt.
2. Build: `eas build -p android --profile production`. This makes an AAB with the same runtime 1.0.7.
   - The first upload must be manual: Testing → Internal testing → upload the AAB.
   - Later: `eas submit -p android` with a Play service-account JSON.
3. **Store listing:** description, screenshots, 512px icon, feature graphic.
4. **Data safety form:**
   - Data collected: name, email, phone, booking/payment status, chat messages sent to Nea (processed by Anthropic).
5. **Account deletion:** Play requires *both* the in-app option (done) *and* a **web URL** where users can request deletion without the app. A page or email form on balkanea.com is enough.
6. **Privacy policy URL:** required by both stores.
   - The app's Profile → Terms and Privacy rows are still no-ops. Give me the URLs and I'll wire them in.

## 5. Other open items
- **Password reset link.** There is no "Forgot password?" link on the sign-in screen, and it isn't in the design brief. The reset flow works end to end once a reset email is sent, including from Supabase → Users → "Send password recovery". Say if you want the link added.
- **Guest bookings.** A guest's bookings live only on the device, so they aren't visible to support or recoverable. Consider requiring sign-in before payment.
- **Salesforce.** Leads created from chat aren't deleted with the account. Handle deletion requests there manually for now.
- **Anthropic key.** Rotate it once testers are on a build without it. Then remove `EXPO_PUBLIC_CLAUDE_API_KEY` and the Retell keys from the EAS production env and `.env`.
