// tests/nuxt/form-preview-annotations.test.ts
// @vitest-environment nuxt
// Spec Addendum A: the editor's Live-preview modal carries the annotation tools for SAVED
// entries (edit mode + documentId) and a "Review view" link to the shareable /preview page.
// Create mode (no stable documentId to key threads to) shows the plain preview: no tools, no link.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import ArticleForm from '~/components/forms/ArticleForm.vue'

// Pin the annotation store seam to localStorage (the suite's storage fixture): the nuxt test
// env is neither a demo build nor import.meta.dev, so the real isDemoData() would select the
// network-backed Strapi adapter (unit-tested separately in annotations-store-strapi.test.ts).
vi.mock('~/lib/demo', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~/lib/demo')>()),
  isDemoData: () => true,
}))
import { useAuthStore } from '~/stores/auth'
import { makeDevAdminSession } from '~/lib/dev-auth'
import { ANNOTATIONS_STORAGE_PREFIX } from '~/lib/annotations/store-local'
import { blankArticle } from '~/lib/forms/blank-models'
import type { Article } from '~/types/content'

mockNuxtImport('useArticles', () => () => ({
  list: vi.fn(), findOne: vi.fn(), create: vi.fn(),
  update: vi.fn(async (_id: string, m: unknown) => m), // echo back: submit()'s saved entity
  remove: vi.fn(),
}))

// Full valid empty model (RepeatableField etc. need iterable fields) + saved identity.
// slug/date filled so validateArticle passes — the save→preview test drives a real submit().
const saved: Article = {
  ...blankArticle(),
  documentId: 'art-42',
  title: 'Saved Draft',
  slug: 'saved-draft',
  date: '2025-12-28',
  markdown: 'The quick brown fox jumps over the lazy dog.',
} as Article

beforeEach(() => {
  for (let i = window.localStorage.length - 1; i >= 0; i--) {
    const k = window.localStorage.key(i)
    if (k?.startsWith(ANNOTATIONS_STORAGE_PREFIX)) window.localStorage.removeItem(k)
  }
  useAuthStore().setSession(makeDevAdminSession('editor'))
})

async function openPreview(wrapper: Awaited<ReturnType<typeof mountSuspended>>) {
  const trigger = wrapper.findAll('button').find((b: { text: () => string }) => b.text().includes('Live preview'))
  expect(trigger, 'Live preview button present').toBeTruthy()
  await trigger!.trigger('click')
  await new Promise((r) => setTimeout(r, 0))
  await new Promise((r) => setTimeout(r, 0))
}

describe('editor Live-preview modal — annotations (Addendum A)', () => {
  it('edit mode with a saved documentId: modal carries the annotation bar and the Live preview view link', async () => {
    const wrapper = await mountSuspended(ArticleForm, {
      props: { mode: 'edit', initial: saved },
      attachTo: document.body,
    })
    await openPreview(wrapper)
    // Modal content teleports to <body>: assert against the document.
    expect(document.querySelector('[data-test="ann-arm"]'), 'annotation bar in modal').toBeTruthy()
    const review = document.querySelector('[data-test="review-view-link"]') as HTMLAnchorElement | null
    expect(review, 'live preview view link in modal header').toBeTruthy()
    expect(review!.textContent).toContain('Live preview view')
    expect(review!.getAttribute('href')).toBe('/preview/article/art-42')
    expect(review!.getAttribute('target')).toBe('_blank')
    wrapper.unmount()
  })

  it('renders an existing stored thread inside the modal (same store as /preview)', async () => {
    window.localStorage.setItem(`${ANNOTATIONS_STORAGE_PREFIX}:article:art-42`, JSON.stringify([{
      id: 'seed-m1', contentType: 'article', documentId: 'art-42',
      anchor: { exact: 'brown fox', prefix: 'The quick ', suffix: ' jumps', offset: 10 },
      color: 'green', resolved: false, createdAt: '2026-07-04T00:00:00.000Z',
      createdBy: { name: 'Dev Editor', email: 'dev-editor@localhost', roleLabel: 'Editor · demo' },
      comments: [{ id: 'c1', body: 'Modal sees this thread.', authorName: 'Dev Editor', authorEmail: 'dev-editor@localhost', createdAt: '2026-07-04T00:00:00.000Z' }],
    }]))
    const wrapper = await mountSuspended(ArticleForm, {
      props: { mode: 'edit', initial: saved },
      attachTo: document.body,
    })
    await openPreview(wrapper)
    await new Promise((r) => setTimeout(r, 0))
    // The rail starts hidden (user decision 2026-07-05) — open it to see the thread.
    ;(document.querySelector('[data-test="ann-rail-toggle"]') as HTMLButtonElement).click()
    await new Promise((r) => setTimeout(r, 0))
    expect(document.body.textContent).toContain('Modal sees this thread.')
    const mark = document.querySelector('mark[data-ann-id="seed-m1"]')
    expect(mark, 'stored annotation painted in modal').toBeTruthy()
    expect(mark!.textContent).toBe('brown fox')
    wrapper.unmount()
  })

  it('opens fullscreen by default; Restore drops to the centered dialog and Expand returns', async () => {
    const wrapper = await mountSuspended(ArticleForm, {
      props: { mode: 'edit', initial: saved },
      attachTo: document.body,
    })
    await openPreview(wrapper)
    const expand = document.querySelector('[data-test="preview-expand"]') as HTMLButtonElement | null
    expect(expand, 'expand toggle in modal header').toBeTruthy()
    const dialog = () => document.querySelector('[role="dialog"]') as HTMLElement
    // Fullscreen is the default preview experience.
    expect(expand!.getAttribute('aria-label')).toBe('Restore preview size')
    expect(dialog().className).toContain('inset-0')
    expect(dialog().className).not.toContain('max-w-6xl')

    expand!.click()
    await new Promise((r) => setTimeout(r, 0))
    expect(expand!.getAttribute('aria-label')).toBe('Expand preview')
    expect(dialog().className).toContain('max-w-6xl')

    expand!.click()
    await new Promise((r) => setTimeout(r, 0))
    expect(expand!.getAttribute('aria-label')).toBe('Restore preview size')
    expect(dialog().className).toContain('inset-0')
    wrapper.unmount()
  })

  it('saving in edit mode opens the FULLSCREEN preview modal in place (no page navigation)', async () => {
    const wrapper = await mountSuspended(ArticleForm, {
      props: { mode: 'edit', initial: saved },
      attachTo: document.body,
    })
    expect(document.querySelector('[role="dialog"]')).toBeNull() // closed before save
    await (wrapper.vm as unknown as { submit: () => Promise<void> }).submit()
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement | null
    expect(dialog, 'preview modal opened by save').toBeTruthy()
    expect(dialog!.className).toContain('inset-0') // fullscreen
    expect(document.querySelector('[data-test="preview-expand"]')!.getAttribute('aria-label')).toBe('Restore preview size')
    wrapper.unmount()
  })

  it('create mode (unsaved): plain preview — no annotation bar, no Live preview view link', async () => {
    const wrapper = await mountSuspended(ArticleForm, {
      props: { mode: 'create' },
      attachTo: document.body,
    })
    await openPreview(wrapper)
    expect(document.querySelector('[data-test="ann-arm"]')).toBeNull()
    expect(document.querySelector('[data-test="review-view-link"]')).toBeNull()
    wrapper.unmount()
  })
})
