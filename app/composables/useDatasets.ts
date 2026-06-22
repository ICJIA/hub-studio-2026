// app/composables/useDatasets.ts
import { createDatasetsRepository } from '~/repositories/datasets'
import { isDemoData } from '~/lib/demo'
import { makeDemoRepository } from '~/lib/demo-repository'
import { DEMO_DATASETS } from '~/lib/demo-content'
import type { Dataset } from '~/types/content'

/** Datasets data access. In-memory demo repo for the whole demo build or a dev/demo session
 *  (audit D-4: gate on isDemoData so a swapped token can't force a real Strapi read); real repo otherwise. */
export function useDatasets() {
  if (isDemoData()) {
    return makeDemoRepository<Dataset>(DEMO_DATASETS as Dataset[], 'datasets')
  }
  const { $api } = useNuxtApp()
  return createDatasetsRepository($api)
}
