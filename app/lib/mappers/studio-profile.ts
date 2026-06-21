// app/lib/mappers/studio-profile.ts
// Map the Content-Manager studio-profile row ↔ the domain StudioProfile. The write body is FLAT
// (authorEmail/reviewers/center only) like every other *ToWrite — the CM create endpoint takes a
// flat body, NOT a { data } wrapper.
import type { StudioProfile, StudioProfileWrite, StrapiStudioProfile } from '~/types/studio-profile'

export function studioProfileFromStrapi(raw: StrapiStudioProfile): StudioProfile {
  return {
    documentId: raw.documentId,
    authorEmail: raw.authorEmail,
    reviewers: raw.reviewers ?? [],
    center: raw.center ?? '',
    publishedAt: raw.publishedAt ?? null,
  }
}

export function studioProfileToWrite(model: StudioProfile): StudioProfileWrite {
  return { authorEmail: model.authorEmail, reviewers: model.reviewers, center: model.center }
}
