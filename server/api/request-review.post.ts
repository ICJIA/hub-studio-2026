// THIN Nitro route (Plan 6, LOCKED decision 3). Nitro builds this under ssr:false and it deploys
// as a Netlify Function. It reads server-only secrets from runtimeConfig, wires the pure
// handleRequestReview deps, and translates the result to an HTTP status. ALL logic/branching lives
// in app/lib/request-review-handler.ts (node-tested); ALL secrets stay server-side.
import { handleRequestReview } from '../../app/lib/request-review-handler'
import { sendViaMailgun } from '../../app/lib/review-email'
import { createRateLimiter } from '../../app/lib/rate-limit'

// Module-scoped limiter: max 5 review sends per caller per 10 minutes (audit M-5). PER-INSTANCE
// (resets on a function cold start / restart; a multi-instance deployment would need a shared
// store) — see app/lib/rate-limit.ts. Created once and reused across requests on this instance.
const reviewLimiter = createRateLimiter({ max: 5, windowMs: 10 * 60 * 1000 })

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)

  // Demo mode (defense in depth): the public demo carries NO Mailgun secret. Short-circuit to a
  // friendly no-op BEFORE reading the body or touching Strapi/Mailgun, so even a direct POST to
  // this route can never send mail or require a secret. The client already no-ops in demo mode.
  if (config.public.demoMode === true) {
    setResponseStatus(event, 200)
    return { ok: true as const }
  }

  const authorization = getHeader(event, 'authorization')
  const clientIp = getRequestIP(event, { xForwardedFor: true })
  const body = await readBody(event)

  const result = await handleRequestReview(
    { authorization, body, clientIp },
    {
      // Anti-abuse: validate the CALLER's own token against Strapi (no server-held admin token).
      // Returns a stable per-user key (the Strapi user id) used to throttle per authenticated user.
      verifyCaller: async (token: string) => {
        try {
          const me = await $fetch<{ id?: number | string }>('/admin/users/me', {
            baseURL: config.public.strapiBaseUrl,
            headers: { Authorization: `Bearer ${token}` },
          })
          // Prefer the user id; fall back to the token itself so a valid session is always keyed.
          return me?.id != null ? `user:${me.id}` : `token:${token}`
        } catch {
          return null
        }
      },
      checkRateLimit: (key: string) => reviewLimiter.hit(key),
      // Direct Mailgun call with the server-only creds; globalThis.fetch satisfies the injected fetch shape.
      sendEmail: (msg) =>
        sendViaMailgun(
          globalThis.fetch,
          { domain: config.mailgunDomain, apiKey: config.mailgunApiKey },
          msg,
        ),
      config: { mailgunFrom: config.mailgunFrom, publicBaseUrl: config.public.publicBaseUrl },
    },
  )

  setResponseStatus(event, result.status)
  return result.body
})
