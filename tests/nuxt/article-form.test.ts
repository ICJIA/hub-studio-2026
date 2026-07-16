// @vitest-environment nuxt
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { Article } from '~/types/content'
import { saveSnapshot, loadSnapshot } from '~/lib/draft-backup'
import { blankArticle } from '~/lib/forms/blank-models'

const createMock = vi.fn(async (m: Article): Promise<Article> => ({ ...m, documentId: 'newdoc1' }))
const updateMock = vi.fn(async (_id: string, m: Article): Promise<Article> => m)
mockNuxtImport('useArticles', () => () => ({
  list: vi.fn(), findOne: vi.fn(), create: createMock, update: updateMock, remove: vi.fn(),
  publish: vi.fn(), unpublish: vi.fn(),
}))
// MediaField → MediaPicker → useUpload; stub so mounting the form hits no network.
mockNuxtImport('useUpload', () => () => ({ upload: vi.fn(), browse: vi.fn().mockResolvedValue([]), remove: vi.fn() }))
// Toolbar Publish/Unpublish is manager-gated (canPublish). Toggle it per-test; PublishButton is
// ALSO canPublish-gated internally, so it reads the same mocked composable.
const canPublish = ref(false)
mockNuxtImport('useAuth', () => () => ({
  user: computed(() => ({ email: 'm@example.com' })),
  canPublish, isLoggedIn: computed(() => true), logout: vi.fn(),
}))

import ArticleForm from '~/components/forms/ArticleForm.vue'

describe('ArticleForm (save-gate + repo wiring)', () => {
  beforeEach(() => { createMock.mockClear(); updateMock.mockClear() })

  it('blocks create when the model is invalid (no title) — repo.create NOT called', async () => {
    const wrapper = await mountSuspended(ArticleForm, { props: { mode: 'create' } })
    await wrapper.vm.$.exposed!.submit() // blank model: missing title/slug/date
    expect(createMock).not.toHaveBeenCalled()
    expect(wrapper.vm.$.exposed!.errors.value.length).toBeGreaterThan(0)
  })

  it('blocks create when markdown contains base64 — the zero-base64 save-gate', async () => {
    const wrapper = await mountSuspended(ArticleForm, { props: { mode: 'create' } })
    wrapper.vm.$.exposed!.setField('title', 'Crime In Illinois')
    wrapper.vm.$.exposed!.setField('date', '2020-01-01')
    wrapper.vm.$.exposed!.setField('markdown', '![x](data:image/png;base64,AAAA)')
    await wrapper.vm.$.exposed!.submit()
    expect(createMock).not.toHaveBeenCalled()
    expect(wrapper.vm.$.exposed!.errors.value.some((e: { field: string }) => e.field === 'markdown')).toBe(true)
  })

  it('blocks create when images contain base64 — the zero-base64 save-gate for images', async () => {
    const wrapper = await mountSuspended(ArticleForm, { props: { mode: 'create' } })
    wrapper.vm.$.exposed!.setField('title', 'Crime In Illinois')
    wrapper.vm.$.exposed!.setField('date', '2020-01-01')
    wrapper.vm.$.exposed!.setField('images', [{ title: 'Fig 1', src: 'data:image/png;base64,AAAA', alt: 'x' }])
    await wrapper.vm.$.exposed!.submit()
    expect(createMock).not.toHaveBeenCalled()
    expect(wrapper.vm.$.exposed!.errors.value.some((e: { field: string }) => e.field === 'images')).toBe(true)
  })

  it('on a clean create, slugifies the title and calls repo.create once', async () => {
    const wrapper = await mountSuspended(ArticleForm, { props: { mode: 'create' } })
    wrapper.vm.$.exposed!.setField('title', 'Crime In Illinois')
    wrapper.vm.$.exposed!.setField('date', '2020-01-01')
    await wrapper.vm.$.exposed!.submit()
    await new Promise((r) => setTimeout(r, 0))
    expect(createMock).toHaveBeenCalledOnce()
    const call = createMock.mock.calls[0]
    expect(call![0].slug).toBe('crime-in-illinois')
  })

  it('renders the full field set (not just the Markdown body)', async () => {
    const wrapper = await mountSuspended(ArticleForm, { props: { mode: 'create' } })
    const text = wrapper.text()
    for (const label of ['Title', 'Date', 'Categories', 'Tags', 'Authors', 'Abstract', 'Splash image', 'Body']) {
      expect(text).toContain(label)
    }
  })
})

describe('ArticleForm sticky toolbar (title + live preview + manager publish gate)', () => {
  beforeEach(() => { canPublish.value = false })

  // A saved (edit-mode) article: has a documentId, still a draft (publishedAt null).
  const saved = (): Article => ({
    documentId: 'doc-1', title: 'Crime In Illinois', slug: 'crime-in-illinois', date: '2020-01-01',
    publishedAt: null, categories: [], tags: [], authors: [], abstract: null, markdown: '',
    images: [], apps: [], datasets: [],
  } as unknown as Article)

  it('shows the live title (and "Untitled article" when empty), plus a Live preview button', async () => {
    const wrapper = await mountSuspended(ArticleForm, { props: { mode: 'create' } })
    expect(wrapper.text()).toContain('Untitled article')
    expect(wrapper.text()).toContain('Live preview')

    wrapper.vm.$.exposed!.setField('title', 'My New Article')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('My New Article')
  })

  // The toolbar's PublishButton renders the capitalised label "Publish" (a draft) — the bottom
  // "Preview as published" uses lowercase "published", so a capital-P `toContain('Publish')`
  // discriminates the toolbar control cleanly.
  it('shows NO Publish control (and no save-first hint) for a non-manager on a saved article — default-deny', async () => {
    canPublish.value = false
    const wrapper = await mountSuspended(ArticleForm, { props: { mode: 'edit', initial: saved() } })
    expect(wrapper.text()).toContain('Live preview')
    // PublishButton is default-deny: an author sees no capital-P "Publish" toolbar control at all …
    expect(wrapper.text()).not.toContain('Publish')
    // … and no "save first" hint either (that's an editor-only affordance).
    expect(wrapper.text()).not.toContain('Save the draft first')
  })

  it('shows Publish for a manager on a SAVED article (edit mode, has documentId)', async () => {
    canPublish.value = true
    const wrapper = await mountSuspended(ArticleForm, { props: { mode: 'edit', initial: saved() } })
    expect(wrapper.text()).toContain('Publish')
  })

  it('does NOT show Publish for a manager on an UNSAVED article (create mode) — shows a save-first hint', async () => {
    canPublish.value = true
    const wrapper = await mountSuspended(ArticleForm, { props: { mode: 'create' } })
    // The PublishButton (which would render the capital-P "Publish") is hidden; the hint stands in.
    expect(wrapper.text()).not.toContain('Publish')
    expect(wrapper.text()).toContain('Save the draft first')
  })
})

describe('unsaved-work guard integration', () => {
  beforeEach(() => localStorage.clear())

  // This file has no top-level `sampleInitial` fixture (the sticky-toolbar describe above has
  // its own local `saved()`); built the same way as that fixture and as
  // form-preview-links.test.ts's `saved` const — blankArticle() spread with just enough
  // (title/slug/date) to clear validateArticle, so submit() reaches persist without extra
  // setField calls. documentId is overridden per-use, same shape as the brief's template.
  const sampleInitial: Article = {
    ...blankArticle(),
    title: 'Crime In Illinois',
    slug: 'crime-in-illinois',
    date: '2020-01-01',
  }

  it('shows the restore banner when a snapshot exists for this draft, and Restore applies it', async () => {
    saveSnapshot('article', 'a1', { ...blankArticle(), title: 'Recovered title' }, '2026-07-16T09:00:00.000Z')
    const wrapper = await mountSuspended(ArticleForm, { props: { mode: 'edit', initial: { ...sampleInitial, documentId: 'a1' } } })
    expect(wrapper.find('[data-test="draft-restore-banner"]').exists()).toBe(true)
    await wrapper.find('[data-test="draft-restore"]').trigger('click')
    const title = wrapper.find('input') // the Title field is the form's first text input
    expect((title.element as HTMLInputElement).value).toBe('Recovered title')
    wrapper.unmount()
  })

  it('shows no banner without a snapshot', async () => {
    const wrapper = await mountSuspended(ArticleForm, { props: { mode: 'edit', initial: { ...sampleInitial, documentId: 'a1' } } })
    expect(wrapper.find('[data-test="draft-restore-banner"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('a successful save clears the snapshot (clear-on-save invariant)', async () => {
    saveSnapshot('article', 'a1', { ...blankArticle(), title: 'Old backup' }, '2026-07-16T09:00:00.000Z')
    const wrapper = await mountSuspended(ArticleForm, { props: { mode: 'edit', initial: { ...sampleInitial, documentId: 'a1' } } })
    await wrapper.vm.$.exposed!.submit()
    await new Promise((r) => setTimeout(r, 0))
    expect(loadSnapshot('article', 'a1')).toBeNull()
    wrapper.unmount()
  })
})
