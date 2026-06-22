// Runs FIRST (the `00.` prefix orders it ahead of api.ts and every other plugin) so the public
// runtime config is immutable before any other code — or a devtools user — can touch it.
//
// Audit §7 D-2 hardening: deep-freeze runtimeConfig.public so `demoMode` (and the rest of the
// non-secret public config) cannot be flipped at runtime to disarm the demo's JS write-guards
// (isDemoMode / isDemoData / assertWritesAllowed). The demo CSP `connect-src 'self'` is still the
// authoritative, JS-independent backstop; this is belt-and-suspenders that removes the easy toggle.
import { deepFreeze } from '~/lib/freeze-public-config'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  deepFreeze(config.public)
})
