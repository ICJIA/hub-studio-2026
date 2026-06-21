// PURE, dependency-injected review-email logic (Plan 6, LOCKED decision 3). Two responsibilities,
// both testable without Nuxt or a real network:
//   - buildReviewEmail: validate reviewer addresses, build the ABSOLUTE /preview/:type/:documentId
//     link (the Plan-5 shareable preview), and return the { to, from, subject, text, html } message.
//   - sendViaMailgun: a DIRECT Mailgun HTTP call (no SDK) — POST /v3/{domain}/messages, HTTP Basic
//     auth api:{apiKey}, form body. `fetch` is injected so the route handler stays thin and the
//     test mocks the HTTP call. Secrets (apiKey/domain/from) are supplied by the route from
//     server-side runtimeConfig — NEVER hardcoded, NEVER in the public config.

export interface MailMessage {
  to: string[]
  from: string
  subject: string
  text: string
  html: string
}

export interface ReviewEmailOptions {
  type: 'article' | 'app' | 'dataset'
  documentId: string
  reviewers: string[]
  message?: string
  /** The deployed Studio origin, e.g. https://studio.example.gov (trailing slash tolerated). */
  baseUrl: string
  /** The Mailgun "From" header, e.g. 'ICJIA Studio <noreply@studio.example.gov>'. */
  from: string
}

export interface MailgunCreds {
  domain: string
  apiKey: string
}

/** Pragmatic single-address check: one @, no spaces, a dotted domain. */
export function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())
}

/**
 * Build the review email. Throws if any reviewer address is invalid (the route maps that to 400).
 * The text AND html bodies contain the EXACT absolute /preview/:type/:documentId link.
 */
export function buildReviewEmail(opts: ReviewEmailOptions): MailMessage {
  const reviewers = opts.reviewers.map((r) => r.trim()).filter(Boolean)
  if (reviewers.length === 0) throw new Error('At least one reviewer email is required.')
  for (const r of reviewers) {
    if (!isValidEmail(r)) throw new Error(`Invalid reviewer email: ${r}`)
  }

  const origin = opts.baseUrl.replace(/\/+$/, '')
  const safeType = encodeURIComponent(opts.type)
  const safeDoc = encodeURIComponent(opts.documentId)
  const previewUrl = `${origin}/preview/${safeType}/${safeDoc}`
  const note = opts.message?.trim()

  const subject = `Review request: ${opts.type} (${opts.documentId})`
  const text = [
    `You have been asked to review a ${opts.type} in the ICJIA Studio.`,
    '',
    `Preview link: ${previewUrl}`,
    ...(note ? ['', `Message from the requester:`, note] : []),
    '',
    `(This link opens the private preview; you must be signed in to the Studio to view it.)`,
  ].join('\n')

  const safeNote = note ? `<p><strong>Message:</strong> ${escapeHtml(note)}</p>` : ''
  const previewUrlHtml = escapeHtml(previewUrl)
  const html = [
    `<p>You have been asked to review a <strong>${escapeHtml(opts.type)}</strong> in the ICJIA Studio.</p>`,
    `<p><a href="${previewUrlHtml}">Open the preview</a><br><code>${previewUrlHtml}</code></p>`,
    safeNote,
    `<p style="color:#6b7280;font-size:0.875rem">This link opens the private preview; you must be signed in to the Studio to view it.</p>`,
  ].join('\n')

  return { to: reviewers, from: opts.from, subject, text, html }
}

/** Minimal HTML-escaping for the user-supplied message in the html body. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Send a message via Mailgun with a DIRECT HTTP call (no SDK). `fetchImpl` is injected (Nitro
 * provides a global fetch; tests pass a fake). HTTP Basic auth uses api:{apiKey}. Throws on non-2xx.
 */
export async function sendViaMailgun(
  fetchImpl: typeof globalThis.fetch,
  creds: MailgunCreds,
  msg: MailMessage,
): Promise<void> {
  const url = `https://api.mailgun.net/v3/${creds.domain}/messages`
  const auth = `Basic ${toBase64(`api:${creds.apiKey}`)}`

  const body = new URLSearchParams()
  body.set('from', msg.from)
  body.set('to', msg.to.join(','))
  body.set('subject', msg.subject)
  body.set('text', msg.text)
  body.set('html', msg.html)

  const res = await fetchImpl(url, {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) {
    const detail = typeof res.text === 'function' ? await res.text().catch(() => '') : ''
    throw new Error(`Mailgun send failed (${res.status}). ${detail}`.trim())
  }
}

/** base64 that works in both Node (Buffer) and the browser (btoa) runtimes. */
function toBase64(s: string): string {
  if (typeof Buffer !== 'undefined') return Buffer.from(s).toString('base64')
  return btoa(s)
}
