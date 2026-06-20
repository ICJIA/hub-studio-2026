// app/repositories/datasets.ts
import type { $Fetch } from 'ofetch'
import { createRepository, type Repository } from '~/lib/repository'
import { datasetFromStrapi, datasetToWrite, type StrapiDataset } from '~/lib/mappers/dataset'
import type { Dataset, DatasetWrite } from '~/types/content'

export function createDatasetsRepository(api: $Fetch): Repository<Dataset> {
  return createRepository<StrapiDataset, Dataset, DatasetWrite>({
    api, uid: 'api::dataset.dataset', relationFields: ['apps', 'articles'],
    fromStrapi: datasetFromStrapi, toWrite: datasetToWrite,
  })
}
