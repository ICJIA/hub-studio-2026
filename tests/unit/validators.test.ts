import { describe, it, expect } from 'vitest'
import { validateArticle } from '~/lib/validators/article'
import { validateApp } from '~/lib/validators/app'
import { validateDataset } from '~/lib/validators/dataset'
import type { Article, App, Dataset } from '~/types/content'

const baseArticle = (over: Partial<Article> = {}): Article => ({
  documentId: '', title: 'T', slug: 't', date: '2020-01-01', external: false,
  type: null, hideFromBanner: false, categories: [], tags: [], authors: [],
  abstract: null, markdown: '', splash: null, thumbnail: null, images: [],
  mainfiletype: null, mainfile: null, extrafile: null, doi: null,
  citation: null, funding: null, apps: [], datasets: [], publishedAt: null, ...over,
})

describe('validateArticle', () => {
  it('passes a valid article', () => {
    expect(validateArticle(baseArticle())).toEqual([])
  })
  it('requires title, slug, and date', () => {
    const errs = validateArticle(baseArticle({ title: ' ', slug: '', date: null }))
    expect(errs.map((e) => e.field).sort()).toEqual(['date', 'slug', 'title'])
  })
  it('rejects an unknown article type', () => {
    expect(validateArticle(baseArticle({ type: 'bogus' }))).toContainEqual(expect.objectContaining({ field: 'type' }))
  })
  it('rejects base64 in images[].src and in markdown', () => {
    expect(validateArticle(baseArticle({ images: [{ title: 'x', src: 'data:image/png;base64,AAAA' }] })))
      .toContainEqual(expect.objectContaining({ field: 'images' }))
    expect(validateArticle(baseArticle({ markdown: '![x](data:image/png;base64,AAAA)' })))
      .toContainEqual(expect.objectContaining({ field: 'markdown' }))
  })
})

const baseApp = (over: Partial<App> = {}): App => ({
  documentId: '', title: 'A', slug: 'a', date: null, external: false,
  categories: [], tags: [], contributors: [], image: null, description: null,
  url: null, citation: null, funding: null, datasets: [], articles: [], publishedAt: null, ...over,
})

describe('validateApp', () => {
  it('requires a title', () => {
    expect(validateApp(baseApp({ title: '' }))).toContainEqual(expect.objectContaining({ field: 'title' }))
  })
  it('requires a slug', () => {
    expect(validateApp(baseApp({ slug: '' }))).toContainEqual(expect.objectContaining({ field: 'slug' }))
  })
  it('rejects base64 in the description', () => {
    expect(validateApp(baseApp({ description: 'data:image/png;base64,AAAA' })))
      .toContainEqual(expect.objectContaining({ field: 'description' }))
  })
  it('rejects javascript: url in the url field', () => {
    expect(validateApp(baseApp({ url: 'javascript:alert(1)' }))).toContainEqual(expect.objectContaining({ field: 'url' }))
  })
  it('accepts a normal https: url', () => {
    expect(validateApp(baseApp({ url: 'https://icjia.illinois.gov/research' }))).not.toContainEqual(expect.objectContaining({ field: 'url' }))
  })
})

const baseDataset = (over: Partial<Dataset> = {}): Dataset => ({
  documentId: '', title: 'D', slug: 'd', date: '2020-01-01', external: false, project: false,
  categories: [], tags: [], sources: [], unit: null, timeperiod: null, description: null,
  notes: [], variables: [], citation: null, funding: null, datafile: null,
  apps: [], articles: [], publishedAt: null, ...over,
})

describe('validateDataset', () => {
  it('requires title and date', () => {
    expect(validateDataset(baseDataset({ title: '', date: null })).map((e) => e.field).sort())
      .toEqual(['date', 'title'])
  })
  it('requires a slug', () => {
    expect(validateDataset(baseDataset({ slug: '' }))).toContainEqual(expect.objectContaining({ field: 'slug' }))
  })
  it('rejects an unknown unit', () => {
    expect(validateDataset(baseDataset({ unit: 'galactic' }))).toContainEqual(expect.objectContaining({ field: 'unit' }))
  })
  it('rejects an unknown timeperiod yeartype', () => {
    expect(validateDataset(baseDataset({ timeperiod: { yeartype: 'bogus', yearmin: 2000, yearmax: 2001 } })))
      .toContainEqual(expect.objectContaining({ field: 'timeperiod' }))
  })
  it('rejects base64 in the description', () => {
    expect(validateDataset(baseDataset({ description: 'data:image/png;base64,AAAA' })))
      .toContainEqual(expect.objectContaining({ field: 'description' }))
  })
})
