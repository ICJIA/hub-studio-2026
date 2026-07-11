# ICJIA Research Hub Studio 2026

## Application Analysis, Improvement Recommendations, and Launch Roadmap

**Date:** July 11, 2026
**Status of the application reviewed:** `main` @ `d78a7ab` (all verification re-run for this report)
**Audience:** written for both non-technical managers and technical developers — each section opens in plain English, with developer detail following.

---

## 1. TL;DR — the 30-to-60-second version

> **Rushed? This section is all you need.** Everything after it is optional depth — §2–§9 for managers who want the reasoning and the plan, and the companion documents (bundled as Appendices A–C in the Word edition) for developers who want the technical specifics.

- **What this is:** the Studio — the private tool ICJIA staff will use to write, review, and publish Research Hub content. The Research Hub is roughly **half of everything read on the agency's website**, so this tool is the production line for the site's flagship content.
- **See it yourself in two minutes:** open **<https://studio-2026.netlify.app>**, click **Enter as Editor**, take the short built-in tour, open an article, publish it. It is the real tool with a safety switch on — nothing done there can touch any real system.
- **Is it done?** Yes — built and working. **677 automated checks pass on every change**, and **four independent security audits found zero critical issues** (Appendix B is the full record).
- **Is the demo different from the real thing?** No. Demo and live are the **same application, one switch apart**. Going live is setup + a rehearsal + a **~30-minute switch** with one-click rollback (Appendix C is the step-by-step plan) — no new building.
- **What's left before launch:** a short setup list owned mostly by Research & Analysis — staff accounts, two storage types in the content system, email keys — then a dress rehearsal with real accounts.
- **When:** demos run through early August 2026; the tool can be live within days of approval once that setup is done.
- **What this review found:** **no blockers.** A short list of inexpensive improvements — three were finished the same day as this review; the most important ones remaining protect authors from losing unsaved work. One already-finished feature (a draft-checking tool) was rescued from an accidentally deleted branch and has since been merged (§5.1).
- **What managers need to decide (§8):** the approval date, the web address, whether the demo stays up after launch, and who owns the content-system and email setup.

*Verified July 11, 2026: 677/677 tests passing, clean type check, WCAG 2.1 AA accessible in light and dark, four audits with zero open critical/high/medium findings. The full design specification is Appendix A.*

---

## 2. How to read this document

| If you are… | Read… |
|---|---|
| A rushed manager | **§1 only** — it was written for you |
| A manager who wants the picture and the plan | §1 (TL;DR), §3 (what it is), §6 (demo vs. live), §7 (roadmap), §8 (decisions we need from you) |
| A developer joining or reviewing the project | Everything, especially §4 (how quality is evidenced), §5 (recommendations, with file references) |
| Anyone deciding "is this ready?" | §4 (current state) and §6 (what actually changes at launch) |

This document deliberately does **not** repeat the two big existing references: the [Design & Implementation Spec](ICJIA-Research-Hub-Studio-2026-Design-and-Implementation-Spec.md) (what the Studio is and why it's built this way) and the [Security Audit](security-audit.md) (the full red/blue-team record). It analyzes the application as it stands, recommends improvements, and lays out the path to launch.

---

## 3. What the application is

**Plain English.** The Studio is a private website where ICJIA research staff write and publish content for the public Research Hub. An **Author** signs in, writes in a friendly editor (formatting buttons, live preview — no coding), adds images from a media library, and saves a draft. Reviewers can highlight passages of the draft and leave threaded comments, exactly like margin comments in Microsoft Word. When the draft is ready, an **Editor** clicks **Publish**; the public website rebuilds itself automatically. That is the whole lifecycle: *Authors draft → Editors publish.*

**Technical shape.** A Nuxt 4 single-page application (Vue 3, TypeScript, `ssr: false`) talking exclusively to Strapi 5's admin Content-Manager API — no public REST/GraphQL surface in the critical path. Clean layering: pages/components → composables → a pure-TypeScript `app/lib/` core (validators, repositories, markdown pipeline, URL allowlist) → a typed `$api` client. State is one Pinia auth store persisted to a cookie; everything else is composable-local. One Nitro server route (the rate-limited review-email relay) deploys as a Netlify Function in production. Roughly 130 source files, ~60 of them pure logic modules that are unit-testable without a browser — which is exactly where the test suite concentrates.

Two properties of the architecture are worth calling out because everything else in this report leans on them:

1. **The demo seam.** Every difference between the public demo and the real tool keys off one flag. Demo builds swap the data layer for an in-memory repository (`isDemoData()`), hard-block all writes (`assertWritesAllowed()` throws before any network call), blank the backend URL, and ship a browser security policy (`connect-src 'self'`) that makes the real backend unreachable *even if every JavaScript guard were bypassed*. This is why the demo can sit on a public URL.
2. **The adapter seam for annotations.** Reviewer comments are stored behind an `AnnotationStore` interface: browser `localStorage` during the demo weeks, and a **fully built, fully tested Strapi adapter that ships dormant** and activates automatically for real signed-in sessions. Launch does not wait on annotation work; it waits only on installing the matching content type on the Strapi side (a documented drop-in under `deploy/strapi/review-annotation/`).

---

## 4. Current state: what's built, and how we know it works

**Plain English.** "It works on my machine" is not evidence. This project's claims are backed by an automated test suite, independent security audits, and accessibility measurements — and all of the repeatable checks were **re-run fresh for this report** rather than taken on faith.

### 4.1 Verification performed for this analysis (July 11, 2026)

| Check | Result |
|---|---|
| Full test suite (`npm test`) | **649 tests / 95 files — all passing** at the morning assessment (10.3 s); **661 / 96** after the same-day §5.2 items; **677 / 97 — all passing** after the linter-branch merge later that day |
| TypeScript check (`npm run typecheck`) | **Clean — zero errors** |
| Security audit record | Four red/blue-team rounds (June 21, June 21, June 22, July 5) — **0 critical / 0 high / 0 medium open**; the one High ever found (missing CSP headers) was fixed the same day it was reported |
| Accessibility | WCAG 2.1 AA, axe-verified **0 violations in light and dark**; measured contrast on the newest surfaces 5.78–17.83:1 (AA floor is 4.5) |
| Dependency health | `npm audit`: 0 critical/high/moderate; 1 known dev-only Low (esbuild); Dependabot active |
| Code hygiene | **Zero** `TODO`/`FIXME`/`HACK` markers in application code |
| Repository state | `main` clean and pushed; **one orphaned feature branch discovered and re-protected** (§5.1) |

*(Small drift note, since resolved: the README advertised 647 tests against an actual 649 at assessment time; the same-day documentation pass brought the README, spec, audit log, and runbook current — refreshed to 677 after the linter merge.)*

### 4.2 Strengths worth preserving

These are not generic compliments; they are specific practices that should survive contact with launch pressure.

- **Defense-in-depth as a habit.** Every protection exists at two or more layers: publish rights are enforced by Strapi server-side *and* hidden in the UI; base64 images are rejected by the form *and* by a guard at the repository write boundary; the demo is isolated by in-memory data *and* a write-block *and* an unreachable-network CSP. The audits repeatedly credit this pattern.
- **Pure-function core.** Validators, mappers, the URL allowlist, the markdown pipeline, annotation anchoring/layout math — all plain TypeScript with no framework dependency, which is why 677 tests run in ten seconds and why the audit could verify behavior by reading small, focused modules.
- **A single, tight XSS seam.** All author content renders through one markdown pipeline with raw HTML disabled (`html: false`) and an id/class-only attribute allowlist; there are exactly three `v-html` sinks in the app, all fed by that pipeline. Every URL that reaches an `href` or `src` passes one allowlist function (`safeHref`).
- **Documentation as part of the deliverable.** The cutover runbook, the Strapi install guides, the audit log, and the changelog discipline mean this project is *transferable* — a second developer could pick it up from the repo alone. For a small team, that is risk management, not paperwork.
- **The demo-first strategy itself.** Stakeholders are evaluating the real application (same code, same tests), not a mockup — while the audited isolation keeps a public URL risk-free.

### 4.3 Known, deliberate launch-posture decisions

Documented in the runbook §6 and accepted in audit §9 — listed here so nobody rediscovers them as "issues" later: annotation freshness is refetch-on-open/after-write (no live push; simultaneous replies to the same thread are last-write-wins); annotation permissions at the API level are coarse for launch (any Author/Editor can modify annotation rows — the UI enforces the polite creator-or-editor rules); demo annotations deliberately do not migrate to production (they live in individual browsers, against synthetic content).

---

## 5. Analysis: gaps and recommended improvements

**Plain English.** Nothing below stops the demo or blocks the launch. These are the things a healthy project fixes *before they matter*: most protect against rare-but-expensive events (lost work, silent breakage), and several take under a day. Each item says what it is, why it matters in practice, roughly what it costs, and when to do it.

### 5.1 Immediate: decide the fate of the recovered body-linter branch

**Finding (made during this review).** The markdown **body linter** — a "Check" button in the editor that flags heading/link/image problems in a draft before publication — was completed on July 8, passed its code reviews, and ran green at 665 tests. But its branch was deleted **without ever being merged or pushed**; the five commits survived only in git's local reflog on this one machine, where they would eventually be garbage-collected. As part of this analysis the branch pointer was restored (branch `feat/body-lint-and-image-reset`, tip `8199b8a`) so the work is no longer at risk.

**Why it matters.** Beyond the feature itself: the deployed public demo builds from `main`, so the linter that was verified locally on July 8 is **not in the demo stakeholders are clicking today**. And the episode reveals a process gap — completed work existed nowhere but one laptop's reflog.

**Recommendation.** (a) Review and merge (or consciously reject) the branch — it is small and was already approved once; (b) push it to the remote either way so the history is off this single machine; (c) adopt the habit of pushing feature branches at end of day, merged or not. *Effort: half a day including re-review.*

**Outcome (2026-07-11, later the same day):** the branch was pushed to the remote and then **merged to `main`** by user decision; the merged tree passes **677/677 tests (97 files)** with a clean typecheck, and the Check-button linter now ships in the editor.

### 5.2 High value, low effort — do during the demo window

| # | Recommendation | Why it matters (plain English) | Evidence in repo | Effort |
|---|---|---|---|---|
| 1 | ✅ **Done 2026-07-11 — CI pipeline added** (`.github/workflows/ci.yml`: typecheck + all tests + a production build + the demo build on every push/PR, with a dev-bypass **bundle-guard positive control** and the production *absence* check staged as a commented launch gate — the bypass deliberately ships-but-unreachable while the public demo depends on it) | The tests only ran when a developer remembered to run them; a broken commit could land silently. CI also removes the "single laptop" risk from §5.1 and gives managers a visible green/red signal per change. | Was: `.github/` contained only `dependabot.yml` | 0.5–1 day |
| 2 | ✅ **Done 2026-07-11 — search-engine exclusion shipped** (`X-Robots-Tag: noindex` in both header sets + a deny-all `robots.txt`, unit-test-guarded) | The Studio is an internal tool on a public URL; its login page shouldn't be discoverable via Google. Was flagged as "optional hardening" in the runbook. | Was: absent from both header sets; no `robots.txt` | < 0.5 day |
| 3 | ✅ **Done 2026-07-11 — documentation currency pass** (README, Design Spec, security-audit delta log, and runbook all brought to the verified 661-test / four-audit / CI state; spec's "planned" sections updated to shipped) | The README and spec are the project's public face and their precision is part of its credibility; the spec still described June's state (375 tests, editor "planned"). | §4.1 drift note | minutes–hours |

### 5.3 Author-experience protections — before or shortly after launch

These three share a theme: **real authors will trust the Studio with hours of work**, and today nothing protects that work from the two classic failure modes (a closed tab and a colleague's simultaneous edit).

| # | Recommendation | Why it matters | Evidence in repo | Effort |
|---|---|---|---|---|
| 4 | **Unsaved-work guard + local draft backup.** Warn on navigating away with unsaved changes (`beforeunload` + route guard on dirty forms); snapshot the in-progress draft to `localStorage` every ~30 s with a "restore unsaved draft?" prompt on return. | An author who closes the tab, hits a crash, or loses Wi-Fi mid-article currently **loses everything since the last manual save** — the single most trust-destroying event an authoring tool can inflict. | No `beforeunload`/autosave/draft-backup code anywhere in `app/` | 1–2 days |
| 5 | **Edit-conflict detection.** Send the draft's `updatedAt` with each save; if the server copy is newer, warn instead of silently overwriting ("This draft was changed by someone else while you were editing"). | Two people opening the same draft is routine in a review workflow. Today the second save **silently erases** the first — no error, no trace. (The annotations system documents its last-write-wins choice; the *drafts themselves* have the same behavior, undocumented.) | `app/lib/repository.ts` `update()` is an unconditional PUT — no version/timestamp check | 1–2 days |
| 6 | **Title search on content lists.** A text box next to the existing type filter, querying Strapi server-side. | The demo's ~15 seeded items browse fine. Launch day imports **236 real articles** — finding one by scrolling a paginated list will be the first thing an author complains about. | `ContentList.vue` has a type filter and pagination only | 1–2 days |

### 5.4 Production-operations readiness — before cutover

| # | Recommendation | Why it matters | Evidence in repo | Effort |
|---|---|---|---|---|
| 7 | **Error monitoring + uptime checks.** Wire a client error reporter (e.g. Sentry, allowed by adding one host to the production CSP) and simple uptime probes on the Studio and the Strapi API, alerting R&A/dev. | After launch, the only error signal today is "an author emails someone." A tool this central to the agency's most-read content deserves to know it's broken before its users do. | No monitoring/error-reporting code or config anywhere | 0.5–1 day |
| 8 | **Make the Strapi host configurable for staging.** The backend URL is hardcoded (`studio.config.ts`); the runbook's own warning says a staging build **writes to the production Strapi** unless the code is edited. Honor the already-documented `NUXT_PUBLIC_STRAPI_BASE_URL` env override (it exists in `.env.example` but the config ignores it), keeping the hardcoded value as default, and document the paired CSP `connect-src` change. | Removes the sharpest edge in the launch plan: a rehearsal that can touch production data. Test-content hygiene (the runbook's current mitigation) works, but a config switch is safer than discipline. | `studio.config.ts:9`; runbook §2 warning; `.env.example` | 0.5 day |
| 9 | **Note the rate-limiter scope.** The email endpoint's 5-per-10-min limit is in-memory per serverless instance; under multiple concurrent instances the effective cap is higher. Fine at ICJIA volumes — just record it as a known property (or move the counter to a durable store later). | Prevents a future "the rate limit didn't hold" surprise from being investigated as a bug. | `app/lib/rate-limit.ts` (module-level Map) | doc-only |
| 10 | **Accessibility polish backlog** (four small riders from the annotations review: color-swatch radiogroup semantics, roving toolbar tabindex, drawer dialog semantics, document-level keyboard-create listener). | The app measures AA-clean; these are screen-reader/keyboard *refinements* already on the tracked list — schedule them so they don't evaporate. | Runbook §6 pointer; `.superpowers/sdd/progress.md` | ~1 day |

### 5.5 Post-launch / longer-term

- **A small end-to-end (browser) test suite.** All 677 tests are unit/component tests; none drive a real browser. A ~5-flow Playwright suite (login → draft → save → preview → annotate → publish) would automate the cutover smoke checklist and catch the class of bug unit tests structurally miss — exemplified by the July 5 `rel=opener` regression, which was found by a human clicking, precisely because opener behavior only exists in a real browser. Run it against deploy previews in CI. *(2–4 days.)*
- **Tighten annotation permissions at the API** once real usage patterns are known (per-creator Strapi policies replacing the accepted coarse launch posture).
- **Revisit the JWT-in-cookie residual** (audit H-1): the admin token lives in a JavaScript-readable cookie; the CSP is the compensating control and the audit accepts it for a staff tool. The structural fix — a thin backend-for-frontend proxy holding the token in an HttpOnly session — is a deliberate architecture change to evaluate *only if* the tool's exposure grows (more users, external reviewers). Related small item: logout is client-side only (Strapi admin JWTs aren't revocable server-side); a short JWT lifetime on the Strapi side is the practical mitigation, already flagged for launch-time verification.
- **The two deferred product items** the team already scoped during the July 8 session: the body-images panel redesign (panel should list all images already in the article body) and page-aware guided tours (separate tours for dashboard/editor/preview). Both are spec'd in `docs/superpowers/`; sequence them against real author feedback.
- **Consider content-list virtualization or server-side sort options** if the library grows well beyond ~250 items.

---

## 6. Demo versus live: what actually changes

**Plain English.** The demo at <https://studio-2026.netlify.app> and the production Studio are **the same application** — same code, same tests, same security review. The demo simply runs with a switch flipped that (a) replaces real sign-in with "Enter as Author/Editor" buttons, (b) serves make-believe content from memory instead of the real database, (c) physically blocks every write, and (d) forbids the browser from contacting the real backend at all. Turning the switch off — plus a short list of one-time setup on the content-system side — *is* the launch. There is no "version 2 to build."

**What flips automatically with the one switch** (nothing to build, verified in code):

| Concern | Demo build | Production build |
|---|---|---|
| Sign-in | Role buttons, no real login possible | Real Strapi admin login with per-person accounts and roles |
| Content | In-memory synthetic articles (resets on reload) | The real content library via Strapi (236 articles, 13 apps, 5 datasets) |
| Reviewer annotations | Per-browser `localStorage` | Shared across reviewers/devices via the dormant Strapi adapter — activates by itself |
| Writes/publishing | Hard-blocked | Real drafts, publish/unpublish, site-rebuild webhook |
| Review-request email | Absent (pure static site) | Live rate-limited Mailgun relay (serverless function) |
| Security headers | Demo set (backend unreachable) | Strict production set (no inline scripts) |

**What must be done by hand, once — none of it application code** (all captured in `docs/demo-to-production.md`):

1. **Strapi side (owner: R&A / whoever administers Strapi):** install the `review-annotation` content type (drop-in folder + install guide ship in this repo); create the `studio-profile` type for first-login onboarding (guide in `docs/onboarding-studio-profile-setup.md` — until it exists the app deliberately *fails open* and simply skips onboarding); confirm Author/Editor role permissions; create the real staff accounts; allow the Studio's origin in CORS; configure the publish→rebuild webhook; enforce upload MIME/size limits at the Media Library (the two remaining audit items, M-3/M-4, land here).
2. **Netlify side:** a production site with `npm run build`, the demo flag absent, and four environment variables (three Mailgun secrets + the public base URL).
3. **Verification:** the staging checklist (runbook §2) with real accounts, including the CSP check on a deploy preview and an end-to-end annotation round-trip between two users; then a ~30-minute cutover (runbook §4).

**Things managers should know cross over — or don't:**

- **Demo feedback carries over** (it's the same app). **Demo *data* does not**: practice articles and margin comments made in the demo are synthetic and stay there, by design.
- **The demo can keep running after launch** — it is isolated by design and useful for training new authors. This is a decision to make once (§8).
- **Approval-to-live is short.** Once the Strapi-side prep and staging validation are done, the cutover itself is about half an hour plus smoke tests. The long pole is the preparation and the approval, not the engineering.

---

## 7. Roadmap

**Plain English.** Demos run through early August. Everything needed for launch can be prepared *in parallel* with the demo period, so that once approval lands, going live takes an afternoon. The improvement recommendations from §5 are slotted where they do the most good. Dates assume the current plan (demo weeks into early August 2026, launch immediately after approval); if approval moves, phases 1–2 slide with it, and nothing is wasted — the demo keeps running at zero risk.

### Phase 0 — Demo window & hardening (now → ~August 7)

*Goal: great demos, and the repo made unbreakable-by-accident.*

| Workstream | Items | Owner |
|---|---|---|
| Demos | Scheduled walkthroughs (Author + Editor roles, guided tour); collect and triage feedback in the changelog discipline | R&A + dev |
| Repo safety | **§5.1 linter-branch decision + push**; **CI pipeline (§5.2-1)**; branch-push habit | Dev |
| Quick wins | `noindex` (§5.2-2); README refresh (§5.2-3) | Dev |
| Author protection | Unsaved-work guard + autosave (§5.3-4) — ideally *demo* it too; title search (§5.3-6) if demo feedback confirms priority | Dev |

**Exit criteria:** demo feedback triaged; CI green on `main`; no unmerged work stranded locally.

### Phase 1 — Production preparation (parallel; target complete ~August 1)

*Goal: everything external to this repo ready, so approval day is boring.*

| Workstream | Items | Owner |
|---|---|---|
| Strapi setup | `review-annotation` + `studio-profile` types; roles & permissions; real accounts; CORS; publish-webhook; Media-Library upload limits (audit M-3/M-4) | R&A / Strapi admin (guides ship in repo) |
| Email | Mailgun domain + credentials into Netlify env | R&A + dev |
| Staging | Second Netlify site; **staging-host override (§5.4-8)** decided/implemented; full runbook §2 checklist with real accounts; **CSP verified on a deploy preview** | Dev |
| Operations | Error monitoring + uptime alerts (§5.4-7) wired to the staging site first | Dev |

**Exit criteria:** every line of runbook §2 checked off on staging; monitoring alerting to a real inbox; decisions in §8 recorded.

### Phase 2 — Cutover (approval day; ~30 minutes + verification)

Runbook §3–§4 verbatim: freeze pushes; flip the production site's build command and environment; deploy; confirm serverless functions present; run the top-five smoke checks with real accounts (both roles, real content, one annotation round-trip, one publish round-trip); custom domain + DNS if chosen (before announcing — HSTS makes hostnames sticky); tag the release and date the changelog. **Rollback is one click** to the previous deploy; the demo site is untouched throughout.

### Phase 3 — Stabilization (launch → +30 days)

Watch monitoring and error reports daily; verify shared annotations behave at real review volume (the freshness model is refetch-based by design — confirm it's comfortable); onboard authors with the built-in tour; deliver **edit-conflict detection (§5.3-5)** and the **accessibility riders (§5.4-10)**; triage launch feedback weekly. *Exit criteria: two consecutive quiet weeks of error logs; authors publishing without hand-holding.*

### Phase 4 — Continuous improvement (quarterly rhythm)

Playwright end-to-end suite in CI against deploy previews; annotation RBAC tightening informed by real usage; the two deferred product items (body-images redesign, page-aware tours); BFF/token-handling evaluation *only if* exposure grows; dependency currency via the existing Dependabot flow.

### Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Approval slips past August | Medium | Low | Demo keeps running at zero cost/risk; phases slide intact |
| Strapi-side misconfiguration (CORS, roles) stalls cutover day | Medium | Medium | All setup front-loaded to Phase 1 with in-repo guides; symptoms pre-documented (e.g. CORS ⇒ console errors, not 401s) |
| Staging rehearsal touches production data | Medium today | Medium | §5.4-8 host override; until then, runbook's throwaway-content hygiene |
| Author loses in-progress work post-launch | Medium | High (trust) | §5.3-4 autosave/guard, scheduled before launch |
| Single-maintainer concentration | — | Medium | Already strong docs; CI (§5.2-1) + push discipline (§5.1) remove the last single-machine failure modes |
| Email deliverability not ready (Mailgun domain verification lead time) | Low | Low | Start Mailgun setup at Phase 1 open, not cutover week |

---

## 8. Decisions needed from management

1. **Approval path and target date** for go-live (the engineering side needs ~zero notice once Phase 1 is complete; the preparation needs the Strapi/Mailgun owners to start now).
2. **Custom domain**: launch on a `*.netlify.app` URL or a `studio.icjia…` hostname? Must be decided *before* announcing (HSTS pinning makes the hostname effectively permanent).
3. **Keep the public demo running after launch?** Recommended: yes, for training and stakeholder show-and-tell — it is isolated by design. Decide once and record it in the runbook.
4. **Who owns Strapi administration and the Mailgun account** — names, not roles, for the Phase 1 checklist.
5. **Scope blessing for the pre-launch improvement set** (§5.2 + §5.3-4; roughly 3–5 developer-days total) versus deferring any of it past launch.

---

## 9. Conclusion

This is a healthy project in an unusually verifiable state: the demo anyone can click (<https://studio-2026.netlify.app>) is the same audited, 677-test application that will go live, and the remaining distance to launch is measured in configuration and checklists, not code. The analysis found no blockers — it found the gaps a project has *right before* it becomes production software: no automated test gate, no monitoring, no protection yet against the two ways authors lose work, and one finished feature nearly lost to a deleted branch. All are cheap relative to what they protect, and all fit inside the existing demo-to-launch timeline without moving it.

**Immediate next steps (this week):** hand the Strapi/Mailgun owners their Phase 1 checklists so the preparation clock starts now — everything else from this section already closed the same day: the linter branch was recovered, pushed, and merged; the CI pipeline is live and green (v0.2.0 released and tagged); and the search-engine exclusion and documentation refresh shipped with it.

---

*Prepared July 11, 2026, against `main` @ `d78a7ab`. Verification commands and results are recorded in §4.1; file paths throughout refer to this repository. Companion documents: [Design & Implementation Spec](ICJIA-Research-Hub-Studio-2026-Design-and-Implementation-Spec.md) · [Security Audit](security-audit.md) · [Demo → Production Runbook](demo-to-production.md).*
