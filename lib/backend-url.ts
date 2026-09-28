// The Chat backend (balkanea-lead-webhook) every app call goes to.
// Defaults to production; set EXPO_PUBLIC_CHAT_BACKEND_URL to point a dev
// build at a Vercel preview deployment (e.g. to test a backend branch
// before it is merged -- merging Chat's main deploys to production).
export const BACKEND_URL = (process.env.EXPO_PUBLIC_CHAT_BACKEND_URL || 'https://balkanea-lead-webhook.vercel.app').replace(/\/$/, '')
