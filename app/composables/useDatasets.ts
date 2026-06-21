// app/composables/useDatasets.ts
import { createDatasetsRepository } from '~/repositories/datasets'
import { isDemoSession } from '~/lib/demo'
import { makeDemoRepository } from '~/lib/demo-repository'
import { DEMO_DATASETS } from '~/lib/demo-content'
import type { Dataset } from '~/types/content'

/** Datasets data access. Returns the in-memory demo repo for a demo session (dev OR demo build); real Strapi repo otherwise. */
export function useDatasets() {
  if (isDemoSession()) {
    return makeDemoRepository<Dataset>(DEMO_DATASETS as Dataset[])
  }
  const { $api } = useNuxtApp()
  return createDatasetsRepository($api)
}
