// app/lib/demo-content.ts
// Deterministic demo content for the dev admin/admin session.
// NO Math.random — all variation is by modular index arithmetic.
// ALL content is phony (lorem ipsum / fake names); no real people, organizations, or data referenced.
import type { Article, App, Dataset } from '~/types/content'
import { blankArticle, blankApp, blankDataset } from '~/lib/forms/blank-models'
import { slugify } from '~/lib/slug'
import { sampleImageUrl, sampleSplashUrl } from '~/lib/sample-images'
import { sampleFigureUrl } from '~/lib/sample-figures'
import { sampleMainFileRef } from '~/lib/sample-files'

// ── Shared pools ──────────────────────────────────────────────────────────────

// Topic stems are used for image alt text and other per-article labels (NOT the title — titles are
// built by buildDemoTitle below so the 210-item list reads as genuinely distinct articles).
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

// ── Helper: deterministic pick by index ──────────────────────────────────────

function pick<T>(arr: readonly T[], i: number): T {
  return arr[i % arr.length]!
}

// ── Year pool: spread 2019–2025 ──────────────────────────────────────────────

const YEARS = [2019, 2020, 2021, 2022, 2023, 2024, 2025] as const

// ── Deterministic VARIED TITLE generator ──────────────────────────────────────
// Managers are non-technical but visually sharp: they WILL flag a list of near-identical titles.
// So titles are NOT "<stem>: <year> Report" anymore. Each is assembled from several lorem
// word-banks into one of many structural FORMS (statement, "An evaluation of …", "Trends in …",
// "… : a lorem review", a question, short vs long) so the 210-item list reads as genuinely
// different articles with varied LEADING words. All titles are deduped to be unique (see
// DEMO_TITLES below); slugs are likewise guaranteed unique downstream.

// A title SUBJECT is built as "<adjective> <noun>" — pairing two independent banks makes the raw
// subject space large (≈ adj × noun), so neighbours rarely share leading words and the 210-item
// list reads as genuinely distinct without templated suffixes.
const TITLE_ADJ = [
  'Placeholder', 'Sample', 'Lorem', 'Demonstration', 'Fictitious', 'Statewide',
  'Local', 'Rural', 'Urban', 'Structured', 'Voluntary', 'Community-Based',
  'Pretrial', 'Post-Release', 'Comparative', 'Longitudinal',
] as const
const TITLE_NOUN = [
  'Diversion Programs', 'Pretrial Outcomes', 'Sentencing Patterns', 'Reentry Services',
  'Victim Compensation', 'Recidivism', 'Caseload Trends', 'Supervision Practices',
  'Treatment Referrals', 'Court Participation', 'Data Quality', 'Bond Reform',
  'Restorative Pilots', 'Probation Completion', 'Service Linkage', 'Arrest Dispositions',
  'Reentry Housing', 'Eligibility Screening', 'Caseflow Timeliness', 'Sentencing Disparities',
  'Program Fidelity', 'Workforce Capacity', 'Risk Assessment', 'Crisis Response',
] as const

/** A capitalized lorem subject phrase, "<adjective> <noun>", from two independent banks. */
function titleSubject(i: number): string {
  return `${pick(TITLE_ADJ, i)} ${pick(TITLE_NOUN, i * 7 + 3)}`
}

// Short modifiers / contexts appended in some forms (e.g. "… in Lorem Counties").
const TITLE_CONTEXTS = [
  'Lorem Counties',
  'Sample Jurisdictions',
  'a Demonstration Cohort',
  'Placeholder Units',
  'the Sample Period',
  'Fictitious Districts',
  'a Lorem Pilot',
  'Rural Sample Sites',
] as const

// Leading verbs/openers for the varied opening forms (kept SHORT and DISTINCT-sounding).
const TITLE_OPENERS = [
  'An Evaluation of',
  'Trends in',
  'Assessing',
  'Rethinking',
  'Understanding',
  'Measuring',
  'Mapping',
  'Examining',
  'A Review of',
  'Patterns in',
  'Toward Better',
  'Improving',
] as const

// Trailing labels for the "Subject: a lorem <label>" colon form.
const TITLE_LABELS = [
  'a Sample Review',
  'a Placeholder Synthesis',
  'a Demonstration Study',
  'a Lorem Assessment',
  'an Exploratory Analysis',
  'a Field Scan',
  'a Baseline Report',
  'a Practice Brief',
] as const

// Question-form WORD PARTS — composed into "<head> <noun> <tail>" so the question form has a large
// space too (instead of a fixed handful that would collide across ~26 indices).
// Heads that all take a bare-infinitive tail (so "<head> <subject> <Improve …?>" stays grammatical).
const TITLE_Q_HEADS = ['Do', 'Does', 'How Much Do', 'Can', 'Should', 'Will'] as const
const TITLE_Q_TAILS = [
  'Improve Sample Outcomes?', 'Hold Across the Demonstration Period?', 'Reduce Placeholder Gaps?',
  'Predict Lorem Completion?', 'Vary by Sample Jurisdiction?', 'Reach the People They Target?',
  'Matter for Demonstration Equity?', 'Tell the Whole Sample Story?',
] as const

/**
 * Build a deterministic, structurally-VARIED article title. No Math.random. The structural FORM is
 * chosen by `form` (so a re-roll can change form independently of the subject), and the subject and
 * other parts draw from independent banks at offsets derived from `i` — so neighbours rarely share
 * leading words. Global uniqueness across the 210 is finalized by DEMO_TITLES (a Set-deduped pass).
 */
function buildDemoTitle(i: number, form: number = i): string {
  const subj = titleSubject(i)
  const subj2 = titleSubject(i * 3 + 5) // a second, offset subject for compound forms
  const ctx = pick(TITLE_CONTEXTS, i * 2 + 1)
  const opener = pick(TITLE_OPENERS, i + (i >> 2))
  const label = pick(TITLE_LABELS, i * 5 + 2)
  switch (form % 8) {
    case 0: // "An Evaluation of <subject> in <context>"
      return `${opener} ${subj} in ${ctx}`
    case 1: { // "Trends in <subject>, <year>–<year>" (always ascending — never e.g. 2024–2020)
      const y1 = pick(YEARS, i), y2 = pick(YEARS, i + 3)
      return `${opener} ${subj}, ${Math.min(y1, y2)}–${Math.max(y1, y2)}`
    }
    case 2: // colon review form — "<subject>: a lorem review"
      return `${subj}: ${label}`
    case 3: // composed question form
      return `${pick(TITLE_Q_HEADS, i)} ${subj} ${pick(TITLE_Q_TAILS, i * 2 + 1)}`
    case 4: // short statement — just the subject (the shortest titles in the list)
      return subj
    case 5: // compound "<subject> and <subject2>"
      return `${subj} and ${subj2}`
    case 6: // long descriptive form
      return `${opener} ${subj} and ${subj2} Across ${ctx}`
    default: // "<subject> in <context>: a lorem <label>"
      return `${subj} in ${ctx}: ${label}`
  }
}

/**
 * 210 UNIQUE, visually-distinct demo titles. Built once at module load. The base form rotates by
 * index; if a title collides with one already produced, the form and word-bank offsets are
 * re-rolled (a large combinatorial space makes this rare) until a fresh title is found — so the
 * list is guaranteed collision-free without a templated "(NNN)" suffix on every item.
 */
const DEMO_TITLES: readonly string[] = (() => {
  const out: string[] = []
  const seen = new Set<string>()
  for (let i = 0; i < 210; i++) {
    let title = buildDemoTitle(i)
    // Re-roll BOTH the index offset and the structural form until unique. The subject space alone
    // (16 adj × 24 noun = 384) across 8 forms makes a free slot reachable well within this bound.
    for (let bump = 1; seen.has(title.toLowerCase()) && bump <= 400; bump++) {
      title = buildDemoTitle(i + bump * 31, i + bump)
    }
    seen.add(title.toLowerCase())
    out.push(title)
  }
  return out
})()

// A LONG, deterministic lorem-ipsum article body with ACTIVE footnote references, generic
// section headings (so the Table of Contents reads realistically), lists, a quote, bold/italic,
// a link, inline sample FIGURES (synthetic charts/tables, NOT photos), and — for some articles —
// a small Markdown results TABLE. Figure COUNT, caption POSITION, and table presence all vary
// deterministically by index (see buildLoremBody) so the demo showcases the full range.
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

// Per-figure caption stems (no leading "Figure" word — the number/label is added by buildLoremBody).
const FIGURE_CAPTIONS = [
  'Placeholder counts by category for the sample reporting period',
  'Annual placeholder rate trend across the sample study window',
  'Distribution of sample records across placeholder service types',
  'Summary statistics by subgroup, with placeholder means and intervals',
  'Placeholder program enrollment by cohort year across the sample units',
  'Series A versus Series B placeholder values by reporting period',
] as const

// Small lorem MARKDOWN TABLES (multimd pipe syntax: header row + 3–5 data rows × 2–4 columns,
// phony headers + invented numbers). ~20% of articles embed ONE of these in the body flow. The
// renderer enables markdown-it-multimd-table, so standard pipe tables render. Picked by index.
const DEMO_TABLES = [
  [
    '| Sample Category | Placeholder Count | Share (%) |',
    '| --- | ---: | ---: |',
    '| Lorem alpha | 1,284 | 38.2 |',
    '| Dolor beta | 942 | 28.0 |',
    '| Amet gamma | 631 | 18.8 |',
    '| Elit delta | 503 | 15.0 |',
  ].join('\n'),
  [
    '| Sample Period | Placeholder Rate | Change |',
    '| --- | ---: | ---: |',
    '| 2021 | 12.4 | — |',
    '| 2022 | 11.1 | −1.3 |',
    '| 2023 | 9.8 | −1.3 |',
    '| 2024 | 9.2 | −0.6 |',
    '| 2025 | 8.7 | −0.5 |',
  ].join('\n'),
  [
    '| Placeholder Unit | Completed | Referred | Rate (%) |',
    '| --- | ---: | ---: | ---: |',
    '| Sample A | 318 | 402 | 79.1 |',
    '| Sample B | 244 | 357 | 68.3 |',
    '| Sample C | 401 | 463 | 86.6 |',
    '| Sample D | 173 | 281 | 61.6 |',
  ].join('\n'),
  [
    '| Sample Measure | Group I | Group II |',
    '| --- | ---: | ---: |',
    '| Placeholder mean | 4.7 | 5.3 |',
    '| Lorem median | 4.0 | 5.0 |',
    '| Dolor n | 612 | 588 |',
  ].join('\n'),
] as const

// One short lead-in sentence so a table reads as a real results/summary table, not a stray grid.
const TABLE_LEADINS = [
  '**Table 1** summarizes the placeholder counts for the sample reporting period.',
  '**Table 1** reports the sample trend across the demonstration study window.',
  'Sample completion by unit is summarized in **Table 1** below.',
  '**Table 1** compares the two placeholder groups on the sample measures.',
] as const

// Figure COUNT bucket for article i (deterministic, no Math.random). EVERY article carries at least
// one inline figure, so a manager opening ANY demo article sees figures inside the body text:
//   i % 20 in [14,20) → 2 or 3 figures  (~30%; the 3-figure case is the even half of that bucket)
//   otherwise         → 1 figure        (~70%)
function figureCount(i: number): number {
  const m = i % 20
  if (m >= 14) return m % 2 === 0 ? 3 : 2
  return 1
}

// A table appears in ~20% of articles (i % 5 === 2) — independent of the figure count, so a table
// accompanies the article's figure(s) in the body flow.
function hasTable(i: number): boolean {
  return i % 5 === 2
}

// Caption POSITION for the figure with per-figure key `k` (k = i + figureSlot). MOST are
// caption-below (default); a clear handful are caption-ABOVE; a handful have NO caption — so all
// three positions show up across the 210-article demo.
type CaptionMode = 'below' | 'above' | 'none'
function captionMode(k: number): CaptionMode {
  if (k % 11 === 0) return 'none'   // a handful with no caption
  if (k % 5 === 0) return 'above'   // a clear handful caption-above
  return 'below'                    // default
}

function buildLoremBody(i: number): string {
  const count = figureCount(i)
  const withTable = hasTable(i)
  // Section slots (0-based into DEMO_SECTIONS) where figures land, by figure count. Varying the
  // slot by index keeps the demo from always dropping figure 1 in the same section.
  const slotPlans: readonly number[][] = [[], [1], [1, 4], [1, 4, 6]]
  const slots = slotPlans[count]!.map((s, idx) => (s + (idx === 0 ? i % 2 : 0)))

  // Caption numbering counts ONLY captioned figures, sequentially within the article.
  let captionNo = 0
  // Build the figure block for the figure occupying section slot `slot` (its 1-based order in the
  // article is `order`). Image alone is a paragraph; an emphasis-only caption paragraph sits
  // immediately BELOW (default) or ABOVE it, or is omitted entirely.
  const figureBlock = (slot: number, order: number): string => {
    const url = sampleFigureUrl(i + order * 50)
    const img = `![Sample research figure ${order} — illustrative chart with placeholder data](${url})`
    const mode = captionMode(i + slot)
    if (mode === 'none') return img
    const n = ++captionNo
    const caption = `*Figure ${n}. ${FIGURE_CAPTIONS[(i + order) % FIGURE_CAPTIONS.length]} — illustrative sample data.*`
    return mode === 'above' ? `${caption}\n\n${img}` : `${img}\n\n${caption}`
  }

  const sections = DEMO_SECTIONS.map((heading, s) => {
    const blocks = [`## ${heading}`, `${loremPara(i + s, 3)}[^${s + 1}]`, loremPara(i + s + 1, 2)]
    if (s === 0) blocks.push('Key terms include **lorem ipsum** and _dolor sit amet_. See the [sample reference](https://example.com).')
    if (s === 2) blocks.push(`> ${loremPara(i + 2, 1)} — _Sample Source, Demonstration Presentation_`)
    if (s === 3) {
      blocks.push(`- ${loremPara(i, 1)}\n- ${loremPara(i + 1, 1)}\n- ${loremPara(i + 2, 1)}`)
      // Place the optional results TABLE in the Findings flow (with a short lead-in sentence).
      if (withTable) blocks.push(pick(TABLE_LEADINS, i), pick(DEMO_TABLES, i))
    }
    if (s === 5) blocks.push(`1. ${loremPara(i, 1)}\n2. ${loremPara(i + 1, 1)}\n3. ${loremPara(i + 2, 1)}`)
    // Drop any figures assigned to this section slot.
    slots.forEach((slot, idx) => { if (slot === s) blocks.push(figureBlock(slot, idx + 1)) })
    return blocks.join('\n\n')
  })
  const refs = DEMO_SECTIONS.map((_, k) =>
    `[^${k + 1}]: Ipsum, L. (20${20 + (k % 6)}). Lorem ipsum dolor sit amet consectetur. Sample Journal of Placeholder Studies, ${k + 1}(${(k % 4) + 1}), ${100 + k * 7}–${118 + k * 7}.`,
  ).join('\n\n')
  return `${sections.join('\n\n')}\n\n## References\n\n${refs}`
}

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

/**
 * Deterministic per-article "Main Files" (PDF attachments) so the demo shows all of 0 / 1 / many.
 * Distribution by index mod 10: 0 files for i%10===0 (a FEW, ~10%); 2-3 files for i%10===1|2
 * (a FEW, ~20% — alternating 2 and 3); exactly 1 file for the rest (MANY, ~70%). Refs are
 * display-only (id 0) → shown in the preview, dropped on Save by mediaIdsForWrite.
 */
function mainFilesFor(i: number): import('~/types/content').MediaRef[] {
  const m = i % 10
  if (m === 0) return []
  if (m === 1) return [sampleMainFileRef(i), sampleMainFileRef(i + 1)]
  if (m === 2) return [sampleMainFileRef(i), sampleMainFileRef(i + 1), sampleMainFileRef(i + 2)]
  return [sampleMainFileRef(i)]
}

// ── Article factory ───────────────────────────────────────────────────────────

function makeArticle(i: number): Article {
  const stem = pick(TOPIC_STEMS, i)
  const year = pick(YEARS, i)
  const title = DEMO_TITLES[i]! // unique, structurally-varied (see DEMO_TITLES)
  // Slug is derived from the (unique) title, but two distinct titles could slugify identically
  // (e.g. punctuation-only differences), so a stable per-index suffix guarantees slug uniqueness.
  const slug = `${slugify(title)}-${String(i + 1).padStart(3, '0')}`
  const numAuthors = (i % 3) + 1  // 1, 2, or 3 authors
  const authors = Array.from({ length: numAuthors }, (_, j) => AUTHORS_POOL[(i + j) % AUTHORS_POOL.length]!)
  const pub = isPublished(i)

  return {
    ...blankArticle(),
    documentId: `demo-article-${String(i + 1).padStart(3, '0')}`,
    title,
    slug,
    date: demoDate(i),
    type: pick(ARTICLE_TYPES, i),
    categories: [...pick(CATEGORIES_POOL, i)] as string[],
    tags: [...pick(TAGS_POOL, i)] as string[],
    authors,
    abstract: pick(ABSTRACTS, i),
    markdown: buildLoremBody(i),
    splash: {
      id: 0,
      url: sampleSplashUrl(i),
      alternativeText: `${stem} — sample feature image`,
      width: 1200,
      height: 600,
      mime: 'image/jpeg',
    },
    thumbnail: {
      id: 0,
      url: sampleImageUrl(i + 1),
      alternativeText: `${stem} — sample thumbnail`,
      width: 600,
      height: 400,
      mime: 'image/jpeg',
    },
    mainfiletype: pick(['PDF', 'full report', 'pdf version'] as const, i),
    mainfiles: mainFilesFor(i),
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
