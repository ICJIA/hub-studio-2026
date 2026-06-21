// app/types/studio-profile.ts
// The per-author Studio profile captured at first-login onboarding (Plan 7). Keyed by the
// author's admin email (authorEmail — the unique lookup key). `reviewers` is a JSON array of
// reviewer/manager email strings (prefilled into the Plan-6 Request-review form). `center` is
// the author's ICJIA center. publishedAt is Strapi's Draft & Publish marker (unused by the gate).
export interface StudioProfile {
  documentId: string
  authorEmail: string
  reviewers: string[]
  center: string
  publishedAt?: string | null
}

/** FLAT create/update body (no documentId / publishedAt) — mirrors the other *Write payloads. */
export interface StudioProfileWrite {
  authorEmail: string
  reviewers: string[]
  center: string
}

/** Raw Content-Manager row (reviewers/center may come back null on a partially-filled record). */
export interface StrapiStudioProfile {
  documentId: string
  authorEmail: string
  reviewers: string[] | null
  center: string | null
  publishedAt?: string | null
}
