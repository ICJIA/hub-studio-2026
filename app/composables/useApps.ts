// app/composables/useApps.ts
import { createAppsRepository } from '~/repositories/apps'
import { isDemoSession } from '~/lib/demo'
import { makeDemoRepository } from '~/lib/demo-repository'
import { DEMO_APPS } from '~/lib/demo-content'
import type { App } from '~/types/content'

/** Apps data access. Returns the in-memory demo repo for a demo session (dev OR demo build); real Strapi repo otherwise. */
export function useApps() {
  if (isDemoSession()) {
    return makeDemoRepository<App>(DEMO_APPS as App[])
  }
  const { $api } = useNuxtApp()
  return createAppsRepository($api)
}
