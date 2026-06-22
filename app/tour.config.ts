// app/tour.config.ts
// Content + shape for the Studio's guided onboarding tour (the `nuxt-guided-tour` module).
//
// WHY this file is split the way it is:
//   - `introSlides`  → the informational, no-spotlight slides shown BEFORE the walkthrough
//     (TourIntro). Pure data.
//   - `buildTourSteps(canPublish)` → the SPOTLIGHT steps, built fresh from the viewer's role so
//     the Publish-queue step is present ONLY for an editor (canPublish). `useTour()` captures
//     `steps` at construction time and never re-reads them, so the role decision MUST happen here,
//     before the config is handed to the composable — not via a reactive filter afterwards.
//   - `tourMeta` / `STUDIO_TOUR_STORAGE_PREFIX` → the versioned first-run-once knobs. The module
//     persists completion under `${storageKeyPrefix}-v${version}`; bump `version` to re-show the
//     tour to everyone after a meaningful content change.
//
// Icons are intentionally `i-lucide-*` (the ONLY icon set bundled into this SPA — see nuxt.config
// `icon.clientBundle`). Heroicons that the module's own components hardcode are added to that
// bundle list so they render offline too; do NOT introduce new heroicons here.
//
// Types are declared LOCALLY (mirroring nuxt-guided-tour's runtime/types) rather than imported: the
// package's `exports` map only exposes its root + `./theme`, so a deep `dist/runtime/types` import
// is unresolvable to TypeScript. These are passed STRUCTURALLY to the module's auto-imported
// `useTour()`, which is structurally compatible. Keep them in sync with the module if it changes.

/** Position of the spotlight popover relative to its target (subset we use). */
type TourPosition = 'top' | 'bottom' | 'left' | 'right'
/** Popover alignment along the position axis. */
type TourAlign = 'start' | 'center' | 'end'

/** One spotlight step. Mirrors nuxt-guided-tour's TourStep (the fields we set). */
export interface TourStep {
  id: string
  /** CSS selector for the target element, e.g. `[data-tour="create"]`. */
  target: string
  title: string
  content: string
  tip?: string
  position?: TourPosition
  align?: TourAlign
  highlight?: boolean
  icon?: string
}

/** One informational intro slide (no spotlight). Mirrors nuxt-guided-tour's IntroSlide. */
export interface IntroSlide {
  title: string
  icon: string
  content: string[]
  footer?: string
}

/** Full tour config handed to useTour(). Mirrors nuxt-guided-tour's TourConfig. */
export interface TourConfig {
  version: number
  autoStart: boolean
  autoStartDelay: number
  storageKeyPrefix: string
  steps: TourStep[]
}

/** localStorage key prefix; the module appends `-v${version}` → e.g. `studio-tour-v1`. */
export const STUDIO_TOUR_STORAGE_PREFIX = 'studio-tour'

/** Tour version. Bump to force the first-run welcome to re-appear for everyone (new key). */
export const STUDIO_TOUR_VERSION = 1

/** Non-step config the driver (layout) needs. Steps are built separately (role-aware). */
export const tourMeta = {
  version: STUDIO_TOUR_VERSION,
  autoStart: true,
  // Small settle delay so the dashboard cards/nav have mounted before the welcome appears.
  autoStartDelay: 600,
  storageKeyPrefix: STUDIO_TOUR_STORAGE_PREFIX,
} as const

/**
 * Informational intro slides (no spotlight) shown before the walkthrough. Brief but accurate —
 * (1) what the Hub is + who it's for, (2) why the body is authored in Markdown.
 */
export const introSlides: IntroSlide[] = [
  {
    title: 'What is the ICJIA Research Hub 2.0?',
    icon: 'i-lucide-library',
    content: [
      'The Research Hub is the Illinois Criminal Justice Information Authority’s public library of '
        + 'research — articles, datasets, and interactive apps on the Illinois criminal justice system.',
      'This Studio is the staff tool for it: ICJIA researchers and editors write content here, preview '
        + 'exactly how it will look once live, and editors publish it to the public Hub.',
    ],
    footer: 'In short: you write and review here; readers see the finished work on the public Hub.',
  },
  {
    title: 'Why Markdown?',
    icon: 'i-lucide-file-text',
    content: [
      'An article’s body is written in Markdown — plain text with a little formatting (headings, '
        + 'links, lists, images). It stays readable, is easy to copy between tools, and never locks your '
        + 'work inside a proprietary format.',
      'The same Markdown you type is what renders into the published article, so the in-Studio preview '
        + 'matches the live page — no surprises between draft and publish.',
    ],
    footer: 'You don’t need to memorize it — the editor and the live preview show your formatting as you go.',
  },
]

/**
 * Build the spotlight steps for the viewer's role.
 *
 * @param canPublish - `useAuth().canPublish` — true for an editor (Publisher), false for an author.
 *   When true, the Publish-queue step is appended; when false it is omitted entirely.
 *
 * Targets are `[data-tour="…"]` selectors that MUST exist on the dashboard (the tour only runs at
 * `/`): the nav role badge + theme toggle + demo banner live in the default layout; Create / Drafts /
 * Publish-queue live in app/pages/index.vue.
 */
export function buildTourSteps(canPublish: boolean): TourStep[] {
  const steps: TourStep[] = [
    {
      id: 'create',
      target: '[data-tour="create"]',
      title: 'Create new content',
      content: 'Start a new article, app, or dataset here. Everything begins as a private draft.',
      icon: 'i-lucide-plus',
      position: 'bottom',
    },
    {
      id: 'drafts',
      target: '[data-tour="drafts"]',
      title: 'Your drafts & content',
      content: 'This list shows your articles, apps, and datasets — open one to keep editing or to preview it.',
      icon: 'i-lucide-file-text',
      position: 'top',
    },
    {
      id: 'role-badge',
      target: '[data-tour="role-badge"]',
      title: 'Your role',
      content: 'This badge shows your role: an Author writes and previews drafts; a Publisher can also publish to the live Hub.',
      icon: 'i-lucide-badge-check',
      position: 'bottom',
    },
    {
      id: 'theme-toggle',
      target: '[data-tour="theme-toggle"]',
      title: 'Light / dark mode',
      content: 'Switch the Studio between light and dark. Your choice is remembered on this device.',
      icon: 'i-lucide-moon',
      position: 'bottom',
      align: 'end',
    },
  ]

  // The demo banner is only mounted in the public demo build; the layout adds `data-tour="demo-banner"`
  // there. Including the step unconditionally is safe (the module simply skips a missing target), and it
  // keeps the tour identical across roles except for the editor-only Publish step below.
  steps.push({
    id: 'demo-banner',
    target: '[data-tour="demo-banner"]',
    title: 'Demo mode',
    content: 'This banner means you’re in the public demo: there’s no real sign-in and nothing you change is saved — it all resets each session.',
    icon: 'i-lucide-info',
    position: 'bottom',
  })

  // EDITORS ONLY: the Publish queue. Authors (canPublish === false) never see this card, so omit
  // the step for them rather than spotlight an element that isn't on their dashboard.
  if (canPublish) {
    steps.push({
      id: 'publish-queue',
      target: '[data-tour="publish-queue"]',
      title: 'Publish queue',
      content: 'As a Publisher you review submitted drafts here and publish them to the public Research Hub.',
      icon: 'i-lucide-send',
      position: 'top',
    })
  }

  return steps
}

/** Assemble the full TourConfig for a role. The layout passes the result to `useTour()`. */
export function buildTourConfig(canPublish: boolean): TourConfig {
  return {
    ...tourMeta,
    steps: buildTourSteps(canPublish),
  }
}
