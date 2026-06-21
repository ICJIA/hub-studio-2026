/**
 * Builds a complete, realistic ICJIA-style dataset draft for demos — every field populated so an
 * author can one-click a full dataset entry instead of typing it piece by piece. Rotates through
 * several topics.
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
    title: 'Illinois UCR Crime Data 2015–2024',
    description:
      'County-level Uniform Crime Reporting (UCR) data for Illinois from 2015 through 2024. Includes offense counts and rates per 100,000 residents for Part I violent and property crimes, sourced from the Illinois State Police annual UCR submissions.',
    categories: ['crimes', 'law enforcement'],
    tags: ['crime', 'UCR', 'Illinois', 'county', 'rates'],
    unit: 'county',
    sources: [
      { title: 'Illinois State Police UCR Program', url: 'https://isp.illinois.gov/CrimeReporting' },
      { title: 'ICJIA Research Hub', url: 'https://icjia.illinois.gov/researchhub' },
    ],
    variables: [
      { name: 'county_fips', type: 'string', definition: 'Five-digit FIPS code for the Illinois county.' },
      { name: 'county_name', type: 'string', definition: 'County name as reported in UCR submissions.' },
      { name: 'year', type: 'integer', definition: 'Calendar year of the reported offenses.' },
      { name: 'violent_crime_count', type: 'integer', definition: 'Total Part I violent crimes reported to police.' },
      { name: 'violent_crime_rate', type: 'float', definition: 'Violent crimes per 100,000 residents (intercensal estimate denominator).' },
      { name: 'property_crime_count', type: 'integer', definition: 'Total Part I property crimes reported to police.' },
    ],
    notes: [
      'Rates use intercensal population estimates; 2020 Census denominators applied from 2020 onward.',
      'Jurisdictions that did not submit complete UCR data are excluded from rate calculations.',
      'Motor vehicle theft figures were revised for Cook County in 2022 following a reporting correction.',
    ],
  },
  {
    title: 'Illinois Victim Services InfoNet Program Data 2000–2024',
    description:
      'Aggregate program-level data from the InfoNet statewide administrative data system, covering publicly funded domestic violence and sexual assault service providers in Illinois. Includes annual service counts, client demographics, and shelter bed utilization from 2000 through 2024.',
    categories: ['victims'],
    tags: ['InfoNet', 'victim services', 'domestic violence', 'sexual assault', 'Illinois'],
    unit: 'state',
    sources: [
      { title: 'ICJIA InfoNet System', url: 'https://icjia.illinois.gov/infonetweb' },
    ],
    variables: [
      { name: 'fiscal_year', type: 'integer', definition: 'Illinois fiscal year (July 1 – June 30).' },
      { name: 'program_type', type: 'string', definition: 'Program category: "DV" (domestic violence) or "SA" (sexual assault).', values: 'DV, SA' },
      { name: 'clients_served', type: 'integer', definition: 'Unduplicated clients served during the fiscal year.' },
      { name: 'shelter_beds_used', type: 'integer', definition: 'Aggregate emergency shelter bed-nights provided (DV programs only).' },
      { name: 'hotline_contacts', type: 'integer', definition: 'Total hotline and crisis contacts received.' },
    ],
    notes: [
      'Client counts are unduplicated within fiscal year; a client served by multiple programs is counted once.',
      'Data prior to 2005 may reflect gaps due to incomplete electronic submission by early adopters.',
    ],
  },
  {
    title: 'Illinois Juvenile Diversion Outcomes 2018–2024',
    description:
      'Circuit-level juvenile diversion data collected from Illinois judicial circuits for fiscal years 2018 through 2024. Includes referral counts, program completion rates, and 12-month recidivism indicators for youth diverted from formal court processing.',
    categories: ['courts', 'corrections'],
    tags: ['juvenile justice', 'diversion', 'recidivism', 'Illinois', 'courts'],
    unit: 'other',
    sources: [
      { title: 'Illinois Juvenile Justice Leadership Council', url: 'https://ijjlc.org' },
      { title: 'Administrative Office of the Illinois Courts', url: 'https://www.illinoiscourts.gov/courts/administrative-office/' },
    ],
    variables: [
      { name: 'circuit', type: 'integer', definition: 'Illinois judicial circuit number (1–24).' },
      { name: 'fiscal_year', type: 'integer', definition: 'Illinois fiscal year (July 1 – June 30).' },
      { name: 'referrals', type: 'integer', definition: 'Youth referred to diversion during the fiscal year.' },
      { name: 'completions', type: 'integer', definition: 'Youth who successfully completed a diversion program.' },
      { name: 'completion_rate', type: 'float', definition: 'Completions as a proportion of referrals (0.0–1.0).' },
      { name: 'recidivism_12mo', type: 'float', definition: 'Proportion of completers with a new referral within 12 months.' },
    ],
    notes: [
      'Recidivism is defined as any new juvenile referral within 12 months of diversion program exit.',
      'Circuit 1 (Cook County) reports separately through the Juvenile Probation department; figures are aggregated here.',
      'Completion rates below 0.50 in any circuit should be interpreted with caution due to small cell sizes.',
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
