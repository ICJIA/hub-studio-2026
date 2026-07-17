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

_Last updated: 2026-07-17 · Current version: v0.8.3_

## Done (recent)

- **The smalls — §5 closeout: relation posture, a11y riders scheduled, dependency
  currency** (v0.8.3, 2026-07-17) — the last item of the 2026-07-16 priority queue.
  Relation editing stays read-only by decision (runbook §6 records the posture — saves
  structurally cannot destroy admin-curated links; build-in sketch under Deferred below).
  The four accessibility riders are scheduled as Next №1. Dependencies brought current:
  CI actions checkout v7 / setup-node v7, plus the 13-update minor-and-patch group
  (@nuxt/ui 4.10, vue 3.5.40, CodeMirror suite, vitest 4.1.10, …) — Dependabot's group
  lockfile was broken (missing `commander@13.1.0`, `npm ci` failed on every job), so the
  lockfile was regenerated locally and the full gate matrix re-proven green. Majors
  remain scheduled (Next №2). 868 tests / 109 files on the bumped tree.
- **Uptime monitoring runbook'd; error reporter formally deferred** (v0.8.2, 2026-07-17) —
  the operations half of analysis-roadmap §5.4-7, docs-only: runbook §4a instructs the
  UptimeRobot free-tier setup (Studio URL monitor + Strapi `/_health` monitor — the
  endpoint returns 204 unauthenticated, verified against the production host; alerts to a
  shared inbox; optional staging monitor during the rehearsal), and the cutover checklist
  gains "monitors live and alerting." The client error reporter (Sentry) is **deferred by
  the 2026-07-17 decision** — to be built in at a later date; design notes recorded below
  under Deferred so the future build-in starts warm. No code, dependency, or CSP change.
- **Staging Strapi-host override — verified and guarded** (v0.8.1, 2026-07-17) — the
  sharpest edge in the launch plan (a rehearsal that could touch production data,
  analysis-roadmap §5.4-8) is closed without a code change: `NUXT_PUBLIC_STRAPI_BASE_URL`
  provably overrides the hardcoded host via Nuxt's runtime-config mechanism — baked into
  static output at generate time, resolved at **server runtime** for the production
  (`npm run build`) deploy (both paths verified empirically; on Netlify, set it via the
  UI/CLI — Functions scope by default — since `netlify.toml` vars never reach
  Functions). CI boots the built production server with a sentinel override
  and fails unless the served page carries it (and doesn't carry the hardcoded host), so
  the mechanism can never silently rot; the runbook's staging section replaces its
  "writes to production unless you edit code" warning with the verified env instructions,
  the paired CSP `connect-src` step, and an env-scope troubleshooting note.
- **Edit-conflict detection (save-time check, warn and choose)** (v0.8.0, 2026-07-17) —
  two editors can no longer silently overwrite each other (analysis-roadmap §5.3-5): a
  fields-limited draft-stamp check before every edit-mode save raises a warn-and-choose
  banner (**Save anyway** / **Load their version**); Load-theirs snapshots the author's
  edits first, so the v0.6.0 restore banner hands them back — the two protections now
  compose into full lost-update coverage, with restore reseeding the stamp so stale
  restores are caught at the next save. Race-guarded end to end (two reviewer-found
  Criticals closed with layered RED-proven tests); verified live. 868 tests / 109 files.
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

- _Nothing in flight at this release. The 2026-07-16 priority queue is complete; the
  accessibility riders (№1 below) are the next scheduled work._

## Next (proposed)

Ordered per the 2026-07-16 planning decision (analysis-roadmap §5 items, re-prioritized):

1. **Accessibility riders** (scheduled 2026-07-17; analysis-roadmap §5.4-10) — the four
   screen-reader/keyboard refinements from the annotations review, as one small release:
   color-swatch **radiogroup** semantics; **roving tabindex** on the annotation toolbar;
   **dialog semantics** on the annotation drawer; scoping the **document-level
   keyboard-create listener**. The app measures AA-clean today — these are refinements,
   not fixes.
2. **Dependabot majors** (as compatibility windows allow): markdown-it-attrs 5 (PR #8
   open), pinia 4 + @pinia/nuxt 1, TypeScript 7 — each needs its own compatibility pass;
   minors/patches and CI-action bumps are merged as they arrive.

## Deferred (with rationale)

- **Relation editing in the Studio** (decided 2026-07-17: document, don't build yet) —
  the forms show related content (article ↔ apps ↔ datasets) read-only; linking stays in
  the Strapi admin, and Studio saves structurally cannot destroy links (write payloads
  omit relation fields; Strapi leaves omitted fields untouched — runbook §6 records the
  posture). Build-in sketch when wanted: Strapi Content-Manager writes accept
  `{ connect: [documentId…], disconnect: [documentId…] }` per relation field; UI would be
  a searchable picker (the media-library grid pattern) on the three forms
  (`RelationList.vue` becomes editable), with demo parity via the in-memory store and the
  usual test-first pipeline. Revisit after real author usage shows demand.
- **Sentry client error reporter** (§5.4-7's other half) — deferred by the 2026-07-17
  decision: management will build it in at a later date; the uptime half shipped in
  v0.8.2. Design notes for the future build-in (so it starts warm): a client-only
  `@sentry/vue` plugin following the `app/plugins/` pattern, DSN-gated and fail-open
  (no `NUXT_PUBLIC_SENTRY_DSN` → structurally a no-op, so the app never depends on the
  account existing); demo builds fully excluded, preserving the demo CSP's documented
  zero-third-party-requests promise; release tag from the existing
  `runtimeConfig.public.version`; `environment` from an env var so staging and production
  separate; one production-CSP `connect-src` addition (the org's Sentry ingest host) in
  `public/_headers` when it lands, demo headers untouched; source-map upload optional via
  an `SENTRY_AUTH_TOKEN`-gated build step (absent token = silently skipped); server-side
  (Nitro) capture deliberately out of scope — the lone email route fails loud to the
  client and logs to Netlify function logs.

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
**Hub Studio 2.0 · Studio build v0.8.3** — for managers monitoring this project:
[Spec & status](https://github.com/ICJIA/copperhead-studio-20/blob/main/docs/ICJIA-Studio-20-rewrite-copperhead.md) ·
[What's changed (changelog)](https://github.com/ICJIA/copperhead-studio-20/blob/main/CHANGELOG.md) ·
[What's next (roadmap)](https://github.com/ICJIA/copperhead-studio-20/blob/main/ROADMAP.md) ·
[README](https://github.com/ICJIA/copperhead-studio-20/blob/main/README.md) ·
[Live demo](https://studio-2026.netlify.app)

*These links always open the latest rendered version of each document.*
