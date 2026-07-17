# Roadmap — Hub Studio 2.0

Living roadmap for the ICJIA Research Hub Studio (the authoring half of the Hub 2.0
publishing project, internal codename Copperhead). Kept current with every substantive
change: shipped work moves to **Done**, and **In progress** / **Next** are reconciled with
each planning decision. For the version-by-version history see
[CHANGELOG.md](https://github.com/ICJIA/copperhead-studio-20/blob/main/CHANGELOG.md); for
the full design see the
[Design & Implementation Spec](https://github.com/ICJIA/copperhead-studio-20/blob/main/docs/ICJIA-Studio-20-rewrite-copperhead.md).
A guard test (`tests/unit/docs-nav.test.ts`) fails the build if this file's version stamp
falls behind a release.

_Last updated: 2026-07-16 · Current version: v0.7.0_

## Done (recent)

- **Title search on content lists** (v0.7.0, 2026-07-16) — a labeled, debounced search box
  beside the Type filter on all three content types, filtering by title across the whole
  library server-side, identically in live and demo; re-pages to 1; distinct "No matches"
  state. The release also fixes a latent live-mode filter-serialization defect uncovered
  by the whole-branch review (the existing type filter was affected too — invisible until
  now because demo/dev run in-memory; final wire confirmation is a named staging-rehearsal
  step). Verified live in the demo. 822 tests / 107 files.
- **Unsaved-work guard + local draft backup** (v0.6.0, 2026-07-16) — the highest-trust
  author protection (analysis-roadmap §5.3-4): a native leave-page warning
  (`beforeunload` + a route-leave confirm), a 30-second local snapshot of the in-progress
  draft while dirty (live builds only — the demo deliberately takes none, keeping its
  "resets each session" promise literally true), and a non-blocking restore banner;
  every successful save clears the backup. Six tasks, test-first, per-task adversarial
  review; verified end-to-end in the running app. 800 tests / 107 files.
- **Media-library picker (library-first images, demo parity)** (v0.5.0, 2026-07-16) — every
  image surface opens on the ~20 newest Media Library images (searchable, Load more) with
  upload-from-desktop one tab away; alt-less library picks require alt text and write it
  back to the shared record (`updateFileInfo`); the MediaField alt-persistence quirk is
  fixed; the body-images tray gains Add-from-library (demo auto-seed removed); demo desktop
  uploads are session-only `blob:` images that structurally cannot reach a Strapi write.
  Ten tasks, built test-first with per-task adversarial review; verified end-to-end in the
  running demo. 757 tests / 104 files.
- **Manager-docs workflow** (v0.4.0, 2026-07-16) — this roadmap; bottom navs with version
  stamps across the manager-facing docs; in-app bottom status bar (version + Spec & status /
  Changelog / Roadmap / Repository); in-app `/spec` page rendering the design spec with
  `.md`/`.docx` downloads; docs-currency guard test.
- **Body markdown linter** (v0.3.0, 2026-07-11) — "Check" button in the editor flags
  heading/link/image problems with jump-to-line results; recovered from a stranded branch,
  reviewed, merged. 677 tests / 97 files at release.
- **CI pipeline + search-engine exclusion + docs currency** (v0.2.0, 2026-07-11) — typecheck,
  full suite, production and demo builds on every push/PR, with the dev-bypass bundle guard;
  `noindex` headers + deny-all robots.txt; README/spec/audit-log refresh.
- **Four independent red/blue-team security audits** (June 21 ×2, June 22, July 5) — zero
  critical, zero open high/medium; every in-repo fix covered by tests.
- **Reviewer annotations, tab-only preview, card-view lists, guided tour, public demo with
  Author/Editor roles** (June–July) — the core authoring/review surface; see the spec's
  "What's working today."

## In progress

- **Edit-conflict detection (save-time check, warn and choose)** — complete on the feature
  branch — all five tasks built test-first with per-task adversarial review; pending the
  whole-branch review and merge. Next on the launch queue (analysis-roadmap §5.3-5): a
  fields-limited `updatedAt` read before every edit-mode save catches a colleague's
  concurrent change (fails open on any check error) and raises a `role="alert"` banner
  offering **Save anyway** or **Load their version** — the latter snapshots the author's
  own edits first, so the v0.6.0 restore banner can offer them back afterward. Race-guarded
  end to end; works identically in the public demo. 867 tests / 109 files on the branch.

## Next (proposed)

Ordered per the 2026-07-16 planning decision (analysis-roadmap §5 items, re-prioritized):

1. **Staging Strapi-host override** — honor `NUXT_PUBLIC_STRAPI_BASE_URL` so a rehearsal
   can never touch production data (§5.4-8).
2. **Error monitoring + uptime checks** — a CSP-compatible client reporter and probes,
   alerting before authors report breakage (§5.4-7).
3. **Smalls** — relation-write support (or document the read-only limitation), merge the
   pending green Dependabot PRs, schedule the four accessibility riders.

## Deferred (with rationale)

- **Unsaved-work-guard follow-ups** (from the v0.6.0 whole-branch review — none affect
  correctness for launch; the cross-machine stale-restore risk flagged at the time — a
  restore trusting local-snapshot existence over a possibly-newer server version — is now
  FULLY MITIGATED: Restore reseeds the form's remembered `updatedAt` to the restored
  snapshot's own embedded stamp, not the page's load-time stamp, so the edit-conflict check
  on the very next save compares against the CURRENT server stamp and correctly fires if
  anything changed since the snapshot was taken — closing the gap a same-session
  restore-then-save would otherwise leave, not just the across-a-reload case): reseed
  MediaField's alt/caption persist-baseline after a banner Restore (a stale restore can
  otherwise re-arm one redundant media-record write-back); decide whether explicit logout
  should clear draft snapshots (shared-machine courtesy — must NOT hook the 401/403
  session-clear paths, which would destroy the feature's headline crash-recovery
  scenario); guard the dirty-check serialization against non-JSON-serializable models
  (latent — no current model shape can trigger it); two small test riders (30 s
  default-interval path; banner invalid-date fallback); boot-time sweep of aged snapshot
  keys (no GC today, ≤1 MB each).

- **Playwright end-to-end suite** — post-launch per the analysis roadmap; automates the
  cutover smoke checklist against deploy previews (§5.5).
- **Annotation RBAC tightening** — after real usage patterns are known; the coarse launch
  posture is documented and audit-accepted.
- **BFF / HttpOnly token handling** — only if exposure grows (more users, external
  reviewers); the CSP is the audit-accepted compensating control today.
- **Body-images panel redesign & page-aware tours** — spec'd July 8; sequence against real
  author feedback.

## Blocked on R&A (not code)

- Create the **`studio-profile`** Strapi type (turns on first-login onboarding; the app
  fails open until then).
- Install the **`review-annotation`** Strapi type (switches reviewer comments from
  per-browser to shared; drop-in folder ships in `deploy/strapi/review-annotation/`).
- **Mailgun keys** into Netlify env (review-request email).
- **Publish → rebuild webhook** (one connection in Strapi to the public site's hosting).
- **Real staff accounts** for the dress rehearsal — including a true Author account to
  prove drafts-only under real conditions.
- The real **centers list** for onboarding (placeholder ships today).

## Launch coordination

- Staging rehearsal per the runbook (`docs/demo-to-production.md` §2), then the ~30-minute
  cutover (§3–§4) with one-click rollback. Custom-domain decision must precede any
  announcement (HSTS pins hostnames).

---

<!-- studio-bottom-nav -->
**Hub Studio 2.0 · Studio build v0.7.0** — for managers monitoring this project:
[Spec & status](https://github.com/ICJIA/copperhead-studio-20/blob/main/docs/ICJIA-Studio-20-rewrite-copperhead.md) ·
[What's changed (changelog)](https://github.com/ICJIA/copperhead-studio-20/blob/main/CHANGELOG.md) ·
[What's next (roadmap)](https://github.com/ICJIA/copperhead-studio-20/blob/main/ROADMAP.md) ·
[README](https://github.com/ICJIA/copperhead-studio-20/blob/main/README.md) ·
[Live demo](https://studio-2026.netlify.app)

*These links always open the latest rendered version of each document.*
