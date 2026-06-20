// app/composables/useArticles.ts
import { createArticlesRepository } from '~/repositories/articles'

/** Articles data access, bound to the configured $api client. */
export function useArticles() {
  const { $api } = useNuxtApp()
  return createArticlesRepository($api)
}
