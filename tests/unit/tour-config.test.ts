import { describe, it, expect } from 'vitest'
import {
  buildTourSteps,
  buildTourConfig,
  introSlides,
  tourMeta,
  STUDIO_TOUR_STORAGE_PREFIX,
  STUDIO_TOUR_VERSION,
} from '~/tour.config'

// The guided-tour content is built role-aware BEFORE it's handed to the module's useTour()
// (which snapshots `steps`). These tests pin that build logic: the Publish-queue step is
// editor-only, the always-on UI steps are present for both roles, and the first-run-once knobs
// are stable.
describe('guided tour config (buildTourSteps / buildTourConfig)', () => {
  it('omits the Publish-queue step for an author (canPublish === false)', () => {
    const ids = buildTourSteps(false).map((s) => s.id)
    expect(ids).not.toContain('publish-queue')
  })

  it('includes the Publish-queue step for an editor (canPublish === true)', () => {
    const ids = buildTourSteps(true).map((s) => s.id)
    expect(ids).toContain('publish-queue')
    // …and it is the LAST step (appended after the shared UI steps).
    expect(ids[ids.length - 1]).toBe('publish-queue')
  })

  it('an editor gets exactly one more step than an author — only the queue differs', () => {
    const author = buildTourSteps(false).map((s) => s.id)
    const editor = buildTourSteps(true).map((s) => s.id)
    expect(editor).toHaveLength(author.length + 1)
    // The author's steps are a prefix of the editor's (same shared steps, same order).
    expect(editor.slice(0, author.length)).toEqual(author)
  })

  it('spotlights the required dashboard elements for both roles', () => {
    for (const canPublish of [false, true]) {
      const ids = buildTourSteps(canPublish).map((s) => s.id)
      // Create, Drafts, role badge, theme toggle, demo banner — always present.
      expect(ids).toEqual(
        expect.arrayContaining(['create', 'drafts', 'role-badge', 'theme-toggle', 'demo-banner']),
      )
    }
  })

  it('every step targets a [data-tour="…"] selector and has title + content', () => {
    for (const step of buildTourSteps(true)) {
      expect(step.target).toMatch(/^\[data-tour="[a-z-]+"\]$/)
      // The selector id matches the step id (anchors live on the matching elements).
      expect(step.target).toBe(`[data-tour="${step.id}"]`)
      expect(step.title.length).toBeGreaterThan(0)
      expect(step.content.length).toBeGreaterThan(0)
    }
  })

  it('ships the two informational intro slides (Hub overview + Why Markdown)', () => {
    expect(introSlides).toHaveLength(2)
    expect(introSlides[0]!.title).toMatch(/Research Hub/i)
    expect(introSlides[1]!.title).toMatch(/Markdown/i)
    // Intro slides are informational — they carry prose content, no spotlight target.
    for (const slide of introSlides) {
      expect(Array.isArray(slide.content)).toBe(true)
      expect(slide.content.length).toBeGreaterThan(0)
      expect(slide).not.toHaveProperty('target')
    }
  })

  it('buildTourConfig wires the role steps onto the versioned first-run-once meta', () => {
    const cfg = buildTourConfig(false)
    expect(cfg.autoStart).toBe(true)
    expect(cfg.version).toBe(STUDIO_TOUR_VERSION)
    expect(cfg.storageKeyPrefix).toBe(STUDIO_TOUR_STORAGE_PREFIX)
    expect(cfg.steps.map((s) => s.id)).toEqual(buildTourSteps(false).map((s) => s.id))
    // The module persists completion under `${prefix}-v${version}` (the once-only key).
    expect(`${cfg.storageKeyPrefix}-v${cfg.version}`).toBe('studio-tour-v1')
  })

  it('keeps the first-run-once meta stable (autoStart on, sane delay)', () => {
    expect(tourMeta.autoStart).toBe(true)
    expect(tourMeta.autoStartDelay).toBeGreaterThan(0)
    expect(tourMeta.storageKeyPrefix).toBe('studio-tour')
    expect(tourMeta.version).toBe(1)
  })
})
