// app/lib/freeze-public-config.ts
// Audit §7 D-2 hardening (defense-in-depth). Nuxt does NOT freeze runtimeConfig.public, so
// `window.__NUXT__.config.public.demoMode` is a writable property: in the public demo an attacker
// with devtools could set it `false` to (a) re-select the real Strapi repository and (b) turn
// `assertWritesAllowed()` into a no-op. That changes nothing REACHABLE — the demo CSP
// `connect-src 'self'` refuses the request and the only token held is a sentinel Strapi rejects —
// but the flip is trivial. Deep-freezing the public config removes the easy in-page toggle so the
// JS guards (isDemoMode / isDemoData / assertWritesAllowed) cannot be silently disarmed; the CSP
// remains the authoritative, JS-independent backstop.
//
// Pure + side-effect-free on the passed object's *shape* (it mutates by freezing, returns the same
// ref) so it can be unit-tested without a Nuxt app. Tolerates non-object input (returns it as-is).

/** Recursively Object.freeze a value and all nested plain objects/arrays. Returns the same ref. */
export function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value
  if (Object.isFrozen(value)) return value
  // Freeze children first so the object is fully immutable once frozen.
  for (const key of Object.keys(value as Record<string, unknown>)) {
    deepFreeze((value as Record<string, unknown>)[key])
  }
  return Object.freeze(value)
}
