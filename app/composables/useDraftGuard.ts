// The unsaved-work guard (analysis-roadmap §5.3-4): dirty tracking + leave warnings + the
// 30-second local snapshot + restore/discard, one call per form. Protections:
//   1. beforeunload — native browser warning while dirty (plus a best-effort final snapshot,
//      live builds only).
//   2. onBeforeRouteLeave — native confirm while dirty (deliberately NOT a custom modal).
//   3. setInterval snapshot while dirty — SKIPPED ENTIRELY in demo mode (user decision:
//      the demo's "nothing is saved / resets each session" promise stays literally true;
//      the demo keeps both warnings).
// markSaved() is called by the form's successful submit path: clears the snapshot + resets
// the baseline — the clear-on-save invariant that makes "a snapshot exists" mean "unsaved
// work exists". Restored content is deliberately left DIRTY so the author saves it normally.
import { computed, ref, onMounted, onBeforeUnmount, inject } from '#imports'
import { matchedRouteKey } from 'vue-router'
import {
  saveSnapshot, loadSnapshot, clearSnapshot, type DraftSnapshot,
} from '~/lib/draft-backup'
import { isDemoMode } from '~/lib/demo'

export const DRAFT_SNAPSHOT_INTERVAL_MS = 30_000

export function useDraftGuard<T extends object>(opts: {
  type: 'article' | 'app' | 'dataset'
  documentId: string | null // null ⇒ create mode (keys under 'new')
  model: T // the form's reactive model
  now?: () => string // test seam; defaults to the real clock
  intervalMs?: number // test seam; defaults to 30 s
}) {
  const nowIso = opts.now ?? (() => new Date().toISOString())
  const intervalMs = opts.intervalMs ?? DRAFT_SNAPSHOT_INTERVAL_MS

  // Dirty = the serialized model differs from the last-saved baseline.
  const baseline = ref(JSON.stringify(opts.model))
  const dirty = computed(() => JSON.stringify(opts.model) !== baseline.value)

  // A surviving snapshot ALWAYS means unsaved work (saves clear it) — existence is the trigger.
  const snapshot = ref<DraftSnapshot<T> | null>(loadSnapshot<T>(opts.type, opts.documentId))
  const restoreAvailable = computed(() => snapshot.value !== null)
  const snapshotSavedAt = computed(() => snapshot.value?.savedAt ?? null)

  function plainModel(): T {
    return JSON.parse(JSON.stringify(opts.model)) as T
  }

  function writeSnapshot() {
    if (isDemoMode()) return // demo: warn-only, never persist
    saveSnapshot(opts.type, opts.documentId, plainModel(), nowIso())
  }

  /** Apply the snapshot to the model (stays DIRTY — the author saves it normally). */
  function restore() {
    if (!snapshot.value) return
    Object.assign(opts.model, snapshot.value.model)
    clearSnapshot(opts.type, opts.documentId)
    snapshot.value = null
  }

  /** Drop the snapshot, keep the loaded model. */
  function discard() {
    clearSnapshot(opts.type, opts.documentId)
    snapshot.value = null
  }

  /** Call after a SUCCESSFUL save: nothing left behind, baseline reset. */
  function markSaved() {
    baseline.value = JSON.stringify(opts.model)
    clearSnapshot(opts.type, opts.documentId)
    snapshot.value = null
  }

  function onBeforeUnload(event: BeforeUnloadEvent) {
    if (!dirty.value) return
    writeSnapshot() // best-effort final write (no-op in demo)
    event.preventDefault()
    // Chrome requires returnValue to show the native dialog.
    event.returnValue = ''
  }

  let timer: ReturnType<typeof setInterval> | undefined
  onMounted(() => {
    timer = setInterval(() => {
      if (dirty.value) writeSnapshot()
    }, intervalMs)
    window.addEventListener('beforeunload', onBeforeUnload)
  })
  onBeforeUnmount(() => {
    if (timer) clearInterval(timer)
    window.removeEventListener('beforeunload', onBeforeUnload)
  })

  // onBeforeRouteLeave only ever registers a WORKING guard when this component renders as a
  // child of an active <router-view> — vue-router wires that internally via
  // `inject(matchedRouteKey)` (registerGuard in its navigationGuards module): a *component-tree*
  // check. That is NOT the same thing as "does the router have a current route" — useRoute()
  // .matched can be non-empty (e.g. matched to '/login') even when THIS component was mounted
  // standalone, outside any <router-view>, as component-level tests do; route.matched reflects
  // the router's global state, not this component's position in it. Checking the same injection
  // vue-router checks internally — rather than useRoute().matched — is what actually predicts
  // (and silences) its "No active route record" dev warning on those standalone mounts. Every
  // real app page renders forms inside a routed page (NuxtPage, built on <router-view>), so the
  // guard always registers in production.
  // The explicit `undefined` 2nd argument matters: Vue's inject() only skips ITS OWN "injection
  // not found" dev warning when arguments.length > 1 at the call site (checked by inspecting
  // Vue's source directly) — regardless of whether that default is itself undefined. Calling
  // inject(matchedRouteKey) with a single argument would silence vue-router's warning (since we
  // never call onBeforeRouteLeave when ungated) while introducing a NEW, different Vue-core one.
  const activeRouteRecord = inject(matchedRouteKey, undefined)
  if (activeRouteRecord?.value) {
    onBeforeRouteLeave(() => {
      if (!dirty.value) return true
      // Native confirm — matches beforeunload's native dialog; no custom-modal a11y surface.
      return window.confirm('You have unsaved changes. Leave without saving?')
    })
  }

  return { dirty, restoreAvailable, snapshotSavedAt, restore, discard, markSaved }
}
