// THIN Nitro route (Plan 6, LOCKED decision 3). Nitro builds this under ssr:false and it deploys
// as a Netlify Function. It reads server-only secrets from runtimeConfig, wires the pure
// handleRequestReview deps, and translates the result to an HTTP status. ALL logic/branching lives
// in app/lib/request-review-handler.ts (node-tested); ALL secrets stay server-side.
import { handleRequestReview } from '../../app/lib/request-review-handler'
import { sendViaMailgun } from '../../app/lib/review-email'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const authorization = getHeader(event, 'authorization')
  const body = await readBody(event)

  const result = await handleRequestReview(
    { authorization, body },
    {
      // Anti-abuse: validate the CALLER's own token against Strapi (no server-held admin token).
      verifyCaller: async (token: string) => {
        try {
          await $fetch('/admin/users/me', {
            baseURL: config.public.strapiBaseUrl,
            headers: { Authorization: `Bearer ${token}` },
          })
          return true
        } catch {
          return false
        }
      },
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
