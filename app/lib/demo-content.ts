// app/lib/demo-content.ts
// Deterministic demo content for the dev admin/admin session.
// NO Math.random — all variation is by modular index arithmetic.
// ALL content is phony (lorem ipsum / fake names); no real people, organizations, or data referenced.
import type { Article, App, Dataset } from '~/types/content'
import { blankArticle, blankApp, blankDataset } from '~/lib/forms/blank-models'
import { slugify } from '~/lib/slug'

// ── Shared pools ──────────────────────────────────────────────────────────────

const TOPIC_STEMS = [
  'Lorem Ipsum Dolor Sit Amet',
  'Consectetur Adipiscing Elit',
  'Sed Do Eiusmod Tempor',
  'Incididunt Ut Labore Et Dolore',
  'Magna Aliqua Ut Enim',
  'Ad Minim Veniam Quis',
  'Nostrud Exercitation Ullamco',
  'Laboris Nisi Ut Aliquip',
  'Ex Ea Commodo Consequat',
  'Duis Aute Irure Dolor',
  'Reprehenderit In Voluptate',
  'Excepteur Sint Occaecat',
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
  ['sample', 'demo', 'lorem ipsum'],
  ['placeholder', 'example', 'demonstration'],
  ['lorem ipsum', 'sample', 'placeholder'],
  ['demo', 'example', 'lorem ipsum'],
  ['placeholder', 'sample', 'demonstration'],
  ['example', 'demo', 'placeholder'],
  ['lorem ipsum', 'demonstration', 'sample'],
  ['demo', 'placeholder', 'example'],
] as const

const AUTHORS_POOL = [
  { title: 'Lorem Ipsum, PhD', description: 'is a sample author listed for demonstration purposes only' },
  { title: 'Dolor A. Amet, MA', description: 'is a sample author listed for demonstration purposes only' },
  { title: 'Consectetur Elit, MS', description: 'is a sample author listed for demonstration purposes only' },
  { title: 'Vivamus Tincidunt, JD', description: 'is a sample author listed for demonstration purposes only' },
  { title: 'Pellentesque Habitant, PhD', description: 'is a sample author listed for demonstration purposes only' },
  { title: 'Nullam Volutpat, MA', description: 'is a sample author listed for demonstration purposes only' },
  { title: 'Aenean Commodo, MSW', description: 'is a sample author listed for demonstration purposes only' },
  { title: 'Tempor Incididunt, MPA', description: 'is a sample author listed for demonstration purposes only' },
  { title: 'Labore Et Dolore, MA', description: 'is a sample author listed for demonstration purposes only' },
  { title: 'Magna Aliqua, PhD', description: 'is a sample author listed for demonstration purposes only' },
] as const

const ABSTRACTS = [
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. This is sample content for demonstration purposes only.',
  'Consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit. This is sample content for demonstration purposes only.',
  'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. This is sample content for demonstration purposes only.',
] as const

// A LONG, deterministic lorem-ipsum article body with ACTIVE footnote references, generic
// section headings (so the Table of Contents reads realistically), lists, a quote, bold/italic,
// a link, and inline sample images. Every demo article gets one (varied by index) — so the
// demo-list articles are full-length, just like the "Add sample article" topics.
const LOREM_SENTENCES = [
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
  'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
  'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
  'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
  'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium totam rem aperiam.',
  'Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos.',
] as const

function loremPara(i: number, sentences: number): string {
  return Array.from({ length: sentences }, (_, k) => LOREM_SENTENCES[(i + k) % LOREM_SENTENCES.length]!).join(' ')
}

const DEMO_SECTIONS = ['Introduction', 'Background', 'Methodology', 'Findings', 'Analysis', 'Discussion', 'Limitations', 'Conclusion'] as const

function buildLoremBody(i: number): string {
  const figure = (n: number) => `![Sample figure ${n}](https://picsum.photos/seed/demobody${i}-${n}/1000/520 "Sample figure ${n} — placeholder")`
  const sections = DEMO_SECTIONS.map((heading, s) => {
    const blocks = [`## ${heading}`, `${loremPara(i + s, 3)}[^${s + 1}]`, loremPara(i + s + 1, 2)]
    if (s === 0) blocks.push('Key terms include **lorem ipsum** and _dolor sit amet_. See the [sample reference](https://example.com).')
    if (s === 1) blocks.push(figure(1))
    if (s === 2) blocks.push(`> ${loremPara(i + 2, 1)} — _Sample Source, Demonstration Presentation_`)
    if (s === 3) blocks.push(`- ${loremPara(i, 1)}\n- ${loremPara(i + 1, 1)}\n- ${loremPara(i + 2, 1)}`)
    if (s === 4) blocks.push(figure(2))
    if (s === 5) blocks.push(`1. ${loremPara(i, 1)}\n2. ${loremPara(i + 1, 1)}\n3. ${loremPara(i + 2, 1)}`)
    return blocks.join('\n\n')
  })
  const refs = DEMO_SECTIONS.map((_, k) =>
    `[^${k + 1}]: Ipsum, L. (20${20 + (k % 6)}). Lorem ipsum dolor sit amet consectetur. Sample Journal of Placeholder Studies, ${k + 1}(${(k % 4) + 1}), ${100 + k * 7}–${118 + k * 7}.`,
  ).join('\n\n')
  return `${sections.join('\n\n')}\n\n## References\n\n${refs}`
}

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
  const title = `${stem}: ${year} Sample Report (${String(i + 1).padStart(3, '0')})`
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
    markdown: buildLoremBody(i),
    splash: {
      id: 0,
      url: `https://picsum.photos/seed/demo${String(i + 1).padStart(3, '0')}/1200/600`,
      alternativeText: `${stem} — sample feature image`,
      width: 1200,
      height: 600,
      mime: 'image/jpeg',
    },
    thumbnail: {
      id: 0,
      url: `https://picsum.photos/seed/thumb${String(i + 1).padStart(3, '0')}/600/400`,
      alternativeText: `${stem} — sample thumbnail`,
      width: 600,
      height: 400,
      mime: 'image/jpeg',
    },
    mainfiletype: pick(['full report', 'pdf version'] as const, i),
    doi: `10.13140/RG.${2000 + i}.${String(i).padStart(5, '0')}`,
    citation: `Ipsum, L. (${year}). ${title}. Sample Organization.`,
    funding: 'This is sample content for demonstration only and is not associated with any real funding source or organization.',
    hideFromBanner: false,
    external: false,
    publishedAt: pub ? publishedAt(i) : null,
    apps: [],
    datasets: [],
  }
}

// ── Contributor pool (for Apps) ───────────────────────────────────────────────

const CONTRIBUTORS_POOL = [
  { title: 'Sample Demonstration Team', description: 'is a sample contributor listed for demonstration purposes only' },
  { title: 'Lorem Ipsum, PhD', description: 'is a sample contributor listed for demonstration purposes only' },
  { title: 'Dolor A. Amet, MA', description: 'is a sample contributor listed for demonstration purposes only' },
  { title: 'Vivamus Tincidunt, JD', description: 'is a sample contributor listed for demonstration purposes only' },
  { title: 'Magna Aliqua, PhD', description: 'is a sample contributor listed for demonstration purposes only' },
] as const

const APP_TITLES = [
  'Lorem Ipsum Sample Explorer',
  'Placeholder Resource Locator',
  'Demonstration Program Finder',
  'Sample Resource Map',
  'Consectetur Data Dashboard',
  'Dolor Visualization Tool',
  'Sed Do Sample Tracker',
  'Lorem Community Index',
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
    description: `A sample interactive data visualization tool for ${stem.toLowerCase()}. This is placeholder content for demonstration purposes only.`,
    url: `https://example.com/sample-apps/${slugify(stem)}`,
    citation: `Ipsum, L. (${year}). ${title}. Sample Organization.`,
    funding: 'This is sample content for demonstration only and is not associated with any real funding source or organization.',
    external: false,
    publishedAt: pub ? publishedAt(i) : null,
    datasets: [],
    articles: [],
  }
}

const DATASET_TITLES = [
  'Lorem Ipsum Sample Statistics',
  'Placeholder Sample Services Data',
  'Demonstration Sample Dispositions',
  'Dolor Sample Records by Unit',
  'Consectetur Population Data',
  'Adipiscing Sample Claims',
  'Sed Do Sample Personnel Survey',
  'Eiusmod Case Processing Sample',
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
    description: `Comprehensive sample placeholder dataset covering ${stem.toLowerCase()}. This is demonstration content only.`,
    unit: pick(['state', 'county', 'municipal', 'national'] as const, i),
    project: i % 4 === 0,
    timeperiod: {
      yeartype: pick(['calendar', 'fiscal-Illinois', 'fiscal-Federal'] as const, i),
      yearmin: year - 2,
      yearmax: year,
    },
    notes: [`Sample placeholder data sourced from demonstration administrative records for ${year}. This is sample content only.`],
    variables: [
      { name: 'count', type: 'integer', definition: 'Number of placeholder incidents or sample records', values: '>= 0' },
      { name: 'year', type: 'integer', definition: 'Sample calendar or placeholder fiscal year', values: '0000–0000' },
    ],
    citation: `Ipsum, L. (${year}). ${title}. Sample Organization.`,
    funding: 'This is sample content for demonstration only and is not associated with any real funding source or organization.',
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
