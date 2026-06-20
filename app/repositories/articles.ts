// app/repositories/articles.ts
import type { $Fetch } from 'ofetch'
import { createRepository, type Repository } from '~/lib/repository'
import { articleFromStrapi, articleToWrite, type StrapiArticle } from '~/lib/mappers/article'
import type { Article, ArticleWrite } from '~/types/content'

export function createArticlesRepository(api: $Fetch): Repository<Article> {
  return createRepository<StrapiArticle, Article, ArticleWrite>({
    api, uid: 'api::article.article', relationFields: ['apps', 'datasets'],
    fromStrapi: articleFromStrapi, toWrite: articleToWrite,
  })
}
