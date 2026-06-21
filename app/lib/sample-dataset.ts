/**
 * Builds a complete sample dataset draft for demos — every field populated so an author can
 * one-click a full dataset entry instead of typing it piece by piece. Rotates through several
 * phony lorem-ipsum topics. ALL content is fabricated; no real people, organizations, or data
 * are referenced.
 *
 * Pure function (only Math.random for variety) — no network, no base64. Passes validateDataset()
 * with zero errors (title + slug + date required; unit and timeperiod.yeartype must be valid enum
 * values when present).
 */
import type { Dataset } from '~/types/content'
import { blankDataset } from '~/lib/forms/blank-models'
import { UNIT_OPTIONS, TIMEPERIOD_TYPE_OPTIONS } from '~/lib/field-options'
import { slugify } from '~/lib/slug'

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

interface DatasetTopic {
  title: string
  description: string
  categories: string[]
  tags: string[]
  unit: typeof UNIT_OPTIONS[number]
  sources: { title: string; url: string }[]
  variables: { name: string; type: string; definition: string; values?: string }[]
  notes: string[]
}

const DATASET_TOPICS: DatasetTopic[] = [
  {
    title: 'Lorem Ipsum Sample Data 0000–0000',
    description:
      'Sample placeholder data for demonstration purposes. Includes fictitious counts and rates per 000,000 sample units for placeholder offense categories. All variable definitions, source attributions, and statistics are entirely fabricated for demonstration only.',
    categories: ['crimes', 'law enforcement'],
    tags: ['sample', 'demo', 'lorem ipsum', 'placeholder', 'example'],
    unit: 'county',
    sources: [
      { title: 'Sample Placeholder Program', url: 'https://example.com/sample-source' },
      { title: 'Demonstration Data Hub', url: 'https://example.com/demo-hub' },
    ],
    variables: [
      { name: 'sample_id', type: 'string', definition: 'Placeholder identifier for the sample unit. Fabricated for demonstration only.' },
      { name: 'unit_name', type: 'string', definition: 'Sample unit name as reported in placeholder submissions.' },
      { name: 'year', type: 'integer', definition: 'Placeholder calendar year of the sample offenses.' },
      { name: 'placeholder_count', type: 'integer', definition: 'Total placeholder sample records reported. Entirely fictitious.' },
      { name: 'placeholder_rate', type: 'float', definition: 'Sample records per 000,000 demonstration units (fictitious denominator).' },
      { name: 'secondary_count', type: 'integer', definition: 'Total secondary sample placeholder records. All values are fabricated.' },
    ],
    notes: [
      'All data in this sample dataset is fabricated for demonstration purposes only.',
      'Sample units that did not submit complete placeholder data are excluded from demonstration calculations.',
      'This is sample content and does not represent any real dataset, organization, or statistics.',
    ],
  },
  {
    title: 'Consectetur Adipiscing Sample Dataset 0000–0000',
    description:
      'Aggregate placeholder data from a fictitious sample administrative data system, covering demonstration service providers. Includes annual sample counts, placeholder demographics, and utilization figures. All content is entirely fabricated for demonstration purposes only and does not represent any real program or organization.',
    categories: ['victims'],
    tags: ['sample', 'demo', 'lorem ipsum', 'placeholder', 'example'],
    unit: 'state',
    sources: [
      { title: 'Sample Placeholder System', url: 'https://example.com/sample-system' },
    ],
    variables: [
      { name: 'sample_year', type: 'integer', definition: 'Placeholder fiscal year (sample dates only).' },
      { name: 'program_type', type: 'string', definition: 'Sample program category: placeholder type A or placeholder type B.', values: 'TYPE_A, TYPE_B' },
      { name: 'clients_placeholder', type: 'integer', definition: 'Unduplicated placeholder clients served during the sample period. Entirely fictitious.' },
      { name: 'placeholder_beds', type: 'integer', definition: 'Aggregate placeholder bed-nights provided (sample programs only). All values fabricated.' },
      { name: 'hotline_placeholder', type: 'integer', definition: 'Total placeholder and sample contacts received. Entirely fictitious.' },
    ],
    notes: [
      'All placeholder counts are fabricated within the sample period; this content is for demonstration only.',
      'Data prior to sample year 0000 may reflect placeholder gaps due to incomplete demonstration entry.',
      'This is sample content and does not represent any real dataset, organization, or statistics.',
    ],
  },
  {
    title: 'Sed Do Eiusmod Sample Outcomes 0000–0000',
    description:
      'Sample unit-level placeholder outcomes data collected from fictitious demonstration units. Includes sample referral counts, placeholder completion rates, and fictional recidivism indicators for participants in sample programs. All content is entirely fabricated for demonstration purposes only.',
    categories: ['courts', 'corrections'],
    tags: ['sample', 'demo', 'lorem ipsum', 'placeholder', 'example'],
    unit: 'other',
    sources: [
      { title: 'Placeholder Sample Council', url: 'https://example.com/placeholder-council' },
      { title: 'Demonstration Administrative Office', url: 'https://example.com/demo-office' },
    ],
    variables: [
      { name: 'sample_unit', type: 'integer', definition: 'Placeholder sample unit number (0–00). Entirely fictitious.' },
      { name: 'sample_year', type: 'integer', definition: 'Placeholder fiscal year (sample dates only).' },
      { name: 'referrals', type: 'integer', definition: 'Placeholder participants referred to demonstration programs. All values fabricated.' },
      { name: 'completions', type: 'integer', definition: 'Placeholder participants who successfully completed a sample program. All values fictitious.' },
      { name: 'completion_rate', type: 'float', definition: 'Sample completions as a proportion of placeholder referrals (0.0–1.0). Entirely fabricated.' },
      { name: 'recidivism_sample', type: 'float', definition: 'Proportion of placeholder completers with a new sample referral within 00 months. All values fictitious.' },
    ],
    notes: [
      'Sample recidivism is defined as any new placeholder referral within 00 months of demonstration program exit.',
      'Sample units with below-threshold values should be interpreted with caution due to placeholder cell sizes.',
      'This is sample content and does not represent any real dataset, organization, or statistics.',
    ],
  },
]

export function buildSampleDataset(): Dataset {
  const t = pick(DATASET_TOPICS)
  return {
    ...blankDataset(),
    title: t.title,
    slug: slugify(t.title),
    date: pick(['2025-01-15', '2025-03-02', '2024-11-20', '2025-05-09', '2025-02-18']),
    categories: t.categories,
    tags: t.tags,
    description: t.description,
    unit: t.unit,
    timeperiod: {
      yeartype: pick(TIMEPERIOD_TYPE_OPTIONS),
      yearmin: '2015',
      yearmax: '2024',
    },
    sources: t.sources,
    variables: t.variables,
    notes: t.notes,
    project: false,
    datafile: null,
    publishedAt: null,
    external: false,
    apps: [],
    articles: [],
  }
}
