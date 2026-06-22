import { describe, it, expect } from 'vitest'
import {
  GUIDED_TOUR_VERSION,
  GUIDED_TOUR_STORAGE_PREFIX,
  GUIDED_TOUR_INTRO_SLIDES,
  buildGuidedTourSteps,
} from '~/composables/guided-tour-config'

// The guided onboarding tour content is pure data, so it can be asserted without a Nuxt context.
// The two role/context gates are the load-bearing behaviour: the Publish-queue step is EDITORS
// ONLY (canPublish), and the demo-banner step appears only when the banner is on screen.
describe('guided-tour-config', () => {
  it('has a stable version + storage prefix (the localStorage key embeds the version)', () => {
    expect(GUIDED_TOUR_VERSION).toBe(1)
    expect(GUIDED_TOUR_STORAGE_PREFIX).toBe('icjia-studio-tour')
  })

  it('intro slides cover (1) what the Hub is and (2) why Markdown', () => {
    expect(GUIDED_TOUR_INTRO_SLIDES).toHaveLength(2)
    expect(GUIDED_TOUR_INTRO_SLIDES[0]?.title).toMatch(/ICJIA Research Hub 2\.0/i)
    expect(GUIDED_TOUR_INTRO_SLIDES[1]?.title).toMatch(/why markdown/i)
    // Every slide needs a title, an icon, and at least one paragraph of content.
    for (const slide of GUIDED_TOUR_INTRO_SLIDES) {
      expect(slide.title.length).toBeGreaterThan(0)
      expect(slide.icon).toMatch(/^i-lucide-/)
      expect(slide.content.length).toBeGreaterThan(0)
    }
  })

  it('every step targets a [data-tour] anchor, has a title/content, and a bundled lucide icon', () => {
    const steps = buildGuidedTourSteps({ canPublish: true, showDemoBanner: true })
    for (const step of steps) {
      expect(step.target).toMatch(/^\[data-tour="[a-z-]+"\]$/)
      expect(step.title.length).toBeGreaterThan(0)
      expect(step.content.length).toBeGreaterThan(0)
      expect(step.icon).toMatch(/^i-lucide-/)
    }
  })

  it('AUTHOR (canPublish false) does NOT get the Publish-queue step', () => {
    const ids = buildGuidedTourSteps({ canPublish: false }).map((s) => s.id)
    expect(ids).toContain('create')
    expect(ids).toContain('drafts')
    expect(ids).toContain('role-badge')
    expect(ids).toContain('theme-toggle')
    expect(ids).not.toContain('publish-queue')
  })

  it('EDITOR (canPublish true) DOES get the Publish-queue step', () => {
    const ids = buildGuidedTourSteps({ canPublish: true }).map((s) => s.id)
    expect(ids).toContain('publish-queue')
  })

  it('the demo-banner step appears only when the banner is on screen', () => {
    const withBanner = buildGuidedTourSteps({ canPublish: false, showDemoBanner: true }).map(
      (s) => s.id,
    )
    const withoutBanner = buildGuidedTourSteps({ canPublish: false, showDemoBanner: false }).map(
      (s) => s.id,
    )
    expect(withBanner).toContain('demo-banner')
    expect(withoutBanner).not.toContain('demo-banner')
    // When shown, it leads (it sits at the top of the page).
    expect(withBanner[0]).toBe('demo-banner')
  })

  it('step ids are unique', () => {
    const ids = buildGuidedTourSteps({ canPublish: true, showDemoBanner: true }).map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
