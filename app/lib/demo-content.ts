// app/lib/demo-content.ts
// Deterministic demo content for the dev admin/admin session.
// NO Math.random — all variation is by modular index arithmetic.
import type { Article, App, Dataset } from '~/types/content'
import { blankArticle, blankApp, blankDataset } from '~/lib/forms/blank-models'
import { slugify } from '~/lib/slug'

// ── Shared pools ──────────────────────────────────────────────────────────────

const TOPIC_STEMS = [
  'Crime Trends in Illinois',
  'Victim Service Data Quality',
  'Juvenile Diversion Outcomes',
  'Recidivism and Re-entry Programs',
  'Drug Policy and Public Health',
  'Domestic Violence Intervention Strategies',
  'Law Enforcement Training Standards',
  'Court-Based Mental Health Diversion',
  'School Safety and Prevention',
  'Human Trafficking in the Midwest',
  'Racial Disparities in Sentencing',
  'Community Violence Interruption',
] as const

const ARTICLE_TYPES = [
  'researchReport', 'researchBulletin', 'article', 'evaluation',
  'annualReport', 'researchAtAGlance', 'programEvaluationSummary', 'update',
] as const

const CATEGORIES_POOL = [
  ['crimes', 'law enforcement'],
  ['victims'],
  ['courts', 'corrections'],
  ['crimes'],
  ['corrections'],
  ['victims', 'courts'],
  ['law enforcement'],
  ['courts'],
] as const

const TAGS_POOL = [
  ['crime trends', 'Illinois', 'UCR'],
  ['InfoNet', 'victim services', 'domestic violence'],
  ['juvenile justice', 'diversion', 'recidivism'],
  ['drug policy', 'opioid', 'public health'],
  ['reentry', 'corrections', 'recidivism'],
  ['mental health', 'diversion', 'courts'],
  ['trafficking', 'exploitation', 'midwest'],
  ['sentencing', 'disparities', 'race'],
] as const

const AUTHORS_POOL = [
  { title: 'Amanda L. Vasquez, MA', description: 'Senior Research Analyst, ICJIA' },
  { title: 'Caleb Schaffner, PhD', description: 'Research Director, ICJIA' },
  { title: 'Lucia F. Gonzalez, MA', description: 'Research Analyst, ICJIA' },
  { title: 'Jennifer Hiselman, MA', description: 'Program Director, ICJIA' },
  { title: 'Marcus T. Reedy, JD', description: 'Senior Policy Analyst, ICJIA' },
  { title: 'Priya N. Anand, PhD', description: 'Evaluation Lead, ICJIA' },
  { title: 'Samuel D. Park, MPA', description: 'Data Analyst, ICJIA' },
  { title: 'Theresa M. Walsh, MA', description: 'Research Coordinator, ICJIA' },
  { title: 'Deon R. Jackson, MA', description: 'Policy Analyst, ICJIA' },
  { title: 'Connie L. Eberhart, PhD', description: 'Senior Evaluation Scientist, ICJIA' },
] as const

const ABSTRACTS = [
  'This report examines statewide crime trends in Illinois, drawing on Uniform Crime Reporting (UCR) data submitted by law enforcement agencies across all 102 counties. Key findings include a continued decline in violent crime rates, shifting patterns in property crime, and notable regional disparities in drug-related offenses.',
  'This study assesses the quality and completeness of victim service data in the InfoNet system and offers targeted recommendations for strengthening data collection and reporting practices across publicly funded domestic violence and sexual assault service providers.',
  'This evaluation examines outcomes for youth referred to community-based diversion programs across Illinois judicial circuits. Drawing on three years of case-level data, it assesses recidivism, program completion, and disparities in referral, and identifies practices associated with successful diversion.',
] as const

const MARKDOWNS = [
  `## Executive Summary\n\nIllinois recorded significant changes in crime patterns during the study period. Property crimes declined for the fifth consecutive year, while drug-related offenses showed more complex geographic variation.\n\n## Key Findings\n\n- Violent crime decreased 3.4% statewide\n- Homicides declined in urban counties\n- Motor vehicle theft increased 11.2%, reversing a four-year downward trend\n\n## Conclusion\n\nTargeted policy engagement remains essential for addressing persistent crime trends.`,
  `## Background\n\nThe InfoNet system contains over 25 years of victim service data, including approximately 900,000 domestic violence and 180,000 sexual assault client records.\n\n## Assessing Data Quality\n\n- Most data fields are consistent and complete\n- Five recurring challenges relate to data collection and reporting\n- Client care appropriately takes precedence over data entry\n\n## Recommendations\n\n1. Streamline data entry to reduce burden on front-line staff\n2. Expand training on standardized data collection practices\n3. Add validation prompts for the highest-priority fields`,
  `## Overview\n\nCommunity-based diversion redirects eligible youth away from formal court processing and toward locally administered services.\n\n## Outcomes\n\n- Program completion exceeded 70 percent in most circuits\n- 12-month recidivism was lower among completers than a matched comparison group\n- Referral rates varied substantially by circuit and demographic group\n\n## Disparities and Practice\n\nWe identified disparities in referral that merit attention from court stakeholders. Circuits with structured eligibility screening showed the strongest outcomes.`,
] as const

// ── Helper: deterministic pick by index ──────────────────────────────────────

function pick<T>(arr: readonly T[], i: number): T {
  return arr[i % arr.length]!
}

// ── Year pool: spread 2019–2025 ──────────────────────────────────────────────

const YEARS = [2019, 2020, 2021, 2022, 2023, 2024, 2025] as const

function demoDate(i: number): string {
  const year = pick(YEARS, i)
  const month = String((i % 12) + 1).padStart(2, '0')
  const day = String((i % 28) + 1).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function updatedAt(i: number): string {
  // Spread across 2026 Jan–Feb, varied hours so sort interleaves across pages
  const day = String((i % 28) + 1).padStart(2, '0')
  const hour = String(i % 24).padStart(2, '0')
  const month = i % 56 < 28 ? '01' : '02'
  return `2026-${month}-${day}T${hour}:${String(i % 60).padStart(2, '0')}:00.000Z`
}

function publishedAt(i: number): string {
  // Published date is before updatedAt
  const year = pick(YEARS, i + 1)
  const month = String((i % 12) + 1).padStart(2, '0')
  return `${year}-${month}-15T12:00:00.000Z`
}

// ~60% published: every 5th item (i % 5 === 0) is draft
function isPublished(i: number): boolean { return i % 5 !== 0 }

// ── Article factory ───────────────────────────────────────────────────────────

function makeArticle(i: number): Article {
  const stem = pick(TOPIC_STEMS, i)
  const year = pick(YEARS, i)
  const title = `${stem}: ${year} Analysis (${String(i + 1).padStart(3, '0')})`
  const numAuthors = (i % 3) + 1  // 1, 2, or 3 authors
  const authors = Array.from({ length: numAuthors }, (_, j) => AUTHORS_POOL[(i + j) % AUTHORS_POOL.length]!)
  const pub = isPublished(i)

  return {
    ...blankArticle(),
    documentId: `demo-article-${String(i + 1).padStart(3, '0')}`,
    title,
    slug: slugify(title),
    date: demoDate(i),
    type: pick(ARTICLE_TYPES, i),
    categories: [...pick(CATEGORIES_POOL, i)] as string[],
    tags: [...pick(TAGS_POOL, i)] as string[],
    authors,
    abstract: pick(ABSTRACTS, i),
    markdown: pick(MARKDOWNS, i),
    splash: {
      id: 0,
      url: `https://picsum.photos/seed/demo${String(i + 1).padStart(3, '0')}/1200/600`,
      alternativeText: `${stem} — feature image`,
      width: 1200,
      height: 600,
      mime: 'image/jpeg',
    },
    thumbnail: {
      id: 0,
      url: `https://picsum.photos/seed/thumb${String(i + 1).padStart(3, '0')}/600/400`,
      alternativeText: `${stem} — thumbnail`,
      width: 600,
      height: 400,
      mime: 'image/jpeg',
    },
    mainfiletype: pick(['full report', 'pdf version'] as const, i),
    doi: `10.13140/RG.${2000 + i}.${String(i).padStart(5, '0')}`,
    citation: `ICJIA. (${year}). ${title}. Illinois Criminal Justice Information Authority.`,
    funding: 'Prepared with support from the Illinois Criminal Justice Information Authority.',
    hideFromBanner: false,
    external: false,
    publishedAt: pub ? publishedAt(i) : null,
    apps: [],
    datasets: [],
  }
}

// ── Contributor pool (for Apps) ───────────────────────────────────────────────

const CONTRIBUTORS_POOL = [
  { title: 'ICJIA Research Team', description: 'Illinois Criminal Justice Information Authority' },
  { title: 'Amanda L. Vasquez, MA', description: 'Senior Research Analyst, ICJIA' },
  { title: 'Samuel D. Park, MPA', description: 'Data Analyst, ICJIA' },
  { title: 'Marcus T. Reedy, JD', description: 'Senior Policy Analyst, ICJIA' },
  { title: 'Priya N. Anand, PhD', description: 'Evaluation Lead, ICJIA' },
] as const

const APP_TITLES = [
  'Illinois Crime Data Explorer',
  'Victim Service Locator',
  'Juvenile Diversion Program Finder',
  'Reentry Resource Map',
  'Drug Treatment Capacity Dashboard',
  'Court Data Visualization Tool',
  'Law Enforcement Training Tracker',
  'Community Safety Index',
] as const

function makeApp(i: number): App {
  const stem = pick(APP_TITLES, i)
  const year = pick(YEARS, i)
  const title = `${stem} ${year} (${String(i + 1).padStart(2, '0')})`
  const pub = isPublished(i)

  return {
    ...blankApp(),
    documentId: `demo-app-${String(i + 1).padStart(2, '0')}`,
    title,
    slug: slugify(title),
    date: demoDate(i),
    categories: [...pick(CATEGORIES_POOL, i)] as string[],
    tags: [...pick(TAGS_POOL, i)] as string[],
    contributors: [CONTRIBUTORS_POOL[(i) % CONTRIBUTORS_POOL.length]!],
    description: `An interactive data visualization tool for ${stem.toLowerCase()} in Illinois.`,
    url: `https://icjia.illinois.gov/researchhub/apps/${slugify(stem)}`,
    citation: `ICJIA. (${year}). ${title}. Illinois Criminal Justice Information Authority.`,
    funding: 'Prepared with support from the Illinois Criminal Justice Information Authority.',
    external: false,
    publishedAt: pub ? publishedAt(i) : null,
    datasets: [],
    articles: [],
  }
}

const DATASET_TITLES = [
  'Illinois UCR Crime Statistics',
  'InfoNet Victim Services Data',
  'Juvenile Court Dispositions',
  'Drug Arrests by County',
  'Corrections Population Data',
  'Victim Compensation Claims',
  'Law Enforcement Personnel Survey',
  'Court Case Processing Times',
] as const

function makeDataset(i: number): Dataset {
  const stem = pick(DATASET_TITLES, i)
  const year = pick(YEARS, i)
  const title = `${stem} ${year} (${String(i + 1).padStart(2, '0')})`
  const pub = isPublished(i)

  return {
    ...blankDataset(),
    documentId: `demo-dataset-${String(i + 1).padStart(2, '0')}`,
    title,
    slug: slugify(title),
    date: demoDate(i),
    categories: [...pick(CATEGORIES_POOL, i)] as string[],
    tags: [...pick(TAGS_POOL, i)] as string[],
    description: `Comprehensive dataset covering ${stem.toLowerCase()} for Illinois.`,
    unit: pick(['state', 'county', 'municipal', 'national'] as const, i),
    project: i % 4 === 0,
    timeperiod: {
      yeartype: pick(['calendar', 'fiscal-Illinois', 'fiscal-Federal'] as const, i),
      yearmin: year - 2,
      yearmax: year,
    },
    notes: [`Data sourced from Illinois administrative records for ${year}.`],
    variables: [
      { name: 'count', type: 'integer', definition: 'Number of incidents or records', values: '>= 0' },
      { name: 'year', type: 'integer', definition: 'Calendar or fiscal year', values: '2000–2025' },
    ],
    citation: `ICJIA. (${year}). ${title}. Illinois Criminal Justice Information Authority.`,
    funding: 'Prepared with support from the Illinois Criminal Justice Information Authority.',
    external: false,
    publishedAt: pub ? publishedAt(i) : null,
    apps: [],
    articles: [],
  }
}

// ── Exports ───────────────────────────────────────────────────────────────────

// Attach updatedAt after construction (it's not on the Article domain type, but the
// demo-repository uses it for sorting via the generic constraint)
function withUpdatedAt<T>(item: T, i: number): T & { updatedAt: string } {
  return Object.assign({}, item, { updatedAt: updatedAt(i) })
}

export const DEMO_ARTICLES = Array.from({ length: 210 }, (_, i) => withUpdatedAt(makeArticle(i), i))
export const DEMO_APPS = Array.from({ length: 40 }, (_, i) => withUpdatedAt(makeApp(i), i))
export const DEMO_DATASETS = Array.from({ length: 40 }, (_, i) => withUpdatedAt(makeDataset(i), i))
