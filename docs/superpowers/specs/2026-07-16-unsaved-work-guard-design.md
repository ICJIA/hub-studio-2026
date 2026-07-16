# Unsaved-work guard + local draft backup — design

**Date:** 2026-07-16 · **Status:** Approved (design reviewed in-session) · **Owner:** cschweda

Real authors will trust the Studio with hours of work, and today nothing protects that work
from a closed tab, a crash, or lost Wi-Fi — everything since the last manual save is gone
(analysis-roadmap §5.3-4, the highest-trust item in the launch risk register). This design
adds three protections: a leave-page warning while a form is dirty, a ~30-second local
snapshot of the in-progress draft, and a restore banner when a newer snapshot is found.

## 1. Scope

**In scope**

- **`app/lib/draft-backup.ts`** (pure): snapshot envelope `{ model, savedAt, type,
  documentId | 'new' }` under localStorage key
  `icjia-studio-draft-backup:<type>:<documentId|'new'>`; `saveSnapshot` / `loadSnapshot` /
  `clearSnapshot`; storage injectable for tests; a size guard skips (never throws) when a
  model exceeds the storage budget. *(The domain models carry no `updatedAt`, so the banner
  triggers on snapshot EXISTENCE — valid because every successful save clears the snapshot,
  so a surviving one always represents unsaved work. The banner shows the snapshot's own
  timestamp; a stale cross-machine snapshot is the author's call, and the roadmap's
  edit-conflict item later adds the server-timestamp plumbing.)*
- **`useDraftGuard()`** composable: dirty tracking (serialize-compare the reactive model vs
  a baseline captured at load and reset on save); `beforeunload` warning while dirty;
  `onBeforeRouteLeave` guard while dirty (**native `confirm`** — deliberately not a custom
  modal, the repo's flagged a11y territory); a 30 s snapshot interval while dirty —
  **skipped entirely in demo mode** (user decision: the demo's "nothing is saved / resets
  each session" promise stays exactly true; demo keeps both warnings); `markSaved()` clears
  the snapshot + resets the baseline; `restoreAvailable` / `restore()` / `discard()`.
- **`DraftRestoreBanner.vue`**: banner atop the form (user-chosen UX) — "Unsaved changes
  from ⟨time⟩ found — Restore / Discard". Shown when a snapshot exists that is newer than
  the loaded draft's `updatedAt` (any snapshot, for `mode: 'create'`). Nothing changes
  until clicked; Restore replaces the model (still unsaved); Discard clears the snapshot.
- **Wiring in all three form components** (they own `model` + submit): ArticleForm,
  AppForm, DatasetForm — one composable call each, covering create + edit.

**Out of scope (v1)**

- Cross-device/user recovery (localStorage is per-browser by design; the multi-user case
  is the roadmap's edit-conflict detection item).
- Version history, undo stacks, annotation-overlay snapshots (own store).
- Snapshot encryption (drafts are staff content in the staff member's own browser profile).

## 2. Decisions and rationale

| Decision | Choice | Why |
|---|---|---|
| Restore UX | Banner with Restore/Discard (user decision) | Non-blocking, impossible to trigger accidentally, no modal a11y surface. |
| Demo policy | Warn-only in demo (user decision) | Keeps the audited "resets each session" contract literally true; a presenter still gets the leave warning. |
| Dirty check | JSON-serialize compare vs baseline | Models are plain data (validated shapes); cheap at form scale; no deep-diff dependency. |
| Route-leave dialog | Native `confirm` | Matches `beforeunload`'s native dialog; zero new a11y surface. |
| Snapshot cadence | 30 s while dirty, plus one immediately on `beforeunload` best-effort | The roadmap's stated design; the unload write is free insurance where the browser allows it. |
| Storage failure | Skip + one console.warn | A full/blocked localStorage must never break editing (same fail-open ethos as onboarding). |
| Clear on save | `markSaved()` from the form's successful `submitForm` path | A clean save leaves no residue; the banner can never offer stale pre-save content after a save. |

## 3. Testing

- Unit (`draft-backup`): round trip, keying per type/documentId, newer-than logic, size
  guard, injected storage, clear.
- Nuxt (`use-draft-guard`, fake timers): dirty flips on edit; interval writes only while
  dirty; no writes in demo mode; `markSaved` clears + resets; beforeunload/route-guard
  registration while dirty only.
- Component: banner appears for newer snapshot (edit) / any snapshot (create); Restore
  applies model; Discard clears; successful save clears; per-form wiring smoke tests.

## 4. Documentation

CHANGELOG entry; ROADMAP move to Done at release; spec status-table row + What's-changed
digest entry; README author-protection mention.
