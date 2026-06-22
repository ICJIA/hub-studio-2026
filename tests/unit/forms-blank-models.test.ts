import { describe, it, expect } from 'vitest'
import { blankArticle, blankApp, blankDataset } from '~/lib/forms/blank-models'
import { validateArticle } from '~/lib/validators/article'
import { validateApp } from '~/lib/validators/app'
import { validateDataset } from '~/lib/validators/dataset'

describe('blank model factories', () => {
  it('blankArticle has every field, defaulting to empty/null', () => {
    const a = blankArticle()
    expect(a.documentId).toBe('')
    expect(a.slug).toBe('')
    expect(a.publishedAt).toBeNull()
    expect(a.markdown).toBe('')
    expect(a.categories).toEqual([])
    expect(a.authors).toEqual([])
    expect(a.splash).toBeNull()
  })
  it('blankArticle defaults the main file type to PDF and main files to an empty array', () => {
    const a = blankArticle()
    expect(a.mainfiletype).toBe('PDF')
    expect(a.mainfiles).toEqual([])
  })
  it('blank models only fail validation on their genuinely-required fields', () => {
    // article/dataset require title+slug+date; app requires title+slug only.
    expect(validateArticle(blankArticle()).map((e) => e.field).sort()).toEqual(['date', 'slug', 'title'])
    expect(validateDataset(blankDataset()).map((e) => e.field).sort()).toEqual(['date', 'slug', 'title'])
    expect(validateApp(blankApp()).map((e) => e.field).sort()).toEqual(['slug', 'title'])
  })
})
