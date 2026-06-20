import type { Dataset, DatasetWrite, Source, Variable, TimePeriod, RelationRef } from '~/types/content'
import { mediaFromStrapi, mediaIdForWrite, type StrapiMedia } from '~/lib/strapi-rest'

// Content-Manager entity: scalars + inline media + JSON. Relations are { count: N } only
// and are NOT read here — they are hydrated separately and passed via `relations`.
export interface StrapiDataset {
  documentId: string; title: string; slug: string; date: string | null; external?: boolean
  project?: boolean; categories?: string[]; tags?: string[]
  sources?: Source[]; unit?: string | null; timeperiod?: TimePeriod | null
  description?: string | null; notes?: string[]; variables?: Variable[]
  citation?: string | null; funding?: string | null
  datafile?: StrapiMedia | null
  publishedAt?: string | null
}

/** Relation arrays hydrated from the Content-Manager relations endpoint. */
export interface DatasetRelations { apps?: RelationRef[]; articles?: RelationRef[] }

export function datasetFromStrapi(raw: StrapiDataset, relations: DatasetRelations = {}): Dataset {
  return {
    documentId: raw.documentId,
    title: raw.title,
    slug: raw.slug,
    date: raw.date ?? null,
    external: raw.external ?? false,
    project: raw.project ?? false,
    categories: raw.categories ?? [],
    tags: raw.tags ?? [],
    sources: raw.sources ?? [],
    unit: raw.unit ?? null,
    timeperiod: raw.timeperiod ?? null,
    description: raw.description ?? null,
    notes: raw.notes ?? [],
    variables: raw.variables ?? [],
    citation: raw.citation ?? null,
    funding: raw.funding ?? null,
    datafile: mediaFromStrapi(raw.datafile),
    apps: relations.apps ?? [],
    articles: relations.articles ?? [],
    publishedAt: raw.publishedAt ?? null,
  }
}

// FLAT write body (Content-Manager). Relation fields (apps/articles) are intentionally
// omitted — relation WRITE is deferred to a later plan.
export function datasetToWrite(m: Dataset): DatasetWrite {
  return {
    title: m.title,
    slug: m.slug,
    date: m.date,
    external: m.external,
    project: m.project,
    categories: m.categories,
    tags: m.tags,
    sources: m.sources,
    unit: m.unit,
    timeperiod: m.timeperiod,
    description: m.description,
    notes: m.notes,
    variables: m.variables,
    citation: m.citation,
    funding: m.funding,
    datafile: mediaIdForWrite(m.datafile),
  }
}
