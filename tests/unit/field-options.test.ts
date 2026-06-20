import { describe, it, expect } from 'vitest'
import {
  CATEGORY_OPTIONS, MAINFILETYPE_OPTIONS, TIMEPERIOD_TYPE_OPTIONS,
  UNIT_OPTIONS, ARTICLE_TYPE_OPTIONS,
} from '~/lib/field-options'

describe('field options', () => {
  it('keeps the v1 category list', () => {
    expect(CATEGORY_OPTIONS).toEqual(['corrections', 'courts', 'crimes', 'law enforcement', 'victims', 'other'])
  })
  it('keeps the v1 mainfiletype, timeperiod, and unit lists', () => {
    expect(MAINFILETYPE_OPTIONS).toEqual(['full report', 'pdf version'])
    expect(TIMEPERIOD_TYPE_OPTIONS).toEqual(['calendar', 'fiscal-Federal', 'fiscal-Illinois', 'other'])
    expect(UNIT_OPTIONS).toEqual(['national', 'state', 'county', 'municipal', 'other'])
  })
  it('lists all 14 confirmed article types', () => {
    expect(ARTICLE_TYPE_OPTIONS).toContain('researchReport')
    expect(ARTICLE_TYPE_OPTIONS).toContain('process_evaluation')
    expect(ARTICLE_TYPE_OPTIONS).toHaveLength(14)
  })
})
