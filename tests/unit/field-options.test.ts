import { describe, it, expect } from 'vitest'
import {
  CATEGORY_OPTIONS, MAINFILETYPE_OPTIONS, TIMEPERIOD_TYPE_OPTIONS,
  UNIT_OPTIONS, ARTICLE_TYPE_OPTIONS, articleTypeLabel,
} from '~/lib/field-options'

describe('field options', () => {
  it('keeps the v1 category list', () => {
    expect(CATEGORY_OPTIONS).toEqual(['corrections', 'courts', 'crimes', 'law enforcement', 'victims', 'other'])
  })
  it('keeps the v1 mainfiletype (with PDF first as the default), timeperiod, and unit lists', () => {
    // PDF is first so it is the default selected value for new articles (blank-models seeds 'PDF').
    expect(MAINFILETYPE_OPTIONS).toEqual(['PDF', 'full report', 'pdf version'])
    expect(MAINFILETYPE_OPTIONS[0]).toBe('PDF')
    expect(TIMEPERIOD_TYPE_OPTIONS).toEqual(['calendar', 'fiscal-Federal', 'fiscal-Illinois', 'other'])
    expect(UNIT_OPTIONS).toEqual(['national', 'state', 'county', 'municipal', 'other'])
  })
  it('lists all 14 confirmed article types', () => {
    expect(ARTICLE_TYPE_OPTIONS).toContain('researchReport')
    expect(ARTICLE_TYPE_OPTIONS).toContain('process_evaluation')
    expect(ARTICLE_TYPE_OPTIONS).toHaveLength(14)
  })

  describe('articleTypeLabel', () => {
    it('humanizes camelCase and snake_case enums to sentence case', () => {
      expect(articleTypeLabel('annualReport')).toBe('Annual report')
      expect(articleTypeLabel('researchReport')).toBe('Research report')
      expect(articleTypeLabel('researchAtAGlance')).toBe('Research at a glance')
      expect(articleTypeLabel('programEvaluationSummary')).toBe('Program evaluation summary')
      expect(articleTypeLabel('process_evaluation')).toBe('Process evaluation')
      expect(articleTypeLabel('strategicPlan')).toBe('Strategic plan')
    })
    it('capitalizes a single lowercase word', () => {
      expect(articleTypeLabel('article')).toBe('Article')
      expect(articleTypeLabel('toolkit')).toBe('Toolkit')
    })
    it('returns empty string for empty/nullish input', () => {
      expect(articleTypeLabel('')).toBe('')
      expect(articleTypeLabel(null)).toBe('')
      expect(articleTypeLabel(undefined)).toBe('')
    })
    it('produces a label for every ARTICLE_TYPE_OPTIONS value (non-empty, starts uppercase)', () => {
      for (const t of ARTICLE_TYPE_OPTIONS) {
        const label = articleTypeLabel(t)
        expect(label.length).toBeGreaterThan(0)
        expect(label[0]).toBe(label[0]!.toUpperCase())
      }
    })
  })
})
