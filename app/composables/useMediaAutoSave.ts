// Auto-save on MAJOR changes (user decision 2026-07-17): picking, replacing, or removing an
// image/file — and inserting a body figure — saves the draft by itself on EDIT pages, so the
// select → saved → Live-preview chain never depends on the manual Save click (the demo's whole
// teaching flow for managers). Create mode stays manual on purpose: a half-formed draft must
// not be auto-created just because an image was picked first.
//
// The trigger is a media-identity SIGNATURE (a serialized list of media ids) the form provides,
// not the model's dirty state: alt/caption typing and body-text edits change the model WITHOUT
// changing any media id, and must never fire a save per keystroke. The form chooses what's in
// the signature (e.g. ArticleForm filters display-only id-0 refs OUT of mainfiles so the demo's
// mount-time sample-PDF seed can't fire a save on page open, while keeping the id-0 splash
// itself IN so "Remove splash" still counts as a major change).
//
// Interplay with the form's other flows:
//  - save() is the form's own submit(): validation, the save-time conflict check, "Draft saved"
//    toast, and markSaved() all apply to an auto-save exactly as to a manual one. A conflict
//    aborts into ConflictBanner — the author decides, and no retry fires until the next change.
//  - busy() (the form's `saving`) gates re-entrancy: a change landing mid-save DEFERS (pending)
//    and re-attempts once the in-flight operation settles — still guarded by dirty(), so a
//    Load-theirs (which ends with a clean model via resetBaseline) drops the deferred attempt.
//  - pause()/resume() bracket PROGRAMMATIC model replacement (Restore, Load-theirs): those
//    flows deliberately leave the author in charge of saving, so their signature jumps must
//    not auto-persist. resume() re-arms on nextTick — after the paused change's watcher fire
//    has already flushed — so only LATER, author-made changes fire again.
import { watch, nextTick } from '#imports'

export function useMediaAutoSave(opts: {
  /** Static per mount: edit pages true, create pages false (never auto-create). */
  enabled: boolean
  /** Serialized media-identity list — fires only when a media id appears/disappears/changes. */
  signature: () => string
  /** The form's draftGuard.dirty — nothing to persist when clean. */
  dirty: () => boolean
  /** The form's `saving` — attempts during a busy window defer instead of racing. */
  busy: () => boolean
  /** The form's submit() — self-guarded, owns validation/conflicts/toasts. */
  save: () => void | Promise<void>
}) {
  // Pause depth (counter, not boolean: overlapping pause/resume pairs must not unpause early).
  let pauseDepth = 0
  // One deferred attempt at most — a re-attempt fires when `busy` falls, re-checked for dirty.
  let pending = false

  function attempt() {
    if (!opts.enabled || pauseDepth > 0) return
    if (!opts.dirty()) return
    if (opts.busy()) { pending = true; return }
    void opts.save()
  }

  function pause() { pauseDepth++ }
  /** Re-arm on nextTick: the paused mutation's own watcher fire flushes first and is dropped. */
  function resume() {
    void nextTick(() => { pauseDepth = Math.max(0, pauseDepth - 1) })
  }

  if (opts.enabled) {
    watch(opts.signature, () => attempt())
    watch(opts.busy, (busyNow) => {
      if (!busyNow && pending) {
        pending = false
        attempt()
      }
    })
  }

  return { pause, resume, request: attempt }
}
