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
// snapshotNow() + resetBaseline() are the edit-conflict flow's "Load their version" primitives
// (called in that order): snapshotNow() force-writes the current model past the dirty gate and
// refreshes the snapshot ref immediately (no interval wait) right before the model is replaced
// by the server's copy; resetBaseline() then re-bases dirty tracking to that replaced model
// WITHOUT touching storage — deliberately NOT markSaved(), which would clear the very snapshot
// snapshotNow() just preserved.
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

  // Pass the reactive model straight through — saveSnapshot stringifies it immediately
  // (a reactive proxy serializes identically to a plain clone), inside ITS OWN try/catch.
  // That's the only serialization pass, and the only place a non-serializable model (e.g. a
  // circular reference) can throw — where the lib's fail-open handling actually catches it.
  function writeSnapshot() {
    if (isDemoMode()) return // demo: warn-only, never persist
    saveSnapshot(opts.type, opts.documentId, opts.model, nowIso())
  }

  /**
   * Apply the snapshot to the model (stays DIRTY — the author saves it normally). Returns the
   * restored model (or null when there was no snapshot — a no-op), so a caller can reseed
   * anything derived from the snapshot's OWN content — notably the edit-conflict save-flow's
   * `loadedUpdatedAt` (see ArticleForm's `onRestore()` wrapper and its comment): the snapshot
   * may be far staler than "since this page loaded" (e.g. recovered from yesterday's crash on
   * a different machine), so the form must compare its NEXT save against the snapshot's own
   * embedded stamp, not the page's load-time one — otherwise a same-session restore-then-save
   * can silently overwrite changes the page's fresh load already reflected before Restore was
   * clicked. This is what makes ROADMAP's "cross-machine stale-restore risk is mitigated by
   * edit-conflict detection" claim actually true.
   */
  function restore(): T | null {
    if (!snapshot.value) return null
    const restored = snapshot.value.model
    Object.assign(opts.model, restored)
    clearSnapshot(opts.type, opts.documentId)
    snapshot.value = null
    // Cast, not a runtime coercion: `snapshot` is a Ref<DraftSnapshot<T> | null>, so Vue's
    // deep-reactivity UnwrapRef<> widens the STATIC type of `.model` for a generic T (it can't
    // prove UnwrapRef<T> assignable back to T for an arbitrary type param, even though every
    // real T here is a plain domain object with no nested refs to unwrap) — the same friction
    // Object.assign's own permissive typing above quietly absorbs.
    return restored as T
  }

  /** Drop the snapshot, keep the loaded model. */
  function discard() {
    clearSnapshot(opts.type, opts.documentId)
    snapshot.value = null
  }

  /**
   * Call after a SUCCESSFUL save: nothing left behind, baseline reset. Contrast with
   * resetBaseline(): this one ALSO clears the snapshot — right when the save has durably
   * persisted everything, so no local backup is needed any more. resetBaseline() re-bases
   * dirty tracking WITHOUT clearing the snapshot, for the one case where the model changed
   * but nothing was saved (the conflict flow's "Load their version").
   */
  function markSaved() {
    baseline.value = JSON.stringify(opts.model)
    clearSnapshot(opts.type, opts.documentId)
    snapshot.value = null
  }

  /**
   * Immediate best-effort snapshot of the CURRENT model, regardless of dirty state (demo-gated
   * exactly like every other snapshot write, by routing through writeSnapshot()). Unlike the
   * interval writer, this has NO dirty gate: the conflict flow's "Load their version" calls
   * this the instant before the model is wholesale-replaced by the server's copy, so even a
   * clean (or seconds-old) model must be captured NOW — waiting for the next interval tick
   * would lose the race. Also refreshes the in-memory `snapshot` ref from storage so
   * `restoreAvailable` flips true immediately afterwards, without waiting on that same
   * interval — the conflict flow renders the restore banner right after calling this.
   */
  function snapshotNow() {
    writeSnapshot()
    snapshot.value = loadSnapshot<T>(opts.type, opts.documentId)
  }

  /**
   * Re-base dirty tracking to the CURRENT model WITHOUT touching storage or the `snapshot`
   * ref. Call this right after the model has been replaced wholesale from the server (the
   * conflict flow's "Load their version", after snapshotNow() has already captured the
   * author's pre-replace edits): dirty flips false against the freshly loaded content, same
   * as markSaved() — but markSaved() would ALSO clear the snapshot just written by
   * snapshotNow(), destroying the very edits it was meant to preserve. Use markSaved() for
   * "this content is now durably saved"; use resetBaseline() for "the model under our feet
   * changed, but nothing was saved."
   */
  function resetBaseline() {
    baseline.value = JSON.stringify(opts.model)
  }

  function onBeforeUnload(event: BeforeUnloadEvent) {
    if (!dirty.value) return
    // The native warning is the primary protection and must never be silently lost — arm it
    // BEFORE attempting the snapshot write, so a write failure (belt-and-braces: saveSnapshot
    // is itself fail-open and shouldn't throw, but nothing upstream of it is free) can never
    // suppress the dialog. Chrome requires returnValue to show it.
    event.preventDefault()
    event.returnValue = ''
    writeSnapshot() // best-effort final write (no-op in demo); failure here no longer matters
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

  return {
    dirty, restoreAvailable, snapshotSavedAt, restore, discard, markSaved, snapshotNow, resetBaseline,
  }
}
