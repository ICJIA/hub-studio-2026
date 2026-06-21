// tests/unit/sample-app.test.ts
import { describe, it, expect } from 'vitest'
import { buildSampleApp } from '~/lib/sample-app'
import { validateApp } from '~/lib/validators/app'
import { containsBase64 } from '~/lib/base64-guard'

describe('buildSampleApp', () => {
  it('returns a valid app (validateApp returns [])', () => {
    const app = buildSampleApp()
    const errors = validateApp(app)
    expect(errors).toEqual([])
  })

  it('publishedAt is null (draft)', () => {
    const app = buildSampleApp()
    expect(app.publishedAt).toBeNull()
  })

  it('title is a non-empty string', () => {
    const app = buildSampleApp()
    expect(typeof app.title).toBe('string')
    expect(app.title.trim()).not.toBe('')
  })

  it('slug is derived from title and non-empty', () => {
    const app = buildSampleApp()
    expect(typeof app.slug).toBe('string')
    expect(app.slug.trim()).not.toBe('')
    // slug should be lowercase and hyphenated
    expect(app.slug).toMatch(/^[a-z0-9-]+$/)
  })

  it('date is a valid ISO date string (YYYY-MM-DD)', () => {
    const app = buildSampleApp()
    expect(app.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('categories array has at least one entry', () => {
    const app = buildSampleApp()
    expect(app.categories.length).toBeGreaterThan(0)
  })

  it('tags array has at least one entry', () => {
    const app = buildSampleApp()
    expect(app.tags.length).toBeGreaterThan(0)
  })

  it('has at least one contributor with a non-empty title', () => {
    const app = buildSampleApp()
    expect(app.contributors.length).toBeGreaterThan(0)
    expect(app.contributors[0]!.title.trim()).not.toBe('')
  })

  it('description is a non-empty string with no base64', () => {
    const app = buildSampleApp()
    expect(typeof app.description).toBe('string')
    expect((app.description as string).trim()).not.toBe('')
    expect(containsBase64(app.description as string)).toBe(false)
  })

  it('url is a non-empty https URL', () => {
    const app = buildSampleApp()
    expect(typeof app.url).toBe('string')
    expect(app.url).toMatch(/^https:\/\//)
  })

  it('image is a display-only demo image (id 0, local bundled url, no base64)', () => {
    const app = buildSampleApp()
    expect(app.image).not.toBeNull()
    expect(app.image!.id).toBe(0)
    expect(app.image!.url).toMatch(/^\/images\/demo\//)
    expect(containsBase64(app.image!.url)).toBe(false)
  })

  it('relations are empty arrays', () => {
    const app = buildSampleApp()
    expect(app.datasets).toEqual([])
    expect(app.articles).toEqual([])
  })

  it('external is false', () => {
    const app = buildSampleApp()
    expect(app.external).toBe(false)
  })
})
