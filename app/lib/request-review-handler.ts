// PURE handler logic for POST /api/request-review (Plan 6, LOCKED decision 3), DI'd so it is
// node-testable WITHOUT Nitro. The thin server route (server/api/request-review.post.ts) supplies
// `deps` from runtimeConfig: verifyCaller (forward the caller's JWT to Strapi /admin/users/me),
// sendEmail (sendViaMailgun with the server-only Mailgun creds), and the from/baseUrl config.
// Gate order — auth FIRST (no open spam relay): missing/invalid token → 401; bad body/email → 400;
// Mailgun failure → 502; success → 200 { ok: true }.
import { buildReviewEmail, isValidEmail, type MailMessage } from '~/lib/review-email'

export interface RequestReviewDeps {
  /** Verify the caller's Bearer token; returns a stable per-user key (e.g. the Strapi user id)
   *  on success, or null when the session is invalid. The key throttles per authenticated user. */
  verifyCaller: (token: string) => Promise<string | null>
  /** Send the built message (Mailgun). Throws on failure. */
  sendEmail: (msg: MailMessage) => Promise<void>
  /** Record one send for `key` and report whether it is within the rate limit (audit M-5). */
  checkRateLimit: (key: string) => { allowed: boolean }
  config: { mailgunFrom: string; publicBaseUrl: string }
}

export interface RequestReviewInput {
  authorization: string | undefined
  body: unknown
  /** Fallback identity (client IP) used to key the rate limit when no user id is available. */
  clientIp?: string
}

export interface HandlerResult {
  status: number
  body: { ok: true } | { error: string }
}

const TYPES = ['article', 'app', 'dataset'] as const

/** Strapi document IDs are alphanumeric; reject any HTML/URL-special chars at the boundary. */
const DOCUMENT_ID_RE = /^[A-Za-z0-9_-]+$/

function bearerToken(authorization: string | undefined): string | null {
  if (!authorization) return null
  const m = /^Bearer\s+(.+)$/i.exec(authorization.trim())
  return m ? (m[1] ?? null) : null
}

interface ReviewBody {
  type: (typeof TYPES)[number]
  documentId: string
  reviewers: string[]
  message?: string
}

function parseBody(body: unknown): ReviewBody | { error: string } | null {
  if (typeof body !== 'object' || body === null) return null
  const b = body as Record<string, unknown>

  if (!TYPES.includes(b.type as (typeof TYPES)[number])) return null
  if (typeof b.documentId !== 'string' || b.documentId.trim() === '') return null
  // Boundary validation: reject any documentId with HTML/URL-special chars
  if (!DOCUMENT_ID_RE.test(b.documentId)) return { error: `Invalid documentId: must match /^[A-Za-z0-9_-]+$/` }
  if (!Array.isArray(b.reviewers) || b.reviewers.length === 0) return null
  if (!b.reviewers.every((r) => typeof r === 'string')) return null
  if (b.message !== undefined && typeof b.message !== 'string') return null

  // Validate reviewer emails at parse time so we can return 400 before build
  for (const r of b.reviewers as string[]) {
    if (!isValidEmail(r)) return { error: `Invalid reviewer email: ${r}` }
  }

  return {
    type: b.type as (typeof TYPES)[number],
    documentId: b.documentId,
    reviewers: b.reviewers as string[],
    message: b.message as string | undefined,
  }
}

export async function handleRequestReview(
  input: RequestReviewInput,
  deps: RequestReviewDeps,
): Promise<HandlerResult> {
  // 1) Auth FIRST — never an open relay.
  const token = bearerToken(input.authorization)
  if (!token) return { status: 401, body: { error: 'Authentication required.' } }
  const userKey = await deps.verifyCaller(token)
  if (!userKey) return { status: 401, body: { error: 'Invalid or expired session.' } }

  // 1b) Rate-limit per authenticated user (fallback: client IP) AFTER auth so unauthenticated
  // probes never consume a real user's allowance (audit M-5). Exceeding the window → 429.
  const limitKey = userKey || input.clientIp || 'anonymous'
  if (!deps.checkRateLimit(limitKey).allowed) {
    return {
      status: 429,
      body: { error: 'Too many review emails sent. Please wait a few minutes and try again.' },
    }
  }

  // 2) Validate the body shape (including documentId boundary check + email format).
  const parsed = parseBody(input.body)
  if (!parsed) return { status: 400, body: { error: 'Invalid request body.' } }
  if ('error' in parsed) return { status: 400, body: { error: parsed.error } }

  // 3) Build the message (per-address email validation in buildReviewEmail throws → 400).
  let msg: MailMessage
  try {
    msg = buildReviewEmail({
      type: parsed.type,
      documentId: parsed.documentId,
      reviewers: parsed.reviewers,
      message: parsed.message,
      baseUrl: deps.config.publicBaseUrl,
      from: deps.config.mailgunFrom,
    })
  } catch (e) {
    return { status: 400, body: { error: e instanceof Error ? e.message : 'Invalid email request.' } }
  }

  // 4) Send (Mailgun failure → 502).
  try {
    await deps.sendEmail(msg)
  } catch {
    return { status: 502, body: { error: 'Failed to send the review email.' } }
  }

  return { status: 200, body: { ok: true } }
}
