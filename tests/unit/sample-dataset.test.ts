// tests/unit/sample-dataset.test.ts
import { describe, it, expect } from 'vitest'
import { buildSampleDataset } from '~/lib/sample-dataset'
import { validateDataset } from '~/lib/validators/dataset'
import { containsBase64 } from '~/lib/base64-guard'
import { UNIT_OPTIONS, TIMEPERIOD_TYPE_OPTIONS } from '~/lib/field-options'

describe('buildSampleDataset', () => {
  it('returns a valid dataset (validateDataset returns [])', () => {
    const dataset = buildSampleDataset()
    const errors = validateDataset(dataset)
    expect(errors).toEqual([])
  })

  it('publishedAt is null (draft)', () => {
    const dataset = buildSampleDataset()
    expect(dataset.publishedAt).toBeNull()
  })

  it('title is a non-empty string', () => {
    const dataset = buildSampleDataset()
    expect(typeof dataset.title).toBe('string')
    expect(dataset.title.trim()).not.toBe('')
  })

  it('slug is derived from title and non-empty', () => {
    const dataset = buildSampleDataset()
    expect(typeof dataset.slug).toBe('string')
    expect(dataset.slug.trim()).not.toBe('')
    // slug should be lowercase and hyphenated
    expect(dataset.slug).toMatch(/^[a-z0-9-]+$/)
  })

  it('date is a valid ISO date string (YYYY-MM-DD)', () => {
    const dataset = buildSampleDataset()
    expect(dataset.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('categories array has at least one entry', () => {
    const dataset = buildSampleDataset()
    expect(dataset.categories.length).toBeGreaterThan(0)
  })

  it('tags array has at least one entry', () => {
    const dataset = buildSampleDataset()
    expect(dataset.tags.length).toBeGreaterThan(0)
  })

  it('description is a non-empty string with no base64', () => {
    const dataset = buildSampleDataset()
    expect(typeof dataset.description).toBe('string')
    expect((dataset.description as string).trim()).not.toBe('')
    expect(containsBase64(dataset.description as string)).toBe(false)
  })

  it('unit is a valid UNIT_OPTIONS value', () => {
    const dataset = buildSampleDataset()
    expect(dataset.unit).toBeTruthy()
    expect((UNIT_OPTIONS as readonly string[]).includes(dataset.unit as string)).toBe(true)
  })

  it('timeperiod is set with a valid yeartype and year range', () => {
    const dataset = buildSampleDataset()
    expect(dataset.timeperiod).not.toBeNull()
    expect((TIMEPERIOD_TYPE_OPTIONS as readonly string[]).includes(dataset.timeperiod!.yeartype)).toBe(true)
    expect(dataset.timeperiod!.yearmin).toBeTruthy()
    expect(dataset.timeperiod!.yearmax).toBeTruthy()
  })

  it('sources array has at least one entry with title and url', () => {
    const dataset = buildSampleDataset()
    expect(dataset.sources.length).toBeGreaterThan(0)
    expect(dataset.sources[0]!.title.trim()).not.toBe('')
    expect(dataset.sources[0]!.url).toMatch(/^https:\/\//)
  })

  it('variables array has at least 4 entries with required fields', () => {
    const dataset = buildSampleDataset()
    expect(dataset.variables.length).toBeGreaterThanOrEqual(4)
    for (const v of dataset.variables) {
      expect(v.name.trim()).not.toBe('')
      expect(v.type.trim()).not.toBe('')
      expect(v.definition.trim()).not.toBe('')
    }
  })

  it('notes array has at least one non-empty entry', () => {
    const dataset = buildSampleDataset()
    expect(dataset.notes.length).toBeGreaterThan(0)
    expect(dataset.notes[0]!.trim()).not.toBe('')
  })

  it('project is false', () => {
    const dataset = buildSampleDataset()
    expect(dataset.project).toBe(false)
  })

  it('datafile is null', () => {
    const dataset = buildSampleDataset()
    expect(dataset.datafile).toBeNull()
  })

  it('relations are empty arrays', () => {
    const dataset = buildSampleDataset()
    expect(dataset.apps).toEqual([])
    expect(dataset.articles).toEqual([])
  })

  it('external is false', () => {
    const dataset = buildSampleDataset()
    expect(dataset.external).toBe(false)
  })
})
