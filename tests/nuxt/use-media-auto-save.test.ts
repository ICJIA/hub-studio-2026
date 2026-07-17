// tests/nuxt/use-media-auto-save.test.ts
// @vitest-environment nuxt
// The auto-save-on-major-change primitive (user decision 2026-07-17: picking/replacing/removing
// an image or file — and inserting a body figure — must save the draft by itself; managers should
// never need the manual Save click for the select → saved → Live-preview chain to work). This
// composable watches a media-identity SIGNATURE (ids only — alt/caption typing and body-text
// edits never re-fire it) and calls the form's own submit() when it changes. The form-level
// integrations are covered in article-form/app-form/dataset-form tests; this file pins the
// composable's own contract: enablement, the dirty/busy gates, deferred retry after a busy
// window, pause/resume around programmatic model replacement, and the explicit request() path.
import { describe, it, expect, vi } from 'vitest'
import { ref, nextTick } from 'vue'
import { useMediaAutoSave } from '~/composables/useMediaAutoSave'

/** A minimal reactive harness standing in for a form: signature/dirty/busy refs + a save spy. */
function harness(opts: { enabled?: boolean } = {}) {
  const signature = ref('[]')
  const dirty = ref(false)
  const busy = ref(false)
  const save = vi.fn(() => { /* forms' submit() is fire-and-forget here */ })
  const autoSave = useMediaAutoSave({
    enabled: opts.enabled ?? true,
    signature: () => signature.value,
    dirty: () => dirty.value,
    busy: () => busy.value,
    save,
  })
  return { signature, dirty, busy, save, autoSave }
}

/** Flush Vue's watcher queue (pre-flush jobs settle within a microtask turn). */
async function flush() {
  await nextTick()
  await new Promise((r) => setTimeout(r, 0))
}

describe('useMediaAutoSave', () => {
  it('fires save when the media signature changes while dirty and idle', async () => {
    const h = harness()
    h.dirty.value = true
    h.signature.value = '[-5]'
    await flush()
    expect(h.save).toHaveBeenCalledTimes(1)
  })

  it('never fires when disabled (create mode)', async () => {
    const h = harness({ enabled: false })
    h.dirty.value = true
    h.signature.value = '[-5]'
    await flush()
    expect(h.save).not.toHaveBeenCalled()
  })

  it('does NOT fire on dirty alone — body-text edits (signature unchanged) never auto-save', async () => {
    const h = harness()
    h.dirty.value = true // e.g. the author typed in the body
    await flush()
    expect(h.save).not.toHaveBeenCalled()
  })

  it('does NOT fire when the model is clean at settle time (nothing to persist)', async () => {
    const h = harness()
    h.signature.value = '[-5]' // signature moved but dirty stayed false
    await flush()
    expect(h.save).not.toHaveBeenCalled()
  })

  it('a change during a busy window defers, then fires ONCE when busy clears (still dirty)', async () => {
    const h = harness()
    h.busy.value = true // a manual save (or Load-theirs) is in flight
    h.dirty.value = true
    h.signature.value = '[-5]'
    await flush()
    expect(h.save).not.toHaveBeenCalled() // deferred, not dropped

    h.busy.value = false
    await flush()
    expect(h.save).toHaveBeenCalledTimes(1) // the deferred attempt lands exactly once
  })

  it('a deferred attempt is dropped when the model comes back CLEAN (Load-theirs replaced it)', async () => {
    const h = harness()
    h.busy.value = true
    h.dirty.value = true
    h.signature.value = '[9]' // loadTheirs Object.assign moves the signature mid-busy
    await flush()

    h.dirty.value = false // resetBaseline() — the replaced model is the new clean state
    h.busy.value = false
    await flush()
    expect(h.save).not.toHaveBeenCalled()
  })

  it('pause() suppresses a signature change entirely; resume() re-arms only for LATER changes', async () => {
    const h = harness()
    h.autoSave.pause()
    h.dirty.value = true
    h.signature.value = '[7]' // e.g. Restore replacing the model programmatically
    h.autoSave.resume()
    await flush()
    expect(h.save).not.toHaveBeenCalled() // the paused change never fires, even after resume

    h.signature.value = '[-5]' // a real author pick afterwards
    await flush()
    expect(h.save).toHaveBeenCalledTimes(1)
  })

  it('request() saves immediately when dirty and idle (the figure-insert path)', async () => {
    const h = harness()
    h.dirty.value = true
    h.autoSave.request()
    expect(h.save).toHaveBeenCalledTimes(1)
  })

  it('request() is a no-op when clean, busy (deferred instead), or disabled', async () => {
    const clean = harness()
    clean.autoSave.request()
    expect(clean.save).not.toHaveBeenCalled()

    const busy = harness()
    busy.dirty.value = true
    busy.busy.value = true
    await flush()
    busy.autoSave.request()
    expect(busy.save).not.toHaveBeenCalled()
    busy.busy.value = false
    await flush()
    expect(busy.save).toHaveBeenCalledTimes(1) // deferred request lands after the busy window

    const off = harness({ enabled: false })
    off.dirty.value = true
    off.autoSave.request()
    expect(off.save).not.toHaveBeenCalled()
  })
})
