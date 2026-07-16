// @vitest-environment nuxt
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent, reactive } from 'vue'
import { backupKey, saveSnapshot, loadSnapshot } from '~/lib/draft-backup'

let demoMode = false
vi.mock('~/lib/demo', () => ({
  isDemoMode: () => demoMode,
  isDemoSession: () => false,
  isDemoData: () => demoMode,
}))

type Guard = ReturnType<typeof import('~/composables/useDraftGuard')['useDraftGuard']>
let guard!: Guard
let model!: { title: string; markdown: string }

function probe(documentId: string | null) {
  return defineComponent({
    setup() {
      model = reactive({ title: 'Original', markdown: '# Body' })
      guard = useDraftGuard({
        type: 'article',
        documentId,
        model,
        now: () => '2026-07-16T14:41:00.000Z',
        intervalMs: 1000, // fast interval for fake timers
      })
      return () => null
    },
  })
}

describe('useDraftGuard', () => {
  beforeEach(() => {
    demoMode = false
    localStorage.clear()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('is clean at mount, dirty after an edit, clean again after markSaved', async () => {
    await mountSuspended(probe('doc1'))
    expect(guard.dirty.value).toBe(false)
    model.title = 'Edited'
    expect(guard.dirty.value).toBe(true)
    guard.markSaved()
    expect(guard.dirty.value).toBe(false)
  })

  it('writes a snapshot on the interval ONLY while dirty', async () => {
    await mountSuspended(probe('doc1'))
    vi.advanceTimersByTime(3000)
    expect(loadSnapshot('article', 'doc1')).toBeNull() // clean → no writes
    model.title = 'Edited'
    vi.advanceTimersByTime(1000)
    const snap = loadSnapshot<{ title: string }>('article', 'doc1')
    expect(snap).not.toBeNull()
    expect(snap!.model.title).toBe('Edited')
    expect(snap!.savedAt).toBe('2026-07-16T14:41:00.000Z')
  })

  it('NEVER writes snapshots in demo mode (user decision: resets-each-session stays true)', async () => {
    demoMode = true
    await mountSuspended(probe('doc1'))
    model.title = 'Edited in demo'
    vi.advanceTimersByTime(5000)
    expect(loadSnapshot('article', 'doc1')).toBeNull()
  })

  it('markSaved clears the snapshot and resets the baseline', async () => {
    await mountSuspended(probe('doc1'))
    model.title = 'Edited'
    vi.advanceTimersByTime(1000)
    expect(loadSnapshot('article', 'doc1')).not.toBeNull()
    guard.markSaved()
    expect(loadSnapshot('article', 'doc1')).toBeNull()
    expect(guard.dirty.value).toBe(false)
  })

  it('exposes an existing snapshot for restore; restore applies it and clears storage', async () => {
    saveSnapshot('article', 'doc1', { title: 'Recovered', markdown: '# Saved body' }, '2026-07-16T09:00:00.000Z')
    await mountSuspended(probe('doc1'))
    expect(guard.restoreAvailable.value).toBe(true)
    expect(guard.snapshotSavedAt.value).toBe('2026-07-16T09:00:00.000Z')
    guard.restore()
    expect(model.title).toBe('Recovered')
    expect(guard.restoreAvailable.value).toBe(false)
    expect(loadSnapshot('article', 'doc1')).toBeNull()
    expect(guard.dirty.value).toBe(true) // restored content is UNSAVED — author must save
  })

  it('discard clears the snapshot without touching the model', async () => {
    saveSnapshot('article', 'doc1', { title: 'Stale', markdown: 'x' }, '2026-07-16T09:00:00.000Z')
    await mountSuspended(probe('doc1'))
    guard.discard()
    expect(model.title).toBe('Original')
    expect(guard.restoreAvailable.value).toBe(false)
    expect(localStorage.getItem(backupKey('article', 'doc1'))).toBeNull()
  })

  it('create mode (documentId null) keys the snapshot under "new"', async () => {
    await mountSuspended(probe(null))
    model.title = 'Fresh draft'
    vi.advanceTimersByTime(1000)
    expect(loadSnapshot('article', null)).not.toBeNull()
  })

  it('unmount stops the interval (no writes after teardown)', async () => {
    const wrapper = await mountSuspended(probe('doc1'))
    model.title = 'Edited'
    wrapper.unmount()
    localStorage.clear()
    vi.advanceTimersByTime(5000)
    expect(loadSnapshot('article', 'doc1')).toBeNull()
  })
})
