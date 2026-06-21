/**
 * Builds a complete, realistic ICJIA-style research article draft for demo purposes.
 * Pure function — no side effects, no network calls, no base64.
 * Passes validateArticle() with zero errors.
 */
import type { Article } from '~/types/content'
import { blankArticle } from '~/lib/forms/blank-models'
import { slugify } from '~/lib/slug'

const TITLE = 'Crime in Illinois: 2024 Trends and Analysis'

const ABSTRACT =
  'This report examines statewide crime trends in Illinois for calendar year 2024, drawing on ' +
  'Uniform Crime Reporting (UCR) data submitted by law enforcement agencies across all 102 counties. ' +
  'Key findings include a continued decline in violent crime rates, shifting patterns in property ' +
  'crime, and notable regional disparities in drug-related offenses. Findings are contextualized ' +
  'within longer-term historical baselines and compared against national trends.'

const MARKDOWN = `## Executive Summary

Illinois recorded **47,312 violent crime incidents** in 2024, representing a _3.4 percent_ decrease
from the prior year. Property crimes declined for the fifth consecutive year, while drug-related
offenses showed more complex geographic variation. This report synthesizes data from all
**795 reporting law enforcement agencies** across the state.

> "Understanding crime trends requires more than raw counts — it demands context, consistency in
> reporting methodology, and sensitivity to the communities behind the numbers."
> — ICJIA Research Director

## Introduction

The Illinois Criminal Justice Information Authority (ICJIA) has published annual crime trend reports
since 1983. This edition covers **calendar year 2024** and employs the [Hierarchy Rule](https://ucr.fbi.gov/nibrs/2011/resources/nibrs-offense-definitions)
consistent with National Incident-Based Reporting System (NIBRS) standards.

Data for this report were collected through the [Illinois Uniform Crime Reporting Program](https://icjia.illinois.gov/researchhub/datasets/illinois-uniform-crime-reporting-program-data-1985-2022)
administered by the Illinois State Police.

## Key Findings

The following trends were identified for 2024:

- Violent crime decreased 3.4% statewide (from 48,972 in 2023 to 47,312 in 2024)
- Homicides declined 8.1% in urban counties but increased 2.3% in rural counties
- Motor vehicle theft increased 11.2%, reversing a four-year downward trend
- Aggravated assault remained the most frequently reported violent offense category
- Rape offenses, as defined under the revised UCR definition, decreased 4.7%

## Methodology

### Data Sources

This analysis draws on three primary data sources:

1. Illinois Uniform Crime Reporting (UCR) Program submissions (January–December 2024)
2. National Crime Victimization Survey (NCVS) supplemental estimates for unreported crime
3. Illinois State Police administrative records for arrest dispositions

### Analytical Approach

County-level rates were calculated per 100,000 residents using **2024 U.S. Census Bureau
population estimates**. Multi-year trend analysis employs a five-year rolling average to
smooth year-to-year volatility.

## Findings by Crime Category

### Violent Crime

Violent crime encompasses homicide, rape, robbery, and aggravated assault. Illinois recorded
47,312 violent incidents in 2024 — a rate of **373 per 100,000 residents**, below both the
prior-year rate (387) and the five-year average (401).

### Property Crime

Property crime — including burglary, larceny-theft, motor vehicle theft, and arson — totaled
**192,847 incidents**, a 1.9% decrease from 2023. _Motor vehicle theft_ was the sole subcategory
to increase, rising 11.2% and warranting focused attention from law enforcement and policymakers.

### Drug-Related Offenses

Drug arrests totaled 68,441 in 2024. The geographic distribution of drug offenses continues to
reflect significant **regional variation**: Cook County accounted for 41% of statewide drug arrests,
while suburban collar counties showed the steepest per-capita increases.

## Discussion

These findings reinforce that crime in Illinois is not monolithic. Urban, suburban, and rural
jurisdictions face distinct challenges that require tailored policy responses. The continued
decline in violent crime is encouraging, yet the motor vehicle theft spike and rural homicide
increase demand sustained attention.

Limitations of this analysis include the voluntary nature of UCR reporting, potential changes
in agency reporting practices over time, and the inherent lag between incident occurrence
and data publication.

## Conclusion

Illinois crime trends for 2024 present a mixed but broadly positive picture. Violent crime
continues its multi-year decline, and most property crime categories remain at historic lows.
However, targeted increases in motor vehicle theft and rural violence underscore the need for
ongoing, data-driven policy engagement.

ICJIA will release county-level data tables and an interactive dashboard companion to this
report in Q2 2025. Researchers and practitioners are encouraged to access the full dataset
through the [ICJIA Research Hub](https://icjia.illinois.gov/researchhub).

---

[^1]: Uniform Crime Reporting statistics represent crimes _known to police_ and may undercount
total victimization. NCVS estimates, while broader, carry their own sampling limitations.

[^2]: Population denominators are intercensal estimates; final 2024 Census Bureau figures were
not yet available at time of publication.
`

export function buildSampleArticle(): Article {
  return {
    ...blankArticle(),
    title: TITLE,
    slug: slugify(TITLE),
    date: '2025-01-15',
    type: 'researchReport',
    categories: ['crimes', 'law enforcement'],
    tags: ['crime trends', 'Illinois', 'UCR', 'violent crime', 'property crime', '2024'],
    authors: [
      { title: 'ICJIA Research Staff', description: 'Illinois Criminal Justice Information Authority' },
    ],
    abstract: ABSTRACT,
    markdown: MARKDOWN,
    // Media fields: null — author adds splash/thumbnail via the editor after reviewing the draft.
    splash: null,
    thumbnail: null,
    images: [],
    mainfiletype: null,
    mainfile: null,
    extrafile: null,
    doi: null,
    citation: null,
    funding: null,
    hideFromBanner: false,
    external: false,
    publishedAt: null,
    apps: [],
    datasets: [],
  }
}
