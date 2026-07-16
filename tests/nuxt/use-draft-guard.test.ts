// @vitest-environment nuxt
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent, reactive, h } from 'vue'
import { RouterView } from 'vue-router'
import { backupKey, saveSnapshot, loadSnapshot } from '~/lib/draft-backup'
import { useAuthStore } from '~/stores/auth'
import { makeDevAdminSession } from '~/lib/dev-auth'

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

  // Positioned FIRST in this file, and each test below explicitly unmounts its own probe.
  // Reason: `mountSuspended` does not auto-unmount components between `it()` blocks (only its
  // own internal Nuxt-root effect scope is torn down on the next mount) — so a `beforeunload`
  // *listener* registered by an earlier test's still-mounted probe stays live on the shared
  // `window` for the rest of the file. Several tests below intentionally end dirty and never
  // unmount (e.g. the interval/demo/restore tests), so a later `window.dispatchEvent(...)`
  // here would also invoke THEIR stale handlers, making a "preventDefault NOT called"
  // assertion order-dependent and flaky. Running first + self-unmounting sidesteps that
  // without touching any of the tests below (confirmed by hand with a throwaway probe before
  // settling on this ordering).
  describe('beforeunload dispatch (the dialog-triggering branch)', () => {
    function dispatchBeforeUnload() {
      const event = new Event('beforeunload', { cancelable: true })
      const preventDefault = vi.spyOn(event, 'preventDefault')
      window.dispatchEvent(event)
      return { event, preventDefault }
    }

    it('clean model: no preventDefault, no snapshot written', async () => {
      const wrapper = await mountSuspended(probe('doc1'))
      const { preventDefault } = dispatchBeforeUnload()
      expect(preventDefault).not.toHaveBeenCalled()
      expect(loadSnapshot('article', 'doc1')).toBeNull()
      wrapper.unmount()
    })

    it('dirty model, live mode: preventDefault called AND a best-effort snapshot is written', async () => {
      const wrapper = await mountSuspended(probe('doc1'))
      model.title = 'Edited before close'
      const { event, preventDefault } = dispatchBeforeUnload()
      expect(preventDefault).toHaveBeenCalled()
      // Chrome requires returnValue set for the native dialog to show.
      expect(event.returnValue).toBe('')
      const snap = loadSnapshot<{ title: string }>('article', 'doc1')
      expect(snap).not.toBeNull()
      expect(snap!.model.title).toBe('Edited before close')
      wrapper.unmount()
    })

    it('dirty model, demo mode: preventDefault called (warning kept) but NO snapshot written', async () => {
      demoMode = true
      const wrapper = await mountSuspended(probe('doc1'))
      model.title = 'Edited in demo before close'
      const { preventDefault } = dispatchBeforeUnload()
      expect(preventDefault).toHaveBeenCalled()
      expect(loadSnapshot('article', 'doc1')).toBeNull()
      wrapper.unmount()
    })
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

// `probe()` above is mounted directly (mountSuspended(probe(...))) — deliberately with NO active
// <router-view>, since that's exactly what Fix Round 1 gates onBeforeRouteLeave() OUT of
// registering at all (silencing vue-router's "No active route record" dev warning on standalone
// component-test mounts). That means none of the tests above ever exercise the confirm-gate
// itself — the leave-blocking `window.confirm` branch has never executed anywhere in this suite.
// These tests close that gap with a REAL navigation.
//
// mountSuspended's own `route` option does NOT provide a working onBeforeRouteLeave context by
// itself: reading @nuxt/test-utils's wrapperSuspended source (node_modules/@nuxt/test-utils/
// dist/chunks/suspended.mjs) shows the mounted component is rendered as
// `Suspense > SuspendedHelper > ClonedComponent` — never wrapped in an actual <router-view> — so
// `inject(matchedRouteKey)` stays undefined regardless of what `route` is passed. Confirmed by
// hand with a throwaway probe before writing this: `mountSuspended(Probe, { route: '/' })` alone
// left `inject(matchedRouteKey, undefined)?.value` undefined inside Probe.
//
// What DOES work (also confirmed by hand): hosting the probe behind a REAL <RouterView>, with
// two throwaway routes registered on the app's shared router BEFORE mountSuspended's initial
// `router.replace()` runs (registering them inside the mounted component's own setup is too
// late — `router.replace()` for the target path happens in mountSuspended's internal
// SuspendedHelper, which mounts and navigates before our component gets a chance to run), plus
// an authenticated session — this app's global `auth.global.ts` middleware redirects ANY
// unauthenticated navigation (including to these made-up test paths) to /login.
function routerHost() {
  return defineComponent({ setup: () => () => h(RouterView) })
}

describe('useDraftGuard — real route-leave confirm gate (drives an actual navigation)', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore().setSession(makeDevAdminSession('editor'))
    const router = useRouter()
    // Registered once (idempotent) on the file's shared router; `probe('doc1')` is the SAME
    // factory used above — each mount still runs its own setup(), so `guard`/`model` are fresh.
    if (!router.hasRoute('draft-guard-probe-a')) {
      router.addRoute({ path: '/__draft-guard-probe-a', name: 'draft-guard-probe-a', component: probe('doc1') })
    }
    if (!router.hasRoute('draft-guard-probe-b')) {
      router.addRoute({ path: '/__draft-guard-probe-b', name: 'draft-guard-probe-b', component: defineComponent({ setup: () => () => null }) })
    }
  })

  it('dirty + confirm declined: navigation is BLOCKED (route unchanged), confirm called once', async () => {
    const wrapper = await mountSuspended(routerHost(), { route: '/__draft-guard-probe-a' })
    expect(guard.dirty.value).toBe(false)
    model.title = 'Edited before leaving'
    expect(guard.dirty.value).toBe(true)

    // happy-dom's `window` has no `confirm` at all (not merely un-mocked — genuinely absent),
    // so vi.spyOn(window, 'confirm') has nothing to wrap ("can only spy on a function, received
    // undefined" — confirmed by hand). Assigning a fresh mock directly is both necessary here
    // and sufficient: no test in this file (or, per Vitest's per-file isolation, any other file)
    // relies on a real window.confirm existing beforehand.
    const confirmMock = vi.fn().mockReturnValue(false)
    window.confirm = confirmMock
    const router = useRouter()
    await router.push('/__draft-guard-probe-b')

    expect(confirmMock).toHaveBeenCalledTimes(1)
    expect(confirmMock).toHaveBeenCalledWith('You have unsaved changes. Leave without saving?')
    expect(router.currentRoute.value.fullPath).toBe('/__draft-guard-probe-a')

    wrapper.unmount()
  })

  it('dirty + confirm accepted: navigation PROCEEDS', async () => {
    const wrapper = await mountSuspended(routerHost(), { route: '/__draft-guard-probe-a' })
    model.title = 'Edited before leaving'
    expect(guard.dirty.value).toBe(true)

    const confirmMock = vi.fn().mockReturnValue(true)
    window.confirm = confirmMock
    const router = useRouter()
    await router.push('/__draft-guard-probe-b')

    expect(confirmMock).toHaveBeenCalledTimes(1)
    expect(router.currentRoute.value.fullPath).toBe('/__draft-guard-probe-b')

    wrapper.unmount()
  })

  it('clean model: NO confirm call, navigation proceeds', async () => {
    const wrapper = await mountSuspended(routerHost(), { route: '/__draft-guard-probe-a' })
    expect(guard.dirty.value).toBe(false)

    const confirmMock = vi.fn()
    window.confirm = confirmMock
    const router = useRouter()
    await router.push('/__draft-guard-probe-b')

    expect(confirmMock).not.toHaveBeenCalled()
    expect(router.currentRoute.value.fullPath).toBe('/__draft-guard-probe-b')

    wrapper.unmount()
  })
})
