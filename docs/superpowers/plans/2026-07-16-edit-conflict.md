# Edit-Conflict Detection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A save-time conflict check on all three edit forms — warn-and-choose (Save anyway / Load their version) instead of silent overwrite, with the author's own edits protected by the draft backup either way.

**Architecture:** `updatedAt` surfaced read-only through the mappers; `getUpdatedAt()` on the repository seam (fields-limited CM findOne live; store read in demo) + a pure `hasConflict()`; a `ConflictBanner` and a save-flow branch in the three forms; `useDraftGuard.snapshotNow()` so Load-theirs preserves the author's edits.

**Tech Stack:** Nuxt 4 / Vue 3 / Nuxt UI 4, Vitest 4 (established `tests/unit` + `tests/nuxt` patterns).

**Spec:** `docs/superpowers/specs/2026-07-16-edit-conflict-design.md` (approved 2026-07-16).

## Global Constraints

- `updatedAt` is READ-ONLY: read mappers surface it; write payloads must never include it (assert in tests).
- `hasConflict(loadedAt, serverAt)`: conflict ⇔ both present AND `serverAt !== loadedAt` AND `serverAt > loadedAt` (ISO string compare); any missing/null side ⇒ false (fail-open for legacy records).
- Wire discipline (v0.7.0 lesson): `getUpdatedAt`'s live request asserts the EXACT query — bracket-key `fields` param (verify the CM findOne fields syntax against how `repository.ts` already encodes params post-flattenFilters; use the same style and pin it in the test).
- Save-anyway bypasses the check for that ONE save only; a successful save refreshes the form's remembered stamp from the response.
- Create mode never checks. Demo parity via the store's stamps (no demo-gating of the CHECK — only `snapshotNow`'s WRITE is demo-gated like all snapshot writes).
- Existing tests unchanged except disclosed fixture updates for the new mapper field.
- TDD; no new deps; targeted runs then full suite (822/107 baseline) + `npx nuxt typecheck` per commit. **No AI trailers.**

---

### Task 1: `updatedAt` through types + mappers; `hasConflict`; `getUpdatedAt`

**Files:**
- Modify: `app/types/content.ts` (BaseContent), `app/lib/mappers/article.ts`, `app/lib/mappers/app.ts`, `app/lib/mappers/dataset.ts`, `app/lib/repository.ts`
- Create: `app/lib/edit-conflict.ts` (pure `hasConflict`)
- Test: existing mapper/repository test files + `tests/unit/edit-conflict.test.ts`

**Interfaces (produced):**
- `BaseContent.updatedAt?: string | null`
- `hasConflict(loadedAt: string | null | undefined, serverAt: string | null | undefined): boolean`
- `Repository<T>.getUpdatedAt(documentId: string): Promise<string | null>` (live: fields-limited findOne; demo: store read)

- [ ] Steps: TDD per file — READ each mapper/repo test file first and follow its patterns. Mapper tests: read-mapper surfaces `updatedAt` from the CM fixture; WRITE payload for each type asserts `updatedAt` absent. `edit-conflict.test.ts`: full truth table (newer ⇒ true; equal/older/either-null/both-null ⇒ false). Repository test: `getUpdatedAt` wire shape pinned exactly + returns the stamp; demo-repository test: returns the stored stamp, null for unknown id. Implement minimally; suite + typecheck; commit: `feat(conflict): updatedAt surfaced read-only; hasConflict + Repository.getUpdatedAt (wire-pinned)`.

---

### Task 2: `useDraftGuard.snapshotNow()`

**Files:** Modify `app/composables/useDraftGuard.ts`; test `tests/nuxt/use-draft-guard.test.ts`.

**Interfaces:** the guard's return gains `snapshotNow(): void` — immediate best-effort snapshot (demo-gated like all writes; no-op when clean is NOT required — it snapshots current state regardless of dirty, since Load-theirs calls it exactly when the model is about to be replaced).

- [ ] TDD: tests — live mode writes immediately with current model; demo mode writes nothing; commit: `feat(drafts): snapshotNow — explicit immediate snapshot for conflict Load-theirs`.

---

### Task 3: ConflictBanner + ArticleForm save-flow (reference integration)

**Files:**
- Create: `app/components/ConflictBanner.vue`
- Modify: `app/components/forms/ArticleForm.vue`
- Test: `tests/nuxt/conflict-banner.test.ts`, `tests/nuxt/article-form.test.ts`

**Interfaces:**
- `<ConflictBanner :their-saved-at="string" @save-anyway @load-theirs />` — `role="alert"` (this one interrupts a user action, unlike the restore banner's polite status), warning-tinted, copy: `This draft was changed by someone else while you were editing (their save: ⟨time⟩).` Buttons **Save anyway** / **Load their version**. data-test: `conflict-banner` / `conflict-save-anyway` / `conflict-load-theirs`.
- ArticleForm pattern (produced for Task 4): remember `loadedUpdatedAt` (from `props.initial?.updatedAt`, refreshed after every successful save from `res.saved?.updatedAt` — verify the update path returns it once Task 1's mapper lands); in the save handler, EDIT mode only: `const serverAt = await repo.getUpdatedAt(documentId)`; `if (hasConflict(loadedUpdatedAt, serverAt) && !bypassOnce) { conflictAt = serverAt; return }` (no persist); Save-anyway sets a one-shot bypass and re-invokes save; Load-theirs: `draftGuard.snapshotNow()` → `repo.findOne(documentId)` → replace model wholesale → `loadedUpdatedAt = fresh.updatedAt` → reset guard baseline (`markSaved()` semantics — but do NOT clear the just-written snapshot! Use a new baseline-only reset OR reorder: snapshotNow AFTER markSaved-style reset would lose the edits — so: snapshotNow() FIRST, then reset baseline WITHOUT clearing storage. `markSaved()` clears the snapshot — that's wrong here. Add to Task 2 a `resetBaseline()` (baseline := current model, storage untouched) and use it; document the distinction in the guard's comments.)
- Also: the conflict banner and the restore banner may render together after Load-theirs — the restore banner SHOULD appear (snapshot exists) and the conflict banner should close. Assert that composition.

- [ ] TDD: banner component tests (copy/emits/role); form tests — no-conflict edit save proceeds + refreshes stamp (getUpdatedAt returns loaded value); conflicted save blocks, persists nothing, banner shows their time; Save-anyway persists exactly once and clears the banner; Load-theirs snapshots (storage has the author's edits), replaces the model with the refetched one, resets dirty, closes conflict banner, restore banner appears; create-mode save never calls getUpdatedAt. Update Task 2's guard for `resetBaseline()` here if not folded into Task 2 (implementer's choice — disclose). Commit: `feat(conflict): ConflictBanner + ArticleForm save-time check — warn and choose, edits preserved`.

---

### Task 4: App/Dataset forms (same pattern)

**Files:** `app/components/forms/AppForm.vue`, `app/components/forms/DatasetForm.vue` + their test files.

- [ ] Copy the ArticleForm pattern exactly (`type`-appropriate repos); 2–3 tests per form (conflict blocks + Save-anyway; Load-theirs happy path once). Commit: `feat(conflict): App/Dataset forms gain the save-time conflict check`.

---

### Task 5: Docs + verification

- [ ] Suite + typecheck first (expect ~845/108±). CHANGELOG under Unreleased (`### 2026-07-16 — edit-conflict detection`; note the guard synergy + the small check-then-write window honestly); ROADMAP In-progress entry (pending-merge voice) + remove item from Next + note the guard's cross-machine stale-restore caveat is now mitigated; spec row + digest bullet (pending-merge); README clause (pending-merge); runbook §2: add the two-browser conflict round-trip to the staging rehearsal. docs-nav 6/6. Commit: `docs: edit-conflict detection — changelog, roadmap, spec row + digest, README, runbook rehearsal step`.

---

## Plan self-review (done at authoring time)

- Spec coverage: §1 all bullets → Tasks 1–4; decisions table encoded in Global Constraints; §3 tests distributed per task; §4 docs → Task 5.
- Type consistency: `updatedAt?: string | null`, `hasConflict(loadedAt, serverAt)`, `getUpdatedAt(documentId)`, `snapshotNow()`, `resetBaseline()` — names used identically across tasks.
- Known judgment points disclosed: the CM `fields` query syntax must be verified in-repo before pinning; `resetBaseline` placement (Task 2 or 3, implementer's choice); update-path `updatedAt` refresh depends on the update response carrying it (verify mapper coverage of the update round-trip in Task 1).
