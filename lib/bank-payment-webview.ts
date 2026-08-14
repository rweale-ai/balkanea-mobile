// WebView-based bank payment — container for the "Balkanea Mobile Payment
// Bridge" WordPress plugin's hosted checkout flow. Confirmed contract as of
// 2026-08-13 (balkanea-mobile-bridge-documentation.txt, verified live
// against stage.staging.balkanea.com order #20592682):
//
//   1. WebView opens `{site}/balkanea-mobile-pay/{orderId}/?key={orderKey}`
//   2. That redirects to a chrome-hidden WooCommerce order-pay page where
//      Bankart's card form runs — still the same domain, no custom scheme
//   3. On completion it redirects again to a normal WooCommerce thank-you
//      page (still the same domain) — there is NO `balkanea://` deep link
//      the app can intercept
//
// Because of (3), the WebView's navigation events are not a reliable signal
// on their own. The documented reliable channel is polling
// `{site}/wp-json/balkanea/v1/order-status?order_id=&key=` until
// `is_terminal === true` — see lib/payment-status.ts. This module only
// builds the entry URL; result detection lives in the polling module.

export function buildMobilePayUrl(baseUrl: string, orderId: number | string, orderKey: string): string {
  return `${baseUrl}/balkanea-mobile-pay/${orderId}/?key=${encodeURIComponent(orderKey)}`
}

// Still a placeholder — createOrder isn't implemented on the backend yet
// (see balkanea-lead-webhook/lib/mobile-bridge.js), so there's no real
// order to build a URL for. Kept as a named export so PaymentWebView's dev
// preview button still has something safe to load.
export const PLACEHOLDER_CHECKOUT_URL = 'https://example.com/balkanea-payment-placeholder'
