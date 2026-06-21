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
  // ─────────────────────────────────────────────────────────────────────────────
  // TOPIC 1 — Crime Trends
  // ─────────────────────────────────────────────────────────────────────────────
  {
    title: 'Crime in Illinois: 2024 Trends and Analysis',
    abstract:
      'This report examines statewide crime trends in Illinois for calendar year 2024, drawing on Uniform Crime Reporting (UCR) data submitted by law enforcement agencies across all 102 counties. Key findings include a continued decline in violent crime rates, shifting patterns in property crime, and notable regional disparities in drug-related offenses. Policy implications for resource allocation and prevention programming are discussed.',
    categories: ['crimes', 'law enforcement'],
    tags: ['crime trends', 'Illinois', 'UCR', 'violent crime', 'property crime', '2024'],
    authors: [
      {
        title: 'Amanda L. Vasquez, MA',
        description: 'is a Senior Research Analyst at the Illinois Criminal Justice Information Authority, where she specializes in statewide crime statistics and Uniform Crime Reporting methodology',
      },
      {
        title: 'Caleb Schaffner, PhD',
        description: 'is the Research Director at the Illinois Criminal Justice Information Authority and has led statewide data collection and policy analysis efforts for more than fifteen years',
      },
      {
        title: 'Destiny R. Park, MS',
        description: 'is a Research Associate at the Illinois Criminal Justice Information Authority with expertise in geographic information systems and spatial crime analysis',
      },
    ],
    body: () => `## Executive Summary

Illinois recorded **47,312 violent crime incidents** in 2024, representing a _3.4 percent_ decrease from the prior year and the fifth consecutive annual decline. Property crimes fell for the fifth straight year, though motor vehicle theft bucked the trend with an 11.2 percent increase — a pattern observed nationally and linked in part to vulnerabilities in keyless ignition systems.[^1] Drug-related offenses showed complex geographic variation, declining in Cook County while rising modestly in several downstate metro areas.

${bodyImage('Statewide violent crime rates, 2018–2024')}

> "Understanding crime trends requires more than raw counts — it demands context, consistency in reporting methodology, and sensitivity to the communities behind the numbers."
> — ICJIA Research Director, 2024 Annual Conference

This report is intended to serve legislators, local policymakers, law enforcement leadership, and community organizations seeking an evidence-based picture of public safety across the state.

## Introduction

The Illinois Criminal Justice Information Authority (ICJIA) has published annual crime trend reports since 1987, drawing on data submitted to the Illinois Uniform Crime Reporting (UCR) Program administered by the Illinois State Police (ISP). The 2024 report covers all Part I offenses — murder and non-negligent manslaughter, rape, robbery, aggravated assault, burglary, larceny-theft, motor vehicle theft, and arson — as well as selected Part II offense categories where statewide data quality meets reporting thresholds.[^2]

Illinois participates in the Federal Bureau of Investigation's National Incident-Based Reporting System (NIBRS) transition. As of 2024, **87 of 102 counties** report using NIBRS-compatible formats, enabling more granular analysis than was previously possible. Counties still using legacy Summary Reporting System (SRS) formats are noted throughout.

### Scope and Coverage

This report covers incidents reported to law enforcement between January 1 and December 31, 2024. Population denominators are the Illinois Department of Revenue intercensal estimates; final 2020 Census-based projections were applied for the first time in this edition. Coverage reached **96.4 percent** of the state's estimated population, consistent with prior years.

## Background

### Historical Context

Illinois violent crime peaked in 1991 at **103,240 incidents** — more than double the 2024 figure. The long decline since then reflects a confluence of factors: demographic shifts, expanded community policing, incarceration trends, and changes in drug markets.[^3] Researchers continue to debate the relative weight of each factor, and ICJIA does not attribute the overall trend to any single cause.

Property crime followed a broadly similar arc, peaking in 1994 and declining more than 58 percent through 2024. However, within the property crime category, _larceny-theft_ has proven more volatile than burglary, which has fallen steadily as home security technology has diffused across income levels.

### Reporting System Evolution

The transition from SRS to NIBRS represents the most significant change in crime data infrastructure in decades. NIBRS collects incident-level data — each crime event, each victim, each offender attribute — rather than the monthly aggregate counts SRS produced. This transition creates comparability challenges in longitudinal analysis and requires transparent documentation of methodology.[^4]

${bodyImage('Illinois county-level NIBRS adoption, 2024')}

## Methodology

County-level rates were calculated per 100,000 residents using the [Illinois UCR Program](https://icjia.illinois.gov/researchhub) data administered by the Illinois State Police. The analytical workflow proceeded in the following sequence:

1. Raw agency-level submissions were cleaned for duplicate reporting and outlier detection using ISP protocols
2. Agencies with more than three months of missing data were excluded from trend calculations but included in count totals with a notation
3. UCR Program submissions were merged with the [National Crime Victimization Survey](https://bjs.ojp.gov/data-collection/ncvs) (NCVS) supplemental estimates to assess potential under-reporting
4. Population denominators were applied from Illinois Department of Revenue estimates (July 1, 2024 vintage)
5. Regional groupings — Chicago MSA, Other Metro, and Rural — follow the Office of Management and Budget definitions

### Limitations of Administrative Data

Administrative crime data captures only crimes **known to police**. The NCVS consistently finds that fewer than half of all violent victimizations are reported to law enforcement; reporting rates for property crimes are lower still.[^5] Readers should interpret counts and rates as floors, not ceilings, of actual victimization.

Additionally, changes in department staffing, recording practices, or local policy can alter reported crime counts independently of true crime levels. Several agencies that expanded online reporting portals in 2024 showed increases in larceny-theft attributable to previously unreported incidents now easily submitted by victims.

## Findings

### Violent Crime

Violent crime declined across all four Part I offense categories except _rape_, which held approximately flat (+0.4%). Notable findings include:

- **Homicide:** 1,189 incidents statewide; Cook County accounted for 61 percent. Rural county homicides increased 2.3 percent, the second consecutive annual rise.
- **Robbery:** Declined 6.1 percent statewide. Commercial robbery fell sharply in Chicago following targeted enforcement; residential robbery increased slightly in collar counties.
- **Aggravated assault:** The most frequent violent offense category at 29,847 incidents (63% of the total), declining 2.9 percent year over year.
- **Rape:** 3,741 incidents under the revised UCR definition. Year-over-year change was within the margin attributable to reporting variation.

Firearm involvement was documented in 41 percent of violent offenses where weapon information was recorded — a slight decrease from 43 percent in 2023, though firearm data completeness varied by agency.

### Property Crime

Property crime totaled **282,104 incidents** in 2024, a 2.7 percent decrease from 2023. Three subcategories drove the overall decline:

- Burglary fell 9.4 percent, continuing a decade-long downward trend
- Larceny-theft fell 1.8 percent
- Arson declined 4.2 percent from a small base

Motor vehicle theft, however, increased **11.2 percent** to 34,619 incidents — the largest single-year increase since 2002. The increase was concentrated in urban and suburban counties and was disproportionately associated with vehicle makes using passive keyless entry technology.[^1]

### Drug Offenses

Drug offense data from Part II reporting showed divergent regional trends:

- Cook County drug arrests declined 12 percent, reflecting policy shifts in enforcement priorities
- Metro East (St. Louis border region) saw a 7.4 percent increase in methamphetamine-related arrests
- Downstate rural counties showed modest increases in synthetic opioid possession charges

### Regional Disparities

${bodyImage('Regional crime rate comparisons, Illinois 2024')}

Geographic analysis reveals persistent disparities. The Chicago MSA accounts for **68 percent** of the state's violent crime incidents while comprising 65 percent of the population — a slight concentration ratio that has narrowed over the past decade. Rural counties, conversely, face elevated rates of certain property crimes (particularly agricultural equipment theft) and drug offenses relative to population.

## Discussion

The 2024 data reinforce several themes from prior years while introducing new concerns. The continued decline in most violent crime categories is encouraging, but the increases in rural homicide and motor vehicle theft signal that the broad positive trend masks important sub-group variation.

_Motor vehicle theft_ deserves particular attention from policymakers. The 2024 increase mirrors a national pattern tied to specific vehicle vulnerabilities, suggesting that targeted manufacturer and regulatory responses — rather than traditional enforcement alone — may be necessary to reverse the trend.[^6]

The ongoing NIBRS transition has improved data granularity but also introduced comparability challenges. ICJIA will publish a methodological supplement in early 2025 documenting how the transition affects longitudinal comparisons and providing guidance for analysts working with the historical series.

### Equity Considerations

Crime data, like all administrative data, reflects the activities of institutions as well as underlying conditions. Disparities in arrest rates by race and ethnicity — visible in NIBRS data — may reflect differences in victimization, enforcement intensity, or both. ICJIA is developing a supplemental report on racial and ethnic disparities in the criminal justice system, expected in the second quarter of 2025.

## Limitations

Several limitations should be noted:

1. Coverage is incomplete: 3.6 percent of the state population resides in jurisdictions with insufficient data for trend analysis
2. NIBRS-to-SRS hybrid reporting affects comparability for 15 agencies still in transition
3. Population estimates carry uncertainty, particularly for rapidly growing or declining municipalities
4. Crime data reflects crimes known to police; dark-figure crime remains unquantified
5. Agency-level policy changes (diversion programs, recording practice updates) can affect counts independent of true crime levels[^4]

## Conclusion

Illinois crime trends for 2024 present a mixed but broadly positive picture. Five consecutive years of declining violent crime reflect sustained investment in evidence-based prevention and intervention, community policing, and reentry support. Targeted increases in motor vehicle theft and rural violence underscore the need for ongoing, data-driven policy engagement.[^2]

ICJIA will continue to monitor these trends, publish quarterly updates for selected offense categories, and support local jurisdictions in interpreting their own data. Researchers seeking agency-level datasets may submit a data request through the [ICJIA Research Hub](https://icjia.illinois.gov/researchhub).

## References

[^1]: National Highway Traffic Safety Administration. (2024). *Motor vehicle theft trends and keyless entry vulnerability: 2023 supplemental analysis*. U.S. Department of Transportation. https://www.nhtsa.gov

[^2]: Illinois Criminal Justice Information Authority. (2024). *Crime in Illinois: 2023 annual report*. ICJIA. https://icjia.illinois.gov/researchhub

[^3]: Blumstein, A., & Farrington, D. P. (2021). *The crime drop in America: Causes and consequences* (3rd ed.). Cambridge University Press.

[^4]: Federal Bureau of Investigation. (2024). *NIBRS technical specification and migration guide, version 2.2*. FBI Criminal Justice Information Services Division. https://www.fbi.gov/services/cjis/ucr/nibrs

[^5]: Morgan, R. E., & Thompson, A. (2025). *Criminal victimization, 2024* (Bureau of Justice Statistics Special Report NCJ 123456). U.S. Department of Justice. https://bjs.ojp.gov

[^6]: Lofstrom, M., & Martin, B. (2024). *Catalytic converter and motor vehicle theft: Trends and policy responses*. Public Policy Institute of California. https://www.ppic.org
`,
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // TOPIC 2 — InfoNet Data Quality
  // ─────────────────────────────────────────────────────────────────────────────
  {
    title: 'Victim Service Data Quality in the InfoNet System',
    abstract:
      'InfoNet is a statewide administrative data system used by publicly funded domestic violence and sexual assault service providers in Illinois. This study assesses the quality and completeness of more than 25 years of victim service data and offers targeted recommendations for strengthening data collection and reporting. Findings indicate that most fields are internally consistent and complete, while five recurring challenge areas merit system-wide attention.',
    categories: ['victims'],
    tags: ['InfoNet', 'victim services', 'domestic violence', 'data quality', 'sexual assault'],
    authors: [
      {
        title: 'Lucia F. Gonzalez, MA',
        description: 'is a Research Analyst at the Illinois Criminal Justice Information Authority specializing in victim services data systems and administrative data quality assessment',
      },
      {
        title: 'Jennifer Hiselman, MA',
        description: 'is a Program Director at the Illinois Criminal Justice Information Authority overseeing the InfoNet data system and statewide victim services evaluation',
      },
      {
        title: 'Robert T. Okafor, PhD',
        description: 'is an Associate Professor of Public Health at Midwestern State University and a Senior Fellow at ICJIA whose research focuses on administrative data infrastructure for human services',
      },
      {
        title: 'Simone L. Beaumont, MSW',
        description: 'is a Research Associate at the Illinois Criminal Justice Information Authority with expertise in survivor-centered research methods and trauma-informed data practices',
      },
    ],
    body: () => `## Executive Summary

The InfoNet system contains over **25 years** of victim service data — approximately 900,000 domestic violence and 180,000 sexual assault client records collected from publicly funded service providers across Illinois. This study is the most comprehensive assessment of InfoNet data quality conducted to date.

> "Responsible interpretation of administrative data depends on systematically assessing its quality and completeness. Without that foundation, even the most sophisticated analyses rest on uncertain ground."
> — Study authors, Research Preface

Our analysis identified five recurring challenge areas — demographics completeness, service linkage documentation, temporal gaps in longitudinal records, geographic coding consistency, and referral source tracking — and offers targeted recommendations for each. The majority of InfoNet fields are _internally consistent and complete_, a finding that validates the system's value for statewide planning and evaluation.

${bodyImage('InfoNet client records by program type, 1998–2024')}

## Introduction

Illinois requires all organizations receiving state funds for domestic violence and sexual assault services to document client interactions in InfoNet, an online data system managed by ICJIA. The system captures intake information, services delivered, safety planning activities, shelter stays, legal advocacy, and outcomes — enabling ICJIA, state funders, and providers to monitor service delivery and plan capacity.[^1]

InfoNet launched in 1998. Over its 25-year history, the system has been updated six times, with the most recent major revision in 2019 introducing enhanced demographic fields and expanded service categories. These updates improve data value but also create longitudinal comparability challenges that this study explicitly addresses.

### Study Purpose

This study was commissioned by ICJIA in response to legislative interest in the reliability of victim service data used for appropriations decisions. Specifically, we sought to answer three questions:

1. How complete and internally consistent are InfoNet data fields?
2. Where do recurring quality challenges arise, and what are their likely causes?
3. What targeted changes to system design, training, or policy would most cost-effectively improve data quality?

## Background

### Domestic Violence and Sexual Assault Services in Illinois

Illinois funds **more than 80 organizations** providing domestic violence services and approximately 40 organizations providing sexual assault services, through a combination of state appropriations, federal Victims of Crime Act (VOCA) funding, and Violence Against Women Act (VAWA) grants.[^2] These organizations range from large urban shelters serving hundreds of clients per year to small rural organizations where a single staff member may manage both service delivery and data entry.

### Prior Research on Administrative Data Quality

Prior research on administrative data quality in human services has consistently found that completeness and consistency vary by field sensitivity, staff capacity, and system design.[^3] Sensitive fields — such as immigration status or mental health diagnoses — are systematically underreported. Fields with large free-text entry options show high variability. Fields that trigger mandatory actions (e.g., safety plan documentation gating discharge) show near-complete entry.

${bodyImage('Data completeness rates by field category, InfoNet 2019–2024')}

Research also shows that provider size moderates data quality: larger organizations with dedicated data entry staff produce more complete records, while smaller organizations — often serving underserved rural populations — show higher rates of missing or inconsistent data.[^4] This has equity implications that we address in our recommendations.

### InfoNet System Architecture

InfoNet is a web-based system with role-based access for shelter staff, legal advocates, and administrators. Client records are created at intake and updated as services are delivered. The system includes built-in validation for a subset of fields, generating warnings (but not hard stops) when required fields are left blank. A quarterly data quality report is automatically generated and sent to each provider, though our stakeholder interviews suggest these reports are often not reviewed by frontline staff.

## Methodology

### Data Sources

This study drew on three data sources:

1. **Full InfoNet extract** (January 1998 – December 2023): 25 complete years of client-level data, de-identified per ICJIA data governance protocols
2. **Provider survey** (n = 67 organizations, 84% response rate): Structured questionnaire on data entry staffing, training, and perceived burden
3. **Stakeholder interviews** (n = 22): Purposive sample of shelter directors, data coordinators, state funders, and ICJIA program staff

### Analytic Approach

We used **internal consistency** across related fields as the primary indicator of data quality, following established frameworks for administrative data assessment.[^5] Internal consistency measures whether logically linked fields agree — for example, whether a client record with a documented shelter stay also records an exit date. It does not assess whether client self-reports are accurate; that question is beyond the scope of administrative data assessment.

For each of the 47 data fields analyzed, we calculated:

- Field completion rate (percent of eligible records with a non-null entry)
- Internal consistency rate (percent of records where the field's value is consistent with related fields)
- Temporal stability (whether completion rates changed significantly across the 25-year period)

We identified "challenge fields" as those with completion rates below 80 percent or internal consistency rates below 85 percent in the most recent three-year period (2021–2023).

### Limitations of the Analytic Approach

Our methodology cannot assess the accuracy of data entered — only its presence and internal consistency. A record that documents ten shelter nights may be internally consistent but factually incorrect. Staff interviews provided qualitative context for interpreting patterns, but we cannot rule out social desirability bias in provider survey responses.

## Findings

### Overall Data Quality

InfoNet data are, on balance, **remarkably complete and consistent** given the operational context of frontline human services delivery. Thirty-eight of 47 analyzed fields met our threshold in the most recent three-year period. Fields related to service counts, safety planning documentation, and funding program assignment showed the highest quality.

${bodyImage('Field completion rates by category, most recent three-year period')}

The five challenge areas identified are:

- _Demographic completeness_: Race, ethnicity, and disability status fields showed completion rates of 71–76 percent, below the 80 percent threshold
- _Service linkage documentation_: Referrals to external services (legal, housing, health) were inconsistently documented
- _Temporal gaps_: Long-term client records showed gaps in annual reassessment documentation
- _Geographic coding_: County of residence coding showed 8.2 percent inconsistency with zip code entries
- _Referral source tracking_: How clients first learned of or were referred to services was blank in 29 percent of records

### Trends Over Time

Data completeness has improved significantly since 1998. The average field completion rate across all 47 fields increased from **62 percent** in the first operational period (1998–2002) to **89 percent** in the most recent period (2021–2023). This improvement reflects system upgrades, ICJIA training investments, and the professionalization of victim services data management.[^1]

However, improvement has not been uniform. Demographic fields — particularly race and ethnicity — showed smaller gains than service documentation fields. Provider survey data suggest that some staff remain uncertain about how to record race and ethnicity when clients express ambiguity or decline to answer, leading to inconsistent use of "unknown" versus "declined to answer" codes.

### Provider Size Effects

Consistent with prior research, provider size strongly moderated data quality.[^4] Organizations with **dedicated data staff** (n = 31) showed mean field completion rates 12 percentage points higher than those without. Rural providers — 78 percent of which lack dedicated data staff — accounted for a disproportionate share of challenge field entries.

Numbered list of highest-quality and lowest-quality field categories:

1. Safety planning documentation: 96% complete, 98% consistent
2. Shelter service counts: 94% complete, 97% consistent
3. Funding program assignment: 93% complete, 99% consistent
4. Referral source: 71% complete, 88% consistent
5. Disability status: 71% complete, 82% consistent
6. County of residence (vs. zip): 91% complete, 92% consistent (8.2% inconsistency)

## Recommendations

We offer five targeted recommendations to strengthen InfoNet data quality. Prioritization was informed by expected impact, implementation feasibility, and equity implications.

### 1. Clarify Race and Ethnicity Coding Guidance

ICJIA should issue updated written guidance clarifying the difference between "unknown" (provider did not ask or information is unavailable) and "declined to answer" (client was asked and declined). A brief in-system tooltip and a one-page reference card for frontline staff would reduce ambiguity at low cost.[^3]

### 2. Add Soft Validation for Referral Source

The referral source field should trigger a visible (but non-blocking) reminder when left blank at intake completion. Research on form completion suggests that soft prompts — particularly when appearing at a natural workflow break — substantially increase completion rates without adding perceived burden.

### 3. Expand Training for Rural and Small Providers

ICJIA should prioritize data quality training for rural and small organizations through:

- Annual virtual training webinars tailored to small-organization workflows
- Peer learning cohorts pairing high-performing and lower-performing providers of similar size
- Technical assistance funding for organizations below data quality thresholds

### 4. Standardize Longitudinal Reassessment Documentation

For clients with records spanning more than 12 months, InfoNet should prompt staff to complete a brief reassessment entry at the 12-month anniversary. This would address the temporal gap challenge and improve the system's utility for longitudinal outcome tracking.

### 5. Automate Geographic Code Cross-Checking

A simple backend validation comparing county code to the known zip-code-to-county crosswalk would flag inconsistencies at entry rather than in post-hoc analysis. This technical change would eliminate the 8.2 percent inconsistency rate in geographic coding with minimal staff burden.[^5]

## Discussion

Our findings confirm that InfoNet is a valuable and generally high-quality statewide data asset. The challenges identified are real but addressable. Importantly, the five recommendations above are **targeted and proportionate** — they address specific, documented gaps rather than calling for wholesale system redesign.

The equity implications of data quality deserve explicit attention. Lower data quality in rural and small organizations means that the populations they serve — often those with the fewest alternative service options — are systematically underrepresented in statewide analyses. Closing this gap is both a data quality imperative and a matter of _fairness_ in how public resources are evaluated and allocated.[^2]

We note that client care appropriately takes precedence over data entry in acute service contexts. Recommendations that would significantly increase staff burden are not justified by data quality gains. The [ICJIA Research Hub](https://icjia.illinois.gov/researchhub) provides public access to aggregated InfoNet data for researchers and policymakers.

## Limitations

1. Our analysis cannot assess the accuracy of entered data — only its presence and internal consistency
2. Provider survey responses may reflect social desirability bias
3. The 25-year longitudinal analysis is affected by system changes that altered field definitions and entry requirements
4. Our stakeholder interview sample, though purposive, may not represent all provider types and regions
5. We did not assess the impact of data quality gaps on downstream policy decisions, which would require a separate study

## Conclusion

InfoNet is a strong administrative data asset that has improved substantially over 25 years. Five recurring challenge areas — demographic completeness, service linkage documentation, temporal gaps, geographic coding, and referral source tracking — can be addressed through targeted guidance, soft validation, training investment, and a modest technical update. Implementation of these recommendations would strengthen Illinois's capacity to understand and respond to the needs of domestic violence and sexual assault survivors statewide.

## References

[^1]: Illinois Criminal Justice Information Authority. (2023). *InfoNet system documentation and data dictionary, version 6.2*. ICJIA. https://icjia.illinois.gov/researchhub

[^2]: Office on Violence Against Women. (2024). *VAWA and VOCA grant program annual report: Illinois*. U.S. Department of Justice. https://www.justice.gov/ovw

[^3]: Putnam-Hornstein, E., & Needell, B. (2020). *Administrative data quality assessment: A practitioner's guide* (2nd ed.). University of California, Berkeley Center for Child and Youth Policy.

[^4]: Green, B. L., Saunders, P. A., Power, E., & Dass-Brailsford, P. (2022). Organizational characteristics and administrative data quality in human services agencies. *Administration in Social Work, 46*(3), 211–228.

[^5]: Connelly, R., Playford, C. J., Gayle, V., & Dibben, C. (2023). The role of administrative data in the big data revolution in social science research. *Social Science Research, 59*, 1–12.

[^6]: Dichter, M. E., & Gelles, R. J. (2019). Survivor-centered research and the limits of administrative data: Balancing completeness with dignity. *Journal of Family Violence, 34*(7), 601–613.
`,
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // TOPIC 3 — Juvenile Diversion
  // ─────────────────────────────────────────────────────────────────────────────
  {
    title: 'Juvenile Diversion Outcomes in Illinois Courts',
    abstract:
      'This evaluation examines outcomes for youth referred to community-based diversion programs across Illinois judicial circuits. Drawing on three years of case-level data from 18 participating circuits, it assesses recidivism, program completion, and disparities in referral, and identifies practices associated with successful diversion. Circuits with structured eligibility criteria and timely service linkage showed the strongest outcomes, offering a model for statewide expansion.',
    categories: ['courts', 'corrections'],
    tags: ['juvenile justice', 'diversion', 'recidivism', 'courts', 'youth', 'Illinois'],
    authors: [
      {
        title: 'Marcus T. Reedy, JD',
        description: 'is a Senior Policy Analyst at the Illinois Criminal Justice Information Authority who focuses on juvenile justice reform, diversion program evaluation, and evidence-based court practices',
      },
      {
        title: 'Priya N. Anand, PhD',
        description: 'is an Evaluation Lead at the Illinois Criminal Justice Information Authority with expertise in quasi-experimental methods and longitudinal outcome studies in juvenile and criminal justice settings',
      },
      {
        title: 'Derek A. Fontaine, MA',
        description: 'is a Research Analyst at the Illinois Criminal Justice Information Authority who manages case-level data collection for the statewide juvenile diversion evaluation',
      },
    ],
    body: () => `## Executive Summary

Community-based diversion redirects eligible youth away from formal court processing and toward **locally administered services** — counseling, mentoring, restorative practices, and skill-building. This evaluation covers _three years_ of case-level data (2021–2023) across 18 Illinois judicial circuits that volunteered to participate in the statewide Juvenile Diversion Initiative (JDI).

${bodyImage('Youth enrolled in Illinois Juvenile Diversion Initiative programs, 2021–2023')}

Key findings:

- Program completion exceeded **70 percent** in 14 of 18 circuits
- 12-month recidivism was 18.4 percentage points lower among completers than a matched comparison group
- Referral rates and demographic composition varied substantially across circuits, suggesting inequitable access
- Circuits with structured eligibility screening and timely service linkage (within 14 days) showed the strongest completion and recidivism outcomes

> "Diversion works best when services are matched to need and delivered close to home. The circuits that got this right did not do so by accident — they built systems for it."
> — Evaluation Lead, presentation to the Illinois Juvenile Justice Leadership Council, March 2024

## Introduction

Illinois processes approximately **42,000 juvenile delinquency cases** per year.[^1] For many youth — particularly first-time and low-level offenders — formal court adjudication may be unnecessary, costly, and potentially criminogenic. Research consistently shows that unnecessary system involvement during adolescence can disrupt schooling, damage family relationships, and increase the likelihood of adult criminal justice contact.[^2]

Diversion is not new. Illinois courts have long exercised informal discretion to redirect youth away from formal processing. What the JDI adds is **structure, accountability, and evaluation** — a shared framework for eligibility, a minimum service standard, and case-level data collection that makes outcomes visible.

### Evaluation Questions

This evaluation addressed four primary questions:

1. What are completion and recidivism outcomes for youth referred to JDI programs?
2. Do outcomes differ by circuit, program model, or youth demographics?
3. Are there disparities in who gets referred to diversion versus who is formally processed?
4. What program and system characteristics are associated with better outcomes?

## Background

### Juvenile Diversion in Illinois

Illinois statute (705 ILCS 405) authorizes juvenile court judges and state's attorneys to divert eligible youth to community-based services as an alternative to formal petition. Prior to the JDI, diversion practice was highly variable: some circuits had formal programs with written criteria, others relied entirely on informal prosecutorial discretion, and most collected no outcome data.[^3]

The JDI, launched in 2021 with ICJIA support and federal Juvenile Justice and Delinquency Prevention Act (JJDPA) funding, established a common framework:

- Written eligibility criteria (required)
- Minimum 90-day program duration
- Case management or service coordination
- Data reporting to ICJIA quarterly

Eighteen of Illinois's 24 judicial circuits joined the initiative in its first year. The six non-participating circuits cited staffing and funding constraints; ICJIA is working with three of them on delayed implementation.

### Research Evidence on Diversion

A substantial research base supports diversion as an effective, cost-efficient alternative to formal processing for eligible youth.[^4] Meta-analyses consistently find reductions in recidivism of 10–30 percentage points compared to formal processing, with the strongest effects for first-time offenders and youth with low-to-moderate risk scores.

${bodyImage('Juvenile recidivism outcomes: diversion vs. formal processing, research synthesis')}

Less well understood is what _makes_ diversion programs work. The literature points to several candidate mechanisms: therapeutic alliance, family engagement, matching services to criminogenic needs, and the absence of court stigma.[^5] This evaluation contributes to that literature by examining program-level variation within a single statewide initiative.

### Equity Context

Racial and ethnic disparities in juvenile justice processing are well-documented nationally and in Illinois.[^1] Black youth are referred for formal petition at rates disproportionate to their representation in the general youth population. One aim of structured diversion is to make eligibility criteria explicit and transparent, reducing the role of discretion as a vector for bias. Whether this aim is realized in practice is an empirical question this evaluation addresses.

## Methodology

### Data Sources

Case-level data were collected from 18 participating circuits via a standardized intake and outcome form. The final analytic sample included:

- **4,847 youth** referred to JDI programs between January 2021 and December 2023
- **1,203 youth** in a matched comparison group drawn from formally processed cases in the same circuits during the same period
- Circuit-level program data from annual JDI progress reports

### Matching Approach

We used **propensity score matching** to construct the comparison group, matching on age, sex, race/ethnicity, prior referral history, offense category, and circuit.[^6] Matching was conducted within circuit to control for unmeasured local factors. The standardized mean differences for all matching variables fell below 0.10 after matching, indicating adequate balance.

Twelve-month recidivism was defined as any new arrest, petition, or adjudication recorded in the Illinois Juvenile Court records system within 12 months of program entry (diversion group) or petition filing (comparison group).

### Outcome Measures

Primary outcomes were:

1. **Program completion** (binary): Completed all required program components and was discharged without new offense
2. **12-month recidivism** (binary): Any new delinquency referral within 12 months
3. **Service receipt** (count): Number of distinct service types received during program participation

Secondary outcomes included school attendance at follow-up (available for a subset of circuits) and employment or vocational training participation.

### Limitations

Several limitations constrain causal inference:

1. Circuits self-selected into the JDI; unmeasured circuit-level characteristics may confound program-outcome associations
2. Comparison group youth were formally processed, introducing potential treatment confound beyond the diversion/formal distinction
3. Recidivism is measured via official records and does not capture undetected offending
4. Service receipt data quality varied across circuits, limiting analysis of service dosage effects
5. The 12-month follow-up period may not capture longer-term divergence between groups[^2]

## Findings

### Program Completion

Overall, **73.2 percent** of JDI participants completed their programs — exceeding the 70 percent target established in the JDI framework. Completion rates varied substantially across circuits, from a low of 54 percent (Circuit G) to a high of 91 percent (Circuit B).

Circuit-level variation in completion was partially explained by:

- Median time from referral to first service contact (faster = higher completion)
- Use of structured eligibility screening (written criteria = higher completion)
- Availability of transportation assistance (associated with 9-point completion increase)

### Recidivism Outcomes

Twelve-month recidivism was **22.1 percent** among JDI completers, compared to **40.5 percent** among the matched comparison group — a difference of **18.4 percentage points** (p < .001, 95% CI: 14.2–22.6). Among non-completers, recidivism was 38.2 percent, not significantly different from the comparison group.

These findings are consistent with the range reported in national diversion meta-analyses and suggest that completion — not mere referral — is the active ingredient for recidivism reduction.[^4]

Outcome patterns by demographic group:

- Completion rates were similar across racial/ethnic groups, but referral rates differed (see Disparities section)
- Youth ages 14–15 showed the highest completion rates; youth ages 10–11 and 17 showed lower completion
- First-time offenders showed larger recidivism reductions (22.1 pp) than youth with prior referrals (11.4 pp)

### Disparities in Referral

${bodyImage('Juvenile diversion referral rates by race/ethnicity, Illinois JDI circuits 2021–2023')}

Analysis of who was referred to diversion versus formally processed revealed meaningful disparities. **Black youth** were referred to diversion at a rate 34 percent lower than White youth with comparable offense histories and risk levels — a gap that persisted after controlling for offense severity and prior referrals. Hispanic youth showed a smaller but still significant gap of 14 percent.

These disparities were largest in circuits without written eligibility criteria. In circuits using standardized eligibility checklists, the gap between Black and White referral rates narrowed to 11 percent — still present, but substantially smaller. This finding directly implicates eligibility criteria formalization as a lever for equity improvement.[^3]

### Circuit Best Practices

Circuits with the strongest outcomes shared four characteristics:

1. **Written, publicly available eligibility criteria** accessible to defense attorneys and families
2. **Service linkage within 14 days** of referral — a threshold below which completion rates dropped sharply
3. **Dedicated diversion coordinator** responsible for case management and service brokerage
4. **Regular data review meetings** with program staff to identify and respond to completion barriers

Circuit B, the highest-performing circuit, additionally used a validated risk-need tool at intake to individualize service referrals — the only circuit in the initiative to do so. Its recidivism rate of 14.2 percent was the lowest in the sample.

## Discussion

### Implications for Statewide Policy

The JDI evaluation provides the strongest evidence to date that structured, community-based diversion — when implemented with fidelity to core program elements — significantly reduces recidivism among Illinois youth. The 18.4 percentage point reduction translates, at scale, to hundreds of avoided delinquency referrals per year and the avoided costs of formal processing, detention, and long-term justice involvement.

The equity findings are sobering. Racial disparities in referral are not an artifact of offense patterns or risk profiles — they persist after careful matching. Structured eligibility criteria narrow but do not eliminate these gaps, suggesting that disparities have multiple sources including implicit bias in referral decisions, differential access to legal representation that may advocate for diversion, and community-level factors that affect which youth come to the attention of JDI programs.[^5]

### Toward Statewide Expansion

ICJIA recommends that the General Assembly consider legislation to:

- Require written diversion eligibility criteria in all 24 circuits
- Establish a minimum service standard (90 days, case management, validated screening)
- Fund dedicated diversion coordinator positions in circuits lacking them
- Mandate annual reporting of demographic data on diversion referrals to enable ongoing equity monitoring

The six non-participating circuits serve approximately 18 percent of Illinois's youth population. Bringing them into the JDI framework is essential for equitable statewide coverage.

The [ICJIA Research Hub](https://icjia.illinois.gov/researchhub) provides circuit-level data summaries for researchers, policymakers, and court stakeholders seeking to understand local patterns.

## Limitations

1. Self-selection of circuits into the JDI limits generalizability to non-participating circuits
2. Propensity score matching controls for observed confounders only; unmeasured differences may remain
3. Official recidivism measures undercount actual reoffending
4. Service receipt data quality varied across circuits, limiting dosage analyses
5. Follow-up period of 12 months may not capture long-term divergence

## Conclusion

Juvenile diversion, when implemented with structure and accountability, produces meaningful reductions in recidivism among Illinois youth. The JDI's three-year evaluation demonstrates that program completion is the critical mechanism — making factors that support completion (timely service linkage, transportation, structured criteria) priority targets for investment. Persistent racial disparities in referral represent an equity challenge that formalizing eligibility criteria alone cannot fully resolve; additional strategies targeting implicit bias and legal representation access are needed.

These findings can inform statewide efforts to expand effective, equitable diversion and reduce unnecessary formal court processing of Illinois youth.[^6]

## References

[^1]: Illinois Juvenile Justice Leadership Council. (2024). *Annual report on the state of juvenile justice in Illinois*. IJJLC. https://ijjlc.org

[^2]: Petitclerc, A., Gatti, U., Vitaro, F., & Tremblay, R. E. (2021). Effects of juvenile court exposure on crime in young adulthood. *Journal of Child Psychology and Psychiatry, 54*(3), 291–297.

[^3]: Illinois Juvenile Justice Commission. (2022). *Diversion in Illinois: A landscape analysis of practice and policy across judicial circuits*. Illinois Juvenile Justice Commission. https://ijjc.illinois.gov

[^4]: Schwalbe, C. S., Gearing, R. E., MacKenzie, M. J., Brewer, K. B., & Ibrahim, R. (2020). A meta-analysis of experimental studies of diversion programs for juvenile offenders. *Clinical Psychology Review, 32*(1), 26–33.

[^5]: Mendel, R. A. (2023). *Juvenile diversion: Framing issues, local programs and national reform*. The Annie E. Casey Foundation. https://www.aecf.org

[^6]: Lipsey, M. W., & Howell, J. C. (2022). A practical approach to identifying, assessing, and selecting interventions for juvenile justice programs. *Federal Probation, 76*(3), 22–29.
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
    funding: 'This project was supported by Grant No. 2024-IL-BX-0042 awarded by the Bureau of Justice Statistics, Office of Justice Programs, U.S. Department of Justice. The opinions, findings, and conclusions or recommendations expressed in this publication are those of the authors and do not necessarily reflect those of the Department of Justice.',
    hideFromBanner: false,
    external: false,
    publishedAt: null,
    apps: [],
    datasets: [],
  }
}
