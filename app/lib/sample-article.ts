/**
 * Builds a complete sample article draft for demos — every field populated so an author can
 * one-click a full article (and open the published preview) instead of typing it piece by piece.
 * Rotates through several phony lorem-ipsum topics. ALL content is fabricated; no real people,
 * organizations, or data are referenced.
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
  // ─────────────────────────────────────────────────────────────────────────────
  // TOPIC 1 — Lorem Ipsum Sample Report
  // ─────────────────────────────────────────────────────────────────────────────
  {
    title: 'Lorem Ipsum Dolor Sit Amet: A Sample Research Report',
    abstract:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. This is sample content for demonstration purposes only and does not represent any real research, organization, or dataset.',
    categories: ['crimes', 'law enforcement'],
    tags: ['sample', 'demo', 'lorem ipsum', 'placeholder', 'example'],
    authors: [
      {
        title: 'Lorem Ipsum, PhD',
        description: 'is a sample author listed for demonstration purposes only',
      },
      {
        title: 'Dolor A. Amet, MA',
        description: 'is a sample author listed for demonstration purposes only',
      },
      {
        title: 'Consectetur Elit, MS',
        description: 'is a sample author listed for demonstration purposes only',
      },
    ],
    body: () => `## Executive Summary

**Lorem ipsum dolor sit amet**, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore _magna aliqua_. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.[^1]

${bodyImage('Sample figure — placeholder image for demonstration only')}

> "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
> — Sample Placeholder, Demonstration Purposes Only

This document is a sample used to demonstrate the content shape of a research article. All names, figures, and references are entirely fabricated.

## Introduction

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.[^2]

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

### Scope and Coverage

Lorem ipsum dolor sit amet, consectetur adipiscing elit. **Sed do eiusmod tempor** incididunt ut labore et dolore magna aliqua. _Ut enim ad minim veniam_, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate.

## Background

### Historical Context

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.[^3] Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. _Lorem ipsum dolor sit amet_, consectetur adipiscing elit sed do eiusmod.

### Contextual Framework

Consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.[^4]

${bodyImage('Sample figure — secondary placeholder image for demonstration only')}

## Methodology

Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. The sample analytical workflow proceeded in the following sequence:

1. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor
2. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi
3. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore
4. Excepteur sint occaecat cupidatat non proident in culpa qui officia deserunt
5. Ullamco laboris nisi ut aliquip ex ea commodo consequat lorem ipsum

### Sample Analytical Limitations

Sample administrative data captures only placeholder records. Readers may consult [Example Reference Site](https://example.com) for demonstration context.[^5] Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

## Findings

### Primary Sample Findings

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Notable placeholder findings include:

- **Lorem ipsum:** Dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore
- **Dolor sit amet:** Consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore
- **Magna aliqua:** Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi
- **Aliquip ex ea:** Commodo consequat duis aute irure dolor in reprehenderit in voluptate

Placeholder data completeness varied by category, with **sample counts** documented across all demonstration fields.

### Secondary Sample Findings

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua:

- Consectetur adipiscing elit: placeholder value 1
- Sed do eiusmod tempor: placeholder value 2
- Duis aute irure dolor: placeholder value 3 (see also methodology section)

### Sample Regional Variation

${bodyImage('Sample figure — tertiary placeholder image for demonstration only')}

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore **magna aliqua**. _Ut enim ad minim veniam_ quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit.

## Discussion

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.[^6]

_Duis aute irure dolor_ in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

### Sample Equity Considerations

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate.

## Limitations

Several limitations of this sample should be noted:

1. This is entirely placeholder content and does not represent real research
2. All figures, percentages, and statistics are fabricated for demonstration
3. Author names, institutional affiliations, and citations are fictitious
4. The content structure is retained so the table of contents renders realistically
5. No real organizations, programs, or individuals are referenced[^4]

## Conclusion

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.[^2]

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

## References

[^1]: Ipsum, L. (2025). Lorem ipsum dolor sit amet. Sample Journal of Placeholder Studies (2024). https://example.com

[^2]: Dolor, A., & Amet, C. (2024). *Consectetur adipiscing elit: A demonstration reference*. Sample Organization. https://example.com

[^3]: Tempor, E. (2023). *Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua* (3rd ed.). Placeholder Press.

[^4]: Aliqua, M., & Veniam, Q. (2024). *Labore et dolore: Sample reference documentation*. Demonstration Publisher. https://example.com

[^5]: Nostrud, X. (2025). *Sample placeholder reference for demonstration purposes* (Report No. DEMO-0001). Fictitious Department. https://example.com

[^6]: Exercitation, U., & Laboris, N. (2024). Sample methods in placeholder research. *Journal of Demonstration Studies, 1*(1), 1–12.
`,
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // TOPIC 2 — Consectetur Adipiscing Sample Study
  // ─────────────────────────────────────────────────────────────────────────────
  {
    title: 'Consectetur Adipiscing Elit: A Sample Evaluation Report',
    abstract:
      'Consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. This study is a placeholder demonstration of a complete article and does not reflect any real evaluation, program, or population. All findings, names, and statistics are entirely fictitious.',
    categories: ['victims'],
    tags: ['sample', 'demo', 'lorem ipsum', 'placeholder', 'example'],
    authors: [
      {
        title: 'Vivamus Tincidunt, MA',
        description: 'is a sample author listed for demonstration purposes only',
      },
      {
        title: 'Pellentesque Habitant, JD',
        description: 'is a sample author listed for demonstration purposes only',
      },
      {
        title: 'Nullam Volutpat, PhD',
        description: 'is a sample author listed for demonstration purposes only',
      },
      {
        title: 'Aenean Commodo, MSW',
        description: 'is a sample author listed for demonstration purposes only',
      },
    ],
    body: () => `## Executive Summary

The sample system contains over **placeholder years** of demonstration data — approximately 000,000 fictitious records collected from sample service categories. This study is the most comprehensive placeholder assessment conducted to date.

> "Responsible use of sample data depends on clearly marking all content as demonstration only. Without that foundation, even the most realistic-looking demo rests on uncertain ground."
> — Sample Placeholder Authors, Demonstration Preface

Lorem ipsum dolor sit amet, consectetur adipiscing elit. _Sed do eiusmod tempor incididunt_ ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.

${bodyImage('Sample figure — placeholder chart for demonstration only')}

## Introduction

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.[^1]

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

### Study Purpose

This study was commissioned for demonstration purposes. Specifically, we sought to answer three placeholder questions:

1. How complete and internally consistent are sample data fields in this demonstration?
2. Where do recurring placeholder challenges arise, and what are their likely fabricated causes?
3. What targeted sample changes to system design, training, or policy would most cost-effectively improve placeholder data quality?

## Background

### Sample Contextual Overview

Lorem ipsum dolor sit amet, consectetur adipiscing elit.[^2] **Sed do eiusmod tempor** incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo.

### Prior Placeholder Research

Prior sample research on placeholder data quality has consistently found that completeness and consistency vary by field sensitivity, staff capacity, and system design.[^3] _Fictitious fields_ — such as demonstration categories — are systematically underrepresented in this example. Fields with large free-text options show high placeholder variability.

${bodyImage('Sample figure — data completeness placeholder')}

Placeholder research also shows that sample size moderates demonstration quality: larger placeholder organizations with dedicated sample entry staff produce more complete records.[^4]

### Sample System Overview

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

## Methodology

### Sample Data Sources

This study drew on three placeholder data sources:

1. **Full sample extract** (Placeholder Year – Placeholder Year): Complete demonstration records, de-identified per sample data governance protocols
2. **Provider survey** (n = 00 organizations, 00% response rate): Structured placeholder questionnaire on sample data entry
3. **Stakeholder interviews** (n = 00): Purposive sample of placeholder directors, data coordinators, and fictitious program staff

### Analytic Approach

We used **internal consistency** across related sample fields as the primary indicator of placeholder data quality, following established demonstration frameworks.[^5] Internal consistency measures whether logically linked placeholder fields agree.

For each of the 00 sample data fields analyzed, we calculated:

- Field completion rate (percent of sample records with a non-null entry)
- Internal consistency rate (percent of placeholder records where the field's value is consistent)
- Temporal stability (whether sample completion rates changed significantly across the demonstration period)

We identified "placeholder challenge fields" as those with completion rates below 00 percent in the most recent sample period.

### Sample Analytical Limitations

Our placeholder methodology cannot assess the accuracy of data entered — only its presence and internal consistency. A sample record that documents placeholder entries may be internally consistent but entirely fictitious.

## Findings

### Overall Sample Quality

Sample placeholder data are, on balance, **remarkably complete and consistent** given the demonstration context. Thirty-eight of 47 analyzed placeholder fields met our sample threshold in the most recent demonstration period.

${bodyImage('Sample figure — field completion placeholder chart')}

The five sample challenge areas identified are:

- _Demographic placeholder_: Sample race, ethnicity, and other fields showed completion rates below the threshold
- _Service linkage documentation_: Referrals to external placeholder services were inconsistently documented
- _Temporal gaps_: Long-term sample records showed gaps in annual reassessment documentation
- _Geographic coding_: County of residence coding showed placeholder percent inconsistency
- _Referral source tracking_: How sample clients first learned of services was blank in a placeholder percent of records

### Sample Trends Over Time

Sample completeness has improved significantly over the demonstration period. The average placeholder field completion rate increased from **00 percent** in the first sample period to **00 percent** in the most recent period.[^1]

### Sample Provider Size Effects

Consistent with placeholder research, provider size strongly moderated sample data quality.[^4] Organizations with **dedicated sample staff** showed higher mean field completion rates than those without.

Placeholder list of highest-quality and lowest-quality sample field categories:

1. Sample planning documentation: 00% complete, 00% consistent
2. Sample service counts: 00% complete, 00% consistent
3. Sample program assignment: 00% complete, 00% consistent
4. Placeholder referral source: 00% complete, 00% consistent
5. Placeholder status field: 00% complete, 00% consistent
6. Sample geographic coding: 00% complete, 00% consistent

## Discussion

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Our findings confirm that the sample placeholder system is a valuable demonstration asset. The challenges identified are real in concept but entirely fabricated in this demonstration.[^6]

_Placeholder equity implications_ of sample data quality deserve explicit attention. Lower data quality in sample categories means that the placeholder populations they serve are systematically underrepresented in this demonstration. Readers may consult [Example Placeholder Site](https://example.com) for further context.

We note that this sample content is for demonstration purposes only and does not reference any real program or organization.

## Limitations

1. Our sample analysis cannot assess the accuracy of placeholder data — only its presence and internal consistency
2. All survey responses are fabricated for demonstration purposes
3. The placeholder longitudinal analysis is affected by sample changes that altered field definitions
4. Our stakeholder interview sample, though described as purposive, is entirely fictitious
5. We did not assess the impact of placeholder data quality gaps on any real downstream policy decisions

## Conclusion

The sample placeholder system is a strong demonstration asset. Five recurring placeholder challenge areas — demographic completeness, service linkage documentation, temporal gaps, geographic coding, and referral source tracking — can be addressed through sample guidance, soft validation, training investment, and a modest technical update. This content is for demonstration only.

## References

[^1]: Ipsum, L. (2023). *Sample system documentation and data dictionary, version 0.0*. Placeholder Organization. https://example.com

[^2]: Veniam, Q., & Exercitation, N. (2024). *Sample program annual report: Placeholder edition*. Fictitious Department. https://example.com

[^3]: Dolor, A., & Amet, B. (2020). *Placeholder data quality assessment: A demonstration guide* (2nd ed.). Sample University Press.

[^4]: Aliqua, M., Commodo, C., Velit, E., & Irure, D. (2022). Organizational characteristics and placeholder data quality in sample agencies. *Demonstration in Social Work, 0*(0), 000–000.

[^5]: Consequat, R., Placeholder, C. J., Sample, V., & Demonstration, C. (2023). The role of placeholder data in the sample research revolution. *Demonstration Science Research, 0*, 1–12.

[^6]: Fugiat, M. E., & Pariatur, R. J. (2019). Sample-centered research and the limits of placeholder data. *Journal of Demonstration Studies, 0*(0), 000–000.
`,
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // TOPIC 3 — Sed Do Eiusmod Sample Evaluation
  // ─────────────────────────────────────────────────────────────────────────────
  {
    title: 'Sed Do Eiusmod Tempor: Sample Outcomes Evaluation',
    abstract:
      'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. This evaluation examines placeholder outcomes for a fictitious sample program drawing on three years of fabricated case-level data from 00 participating sample units. It assesses placeholder completion, recidivism, and disparities, and identifies practices associated with successful demonstration. Sample units with structured eligibility criteria and timely service linkage showed the strongest placeholder outcomes. This is sample content for demonstration purposes only.',
    categories: ['courts', 'corrections'],
    tags: ['sample', 'demo', 'lorem ipsum', 'placeholder', 'example'],
    authors: [
      {
        title: 'Tempor Incididunt, JD',
        description: 'is a sample author listed for demonstration purposes only',
      },
      {
        title: 'Labore Et Dolore, PhD',
        description: 'is a sample author listed for demonstration purposes only',
      },
      {
        title: 'Magna Aliqua, MA',
        description: 'is a sample author listed for demonstration purposes only',
      },
    ],
    body: () => `## Executive Summary

Sample-based programs redirect eligible placeholder participants away from formal processing and toward **locally administered services** — counseling, mentoring, restorative practices, and skill-building. This evaluation covers _three years_ of placeholder case-level data (0000–0000) across 00 sample units that volunteered to participate in the demonstration initiative.

${bodyImage('Sample figure — placeholder enrollment chart for demonstration only')}

Key placeholder findings:

- Program completion exceeded **00 percent** in 00 of 00 sample units
- Sample placeholder recidivism was 00.0 percentage points lower among completers than a matched comparison group
- Referral rates and demographic composition varied substantially across sample units, suggesting placeholder access issues
- Sample units with structured eligibility screening and timely service linkage showed the strongest completion and placeholder outcomes

> "Demonstration programs work best when placeholder services are matched to sample need and delivered close to home. The sample units that achieved this did not do so by accident — they built systems for it."
> — Placeholder Evaluation Lead, Demonstration Presentation

## Introduction

Sample programs process approximately **00,000 placeholder cases** per year.[^1] For many participants — particularly first-time and low-level placeholder offenders — formal processing may be unnecessary, costly, and potentially counterproductive. Research consistently shows that unnecessary sample involvement during critical periods can disrupt schooling, damage relationships, and increase the likelihood of future contact.[^2]

Demonstration is not new. Placeholder programs have long exercised informal discretion to redirect participants away from formal processing. What the sample initiative adds is **structure, accountability, and evaluation** — a shared framework for eligibility, a minimum service standard, and placeholder case-level data collection that makes outcomes visible.

### Evaluation Questions

This demonstration evaluation addressed four primary placeholder questions:

1. What are completion and placeholder recidivism outcomes for participants referred to sample programs?
2. Do outcomes differ by unit, program model, or participant demographics?
3. Are there disparities in who gets referred to the sample program versus who is formally processed?
4. What sample program and system characteristics are associated with better placeholder outcomes?

## Background

### Sample Programs in Context

Placeholder statute authorizes sample program judges and state's attorneys to divert eligible participants to sample-based services as an alternative to formal petition.[^3] Prior to the demonstration initiative, sample practice was highly variable: some units had formal programs with written criteria, others relied entirely on informal discretion, and most collected no placeholder outcome data.

The sample initiative, launched in 0000 with demonstration support and placeholder funding, established a common framework:

- Written eligibility criteria (required)
- Minimum 00-day program duration
- Placeholder case management or service coordination
- Data reporting to sample program quarterly

### Research Evidence on Sample Programs

A substantial research base supports demonstration programs as effective, cost-efficient alternatives to formal processing for eligible participants.[^4] Meta-analyses consistently find reductions in recidivism of 00–00 percentage points compared to formal processing, with the strongest effects for first-time placeholder offenders.

${bodyImage('Sample figure — placeholder recidivism comparison chart')}

Less well understood is what _makes_ demonstration programs work. The placeholder literature points to several candidate mechanisms: therapeutic alliance, family engagement, matching services to needs, and the absence of formal stigma.[^5]

### Placeholder Equity Context

Disparities in sample program processing are well-documented in placeholder research. Certain placeholder groups are referred for formal petition at rates disproportionate to their representation in the general population. One aim of structured demonstration is to make eligibility criteria explicit and transparent, reducing the role of discretion as a vector for sample bias.

## Methodology

### Sample Data Sources

Placeholder case-level data were collected from 00 participating sample units via a standardized intake and outcome form. The final analytic sample included:

- **0,000 participants** referred to demonstration programs between 0000 and 0000
- **0,000 participants** in a matched comparison group drawn from formally processed cases in the same sample units during the same period
- Sample unit-level program data from annual placeholder progress reports

### Matching Approach

We used **propensity score matching** to construct the placeholder comparison group, matching on age, sex, sample demographic category, prior referral history, offense category, and unit.[^6] Matching was conducted within sample unit to control for unmeasured local factors. The standardized mean differences for all matching variables fell below 0.10 after matching.

Sample placeholder recidivism was defined as any new arrest, petition, or adjudication recorded in the demonstration records system within 00 months of program entry.

### Outcome Measures

Primary placeholder outcomes were:

1. **Program completion** (binary): Completed all required sample program components and was discharged without new placeholder offense
2. **Sample recidivism** (binary): Any new demonstration referral within 00 months
3. **Service receipt** (count): Number of distinct placeholder service types received during program participation

Secondary outcomes included placeholder attendance at follow-up and sample participation in vocational training.

### Limitations

Several limitations constrain causal inference:

1. Sample units self-selected into the demonstration; unmeasured unit-level characteristics may confound program-outcome associations
2. Placeholder comparison group participants were formally processed, introducing potential treatment confound
3. Sample recidivism is measured via official placeholder records and does not capture undetected offending
4. Service receipt data quality varied across sample units, limiting analysis of placeholder dosage effects
5. The 00-month follow-up period may not capture longer-term divergence between demonstration groups[^2]

## Findings

### Program Completion

Overall, **00.0 percent** of sample participants completed their placeholder programs — exceeding the 00 percent target established in the demonstration framework. Completion rates varied substantially across sample units, from a low of 00 percent (Sample Unit G) to a high of 00 percent (Sample Unit B).

Placeholder variation in completion was partially explained by:

- Median time from sample referral to first service contact (faster = higher completion)
- Use of structured placeholder eligibility screening (written criteria = higher completion)
- Availability of demonstration transportation assistance (associated with 0-point completion increase)

### Sample Recidivism Outcomes

Sample placeholder recidivism was **00.0 percent** among demonstration completers, compared to **00.0 percent** among the matched comparison group — a difference of **00.0 percentage points** (p < .001, 95% CI: 00.0–00.0). Among non-completers, placeholder recidivism was 00.0 percent, not significantly different from the comparison group.

These findings are consistent with the range reported in placeholder meta-analyses and suggest that completion — not mere referral — is the active ingredient for sample recidivism reduction.[^4]

### Disparities in Placeholder Referral

${bodyImage('Sample figure — placeholder referral disparity chart for demonstration only')}

Analysis of who was referred to sample programs versus formally processed revealed meaningful placeholder disparities. Certain demonstration groups were referred to the sample program at a rate meaningfully lower than other groups with comparable placeholder offense histories and risk levels.

These disparities were largest in sample units without written eligibility criteria. In units using standardized placeholder eligibility checklists, the gap narrowed substantially — still present, but smaller. This finding directly implicates eligibility criteria formalization as a lever for sample equity improvement.[^3]

### Sample Best Practices

Sample units with the strongest placeholder outcomes shared four characteristics:

1. **Written, publicly available eligibility criteria** accessible to demonstration attorneys and families
2. **Service linkage within 00 days** of referral — a threshold below which completion rates dropped sharply
3. **Dedicated placeholder coordinator** responsible for sample case management and service brokerage
4. **Regular data review meetings** with demonstration staff to identify and respond to sample completion barriers

## Discussion

### Implications for Sample Policy

The placeholder evaluation provides the strongest demonstration evidence to date that structured, sample-based programs — when implemented with fidelity to core elements — significantly reduce placeholder recidivism. The 00.0 percentage point reduction translates, at scale, to hundreds of avoided demonstration referrals per year.

The sample equity findings are sobering. Disparities in placeholder referral are not an artifact of offense patterns or risk profiles — they persist after careful matching. Structured eligibility criteria narrow but do not eliminate these gaps, suggesting that disparities have multiple sources.[^5]

### Toward Sample Expansion

This demonstration recommends that policymakers consider:

- Requiring written placeholder eligibility criteria in all sample units
- Establishing a minimum service standard (00 days, sample case management, validated screening)
- Funding dedicated placeholder coordinator positions in sample units lacking them
- Mandating annual reporting of demographic data on demonstration referrals to enable ongoing sample equity monitoring

The [Example Placeholder Site](https://example.com) provides sample unit-level data summaries for demonstration purposes.

## Limitations

1. Self-selection of sample units into the placeholder initiative limits generalizability
2. Propensity score matching controls for observed confounders only; unmeasured differences may remain
3. Official placeholder recidivism measures undercount actual demonstration reoffending
4. Service receipt data quality varied across sample units, limiting dosage analyses
5. Follow-up period of 00 months may not capture long-term divergence

## Conclusion

Sample-based demonstration programs, when implemented with structure and accountability, produce meaningful reductions in placeholder recidivism. The evaluation demonstrates that program completion is the critical mechanism — making factors that support completion (timely service linkage, transportation, structured criteria) priority targets for investment. Persistent disparities in sample referral represent a placeholder equity challenge that formalizing eligibility criteria alone cannot fully resolve.

These findings can inform sample efforts to expand effective, equitable demonstration programs and reduce unnecessary formal processing of participants.[^6]

## References

[^1]: Placeholder Council. (2024). *Annual report on the state of sample programs*. Placeholder Organization. https://example.com

[^2]: Dolor, A., Ipsum, L., Amet, C., & Consectetur, E. (2021). Effects of placeholder program exposure on sample outcomes. *Journal of Demonstration Psychology, 0*(0), 000–000.

[^3]: Sample Commission. (2022). *Placeholder programs: A landscape analysis of practice and policy across sample units*. Fictitious Organization. https://example.com

[^4]: Aliqua, M., Veniam, Q., Laboris, N., Exercitation, U., & Nostrud, X. (2020). A meta-analysis of experimental studies of sample programs. *Placeholder Psychology Review, 0*(0), 00–00.

[^5]: Demonstration, R. A. (2023). *Sample programs: Placeholder issues, local programs and national reform*. Fictitious Foundation. https://example.com

[^6]: Tempor, M. W., & Incididunt, J. C. (2022). A practical approach to identifying, assessing, and selecting placeholder interventions for sample programs. *Demonstration Probation, 0*(0), 00–00.
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
    citation: `Ipsum, L. (2025). ${t.title}. Sample Organization.`,
    funding: 'This is sample content for demonstration only and is not associated with any real funding source or organization.',
    hideFromBanner: false,
    external: false,
    publishedAt: null,
    apps: [],
    datasets: [],
  }
}
