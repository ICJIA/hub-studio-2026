// app/composables/useArticles.ts
import { createArticlesRepository } from '~/repositories/articles'
import { isDemoData } from '~/lib/demo'
import { makeDemoRepository } from '~/lib/demo-repository'
import { DEMO_ARTICLES } from '~/lib/demo-content'
import type { Article } from '~/types/content'

/** Articles data access. In-memory demo repo for the whole demo build or a dev/demo session
 *  (audit D-4: gate on isDemoData so a swapped token can't force a real Strapi read); real repo otherwise. */
export function useArticles() {
  if (isDemoData()) {
    return makeDemoRepository<Article>(DEMO_ARTICLES as Article[])
  }
  const { $api } = useNuxtApp()
  return createArticlesRepository($api)
}
