# Edit-conflict detection — design

**Date:** 2026-07-16 · **Status:** Approved (design reviewed in-session) · **Owner:** cschweda

Two people opening the same draft is routine in a review workflow, and today the second save
silently erases the first — no error, no trace (analysis-roadmap §5.3-5). This adds a
save-time conflict check with a warn-and-choose banner: the author may overwrite knowingly
or load the other person's version — and thanks to the unsaved-work guard (v0.6.0), their
own edits survive either way in the local draft backup.

## 1. Scope

**In scope**

- **`updatedAt` surfaced read-only on the domain models** (`BaseContent.updatedAt?: string |
  null`) through all three mappers (Strapi CM responses already carry it; the demo
  repository already stamps it). Never written (the write mappers ignore it).
- **`getUpdatedAt(documentId)` on the repository seam:** live → a fields-limited
  Content-Manager findOne (`fields[0]=updatedAt` — EXACT wire shape asserted in tests, per
  the v0.7.0 wire-format lesson); demo → read from the in-memory store. Plus a pure
  `hasConflict(loadedAt, serverAt): boolean` helper (string compare of ISO stamps; null/
  missing on either side ⇒ no conflict — fail-open for legacy records).
- **Save-flow integration in all three forms:** before persisting an EDIT (create is
  conflict-free), fetch the server `updatedAt` and compare with the value the form loaded.
  On conflict: the save is interrupted and a **ConflictBanner** appears (user decision:
  warn + choose): *"This draft was changed by someone else while you were editing (their
  save: ⟨time⟩)."* with **Save anyway** (retries the save bypassing the check once) and
  **Load their version** (first forces a local snapshot of the author's current edits via a
  new `useDraftGuard.snapshotNow()` — so the restore banner can offer them back — then
  refetches, replaces the model, and resets the dirty baseline; the conflict banner closes
  and the restore banner appears).
- **`useDraftGuard.snapshotNow()`**: explicit best-effort snapshot write (demo-gated like
  all writes), used by Load-their-version.
- A successful save updates the form's remembered `updatedAt` from the response (so
  consecutive saves by the same author never self-conflict).

**Out of scope (v1)**

- True compare-and-set (Strapi CM has no native optimistic concurrency) — a small
  check-then-write race window remains, documented; the roadmap's ask is warn-based.
- Field-level merge/diff UI; annotation-store concurrency (documented last-write-wins
  posture stands); publish-action conflicts (publish is idempotent server-side).

## 2. Decisions and rationale

| Decision | Choice | Why |
|---|---|---|
| Conflict UX | Warn + choose: Save anyway / Load theirs (user decision) | Author stays in control; the draft backup makes Load-theirs non-destructive. |
| Comparison | ISO-string compare of `updatedAt`; missing ⇒ no conflict | Server stamps are authoritative and monotonic per record; fail-open keeps legacy/sparse records saveable. |
| Check timing | At save time only (not polling) | Matches the roadmap's design; polling adds load and UX noise for a staff-sized team. |
| Check transport | Fields-limited findOne | Cheapest correct read; exact bracket-key wire shape pinned by tests (v0.7.0 lesson). |
| Save-anyway semantics | Bypasses the check for THAT save only | A second conflict after another concurrent save re-warns — never a standing override. |
| Demo parity | Same check against the in-memory store's stamps | Demo store is per-tab (module-level map, no cross-tab sync) — collision reproduction is a two-browser staging-rehearsal exercise, not a two-demo-tab one. |

## 3. Testing

- Unit: mappers surface `updatedAt` (all three, read-mappers only — write payloads never
  carry it); `hasConflict` truth table (newer/equal/older/null combinations);
  `getUpdatedAt` live wire shape (`fields` param exact) + demo store read.
- Nuxt: `snapshotNow()` writes immediately (and not in demo); form save-flow — no-conflict
  save proceeds and refreshes the remembered stamp; conflicted save blocks + banner with
  their timestamp; Save anyway persists; Load theirs snapshots-then-replaces-then-resets
  (restore banner appears; conflict banner gone); create-mode never checks.
- All existing suites green (mappers gain a field — snapshot/fixture updates disclosed).

## 4. Documentation

CHANGELOG; ROADMAP (move to Done at release; this item also upgrades the unsaved-work
guard's cross-machine stale-restore caveat — note that); spec status row + digest bullet;
README clause; runbook note that the staging rehearsal should include a two-browser
conflict round-trip. Release as v0.8.0.
