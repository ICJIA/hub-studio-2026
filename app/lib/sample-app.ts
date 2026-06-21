/**
 * Builds a complete sample app draft for demos — every field populated so an author can
 * one-click a full app entry (and open the published preview) instead of typing it piece by piece.
 * Rotates through several phony lorem-ipsum topics. ALL content is fabricated; no real people,
 * organizations, or data are referenced.
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
    title: 'Lorem Ipsum Sample Data Explorer',
    description:
      'A sample interactive dashboard that visualizes placeholder data trends from 0000 to the present. Users can explore demonstration data by offense category, jurisdiction, and year, and download formatted placeholder tables for further analysis. This is sample content for demonstration purposes only.',
    categories: ['crimes', 'law enforcement'],
    tags: ['sample', 'demo', 'lorem ipsum', 'placeholder', 'example'],
    contributors: [
      { title: 'Lorem Ipsum, PhD', description: 'is a sample contributor listed for demonstration purposes only' },
      { title: 'Dolor A. Amet, MA', description: 'is a sample contributor listed for demonstration purposes only' },
    ],
    url: 'https://example.com/sample-app/lorem-ipsum-explorer',
  },
  {
    title: 'Placeholder Resource Locator Sample App',
    description:
      'A sample map-based tool that demonstrates how placeholder service providers could be located across fictitious regions. Listings in this demonstration include sample contact information, service hours, and populations served. All data is fabricated for demonstration purposes only.',
    categories: ['victims'],
    tags: ['sample', 'demo', 'lorem ipsum', 'placeholder', 'example'],
    contributors: [
      { title: 'Consectetur Elit, MS', description: 'is a sample contributor listed for demonstration purposes only' },
    ],
    url: 'https://example.com/sample-app/placeholder-locator',
  },
  {
    title: 'Demonstration Data Hub Sample Application',
    description:
      'A sample data hub that demonstrates how placeholder outcomes — referrals, diversions, adjudications, and commitments — could be presented for fictitious sample units. Designed for demonstration purposes only; all data, names, and statistics are entirely fabricated.',
    categories: ['courts', 'corrections'],
    tags: ['sample', 'demo', 'lorem ipsum', 'placeholder', 'example'],
    contributors: [
      { title: 'Vivamus Tincidunt, JD', description: 'is a sample contributor listed for demonstration purposes only' },
      { title: 'Pellentesque Habitant, PhD', description: 'is a sample contributor listed for demonstration purposes only' },
    ],
    url: 'https://example.com/sample-app/demonstration-data-hub',
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
