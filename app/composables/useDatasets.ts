// app/composables/useDatasets.ts
import { createDatasetsRepository } from '~/repositories/datasets'
import { isDemoSession } from '~/lib/demo'
import { makeDemoRepository } from '~/lib/demo-repository'
import { DEMO_DATASETS } from '~/lib/demo-content'
import type { Dataset } from '~/types/content'

/** Datasets data access. Returns demo repo in dev admin/admin session; real Strapi repo otherwise. */
export function useDatasets() {
  if (import.meta.dev && isDemoSession()) {
    return makeDemoRepository<Dataset>(DEMO_DATASETS as Dataset[])
  }
  const { $api } = useNuxtApp()
  return createDatasetsRepository($api)
}
