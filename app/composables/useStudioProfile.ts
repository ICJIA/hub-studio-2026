// app/composables/useStudioProfile.ts
// Studio-profile data access bound to the configured $api client (Plan 7). Exposes the repo plus
// the findByAuthorEmail lookup the onboarding gate uses.
import { createStudioProfileRepository, findByAuthorEmail } from '~/repositories/studio-profile'
import type { StudioProfile } from '~/types/studio-profile'

export function useStudioProfile() {
  const { $api } = useNuxtApp()
  const repo = createStudioProfileRepository($api)
  return {
    repo,
    findByAuthorEmail: (email: string): Promise<StudioProfile | null> => findByAuthorEmail(repo, email),
  }
}
