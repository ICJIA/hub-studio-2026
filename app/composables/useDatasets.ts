// app/composables/useDatasets.ts
import { createDatasetsRepository } from '~/repositories/datasets'

export function useDatasets() {
  const { $api } = useNuxtApp()
  return createDatasetsRepository($api)
}
