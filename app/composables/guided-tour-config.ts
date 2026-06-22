// app/composables/guided-tour-config.ts
//
// Content for the in-app guided onboarding tour: the intro slides shown first, then the role-aware
// spotlight steps on the dashboard. Kept as PURE data/helpers (no Nuxt context) so they are unit
// testable and so the layout can build a single tour instance from them.
//
// Icons are lucide names (`i-lucide-*`) — the app bundles lucide with `icon.fallbackToApi:false`
// under a tight CSP, so heroicons would not resolve at runtime. Each icon below is also listed in
// nuxt.config's clientBundle.icons so the static SPA ships them.
import type { IntroSlide, TourStep } from './guided-tour-types'

/** Bump to re-show the tour to everyone (the localStorage key embeds the version). */
export const GUIDED_TOUR_VERSION = 1

/** LocalStorage key prefix; the version is appended → `icjia-studio-tour-v1`. */
export const GUIDED_TOUR_STORAGE_PREFIX = 'icjia-studio-tour'

/** ms before the first-run welcome appears (lets the dashboard paint first). */
export const GUIDED_TOUR_AUTOSTART_DELAY = 700

/**
 * Intro slides: (1) what the Research Hub Studio is, (2) why Markdown.
 * Shown once before the spotlight steps.
 */
export const GUIDED_TOUR_INTRO_SLIDES: IntroSlide[] = [
  {
    title: 'What is the ICJIA Research Hub 2.0?',
    icon: 'i-lucide-compass',
    content: [
      'Welcome to the Research Hub Studio — the authoring tool for the ICJIA Research Hub 2.0. It is where staff write, review, and publish the articles, apps, and datasets that appear on the public Hub.',
      'Everything is organized around a simple flow: create a draft, preview it exactly as it will look published, and (for editors) send it live. This quick tour points out where each of those lives.',
    ],
    benefits: [
      {
        icon: 'i-lucide-pen-line',
        title: 'Write once, structured',
        description: 'Articles are plain text with light formatting — no fragile page builder.',
      },
      {
        icon: 'i-lucide-eye',
        title: 'Preview before you publish',
        description: 'The in-Studio preview matches the live article styling.',
      },
      {
        icon: 'i-lucide-users',
        title: 'Author & editor roles',
        description: 'Authors draft; editors review and publish. The navbar badge shows your role.',
      },
    ],
    footer: 'This is a public demo with sample content — nothing you change here is saved.',
  },
  {
    title: 'Why Markdown?',
    icon: 'i-lucide-file-text',
    content: [
      'Articles are written in Markdown — a tiny, readable set of text conventions for headings, links, lists, and emphasis. You type a little punctuation and it becomes clean, consistent formatting.',
      'Markdown keeps content portable and accessible: the same source renders the same way every time, survives copy-paste, and never traps your work inside a proprietary editor.',
    ],
    examples: [
      { label: 'Heading', syntax: '## Findings', result: 'Findings (H2)' },
      { label: 'Bold', syntax: '**important**', result: 'important' },
      { label: 'Link', syntax: '[ICJIA](https://icjia.illinois.gov)', result: 'ICJIA' },
    ],
    callout: {
      icon: 'i-lucide-lightbulb',
      title: 'You do not have to memorize it',
      text: 'The editor has a toolbar and a live preview — Markdown is just what is saved underneath.',
    },
    footer: 'Next: a quick spotlight tour of the dashboard.',
  },
]

/**
 * Build the dashboard spotlight steps. Role/context-aware:
 *   - the demo-banner step is included only when the banner is actually on screen
 *     (`showDemoBanner` — it is dismissable and absent outside demo mode);
 *   - the Publish-queue step is included ONLY for editors (`canPublish`), matching the dashboard
 *     which renders that card only when canPublish.
 *
 * Targets are `[data-tour="…"]` anchors added to app/pages/index.vue and app/layouts/default.vue.
 * A step whose target is absent is simply skipped at runtime by the composable (it queries the DOM),
 * but we still gate here so a skipped step never appears as an empty spotlight in the count.
 */
export function buildGuidedTourSteps(opts: {
  canPublish: boolean
  showDemoBanner?: boolean
}): TourStep[] {
  const steps: TourStep[] = []

  // Demo banner sits at the very top — show it first when present.
  if (opts.showDemoBanner) {
    steps.push({
      id: 'demo-banner',
      target: '[data-tour="demo-banner"]',
      title: 'You are in the public demo',
      content:
        'This banner means there is no secure login and nothing you change is saved — all content is sample data held in memory and resets each session. Safe to click around freely.',
      icon: 'i-lucide-info',
      position: 'bottom',
    })
  }

  steps.push(
    {
      id: 'create',
      target: '[data-tour="create"]',
      title: 'Create new content',
      content:
        'Start a new article, app, or dataset here. Each opens a focused form with a live preview alongside it.',
      icon: 'i-lucide-plus',
    },
    {
      id: 'drafts',
      target: '[data-tour="drafts"]',
      title: 'The content list',
      content:
        'Browse all articles — published and drafts together — from everyone, not just your own. Switch between articles, apps, and datasets, filter articles by type, and open any item to keep editing or to preview it.',
      icon: 'i-lucide-files',
    },
    {
      id: 'role-badge',
      target: '[data-tour="role-badge"]',
      title: 'Your role',
      content:
        'This chip shows whether you are signed in as an Author (drafts & previews) or an Editor (also publishes). Click it any time for a plain-language summary of what your role can do.',
      icon: 'i-lucide-id-card',
    },
    {
      id: 'theme-toggle',
      target: '[data-tour="theme-toggle"]',
      title: 'Light / dark mode',
      content:
        'Toggle between light and dark themes. Your choice is remembered on this device for next time.',
      icon: 'i-lucide-moon',
    },
  )

  // EDITORS ONLY: the Publish queue (gated on canPublish, exactly like the dashboard card).
  if (opts.canPublish) {
    steps.push({
      id: 'publish-queue',
      target: '[data-tour="publish-queue"]',
      title: 'Publish queue',
      content:
        'As an editor, review submitted drafts here and publish them to the live Research Hub. Authors do not see this — it is the editor-only step of the tour.',
      icon: 'i-lucide-send',
    })
  }

  return steps
}
