# Unsaved-Work Guard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Authors never silently lose in-progress work — a leave-page warning while a form is dirty, a 30-second local snapshot (live builds only), and a Restore/Discard banner when a snapshot survives.

**Architecture:** A pure `draft-backup` lib (localStorage envelope, injectable store) + a `useDraftGuard()` composable owning dirty-state, the `beforeunload`/route-leave warnings, the snapshot interval (skipped in demo), and restore/discard/markSaved — wired identically into the three form components, with a shared `DraftRestoreBanner.vue`.

**Tech Stack:** Nuxt 4 / Vue 3 `<script setup>`, vue-router `onBeforeRouteLeave` (auto-imported), Vitest 4 (`tests/unit` node env; `tests/nuxt` via `mountSuspended`/`mockNuxtImport`, fake timers).

**Spec:** `docs/superpowers/specs/2026-07-16-unsaved-work-guard-design.md` (approved 2026-07-16).

## Global Constraints

- **Demo policy (user decision):** NO snapshots in demo mode — `isDemoMode()` gates every write, including the beforeunload best-effort write. Demo keeps both warnings.
- **Fail-open:** storage full/blocked/absent must never break editing — skip + one `console.warn`, never throw.
- **Native dialogs only:** route-leave uses `window.confirm`; no custom modal.
- **Clear-on-save invariant:** a successful save always clears the draft's snapshot and resets the baseline — a surviving snapshot ALWAYS means unsaved work.
- TDD; no new npm dependencies; targeted runs via `npx vitest run <file>`, full suite (`npm test`, currently 757/104) + `npx nuxt typecheck` before each commit.
- Commit style: conventional prefix + em-dash. **Never add `Co-Authored-By` or any AI trailer.**
- User-facing copy: plain English, sentence case (match existing strings).

---

### Task 1: Pure lib — `draft-backup.ts`

**Files:**
- Create: `app/lib/draft-backup.ts`
- Test: `tests/unit/draft-backup.test.ts`

**Interfaces (produced for Tasks 2–3):**
- `interface DraftSnapshot<T> { model: T; savedAt: string; type: string; documentId: string }`
- `backupKey(type: string, documentId: string | null): string` → `icjia-studio-draft-backup:<type>:<documentId ?? 'new'>`
- `interface BackupStore { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void }`
- `saveSnapshot<T>(type: string, documentId: string | null, model: T, savedAt: string, store?: BackupStore | null): boolean`
- `loadSnapshot<T>(type: string, documentId: string | null, store?: BackupStore | null): DraftSnapshot<T> | null`
- `clearSnapshot(type: string, documentId: string | null, store?: BackupStore | null): void`
- `DRAFT_BACKUP_MAX_BYTES = 1_000_000`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/draft-backup.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import {
  backupKey, saveSnapshot, loadSnapshot, clearSnapshot,
  DRAFT_BACKUP_MAX_BYTES, type BackupStore,
} from '~/lib/draft-backup'

/** Tiny in-memory BackupStore (the unit env has no localStorage). */
function memoryStore(): BackupStore & { map: Map<string, string> } {
  const map = new Map<string, string>()
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => { map.set(k, v) },
    removeItem: (k) => { map.delete(k) },
  }
}

const model = { title: 'Draft title', markdown: '# Body', tags: ['a'] }

describe('backupKey', () => {
  it('keys per type + documentId, with "new" for null', () => {
    expect(backupKey('article', 'abc123')).toBe('icjia-studio-draft-backup:article:abc123')
    expect(backupKey('dataset', null)).toBe('icjia-studio-draft-backup:dataset:new')
  })
})

describe('saveSnapshot / loadSnapshot round trip', () => {
  it('stores and restores the model with its envelope', () => {
    const store = memoryStore()
    expect(saveSnapshot('article', 'abc123', model, '2026-07-16T14:41:00.000Z', store)).toBe(true)
    const snap = loadSnapshot<typeof model>('article', 'abc123', store)
    expect(snap).not.toBeNull()
    expect(snap!.model).toEqual(model)
    expect(snap!.savedAt).toBe('2026-07-16T14:41:00.000Z')
    expect(snap!.type).toBe('article')
    expect(snap!.documentId).toBe('abc123')
  })

  it('create-mode drafts key under "new" and do not collide with edit drafts', () => {
    const store = memoryStore()
    saveSnapshot('article', null, { ...model, title: 'New draft' }, '2026-07-16T10:00:00.000Z', store)
    saveSnapshot('article', 'abc123', model, '2026-07-16T11:00:00.000Z', store)
    expect(loadSnapshot<typeof model>('article', null, store)!.model.title).toBe('New draft')
    expect(loadSnapshot<typeof model>('article', 'abc123', store)!.model.title).toBe('Draft title')
  })

  it('returns null for a missing snapshot and for corrupt JSON', () => {
    const store = memoryStore()
    expect(loadSnapshot('article', 'nope', store)).toBeNull()
    store.setItem(backupKey('article', 'bad'), '{not json')
    expect(loadSnapshot('article', 'bad', store)).toBeNull()
  })

  it('returns null for a wrong-shaped envelope (no model)', () => {
    const store = memoryStore()
    store.setItem(backupKey('article', 'shape'), JSON.stringify({ savedAt: 'x' }))
    expect(loadSnapshot('article', 'shape', store)).toBeNull()
  })
})

describe('fail-open guards', () => {
  it('skips oversized models (returns false, no write, warns once)', () => {
    const store = memoryStore()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const huge = { markdown: 'x'.repeat(DRAFT_BACKUP_MAX_BYTES) }
    expect(saveSnapshot('article', 'big', huge, '2026-07-16T10:00:00.000Z', store)).toBe(false)
    expect(store.map.size).toBe(0)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('a throwing store (quota) is swallowed — returns false, never throws', () => {
    const store: BackupStore = {
      getItem: () => null,
      setItem: () => { throw new Error('QuotaExceededError') },
      removeItem: () => {},
    }
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(saveSnapshot('article', 'q', model, '2026-07-16T10:00:00.000Z', store)).toBe(false)
    warn.mockRestore()
  })

  it('a null store (no localStorage) is a no-op everywhere', () => {
    expect(saveSnapshot('article', 'x', model, '2026-07-16T10:00:00.000Z', null)).toBe(false)
    expect(loadSnapshot('article', 'x', null)).toBeNull()
    expect(() => clearSnapshot('article', 'x', null)).not.toThrow()
  })
})

describe('clearSnapshot', () => {
  it('removes exactly the draft key', () => {
    const store = memoryStore()
    saveSnapshot('article', 'abc123', model, '2026-07-16T10:00:00.000Z', store)
    saveSnapshot('app', 'abc123', model, '2026-07-16T10:00:00.000Z', store)
    clearSnapshot('article', 'abc123', store)
    expect(loadSnapshot('article', 'abc123', store)).toBeNull()
    expect(loadSnapshot('app', 'abc123', store)).not.toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run tests/unit/draft-backup.test.ts` → FAIL (module does not exist).

- [ ] **Step 3: Implement**

Create `app/lib/draft-backup.ts`:

```ts
// app/lib/draft-backup.ts
// Local draft backup (analysis-roadmap §5.3-4): the pure storage half of the unsaved-work
// guard. One snapshot per draft, keyed by content type + documentId ('new' for create mode),
// in localStorage. FAIL-OPEN everywhere: a full, blocked, or absent store must never break
// editing — writes skip with one console.warn; corrupt payloads read as null. The store is
// injectable so unit tests run without a browser. Clock-free: callers pass savedAt.
// Demo policy (spec §2): the CALLER (useDraftGuard) skips snapshots entirely in demo mode —
// this lib is mode-agnostic.
export interface DraftSnapshot<T> {
  model: T
  savedAt: string
  type: string
  documentId: string
}

export interface BackupStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

const KEY_PREFIX = 'icjia-studio-draft-backup'

/** ~1 MB per draft — far above any real article, far below the localStorage budget. */
export const DRAFT_BACKUP_MAX_BYTES = 1_000_000

export function backupKey(type: string, documentId: string | null): string {
  return `${KEY_PREFIX}:${type}:${documentId ?? 'new'}`
}

function defaultStore(): BackupStore | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null // privacy modes can throw on ACCESS — treat as absent
  }
}

/** Write one snapshot. Returns false (and warns) instead of ever throwing. */
export function saveSnapshot<T>(
  type: string,
  documentId: string | null,
  model: T,
  savedAt: string,
  store: BackupStore | null = defaultStore(),
): boolean {
  if (!store) return false
  let payload: string
  try {
    payload = JSON.stringify({ model, savedAt, type, documentId: documentId ?? 'new' })
  } catch {
    console.warn('[draft-backup] snapshot not serializable — skipped')
    return false
  }
  if (payload.length > DRAFT_BACKUP_MAX_BYTES) {
    console.warn('[draft-backup] snapshot too large — skipped')
    return false
  }
  try {
    store.setItem(backupKey(type, documentId), payload)
    return true
  } catch (err) {
    console.warn('[draft-backup] write failed — skipped', err)
    return false
  }
}

/** Read one snapshot; corrupt or wrong-shaped payloads read as null. */
export function loadSnapshot<T>(
  type: string,
  documentId: string | null,
  store: BackupStore | null = defaultStore(),
): DraftSnapshot<T> | null {
  if (!store) return null
  let raw: string | null
  try {
    raw = store.getItem(backupKey(type, documentId))
  } catch {
    return null
  }
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<DraftSnapshot<T>>
    if (!parsed || typeof parsed !== 'object' || parsed.model === undefined || typeof parsed.savedAt !== 'string') {
      return null
    }
    return parsed as DraftSnapshot<T>
  } catch {
    return null
  }
}

/** Remove one snapshot (no-op on any failure). */
export function clearSnapshot(
  type: string,
  documentId: string | null,
  store: BackupStore | null = defaultStore(),
): void {
  try {
    store?.removeItem(backupKey(type, documentId))
  } catch {
    // fail-open
  }
}
```

- [ ] **Step 4: Verify green** — `npx vitest run tests/unit/draft-backup.test.ts` → PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add app/lib/draft-backup.ts tests/unit/draft-backup.test.ts
git commit -m "feat(drafts): draft-backup lib — per-draft localStorage snapshots, fail-open, injectable store"
```

---

### Task 2: `useDraftGuard()` composable

**Files:**
- Create: `app/composables/useDraftGuard.ts`
- Test: `tests/nuxt/use-draft-guard.test.ts`

**Interfaces:**
- Consumes: Task 1's lib; `isDemoMode` from `~/lib/demo`; `onBeforeRouteLeave` (Nuxt auto-import).
- Produces (consumed by Tasks 3–5):
  `useDraftGuard<T extends object>(opts: { type: 'article'|'app'|'dataset'; documentId: string | null; model: T; now?: () => string; intervalMs?: number })`
  returning `{ dirty: ComputedRef<boolean>; restoreAvailable: ComputedRef<boolean>; snapshotSavedAt: ComputedRef<string | null>; restore(): void; discard(): void; markSaved(): void }`
- `DRAFT_SNAPSHOT_INTERVAL_MS = 30_000` exported.

- [ ] **Step 1: Write the failing tests**

Create `tests/nuxt/use-draft-guard.test.ts`:

```ts
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
```

- [ ] **Step 2: Verify failure** — `npx vitest run tests/nuxt/use-draft-guard.test.ts` → FAIL (`useDraftGuard` is not defined).

- [ ] **Step 3: Implement**

Create `app/composables/useDraftGuard.ts`:

```ts
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
import { computed, ref, onMounted, onBeforeUnmount } from '#imports'
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

  onBeforeRouteLeave(() => {
    if (!dirty.value) return true
    // Native confirm — matches beforeunload's native dialog; no custom-modal a11y surface.
    return window.confirm('You have unsaved changes. Leave without saving?')
  })

  return { dirty, restoreAvailable, snapshotSavedAt, restore, discard, markSaved }
}
```

- [ ] **Step 4: Verify green** — `npx vitest run tests/nuxt/use-draft-guard.test.ts tests/unit/draft-backup.test.ts` → PASS (17 tests).

(If `onBeforeRouteLeave` throws outside a route context in the probe mount, wrap that single call in `try { onBeforeRouteLeave(...) } catch { /* outside router context (tests) */ }` and disclose — the route-guard behavior itself is covered by the form-level tests in Tasks 4–5 via mocked confirm.)

- [ ] **Step 5: Commit**

```bash
git add app/composables/useDraftGuard.ts tests/nuxt/use-draft-guard.test.ts
git commit -m "feat(drafts): useDraftGuard — dirty tracking, leave warnings, 30s snapshots (live only), restore/discard/markSaved"
```

---

### Task 3: `DraftRestoreBanner.vue`

**Files:**
- Create: `app/components/DraftRestoreBanner.vue`
- Test: `tests/nuxt/draft-restore-banner.test.ts`

**Interfaces:** `<DraftRestoreBanner :saved-at="string" @restore @discard />` (components auto-import flat).

- [ ] **Step 1: Write the failing tests**

Create `tests/nuxt/draft-restore-banner.test.ts`:

```ts
// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import DraftRestoreBanner from '~/components/DraftRestoreBanner.vue'

describe('DraftRestoreBanner', () => {
  it('announces the unsaved changes with the snapshot time, as a status region', async () => {
    const wrapper = await mountSuspended(DraftRestoreBanner, {
      props: { savedAt: '2026-07-16T14:41:00.000Z' },
    })
    const banner = wrapper.find('[data-test="draft-restore-banner"]')
    expect(banner.exists()).toBe(true)
    expect(banner.attributes('role')).toBe('status')
    expect(banner.text()).toContain('Unsaved changes')
  })

  it('emits restore and discard from its two buttons', async () => {
    const wrapper = await mountSuspended(DraftRestoreBanner, {
      props: { savedAt: '2026-07-16T14:41:00.000Z' },
    })
    await wrapper.find('[data-test="draft-restore"]').trigger('click')
    await wrapper.find('[data-test="draft-discard"]').trigger('click')
    expect(wrapper.emitted('restore')).toHaveLength(1)
    expect(wrapper.emitted('discard')).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Verify failure**, then **Step 3: Implement**

Create `app/components/DraftRestoreBanner.vue`:

```vue
<!-- app/components/DraftRestoreBanner.vue -->
<!--
  Restore banner for a surviving draft snapshot (unsaved-work guard, spec §1). Non-blocking
  by design (user decision): the saved draft renders beneath; nothing changes until the
  author clicks Restore (apply the snapshot, still unsaved) or Discard (drop it). role=status
  so screen readers announce it without stealing focus.
-->
<script setup lang="ts">
import { computed } from '#imports'

const props = defineProps<{ savedAt: string }>()
const emit = defineEmits<{ restore: []; discard: [] }>()

const savedAtLabel = computed(() => {
  const date = new Date(props.savedAt)
  return Number.isNaN(date.getTime()) ? props.savedAt : date.toLocaleString()
})
</script>

<template>
  <div
    role="status"
    class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm"
    data-test="draft-restore-banner"
  >
    <p class="text-highlighted">
      <span class="font-semibold">Unsaved changes from {{ savedAtLabel }} found.</span>
      They were backed up in this browser before the draft was last closed.
    </p>
    <div class="flex gap-2">
      <UButton size="xs" color="warning" variant="solid" data-test="draft-restore" @click="emit('restore')">
        Restore
      </UButton>
      <UButton size="xs" color="neutral" variant="outline" data-test="draft-discard" @click="emit('discard')">
        Discard
      </UButton>
    </div>
  </div>
</template>
```

- [ ] **Step 4: Verify green**, **Step 5: Commit**

```bash
git add app/components/DraftRestoreBanner.vue tests/nuxt/draft-restore-banner.test.ts
git commit -m "feat(drafts): DraftRestoreBanner — non-blocking Restore/Discard status banner"
```

---

### Task 4: Wire ArticleForm (reference integration)

**Files:**
- Modify: `app/components/forms/ArticleForm.vue`
- Modify: `tests/nuxt/article-form.test.ts`

**Interfaces:** consumes Tasks 1–3. Pattern produced for Task 5: guard call + banner + `markSaved()` in the submit-success path.

- [ ] **Step 1: Write the failing tests** (append to `tests/nuxt/article-form.test.ts`, following that file's existing mount/mocks; `localStorage.clear()` in a `beforeEach` for the new describe):

```ts
describe('unsaved-work guard integration', () => {
  beforeEach(() => localStorage.clear())

  it('shows the restore banner when a snapshot exists for this draft, and Restore applies it', async () => {
    saveSnapshot('article', 'a1', { ...blankArticle(), title: 'Recovered title' }, '2026-07-16T09:00:00.000Z')
    const wrapper = await mountSuspended(ArticleForm, { props: { mode: 'edit', initial: { ...sampleInitial, documentId: 'a1' } } })
    expect(wrapper.find('[data-test="draft-restore-banner"]').exists()).toBe(true)
    await wrapper.find('[data-test="draft-restore"]').trigger('click')
    const title = wrapper.find('input') // the Title field is the form's first text input
    expect((title.element as HTMLInputElement).value).toBe('Recovered title')
  })

  it('shows no banner without a snapshot', async () => {
    const wrapper = await mountSuspended(ArticleForm, { props: { mode: 'edit', initial: { ...sampleInitial, documentId: 'a1' } } })
    expect(wrapper.find('[data-test="draft-restore-banner"]').exists()).toBe(false)
  })

  it('a successful save clears the snapshot (clear-on-save invariant)', async () => {
    saveSnapshot('article', 'a1', { ...blankArticle(), title: 'Old backup' }, '2026-07-16T09:00:00.000Z')
    const wrapper = await mountSuspended(ArticleForm, { props: { mode: 'edit', initial: { ...sampleInitial, documentId: 'a1' } } })
    await wrapper.vm.$.exposed!.__save() // the form's existing exposed save seam (use its real name)
    await new Promise((r) => setTimeout(r, 0))
    expect(loadSnapshot('article', 'a1')).toBeNull()
  })
})
```

Import `saveSnapshot`/`loadSnapshot` from `~/lib/draft-backup` and reuse the file's existing `sampleInitial`-style fixture and save seam — READ the file first and adapt the three tests to its actual helpers/mocks (the update/persist mock must resolve OK). The test INTENT is binding: banner-on-snapshot, restore-applies, save-clears.

- [ ] **Step 2: Verify the new tests fail.**

- [ ] **Step 3: Implement in `ArticleForm.vue`:**

Script additions:

```ts
import { useDraftGuard } from '~/composables/useDraftGuard'

const draftGuard = useDraftGuard({
  type: 'article',
  documentId: props.mode === 'edit' ? (props.initial?.documentId ?? null) : null,
  model,
})
```

In the save handler, directly after the existing success branch (`res.ok`) and BEFORE any emit/navigation: `draftGuard.markSaved()`.

Template, first element inside the form's root container:

```vue
    <DraftRestoreBanner
      v-if="draftGuard.restoreAvailable.value"
      :saved-at="draftGuard.snapshotSavedAt.value ?? ''"
      @restore="draftGuard.restore()"
      @discard="draftGuard.discard()"
    />
```

- [ ] **Step 4: Green** — `npx vitest run tests/nuxt/article-form.test.ts` (all existing + 3 new). Full suite + typecheck.

- [ ] **Step 5: Commit**

```bash
git add app/components/forms/ArticleForm.vue tests/nuxt/article-form.test.ts
git commit -m "feat(drafts): ArticleForm unsaved-work guard — restore banner, snapshots, clear-on-save"
```

---

### Task 5: Wire AppForm + DatasetForm

**Files:**
- Modify: `app/components/forms/AppForm.vue`, `app/components/forms/DatasetForm.vue`
- Modify: `tests/nuxt/app-form.test.ts`, `tests/nuxt/dataset-form.test.ts` (or the equivalent existing form test files — locate by `ls tests/nuxt/*form*`)

Identical pattern to Task 4 with `type: 'app'` / `type: 'dataset'`. Tests per form: banner-on-snapshot + save-clears (2 each — restore-applies is covered once in Task 4; the wiring is identical). TDD as before; commit:

```bash
git commit -m "feat(drafts): App/Dataset forms gain the unsaved-work guard (same pattern as ArticleForm)"
```

---

### Task 6: Docs + verification

**Files:** `CHANGELOG.md`, `ROADMAP.md`, `docs/ICJIA-Studio-20-rewrite-copperhead.md`, `README.md`

- [ ] Full verification first: `npm test` (expect ~757 + ~20 new, ALL passing) + `npx nuxt typecheck`.
- [ ] `CHANGELOG.md` under `## [Unreleased]`, heading `### 2026-07-16 — unsaved-work guard`: _Added_ — the three protections (leave warning, 30 s local snapshots in live builds, restore banner), the demo warn-only policy (user decision, demo's resets-each-session promise intact), fail-open storage. Real test counts.
- [ ] `ROADMAP.md`: keep under **In progress** reworded to "complete on feature branch, pending merge" (release flow moves it to Done — do NOT bump versions or stamps; the docs-nav guard pins them).
- [ ] Spec status table: add row `| Unsaved-work guard (leave warning, 30 s local backup, restore banner) | Authors can't silently lose in-progress work | **Built** (feature branch; merges with the next release) |` and a "What's changed recently" bullet in the same pending-merge voice.
- [ ] README: extend the author-protection area of the features paragraph with one clause (pending-merge qualified).
- [ ] Commit: `docs: unsaved-work guard — changelog, roadmap, spec row + digest, README (pending-merge qualified)`.

---

## Plan self-review (done at authoring time)

- **Spec coverage:** lib → Task 1; composable incl. demo policy + native dialogs → Task 2; banner UX → Task 3; three-form wiring → Tasks 4–5; docs → Task 6. Clear-on-save invariant tested at both composable (T2) and form (T4/T5) levels.
- **Type consistency:** `useDraftGuard` returns `dirty/restoreAvailable/snapshotSavedAt/restore/discard/markSaved` — Tasks 3–5 consume exactly those; `BackupStore`/`DraftSnapshot` names match Task 1's exports.
- **Known judgment points for implementers (disclosed up front):** Task 2's probe-mount route-guard try/catch fallback; Task 4/5's instruction to adapt test scaffolding to the existing form-test files' real helpers (intent binding, scaffolding flexible).
