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

/** A promise whose resolution is controlled externally — for exercising in-flight request races
 *  (content-list.test.ts precedent: its stale-response-guard describe uses the same helper). */
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => { resolve = r })
  return { promise, resolve }
}

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

  // Fix round 1 (Critical, reviewer-found): ConflictBanner stays mounted across loadTheirs()'s
  // own findOne await (by design — a failed fetch should be retryable from the same prompt), so
  // WITHOUT a guard, its Save-anyway button is still clickable during that window. An impatient
  // click there would bypass the conflict check (bypassConflictOnce) and persist the STALE
  // pre-replace model — then, if the persist wins the race, its success path calls markSaved(),
  // which clears the very snapshot snapshotNow() just wrote to protect the author's edits. That's
  // the silent-overwrite-plus-lost-backup outcome this whole feature exists to prevent.
  it("CRITICAL: an impatient Save-anyway click while Load-theirs is still fetching does not persist the stale model, and the author's snapshot survives", async () => {
    getUpdatedAtMock.mockResolvedValueOnce('2026-07-16T12:00:00.000Z') // provoke the conflict
    const slow = deferred<Article>()
    findOneMock.mockReturnValueOnce(slow.promise) // Load-theirs' fetch — held open on purpose
    const wrapper = await mountSuspended(ArticleForm, { props: { mode: 'edit', initial: loaded } })
    wrapper.vm.$.exposed!.setField('title', 'My Unsaved Local Edit')

    await wrapper.vm.$.exposed!.submit()
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.find('[data-test="conflict-banner"]').exists()).toBe(true)

    // Click Load-theirs: snapshotNow() fires synchronously; the refetch is now in flight and
    // deliberately never resolves until this test says so.
    await wrapper.find('[data-test="conflict-load-theirs"]').trigger('click')
    await new Promise((r) => setTimeout(r, 0))
    expect(loadSnapshot<Article>('article', 'c1')?.model.title).toBe('My Unsaved Local Edit')

    // Impatient click on Save-anyway WHILE the fetch above is still pending.
    await wrapper.find('[data-test="conflict-save-anyway"]').trigger('click')
    await new Promise((r) => setTimeout(r, 0))

    expect(updateMock).not.toHaveBeenCalled() // must NOT persist the stale pre-replace model
    // The snapshot Load-theirs just wrote must survive — a stray markSaved() would clear it.
    expect(loadSnapshot<Article>('article', 'c1')?.model.title).toBe('My Unsaved Local Edit')

    // Let the held-open fetch resolve and confirm Load-theirs still completes cleanly afterward.
    slow.resolve({ ...loaded, title: 'Their Refetched Title', updatedAt: '2026-07-16T12:00:00.000Z' })
    await new Promise((r) => setTimeout(r, 0))
    const titleInput = wrapper.find('input')
    expect((titleInput.element as HTMLInputElement).value).toBe('Their Refetched Title')
    expect(wrapper.find('[data-test="conflict-banner"]').exists()).toBe(false)
    wrapper.unmount()
  })

  // The DOM-level test above goes through ConflictBanner's `busy`-disabled button, which alone
  // is enough to stop a `.trigger('click')` from reaching saveAnyway() at all — verified by hand
  // (temporarily strip just the two `if (saving.value) return` guards and this suite still
  // passes on the `busy` disable alone). That leaves the OTHER fix — the guards themselves,
  // explicitly asked for to cover "every entry point, present and future," not only this one
  // button — unverified by that test alone. This one calls the exposed saveAnyway() directly,
  // bypassing the DOM/disabled attribute entirely, to prove the guard holds on its own.
  it('the saving-guard alone (independent of any disabled DOM button) blocks a direct saveAnyway() call while Load-theirs is in flight', async () => {
    getUpdatedAtMock.mockResolvedValueOnce('2026-07-16T12:00:00.000Z')
    const slow = deferred<Article>()
    findOneMock.mockReturnValueOnce(slow.promise)
    const wrapper = await mountSuspended(ArticleForm, { props: { mode: 'edit', initial: loaded } })
    wrapper.vm.$.exposed!.setField('title', 'My Unsaved Local Edit')

    await wrapper.vm.$.exposed!.submit()
    await new Promise((r) => setTimeout(r, 0))
    await wrapper.find('[data-test="conflict-load-theirs"]').trigger('click')
    await new Promise((r) => setTimeout(r, 0))
    expect(loadSnapshot<Article>('article', 'c1')?.model.title).toBe('My Unsaved Local Edit')

    // Direct call — no DOM, no disabled attribute involved.
    wrapper.vm.$.exposed!.saveAnyway()
    await new Promise((r) => setTimeout(r, 0))

    expect(updateMock).not.toHaveBeenCalled()
    expect(loadSnapshot<Article>('article', 'c1')?.model.title).toBe('My Unsaved Local Edit')
    // A blocked call must be a TRUE no-op, not just short of persisting: without saveAnyway()'s
    // OWN guard (relying only on submit()'s), it would still have cleared conflictTheirAt before
    // handing off to submit() — closing the banner on a click that actually did nothing, and
    // leaving bypassConflictOnce stuck armed (submit() bails before its finally resets it) to
    // silently skip the NEXT legitimate save's conflict check. The banner must still be up.
    expect(wrapper.find('[data-test="conflict-banner"]').exists()).toBe(true)

    slow.resolve({ ...loaded, title: 'Their Refetched Title', updatedAt: '2026-07-16T12:00:00.000Z' })
    await new Promise((r) => setTimeout(r, 0))
    wrapper.unmount()
  })

  // Final-review fix round 1 (Critical, mirror of the Load-theirs/Save-anyway race above): the
  // SAME mid-flight window — loadTheirs()'s snapshotNow() flips draftGuard.restoreAvailable
  // true (mounting DraftRestoreBanner) BEFORE its own findOne() await settles — also exposes
  // the OTHER banner's Restore button. Pre-fix, DraftRestoreBanner had no `busy` prop and
  // @restore was wired straight to draftGuard.restore(): an impatient click there runs the raw
  // restore(), which clears the very snapshot snapshotNow() just wrote to protect the author's
  // pre-replace edits — even though loadTheirs()'s own Object.assign(model, fresh) then
  // overwrites whatever restore() put in model anyway, so the visible symptom is a silently
  // vanished local backup, not a wrong final model.
  it("CRITICAL: an impatient Restore click while Load-theirs is still fetching does not clear the author's snapshot, and the model still ends up as theirs", async () => {
    getUpdatedAtMock.mockResolvedValueOnce('2026-07-16T12:00:00.000Z') // provoke the conflict
    const slow = deferred<Article>()
    findOneMock.mockReturnValueOnce(slow.promise) // Load-theirs' fetch — held open on purpose
    const wrapper = await mountSuspended(ArticleForm, { props: { mode: 'edit', initial: loaded } })
    wrapper.vm.$.exposed!.setField('title', 'My Unsaved Local Edit')

    await wrapper.vm.$.exposed!.submit()
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.find('[data-test="conflict-banner"]').exists()).toBe(true)

    // Click Load-theirs: snapshotNow() fires synchronously — DraftRestoreBanner mounts on the
    // very same tick, before the refetch (held open) resolves.
    await wrapper.find('[data-test="conflict-load-theirs"]').trigger('click')
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.find('[data-test="draft-restore-banner"]').exists()).toBe(true)
    expect(loadSnapshot<Article>('article', 'c1')?.model.title).toBe('My Unsaved Local Edit')

    // Impatient click on Restore WHILE the fetch above is still pending.
    await wrapper.find('[data-test="draft-restore"]').trigger('click')
    await new Promise((r) => setTimeout(r, 0))

    // The snapshot Load-theirs just wrote must survive — a stray restore() would clear it.
    expect(loadSnapshot<Article>('article', 'c1')?.model.title).toBe('My Unsaved Local Edit')

    // Let the held-open fetch resolve; Load-theirs still completes cleanly afterward.
    slow.resolve({ ...loaded, title: 'Their Refetched Title', updatedAt: '2026-07-16T12:00:00.000Z' })
    await new Promise((r) => setTimeout(r, 0))
    const titleInput = wrapper.find('input')
    expect((titleInput.element as HTMLInputElement).value).toBe('Their Refetched Title')
    wrapper.unmount()
  })

  // Final-review fix round 1 (Finding 4→2): restoring a snapshot must reseed loadedUpdatedAt to
  // the SNAPSHOT's own embedded stamp, not leave it at the page's load-time stamp. Otherwise the
  // ROADMAP's "cross-machine stale-restore risk is now mitigated by edit-conflict detection"
  // claim is false: a same-session restore of an old snapshot would compare the next save
  // against the (unchanged) load-time stamp and see no conflict, even though the restored
  // CONTENT is older than what the page originally loaded.
  it('restoring an older snapshot reseeds loadedUpdatedAt to the snapshot\'s own stamp, so a subsequent save trips the conflict check (ROADMAP mitigation)', async () => {
    const olderSnapshotModel: Article = {
      ...loaded, title: 'Recovered from yesterday', updatedAt: '2026-07-15T09:00:00.000Z',
    }
    saveSnapshot('article', 'c1', olderSnapshotModel, '2026-07-15T09:05:00.000Z')
    const wrapper = await mountSuspended(ArticleForm, { props: { mode: 'edit', initial: loaded } })
    expect(wrapper.vm.$.exposed!.loadedUpdatedAt.value).toBe(loaded.updatedAt) // fresh-load stamp

    await wrapper.find('[data-test="draft-restore"]').trigger('click')
    // Reseeded to the RESTORED snapshot's own stamp, not the (newer) page-load stamp.
    expect(wrapper.vm.$.exposed!.loadedUpdatedAt.value).toBe('2026-07-15T09:00:00.000Z')

    // The server hasn't moved again since this page loaded — getUpdatedAt returns the SAME
    // stamp the page originally loaded with, not a "new" one.
    getUpdatedAtMock.mockResolvedValueOnce(loaded.updatedAt ?? null)
    await wrapper.vm.$.exposed!.submit()
    await new Promise((r) => setTimeout(r, 0))

    // Even so, the check correctly fires: loadedUpdatedAt now reflects the STALER restored
    // content, which could be missing changes made between the snapshot's time and now.
    expect(updateMock).not.toHaveBeenCalled()
    expect(wrapper.find('[data-test="conflict-banner"]').exists()).toBe(true)
    wrapper.unmount()
  })

  // Final-review fix round 1 (Finding 2): publish/unpublish bumps the server's updatedAt (both
  // live Strapi and the demo repo — see demo-repository.ts's publish/unpublish). Without this,
  // ArticleForm's remembered loadedUpdatedAt goes stale the moment a publish succeeds, and the
  // VERY NEXT save falsely reports "changed by someone else" against the author's own publish.
  it('publish then edit-save proceeds without a false conflict banner (loadedUpdatedAt refreshes from the publish response)', async () => {
    const wrapper = await mountSuspended(ArticleForm, { props: { mode: 'edit', initial: loaded } })
    const publishedEntity: Article = {
      ...loaded, publishedAt: '2026-07-16T11:00:00.000Z', updatedAt: '2026-07-16T11:00:00.000Z',
    }
    wrapper.vm.$.exposed!.onPublished(publishedEntity)
    expect(wrapper.vm.$.exposed!.loadedUpdatedAt.value).toBe('2026-07-16T11:00:00.000Z')

    wrapper.vm.$.exposed!.setField('title', 'Edited After Publish')
    getUpdatedAtMock.mockResolvedValueOnce('2026-07-16T11:00:00.000Z') // == what publish just set
    await wrapper.vm.$.exposed!.submit()
    await new Promise((r) => setTimeout(r, 0))

    expect(wrapper.find('[data-test="conflict-banner"]').exists()).toBe(false)
    expect(updateMock).toHaveBeenCalledOnce()
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
