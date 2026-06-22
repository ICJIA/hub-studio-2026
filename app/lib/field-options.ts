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
