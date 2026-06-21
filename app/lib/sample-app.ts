/**
 * Builds a complete, realistic ICJIA-style app draft for demos — every field populated so an
 * author can one-click a full app entry (and open the published preview) instead of typing it
 * piece by piece. Rotates through several topics.
 *
 * Pure function (only Math.random for variety) — no network, no base64. Image is a hosted url.
 * The image is a DISPLAY-ONLY ref (id 0): it shows in the preview but maps to null on Save
 * (see mediaIdForWrite), so a demo image never sends a bogus media id to Strapi. Passes
 * validateApp() with zero errors.
 */
import type { App, MediaRef } from '~/types/content'
import { blankApp } from '~/lib/forms/blank-models'
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

interface AppTopic {
  title: string
  description: string
  categories: string[]
  tags: string[]
  contributors: { title: string; description: string }[]
  url: string
}

const APP_TOPICS: AppTopic[] = [
  {
    title: 'Illinois Crime Trends Explorer',
    description:
      'An interactive dashboard that visualizes county-level crime trends across Illinois from 2010 to the present. Users can explore Uniform Crime Reporting (UCR) data by offense category, jurisdiction, and year, and download formatted data tables for further analysis.',
    categories: ['crimes', 'law enforcement'],
    tags: ['crime trends', 'Illinois', 'UCR', 'interactive', 'dashboard'],
    contributors: [
      { title: 'Amanda L. Vasquez, MA', description: 'Senior Research Analyst, ICJIA' },
      { title: 'Caleb Schaffner, PhD', description: 'Research Director, ICJIA' },
    ],
    url: 'https://icjia.illinois.gov/apps/crime-trends',
  },
  {
    title: 'Victim Services Program Locator',
    description:
      'A map-based tool that helps survivors and service providers locate publicly funded domestic violence and sexual assault programs across all 102 Illinois counties. Listings include contact information, service hours, and populations served.',
    categories: ['victims'],
    tags: ['victim services', 'domestic violence', 'sexual assault', 'map', 'resource finder'],
    contributors: [
      { title: 'Lucia F. Gonzalez, MA', description: 'Research Analyst, ICJIA' },
    ],
    url: 'https://icjia.illinois.gov/apps/victim-services-locator',
  },
  {
    title: 'Illinois Juvenile Justice Data Hub',
    description:
      'A data hub that aggregates and presents youth justice outcomes — referrals, diversions, adjudications, and commitments — for all Illinois judicial circuits. Designed for practitioners, policymakers, and researchers who need quick access to comparable circuit-level indicators.',
    categories: ['courts', 'corrections'],
    tags: ['juvenile justice', 'diversion', 'courts', 'data hub', 'Illinois'],
    contributors: [
      { title: 'Marcus T. Reedy, JD', description: 'Senior Policy Analyst, ICJIA' },
      { title: 'Priya N. Anand, PhD', description: 'Evaluation Lead, ICJIA' },
    ],
    url: 'https://icjia.illinois.gov/apps/juvenile-justice-hub',
  },
]

export function buildSampleApp(): App {
  const t = pick(APP_TOPICS)
  return {
    ...blankApp(),
    title: t.title,
    slug: slugify(t.title),
    date: pick(['2025-01-15', '2025-03-02', '2024-11-20', '2025-05-09', '2025-02-18']),
    categories: t.categories,
    tags: t.tags,
    contributors: t.contributors,
    // Display-only demo image (id 0 → shown in preview, dropped on Save by mediaIdForWrite).
    image: demoImage(1200, 600, `${t.title} — screenshot`),
    description: t.description,
    url: t.url,
    external: false,
    publishedAt: null,
    datasets: [],
    articles: [],
  }
}
