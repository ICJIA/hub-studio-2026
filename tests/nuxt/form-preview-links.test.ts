// tests/nuxt/form-preview-links.test.ts
// Tab-only preview (user decision 2026-07-05): the editor links to the standalone /preview
// page in a NAMED tab (one preview tab per document, reused on every click) — there is no
// preview modal. Unsaved create-mode disables the button until the first save.
// @vitest-environment nuxt
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import ArticleForm from '~/components/forms/ArticleForm.vue'
import { useAuthStore } from '~/stores/auth'
import { makeDevAdminSession } from '~/lib/dev-auth'
import { blankArticle } from '~/lib/forms/blank-models'
import type { Article } from '~/types/content'

mockNuxtImport('useArticles', () => () => ({
  list: vi.fn(), findOne: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(),
}))

const saved: Article = {
  ...blankArticle(),
  documentId: 'art-42',
  title: 'Saved Draft',
  slug: 'saved-draft',
  date: '2025-12-28',
  markdown: 'The quick brown fox jumps over the lazy dog.',
} as Article

beforeEach(() => { useAuthStore().setSession(makeDevAdminSession('editor')) })

describe('editor → live preview (tab-only)', () => {
  it('edit mode: Live preview links to the review page in a per-document named tab', async () => {
    const wrapper = await mountSuspended(ArticleForm, { props: { mode: 'edit', initial: saved } })
    const link = wrapper.find('[data-test="live-preview-link"]')
    expect(link.exists()).toBe(true)
    expect(link.attributes('href')).toBe('/preview/article/art-42')
    expect(link.attributes('target')).toBe('studio-preview-art-42')
    expect(wrapper.find('[data-test="live-preview-disabled"]').exists()).toBe(false)
  })

  it('every preview link keeps the opener (rel="opener") so the preview tab can close itself', async () => {
    // NuxtLink puts a fallback rel="noopener noreferrer" on ANY link with a target — named
    // tabs included — which nulls window.opener in the preview tab. The preview page reads
    // window.opener to show "Close preview" (close the tab, the editor is where you came
    // from) instead of "Back to editor" (navigate → a SECOND live editor for the draft).
    // Same-origin authed page, so opting back in with rel="opener" is safe.
    const wrapper = await mountSuspended(ArticleForm, { props: { mode: 'edit', initial: saved } })
    const previewLinks = wrapper.findAll('a').filter((a) => a.attributes('href')?.startsWith('/preview/'))
    expect(previewLinks.length).toBe(2) // sticky-bar "Live preview" + footer "Preview as published"
    for (const a of previewLinks) {
      expect(a.attributes('target')).toBe('studio-preview-art-42')
      expect(a.attributes('rel')).toBe('opener')
    }
  })

  it('create mode (unsaved): disabled with a save-first hint — no link, no modal anywhere', async () => {
    const wrapper = await mountSuspended(ArticleForm, { props: { mode: 'create' }, attachTo: document.body })
    const btn = wrapper.find('[data-test="live-preview-disabled"]')
    expect(btn.exists()).toBe(true)
    expect(btn.attributes('title')).toContain('Save the draft first')
    expect(wrapper.find('[data-test="live-preview-link"]').exists()).toBe(false)
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    wrapper.unmount()
  })
})
