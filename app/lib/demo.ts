// app/lib/demo.ts
// Demo mode = a fully self-contained, safe-to-expose public deploy: demo login only,
// in-memory content (zero Strapi writes), no secrets. Toggled by NUXT_PUBLIC_DEMO_MODE
// (baked into runtimeConfig.public.demoMode at build via studio.config.ts).
//
// isDemoMode()    — is this build the public demo? (build-time flag; client-safe).
// isDemoSession() — is the synthetic admin/admin token active in a context (dev OR demo)
//                   where it is honored? Drives the in-memory repo selection.
import { isDevAdminToken } from '~/lib/dev-auth'
import { useAuthStore } from '~/stores/auth'

/**
 * Whether this build is the public demo deploy. Reads the baked-in public runtime flag.
 * Context-safe: outside a Nuxt app (e.g. a unit test with no app context) there is no demo deploy,
 * so it returns false — the SAFE default (never accidentally "demo" where the flag can't be read).
 * In the real running SPA the Nuxt context always exists and the baked flag is authoritative.
 */
export function isDemoMode(): boolean {
  if (!tryUseNuxtApp()) return false
  return useRuntimeConfig().public.demoMode === true
}

/**
 * True only when the synthetic dev-admin token is active AND this context honors it —
 * local dev (`import.meta.dev`) OR the public demo build (`isDemoMode()`). In a normal
 * production build (demoMode=false) this is always false, exactly as before.
 */
export function isDemoSession(): boolean {
  if (!import.meta.dev && !isDemoMode()) return false
  return isDevAdminToken(useAuthStore().jwt)
}

/**
 * Whether content composables should serve the in-memory demo repository instead of Strapi.
 * True for the ENTIRE public demo build (isDemoMode) — so even a devtools-swapped auth token can
 * never make the demo attempt a real Strapi read (audit D-4) — OR for a dev/demo admin session.
 */
export function isDemoData(): boolean {
  return isDemoMode() || isDemoSession()
}
