/**
 * Builds a complete, realistic ICJIA-style research article draft for demos — every field
 * populated so an author can one-click a full article (and open the published preview) instead
 * of typing it piece by piece. Rotates through several topics and uses random real photos.
 *
 * Pure function (only Math.random for variety) — no network, no base64. Images are hosted urls.
 * Splash/thumbnail are DISPLAY-ONLY refs (id 0): they show in the preview but map to null on Save
 * (see mediaIdForWrite), so a demo image never sends a bogus media id to Strapi. Passes
 * validateArticle() with zero errors.
 */
import type { Article, MediaRef } from '~/types/content'
import { blankArticle } from '~/lib/forms/blank-models'
import { MAINFILETYPE_OPTIONS } from '~/lib/field-options'
import { slugify } from '~/lib/slug'

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}
function seed(): string {
  return Math.floor(Math.random() * 1_000_000).toString(36)
}
/** A display-only Media Library ref (id 0 → never written; see mediaIdForWrite) with a real photo. */
function demoImage(w: number, h: number, alt: string): MediaRef {
  const s = seed()
  return { id: 0, url: `https://picsum.photos/seed/${s}/${w}/${h}`, name: `demo-${s}.jpg`, alternativeText: alt, width: w, height: h, mime: 'image/jpeg' }
}
/** A random hosted body image as a Markdown figure (saves fine — it's just markdown text). */
function bodyImage(alt: string, w = 1000, h = 520): string {
  return `![${alt}](https://picsum.photos/seed/${seed()}/${w}/${h} "${alt}")`
}

interface Topic {
  title: string
  abstract: string
  categories: string[]
  tags: string[]
  authors: { title: string; description: string }[]
  body: () => string
}

const TOPICS: Topic[] = [
  {
    title: 'Crime in Illinois: 2024 Trends and Analysis',
    abstract:
      'This report examines statewide crime trends in Illinois for calendar year 2024, drawing on Uniform Crime Reporting (UCR) data submitted by law enforcement agencies across all 102 counties. Key findings include a continued decline in violent crime rates, shifting patterns in property crime, and notable regional disparities in drug-related offenses.',
    categories: ['crimes', 'law enforcement'],
    tags: ['crime trends', 'Illinois', 'UCR', 'violent crime', 'property crime', '2024'],
    authors: [
      { title: 'Amanda L. Vasquez, MA', description: 'Senior Research Analyst, ICJIA' },
      { title: 'Caleb Schaffner, PhD', description: 'Research Director, ICJIA' },
    ],
    body: () => `## Executive Summary

Illinois recorded **47,312 violent crime incidents** in 2024, representing a _3.4 percent_ decrease
from the prior year. Property crimes declined for the fifth consecutive year, while drug-related
offenses showed more complex geographic variation.

${bodyImage('Statewide crime rates declined for the fifth consecutive year')}

> "Understanding crime trends requires more than raw counts — it demands context, consistency in
> reporting methodology, and sensitivity to the communities behind the numbers."
> — ICJIA Research Director

## Key Findings

The following trends were identified for 2024:

- Violent crime decreased 3.4% statewide (from 48,972 in 2023 to 47,312 in 2024)
- Homicides declined 8.1% in urban counties but increased 2.3% in rural counties
- Motor vehicle theft increased 11.2%, reversing a four-year downward trend
- Aggravated assault remained the most frequently reported violent offense category

## Methodology

County-level rates were calculated per 100,000 residents using the [Illinois UCR Program](https://icjia.illinois.gov/researchhub) data administered by the Illinois State Police.[^1]

1. UCR Program submissions (January–December 2024)
2. National Crime Victimization Survey supplemental estimates
3. Illinois State Police administrative records

## Conclusion

Illinois crime trends for 2024 present a mixed but broadly positive picture. Targeted increases in
motor vehicle theft and rural violence underscore the need for ongoing, data-driven policy engagement.[^2]

[^1]: UCR statistics represent crimes _known to police_ and may undercount total victimization.

[^2]: Population denominators are intercensal estimates; final Census figures were not yet available.
`,
  },
  {
    title: 'Victim Service Data Quality in the InfoNet System',
    abstract:
      'InfoNet is a statewide administrative data system used by publicly funded domestic violence and sexual assault service providers in Illinois. This study assesses the quality and completeness of more than 25 years of victim service data and offers targeted recommendations for strengthening data collection and reporting.',
    categories: ['victims'],
    tags: ['InfoNet', 'victim services', 'domestic violence', 'data quality'],
    authors: [
      { title: 'Lucia F. Gonzalez, MA', description: 'Research Analyst, ICJIA' },
      { title: 'Jennifer Hiselman, MA', description: 'Program Director, ICJIA' },
    ],
    body: () => `## Background

The InfoNet system contains over **25 years** of victim service data, including approximately
900,000 domestic violence and 180,000 sexual assault client records.

${bodyImage('Victim service providers rely on InfoNet to track client services')}

## Assessing Data Quality

We used internal consistency across related fields as the primary indicator of data quality.[^1]

- Most InfoNet data fields are _consistent and complete_
- Five recurring challenges relate to **data collection and reporting**
- Client care appropriately takes precedence over data entry

> "Responsible interpretation of administrative data depends on systematically assessing its quality
> and completeness." — Study authors

## Recommendations

We offer targeted recommendations including potential [system upgrades](https://icjia.illinois.gov/researchhub) and
expanded training on data collection standards. While findings are specific to InfoNet, the
recommendations apply broadly to administrative data systems documenting sensitive services.[^2]

[^1]: Internal consistency measures whether related fields agree, not whether client reports are accurate.

[^2]: Standardized reporting must balance against the flexibility providers need for diverse practices.
`,
  },
  {
    title: 'Juvenile Diversion Outcomes in Illinois Courts',
    abstract:
      'This evaluation examines outcomes for youth referred to community-based diversion programs across Illinois judicial circuits. Drawing on three years of case-level data, it assesses recidivism, program completion, and disparities in referral, and identifies practices associated with successful diversion.',
    categories: ['courts', 'corrections'],
    tags: ['juvenile justice', 'diversion', 'recidivism', 'courts'],
    authors: [
      { title: 'Marcus T. Reedy, JD', description: 'Senior Policy Analyst, ICJIA' },
      { title: 'Priya N. Anand, PhD', description: 'Evaluation Lead, ICJIA' },
    ],
    body: () => `## Overview

Community-based diversion redirects eligible youth away from formal court processing and toward
**locally administered services**. This evaluation covers _three years_ of case-level data across
Illinois judicial circuits.

${bodyImage('Community-based diversion programs serve youth across Illinois circuits')}

## Outcomes

Key outcomes observed across participating circuits:

- Program completion exceeded **70 percent** in most circuits
- 12-month recidivism was lower among completers than a matched comparison group
- Referral rates varied substantially by circuit and demographic group

> "Diversion works best when services are matched to need and delivered close to home."
> — Evaluation Lead

## Disparities and Practice

We identified disparities in referral that merit attention from [court stakeholders](https://icjia.illinois.gov/researchhub).
Circuits with structured eligibility screening and timely service linkage showed the strongest
outcomes.[^1]

1. Structured, written eligibility criteria
2. Timely linkage to services (within 14 days)
3. Sustained funding for community providers

These findings can inform statewide efforts to expand effective, equitable diversion.[^2]

[^1]: Comparison groups were matched on age, prior referrals, and offense category.

[^2]: Circuit-level variation reflects both policy and the local availability of provider capacity.
`,
  },
]

export function buildSampleArticle(): Article {
  const t = pick(TOPICS)
  return {
    ...blankArticle(),
    title: t.title,
    slug: slugify(t.title),
    date: pick(['2025-01-15', '2025-03-02', '2024-11-20', '2025-05-09', '2025-02-18']),
    type: pick(['researchReport', 'researchBulletin', 'article', 'evaluation']),
    categories: t.categories,
    tags: t.tags,
    authors: t.authors,
    abstract: t.abstract,
    markdown: t.body(),
    // Display-only demo images (id 0 → shown in the preview, dropped on Save by mediaIdForWrite).
    splash: demoImage(1600, 800, `${t.title} — feature image`),
    thumbnail: demoImage(600, 400, `${t.title} — thumbnail`),
    images: [],
    mainfiletype: pick(MAINFILETYPE_OPTIONS),
    mainfile: null,
    extrafile: null,
    doi: `10.13140/RG.${Math.floor(Math.random() * 9000 + 1000)}.${seed()}`,
    citation: `ICJIA. (2025). ${t.title}. Illinois Criminal Justice Information Authority.`,
    funding: 'Prepared with support from the Illinois Criminal Justice Information Authority.',
    hideFromBanner: false,
    external: false,
    publishedAt: null,
    apps: [],
    datasets: [],
  }
}
