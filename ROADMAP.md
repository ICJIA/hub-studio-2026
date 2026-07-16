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

_Last updated: 2026-07-16 · Current version: v0.4.0_

## Done (recent)

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

- **Media-library picker (library-first images, demo parity)** — every image surface opens
  on the ~20 newest Media Library images (searchable) with upload-from-desktop as the second
  path; alt-less library picks require alt text and write it back; identical behavior in the
  demo where nothing persists. Spec + 10-task implementation plan committed 2026-07-16
  (`docs/superpowers/specs/2026-07-16-media-library-picker-design.md`); implementation
  underway on a worktree branch.

## Next (proposed)

Ordered per the 2026-07-16 planning decision (analysis-roadmap §5 items, re-prioritized):

1. **Unsaved-work guard + local draft backup** — warn on navigating away with unsaved
   changes; ~30 s draft snapshots with a "restore unsaved draft?" prompt. The highest-trust
   author protection (analysis-roadmap §5.3-4).
2. **Title search on content lists** — server-side search beside the type filter; launch
   imports 236 real articles (§5.3-6).
3. **Edit-conflict detection** — send `updatedAt` with saves; warn instead of silently
   overwriting a colleague's changes (§5.3-5).
4. **Staging Strapi-host override** — honor `NUXT_PUBLIC_STRAPI_BASE_URL` so a rehearsal
   can never touch production data (§5.4-8).
5. **Error monitoring + uptime checks** — a CSP-compatible client reporter and probes,
   alerting before authors report breakage (§5.4-7).
6. **Smalls** — relation-write support (or document the read-only limitation), merge the
   pending green Dependabot PRs, schedule the four accessibility riders.

## Deferred (with rationale)

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
**Hub Studio 2.0 · Studio build v0.4.0** — for managers monitoring this project:
[Spec & status](https://github.com/ICJIA/copperhead-studio-20/blob/main/docs/ICJIA-Studio-20-rewrite-copperhead.md) ·
[What's changed (changelog)](https://github.com/ICJIA/copperhead-studio-20/blob/main/CHANGELOG.md) ·
[What's next (roadmap)](https://github.com/ICJIA/copperhead-studio-20/blob/main/ROADMAP.md) ·
[README](https://github.com/ICJIA/copperhead-studio-20/blob/main/README.md) ·
[Live demo](https://studio-2026.netlify.app)

*These links always open the latest rendered version of each document.*
