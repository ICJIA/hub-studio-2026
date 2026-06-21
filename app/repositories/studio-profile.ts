// app/repositories/studio-profile.ts
// The studio-profile data access (Plan 7). The generic Content-Manager repository, addressed by
// the studio-profile uid, plus a thin findByAuthorEmail lookup: a filtered list (authorEmail $eq)
// → the first row or null. NOTE: the studio-profile collection type does NOT exist on the
// production sandbox yet — it is created by the user in their Strapi dev env from
// docs/onboarding-studio-profile-setup.md. Built from the validated-by-analogy CM list/create
// contract; the caller (the fail-open gate) treats any lookup error as "unknown" (never gates).
import type { $Fetch } from 'ofetch'
import { createRepository, type Repository } from '~/lib/repository'
import { studioProfileFromStrapi, studioProfileToWrite } from '~/lib/mappers/studio-profile'
import type { StudioProfile, StudioProfileWrite, StrapiStudioProfile } from '~/types/studio-profile'

export const STUDIO_PROFILE_UID = 'api::studio-profile.studio-profile'

export function createStudioProfileRepository(api: $Fetch): Repository<StudioProfile> {
  return createRepository<StrapiStudioProfile, StudioProfile, StudioProfileWrite>({
    api,
    uid: STUDIO_PROFILE_UID,
    relationFields: [],
    fromStrapi: studioProfileFromStrapi,
    toWrite: studioProfileToWrite,
  })
}

/** Find a profile by the author's email (the unique lookup key). Returns the first match or null. */
export async function findByAuthorEmail(
  repo: Repository<StudioProfile>,
  email: string,
): Promise<StudioProfile | null> {
  const rows = await repo.list({ filters: { authorEmail: { $eq: email } } })
  return rows[0] ?? null
}
