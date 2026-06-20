// app/composables/useApps.ts
import { createAppsRepository } from '~/repositories/apps'

export function useApps() {
  const { $api } = useNuxtApp()
  return createAppsRepository($api)
}
