// app/composables/useArticles.ts
import { createArticlesRepository } from '~/repositories/articles'
import { isDemoSession } from '~/lib/demo'
import { makeDemoRepository } from '~/lib/demo-repository'
import { DEMO_ARTICLES } from '~/lib/demo-content'
import type { Article } from '~/types/content'

/** Articles data access. Returns the in-memory demo repo for a demo session (dev OR demo build); real Strapi repo otherwise. */
export function useArticles() {
  if (isDemoSession()) {
    return makeDemoRepository<Article>(DEMO_ARTICLES as Article[])
  }
  const { $api } = useNuxtApp()
  return createArticlesRepository($api)
}
