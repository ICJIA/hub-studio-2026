// @vitest-environment nuxt
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { App } from '~/types/content'
import { saveSnapshot, loadSnapshot } from '~/lib/draft-backup'
import { blankApp } from '~/lib/forms/blank-models'

const createMock = vi.fn(async (m: App): Promise<App> => ({ ...m, documentId: 'appdocN' }))
const updateMock = vi.fn(async (_id: string, m: App): Promise<App> => m)
// Edit-conflict primitives (Task 4, mirrors ArticleForm/Task 3). Default to "no conflict"
// (getUpdatedAt → null; hasConflict fails open on a missing stamp) and a same-shape refetch, so
// every describe block below that predates the save-time check keeps passing unchanged. The
// 'edit-conflict save-flow' describe overrides both with mockResolvedValueOnce per test.
const getUpdatedAtMock = vi.fn(async (): Promise<string | null> => null)
const findOneMock = vi.fn(async (id: string): Promise<App> => ({ ...blankApp(), documentId: id }))
mockNuxtImport('useApps', () => () => ({
  list: vi.fn(), findOne: findOneMock, create: createMock, update: updateMock, remove: vi.fn(),
  getUpdatedAt: getUpdatedAtMock,
}))
mockNuxtImport('useUpload', () => () => ({ upload: vi.fn(), browse: vi.fn().mockResolvedValue([]), remove: vi.fn() }))

import AppForm from '~/components/forms/AppForm.vue'

describe('AppForm', () => {
  beforeEach(() => createMock.mockClear())

  it('blocks create with a blank model (title and slug required)', async () => {
    const wrapper = await mountSuspended(AppForm, { props: { mode: 'create' } })
    await wrapper.vm.$.exposed!.submit()
    expect(createMock).not.toHaveBeenCalled()
  })

  it('creates with a slugified slug (title only required — no date)', async () => {
    const wrapper = await mountSuspended(AppForm, { props: { mode: 'create' } })
    wrapper.vm.$.exposed!.setField('title', 'UCR Index Offense Explorer')
    await wrapper.vm.$.exposed!.submit()
    await new Promise((r) => setTimeout(r, 0))
    expect(createMock).toHaveBeenCalledOnce()
    const call = createMock.mock.calls[0]
    expect(call![0].slug).toBe('ucr-index-offense-explorer')
  })

  it('blocks create when description contains base64', async () => {
    const wrapper = await mountSuspended(AppForm, { props: { mode: 'create' } })
    wrapper.vm.$.exposed!.setField('title', 'My App')
    wrapper.vm.$.exposed!.setField('description', 'data:image/png;base64,abc123==')
    await wrapper.vm.$.exposed!.submit()
    expect(createMock).not.toHaveBeenCalled()
    const errs = wrapper.vm.$.exposed!.errors.value
    expect(errs.some((e: { field: string }) => e.field === 'description')).toBe(true)
  })
})

describe('unsaved-work guard integration', () => {
  beforeEach(() => localStorage.clear())

  // Edit-mode fixture: blankApp() spread with just enough (title/slug — validateApp needs no
  // date) to clear validateApp, so submit() reaches persist without extra setField calls.
  // documentId is overridden per-use, same pattern as article-form.test.ts's sampleInitial.
  const sampleInitial: App = {
    ...blankApp(),
    title: 'UCR Index Offense Explorer',
    slug: 'ucr-index-offense-explorer',
  }

  it('shows the restore banner when a snapshot exists for this draft', async () => {
    saveSnapshot('app', 'ap1', { ...blankApp(), title: 'Recovered title' }, '2026-07-16T09:00:00.000Z')
    const wrapper = await mountSuspended(AppForm, { props: { mode: 'edit', initial: { ...sampleInitial, documentId: 'ap1' } } })
    expect(wrapper.find('[data-test="draft-restore-banner"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('shows no banner without a snapshot', async () => {
    const wrapper = await mountSuspended(AppForm, { props: { mode: 'edit', initial: { ...sampleInitial, documentId: 'ap1' } } })
    expect(wrapper.find('[data-test="draft-restore-banner"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('a successful save clears the snapshot (clear-on-save invariant)', async () => {
    saveSnapshot('app', 'ap1', { ...blankApp(), title: 'Old backup' }, '2026-07-16T09:00:00.000Z')
    const wrapper = await mountSuspended(AppForm, { props: { mode: 'edit', initial: { ...sampleInitial, documentId: 'ap1' } } })
    await wrapper.vm.$.exposed!.submit()
    await new Promise((r) => setTimeout(r, 0))
    expect(loadSnapshot('app', 'ap1')).toBeNull()
    wrapper.unmount()
  })
})

// The save-time edit-conflict check (design §1-2; ArticleForm is the reference integration Task
// 4 copies — see article-form.test.ts's 'edit-conflict save-flow' block for the full pattern,
// including the race-condition hardening tests, which are pinned there and not re-proven per
// form). getUpdatedAtMock/findOneMock default to "no conflict" / a same-shape refetch (module
// scope above), so every describe block ABOVE this one needed no changes beyond that default.
describe('edit-conflict save-flow', () => {
  beforeEach(() => {
    localStorage.clear()
    createMock.mockClear(); updateMock.mockClear(); getUpdatedAtMock.mockClear(); findOneMock.mockClear()
  })

  // A saved (edit-mode) app WITH a loaded updatedAt stamp — the save-time check compares against
  // this. documentId 'ap-c1' keeps this block's snapshot key distinct from the 'ap1' fixture the
  // unsaved-work guard block above uses (localStorage is shared across tests in this file).
  const loaded: App = {
    ...blankApp(),
    documentId: 'ap-c1', title: 'UCR Index Offense Explorer', slug: 'ucr-index-offense-explorer',
    updatedAt: '2026-07-16T09:00:00.000Z',
  }

  it('a conflicted save aborts: persist is never called, no validate errors shown, and the banner shows their save time', async () => {
    const theirAt = '2026-07-16T12:00:00.000Z' // newer than loaded ⇒ conflict
    getUpdatedAtMock.mockResolvedValueOnce(theirAt)
    const wrapper = await mountSuspended(AppForm, { props: { mode: 'edit', initial: loaded } })

    await wrapper.vm.$.exposed!.submit()
    await new Promise((r) => setTimeout(r, 0))

    expect(getUpdatedAtMock).toHaveBeenCalledWith('ap-c1')
    expect(updateMock).not.toHaveBeenCalled()
    expect(wrapper.vm.$.exposed!.errors.value).toHaveLength(0)
    const banner = wrapper.find('[data-test="conflict-banner"]')
    expect(banner.exists()).toBe(true)
    expect(banner.text()).toContain(new Date(theirAt).toLocaleString())
    wrapper.unmount()
  })

  it('Save anyway bypasses the check exactly once, persists exactly once, and clears the conflict banner', async () => {
    getUpdatedAtMock.mockResolvedValueOnce('2026-07-16T12:00:00.000Z') // provoke the conflict first
    const wrapper = await mountSuspended(AppForm, { props: { mode: 'edit', initial: loaded } })
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

  // Load-theirs' full composition (snapshot survives → model wholesale-replaced → dirty resets →
  // conflict banner closes → restore banner appears) is already pinned at ArticleForm. This is
  // the one cross-check the task brief asks for, guarding that AppForm wires the same primitives
  // — not a re-proof of the whole flow. DatasetForm's test file relies on this one (task brief:
  // "once total").
  it("Load their version snapshots the author's edits, replaces the model with the refetched draft, and hands off to the restore banner", async () => {
    getUpdatedAtMock.mockResolvedValueOnce('2026-07-16T12:00:00.000Z')
    const theirVersion: App = { ...loaded, title: 'Their Refetched Title', updatedAt: '2026-07-16T12:00:00.000Z' }
    findOneMock.mockResolvedValueOnce(theirVersion)
    const wrapper = await mountSuspended(AppForm, { props: { mode: 'edit', initial: loaded } })
    wrapper.vm.$.exposed!.setField('title', 'My Unsaved Local Edit')

    await wrapper.vm.$.exposed!.submit()
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.find('[data-test="conflict-banner"]').exists()).toBe(true)

    await wrapper.find('[data-test="conflict-load-theirs"]').trigger('click')
    await new Promise((r) => setTimeout(r, 0))

    // The author's pre-replace edit survives — snapshotNow() ran before the model was replaced.
    expect(loadSnapshot<App>('app', 'ap-c1')?.model.title).toBe('My Unsaved Local Edit')
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

  // Final-review fix round 1 (Finding 2): App's PublishButton lives on the edit PAGE, not
  // inside this form (contrast ArticleForm's own in-toolbar PublishButton) — the page relays
  // the fresh entity in via this exposed onPublished (see app/pages/edit/[type]/[documentId]
  // .vue). Without it, loadedUpdatedAt goes stale the moment a publish succeeds, and the VERY
  // NEXT save falsely reports "changed by someone else" against the author's own publish.
  it('publish then edit-save proceeds without a false conflict banner (loadedUpdatedAt refreshes from the publish response)', async () => {
    const wrapper = await mountSuspended(AppForm, { props: { mode: 'edit', initial: loaded } })
    const publishedEntity: App = {
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
})
