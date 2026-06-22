// Option lists ported from v1 src/consts/fieldOptions.js; ARTICLE_TYPE_OPTIONS confirmed
// against ENUM_ARTICLE_TYPE by read-only GraphQL introspection (2026-06-20).

export const CATEGORY_OPTIONS = [
  'corrections', 'courts', 'crimes', 'law enforcement', 'victims', 'other',
] as const

// PDF first so it is the default selected value for new articles (blank-models seeds 'PDF').
export const MAINFILETYPE_OPTIONS = ['PDF', 'full report', 'pdf version'] as const

export const TIMEPERIOD_TYPE_OPTIONS = [
  'calendar', 'fiscal-Federal', 'fiscal-Illinois', 'other',
] as const

export const UNIT_OPTIONS = ['national', 'state', 'county', 'municipal', 'other'] as const

export const ARTICLE_TYPE_OPTIONS = [
  'annualReport', 'article', 'dataset', 'evaluation', 'general', 'newsletter',
  'process_evaluation', 'programEvaluationSummary', 'researchAtAGlance',
  'researchBulletin', 'researchReport', 'strategicPlan', 'toolkit', 'update',
] as const

/**
 * Human-readable label for an ARTICLE_TYPE_OPTIONS value (the raw enum is camelCase / snake_case,
 * e.g. 'annualReport' → 'Annual report', 'researchAtAGlance' → 'Research at a glance',
 * 'process_evaluation' → 'Process evaluation'). Used by the content-list type chip and the type
 * filter dropdown so managers read plain words, not the stored enum. Returns the input unchanged
 * for an empty/unknown value so it degrades gracefully.
 */
export function articleTypeLabel(value: string | null | undefined): string {
  if (!value) return ''
  const words = value
    .replace(/_/g, ' ') // snake_case → spaced
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2') // run-of-caps boundary: "AGlance" → "A Glance"
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2') // camelCase → spaced: "researchAt" → "research At"
    .trim()
    .toLowerCase()
    .split(/\s+/)
  if (!words.length) return ''
  // Sentence case: capitalize only the first word; the rest stay lower-case ("Research at a glance").
  return words.map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w)).join(' ')
}
