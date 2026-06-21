// app/composables/useApps.ts
import { createAppsRepository } from '~/repositories/apps'
import { isDemoData } from '~/lib/demo'
import { makeDemoRepository } from '~/lib/demo-repository'
import { DEMO_APPS } from '~/lib/demo-content'
import type { App } from '~/types/content'

/** Apps data access. In-memory demo repo for the whole demo build or a dev/demo session
 *  (audit D-4: gate on isDemoData so a swapped token can't force a real Strapi read); real repo otherwise. */
export function useApps() {
  if (isDemoData()) {
    return makeDemoRepository<App>(DEMO_APPS as App[])
  }
  const { $api } = useNuxtApp()
  return createAppsRepository($api)
}
