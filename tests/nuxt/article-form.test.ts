// @vitest-environment nuxt
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { Article } from '~/types/content'
import { saveSnapshot, loadSnapshot } from '~/lib/draft-backup'
import { blankArticle } from '~/lib/forms/blank-models'

const createMock = vi.fn(async (m: Article): Promise<Article> => ({ ...m, documentId: 'newdoc1' }))
const updateMock = vi.fn(async (_id: string, m: Article): Promise<Article> => m)
// Edit-conflict primitives (Task 3). Default to "no conflict" (getUpdatedAt → null; hasConflict
// fails open on a missing stamp) and a same-shape refetch, so every PRE-EXISTING edit-mode save
// test below — none of which anticipate the new save-time check — keeps passing unchanged. The
// dedicated 'edit-conflict save-flow' describe block overrides both with mockResolvedValueOnce
// per test.
const getUpdatedAtMock = vi.fn(async (): Promise<string | null> => null)
const findOneMock = vi.fn(async (id: string): Promise<Article> => ({ ...blankArticle(), documentId: id }))
mockNuxtImport('useArticles', () => () => ({
  list: vi.fn(), findOne: findOneMock, create: createMock, update: updateMock, remove: vi.fn(),
  publish: vi.fn(), unpublish: vi.fn(), getUpdatedAt: getUpdatedAtMock,
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

// The save-time edit-conflict check (design §1-2; ArticleForm is the reference integration Task
// 4 copies for App/Dataset). getUpdatedAtMock/findOneMock default to "no conflict" / a same-shape
// refetch (declared at module scope above) so every describe block ABOVE this one — none of which
// anticipate the check — needed no changes beyond that shared default. Each test below overrides
// with mockResolvedValueOnce as needed.
describe('edit-conflict save-flow', () => {
  beforeEach(() => {
    localStorage.clear()
    createMock.mockClear(); updateMock.mockClear(); getUpdatedAtMock.mockClear(); findOneMock.mockClear()
  })

  // A saved (edit-mode) article WITH a loaded updatedAt stamp — the save-time check compares
  // against this. documentId 'c1' keeps this block's snapshot key distinct from the 'a1'/'doc-1'
  // fixtures used elsewhere in this file (localStorage is shared across tests in this file).
  const loaded: Article = {
    ...blankArticle(),
    documentId: 'c1', title: 'Crime In Illinois', slug: 'crime-in-illinois', date: '2020-01-01',
    updatedAt: '2026-07-16T09:00:00.000Z',
  }

  it('no-conflict edit save proceeds (getUpdatedAt returns the loaded stamp) and refreshes loadedUpdatedAt from the response', async () => {
    getUpdatedAtMock.mockResolvedValueOnce('2026-07-16T09:00:00.000Z') // == loaded stamp ⇒ no conflict
    updateMock.mockResolvedValueOnce({ ...loaded, updatedAt: '2026-07-16T10:00:00.000Z' })
    const wrapper = await mountSuspended(ArticleForm, { props: { mode: 'edit', initial: loaded } })

    await wrapper.vm.$.exposed!.submit()
    await new Promise((r) => setTimeout(r, 0))

    expect(getUpdatedAtMock).toHaveBeenCalledWith('c1')
    expect(updateMock).toHaveBeenCalledOnce()
    expect(wrapper.vm.$.exposed!.loadedUpdatedAt.value).toBe('2026-07-16T10:00:00.000Z')
    wrapper.unmount()
  })

  it('a conflicted save aborts: persist is never called, no validate errors shown, and the banner shows their save time', async () => {
    const theirAt = '2026-07-16T12:00:00.000Z' // newer than loaded ⇒ conflict
    getUpdatedAtMock.mockResolvedValueOnce(theirAt)
    const wrapper = await mountSuspended(ArticleForm, { props: { mode: 'edit', initial: loaded } })

    await wrapper.vm.$.exposed!.submit()
    await new Promise((r) => setTimeout(r, 0))

    expect(updateMock).not.toHaveBeenCalled()
    expect(wrapper.vm.$.exposed!.errors.value).toHaveLength(0)
    const banner = wrapper.find('[data-test="conflict-banner"]')
    expect(banner.exists()).toBe(true)
    expect(banner.text()).toContain(new Date(theirAt).toLocaleString())
    wrapper.unmount()
  })

  it('Save anyway bypasses the check exactly once, persists exactly once, and clears the conflict banner', async () => {
    getUpdatedAtMock.mockResolvedValueOnce('2026-07-16T12:00:00.000Z') // provoke the conflict first
    const wrapper = await mountSuspended(ArticleForm, { props: { mode: 'edit', initial: loaded } })
    await wrapper.vm.$.exposed!.submit()
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.find('[data-test="conflict-banner"]').exists()).toBe(true)

    await wrapper.find('[data-test="conflict-save-anyway"]').trigger('click')
    await new Promise((r) => setTimeout(r, 0))

    expect(getUpdatedAtMock).toHaveBeenCalledOnce() // NOT re-checked — the bypass skipped it
    expect(updateMock).toHaveBeenCalledOnce()
    expect(wrapper.find('[data-test="conflict-banner"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it("Load their version snapshots the author's edits, replaces the model with the refetched draft, resets dirty, and hands off to the restore banner", async () => {
    getUpdatedAtMock.mockResolvedValueOnce('2026-07-16T12:00:00.000Z')
    const theirVersion: Article = { ...loaded, title: 'Their Refetched Title', updatedAt: '2026-07-16T12:00:00.000Z' }
    findOneMock.mockResolvedValueOnce(theirVersion)
    const wrapper = await mountSuspended(ArticleForm, { props: { mode: 'edit', initial: loaded } })
    wrapper.vm.$.exposed!.setField('title', 'My Unsaved Local Edit')

    await wrapper.vm.$.exposed!.submit()
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.find('[data-test="conflict-banner"]').exists()).toBe(true)

    await wrapper.find('[data-test="conflict-load-theirs"]').trigger('click')
    await new Promise((r) => setTimeout(r, 0))

    // The author's pre-replace edit survives — snapshotNow() ran before the model was replaced.
    expect(loadSnapshot<Article>('article', 'c1')?.model.title).toBe('My Unsaved Local Edit')
    // The model itself is wholesale-replaced with the refetched (their) content.
    const titleInput = wrapper.find('input')
    expect((titleInput.element as HTMLInputElement).value).toBe('Their Refetched Title')
    expect(wrapper.vm.$.exposed!.loadedUpdatedAt.value).toBe('2026-07-16T12:00:00.000Z')
    // resetBaseline (not markSaved) — dirty is false against the fresh model, but the snapshot
    // above survives (asserted separately, it does).
    expect(wrapper.vm.$.exposed!.draftGuard.dirty.value).toBe(false)
    // Conflict banner closes; restore banner appears (the snapshot just written makes it so) —
    // the composition the design doc calls out explicitly.
    expect(wrapper.find('[data-test="conflict-banner"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="draft-restore-banner"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('create mode never calls getUpdatedAt (conflict-free by design — nothing to conflict with yet)', async () => {
    const wrapper = await mountSuspended(ArticleForm, { props: { mode: 'create' } })
    wrapper.vm.$.exposed!.setField('title', 'Crime In Illinois')
    wrapper.vm.$.exposed!.setField('date', '2020-01-01')

    await wrapper.vm.$.exposed!.submit()
    await new Promise((r) => setTimeout(r, 0))

    expect(getUpdatedAtMock).not.toHaveBeenCalled()
    expect(createMock).toHaveBeenCalledOnce()
    wrapper.unmount()
  })
})
