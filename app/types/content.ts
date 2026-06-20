export type ContentStatus = 'draft' | 'published'

/** A Media Library reference. `id` is the numeric upload id used on writes; `url` is for display. */
export interface MediaRef {
  id: number
  url: string
  name?: string
  alternativeText?: string | null
  caption?: string | null
  width?: number | null
  height?: number | null
  mime?: string
}

/**
 * A related entry, addressed by documentId. `slug` is OPTIONAL: the Content-Manager
 * relations endpoint returns `documentId` + `title` but no `slug`.
 */
export interface RelationRef {
  documentId: string
  title: string
  slug?: string
}

export interface Author { title: string; description?: string }
export interface Contributor { title: string; description?: string }
/** Inline article figure. `src` is a Media Library URL — NEVER base64. `alt`/`caption` aid accessibility. */
export interface ImageRef { title: string; src: string; alt?: string; caption?: string }
export interface Source { title: string; url: string }
export interface Variable { name: string; type: string; definition: string; values?: string }
export interface TimePeriod { yeartype: string; yearmin: number | string; yearmax: number | string }

export interface BaseContent {
  documentId: string
  title: string
  slug: string
  date: string | null
  external: boolean
  categories: string[]
  tags: string[]
  citation: string | null
  funding: string | null
  /** null = draft. Source of truth for Draft & Publish. */
  publishedAt: string | null
}

export interface Article extends BaseContent {
  type: string | null
  hideFromBanner: boolean
  authors: Author[]
  abstract: string | null
  markdown: string
  splash: MediaRef | null
  thumbnail: MediaRef | null
  images: ImageRef[]
  mainfiletype: string | null
  mainfile: MediaRef | null
  extrafile: MediaRef | null
  doi: string | null
  apps: RelationRef[]
  datasets: RelationRef[]
}

export interface App extends BaseContent {
  contributors: Contributor[]
  image: MediaRef | null
  description: string | null
  url: string | null
  datasets: RelationRef[]
  articles: RelationRef[]
}

export interface Dataset extends BaseContent {
  project: boolean
  sources: Source[]
  unit: string | null
  timeperiod: TimePeriod | null
  description: string | null
  notes: string[]
  variables: Variable[]
  datafile: MediaRef | null
  apps: RelationRef[]
  articles: RelationRef[]
}

// Write payloads (FLAT body for the Content-Manager API): scalars + media → numeric id (or null) + JSON fields.
// Relation fields (apps/datasets/articles) are intentionally OMITTED — relation WRITE is deferred to a later plan.
// No documentId/publishedAt/legacy fields either.
export interface ArticleWrite {
  title: string; slug: string; date: string | null; external: boolean
  type: string | null; hideFromBanner: boolean
  categories: string[]; tags: string[]; authors: Author[]
  abstract: string | null; markdown: string
  splash: number | null; thumbnail: number | null; images: ImageRef[]
  mainfiletype: string | null; mainfile: number | null; extrafile: number | null
  doi: string | null; citation: string | null; funding: string | null
}
export interface AppWrite {
  title: string; slug: string; date: string | null; external: boolean
  categories: string[]; tags: string[]; contributors: Contributor[]
  image: number | null; description: string | null; url: string | null
  citation: string | null; funding: string | null
}
export interface DatasetWrite {
  title: string; slug: string; date: string | null; external: boolean
  project: boolean; categories: string[]; tags: string[]
  sources: Source[]; unit: string | null; timeperiod: TimePeriod | null
  description: string | null; notes: string[]; variables: Variable[]
  citation: string | null; funding: string | null
  datafile: number | null
}
