# Security Audit — ICJIA Research Hub Studio (Red Team / Blue Team)

> **Ordering:** newest audit first. The latest pass is **§9 (2026-07-05)** immediately below;
> the 2026-06-22 audit (§8), the 2026-06-21 production audit (§1–§6) and demo/public-deploy
> audit (§7) follow, unchanged.

---

## 9. Annotations, Tab-Only Preview & Card View Audit (2026-07-05)

**Target:** `hub-studio-2026` — Nuxt 4 SPA (`ssr: false`) staff content tool
**Reviewed commit:** `2e2adef` (branch `main` — the 2026-07-05 feature day)
**Date:** 2026-07-05
**Method:** Static source review (red team) + defensive credit (blue team), a live `npm audit`,
and full axe-core 4.10 WCAG 2.1 A/AA sweeps (light **and** dark) over every changed surface.
The Strapi 5 backend stays out of scope; the new Strapi adapter is client code and **dormant**
until launch.

### 9.1 Scope — the new surface since §8

- **Reviewer annotations, end to end:** quote-anchored highlights painted as accessible
  `<mark>` elements, threaded comments in versioned `localStorage`, the composer/bar/rail UI,
  Word-style aligned comment cards (`lib/annotations/rail-layout.ts` collision pass), the
  Clean-view toggle, and the armed `::selection` tint.
- **Phase 2 Strapi `AnnotationStore` adapter** (`store-strapi.ts` + mapper/validator/repository) —
  selected only for real (non-demo) sessions; dormant in every demo build.
- **Tab-only preview architecture:** the Live-preview modal was removed; every preview entry
  point opens `/preview/{type}/{id}` in a per-document **named tab**; the page branches
  Close-preview (has `window.opener`) vs Back-to-editor (shared-link visit).
- **Content-list card view (default):** splash imagery with on-image status badge, plain-text
  excerpts (`lib/text-excerpt.ts`), clickable artwork.
- **Semantic-token darkening** for WCAG AA (primary→700, success/warning→800, error→700 in
  light; 400s in dark).

### 9.2 Findings

| # | Finding | Severity | Status |
|---|---|---|---|
| F-1 | Card `img :src` took Media-Library URLs unfiltered (residual risk was inert-scheme only: media is admin-authored and the CSP `img-src` already bounds it) | Low (defense-in-depth) | ✅ **Fixed this audit** — the same `safeHref` allowlist as every URL sink pins the scheme; anything else renders the neutral placeholder; regression-tested (`javascript:` / `data:` → placeholder) |
| F-2 | Annotation write limits (quote ≤ 1000, context ≤ 32, non-empty body) are client-enforced; the launch Strapi type keeps coarse RBAC (any Author/Editor CRUD via the admin API) | Info | ✅ Accepted for launch — deliberate, documented posture (`docs/demo-to-production.md` §6); the UI enforces creator-or-editor rules; server tightening is a post-launch candidate |
| F-3 | The localStorage annotation store trusts stored JSON shape (same-origin self-poisoning only) | Info | ✅ Accepted — parse failures are caught (in-memory fallback + one-time toast), every rendered field is Vue-interpolated **text**, and the CSP blocks foreign script |
| F-4 | Named-target preview tabs retain `window.opener` | Info | ✅ Accepted (by design) — same-origin internal links only; the opener **is** the feature (the Close-preview branch); no external `target` was added |
| F-5 | Strapi adapter demo-reach check: `isDemoData()` store selection **plus** repo-level `assertWritesAllowed()` double-lock; zero-base64 guard inherited at the write boundary; server rows mapped field-by-field with defensive comments-JSON parsing; server ids reaching DOM selectors go through `CSS.escape` | — | ✅ Blue-team credit |
| F-6 | XSS sweep of all new UI: comment bodies, quotes, author names, and labels are interpolation or attribute bindings; mark `aria-label`s go through `setAttribute` (no HTML parse); the `v-html` sink count is **unchanged** (3, all fed by the `html:false` markdown pipeline) | — | ✅ Blue-team credit |
| F-7 | `plainExcerpt` regex set is linear (no nested quantifiers → no ReDoS); output is only ever interpolated as text | — | ✅ Blue-team credit |

**`npm audit`:** 0 critical / 0 high / 0 moderate; the 1 known **dev-only Low** (esbuild
dev-server file-read) is unchanged since §8.

### 9.3 Verification

**647 tests** + typecheck (0 errors) green. axe-core 4.10 (WCAG 2.1 A/AA): **0 violations** on
the dashboard (cards **and** table views), the editor, and the annotated review page — in
**both light and dark** (the same day's token work fixed the pre-existing light-mode contrast
family: white-on-warning buttons, soft chips, soft/outline primary labels).

Measured WCAG contrast on the new card elements (AA requires 4.5:1; badge text is measured
against the badge's solid fill, alpha backgrounds composited over the card):

| Element | Light | Dark |
|---|---|---|
| Published badge (green, on-image) | 7.13 | 10.02 |
| Draft badge (red, on-image) | 6.42 | 6.17 |
| Card title | 17.83 | 17.83 |
| Date / authors meta | 7.58 | 6.78 |
| Excerpt | 10.36 | 12.00 |
| Edit button (soft primary) | 5.83 | 5.78 |
| Preview button (outline) | 14.62 | 14.46 |

---

## 8. Demo Roles, Main Files, Guided Tour & Dependency Refresh Audit (2026-06-22)

**Target:** `hub-studio-2026` — Nuxt 4 SPA (`ssr: false`) staff content tool
**Reviewed commit:** `d8ae8e0` (branch `main`, HEAD = the dependency refresh)
**Date:** 2026-06-22
**Method:** Static, read-only source review (red team) + defensive credit (blue team) **plus** a live
`npm audit`. The Strapi 5 backend is managed separately and was **not** in scope.

### 8.1 Scope — the new surface since §7

A third adversarial pass over the work landed since the 2026-06-21 demo audit (CHANGELOG
`[Unreleased]`):

- **Public DEMO mode** — in-memory content, the hard write-block (`assertWritesAllowed`), demo login.
- **Demo AUTHOR/EDITOR roles** — `loginAsDemo`, `app/lib/dev-auth.ts` (`makeDevAdminSession(role)`),
  `app/lib/admin-roles.ts` (`canPublish` gating + `roleLabel`/`rolePermissions`), the navbar role chip + popover.
- **Multiple Main Files** — the PDF array (`app/lib/mappers/article.ts`, `mediaListFromStrapi`/`mediaIdsForWrite`),
  bundled demo PDFs in `public/files/demo/`, per-file download links in `PublishedArticlePreview.vue`.
- **Live Publish/Unpublish in the demo** — shared in-memory store + a real `unpublish` action on the repo.
- **The in-app guided tour** — `app/composables/useGuidedTour.ts` + `app/components/tour/*` + a versioned
  `localStorage` key + `data-tour` anchors.
- **Splash / sticky toolbar / dark-mode CSS** and the **dependency refresh** (Nuxt 4.4.8, Vue 3.5.38,
  Pinia 3, vue-router 5, TypeScript 6, Vitest 4, @nuxt/ui 4.9, etc.).

### 8.2 Bottom line

**No Critical, High, or Medium finding on the new surface.** Every concern in the engagement brief was
already correctly mitigated by the code under review: the demo cannot write to or authenticate against
real Strapi; publish/unpublish is enforced server-side (Strapi 403) with the UI gate as
defense-in-depth; the demo identities are dev/demo-only and tree-shaken from a normal production build;
Main-File download links pass through the `safeHref` URL-scheme allowlist and the array mapper is
numeric/type-strict; the guided tour has **zero** `v-html`/innerHTML and a namespaced+versioned
`localStorage` key; markdown stays `html:false` with a 2-attribute (`id`/`class`) markdown-it-attrs
allowlist across all three instances; both CSP header sets are intact. `npm audit` reports **0
critical / 0 high / 0 moderate**, with a single **known dev-only Low** (esbuild dev-server file-read on
Windows) that does not affect the built static artifact.

Two **defense-in-depth** improvements were nonetheless implemented (turning previously-accepted §7
residuals into tested guarantees) — see F-1 and F-2.

### 8.3 Findings

| ID | Finding | Severity | Status |
|----|---------|:--------:|--------|
| F-1 | `runtimeConfig.public` (incl. `demoMode`) was runtime-mutable — devtools could flip `demoMode=false` to disarm the demo's JS write-guards (the §7 D-2 residual; CSP still backstopped it) | Low | **Fixed** — deep-freeze the public config in an early client plugin (`app/plugins/00.freeze-config.ts` + `app/lib/freeze-public-config.ts`); test `tests/unit/freeze-public-config.test.ts` |
| F-2 | The demo header set (`deploy/headers-demo.txt`) — the demo's authoritative network backstop — had **no** regression guard; only production `public/_headers` was tested (the §7 D-2 "CI guard" recommendation) | Low | **Fixed** — added assertions that the demo CSP keeps `connect-src 'self'` (no Strapi/Mailgun/Iconify) + the full hardening set, in `tests/unit/security-headers.test.ts` |
| F-3 | Demo isolation — can a swapped token/flag force a real read/write? | Info | **Accepted (safe).** Reads route to the in-memory repo for the whole demo build via `isDemoData()` (audit D-4); writes throw in `assertWritesAllowed()` before any `$api` call (now also harder to disarm via F-1); the only token minted is the sentinel Strapi rejects; and the demo CSP `connect-src 'self'` refuses any real request even if every JS guard is defeated. Verified the built demo bundle contains **no** `v2.hub.icjia-api.cloud` in any JS chunk (only in the prod `_headers` placeholder, which Netlify overwrites with `headers-demo.txt`). |
| F-4 | Auth/roles — is publish/unpublish enforced server-side, and are the demo identities dev-only? | Info | **Accepted (correct).** `PublishButton.vue` is default-deny (`v-if="canPublish"` — an author renders nothing); `repository.publish`/`unpublish` both document the Strapi 403 backstop and both call `assertWritesAllowed()`. `loginAsDemo` throws unless `import.meta.dev \|\| isDemoMode()`, so it cannot mint a session in a normal production build; `init()` and the `$api` 401 interceptor only honor the sentinel token under the same guard. Covered by `tests/nuxt/demo-mode.test.ts` (rejects real login in demo; create/update/remove/publish/unpublish throw before `$api`). |
| F-5 | Main Files — injection via filename/URL or the array mapper? | Info | **Accepted (safe).** Download links bind `:href="safeHref(f.url)"` (no `javascript:`/`data:`), the filename renders via `{{ }}` (Vue-escaped) and a `:download` string attribute; `articleFromStrapi`/`articleToWrite` use `mediaListFromStrapi`/`mediaIdsForWrite`, which are numeric/type-strict and drop placeholder refs (`id <= 0`). Bundled demo PDFs are static files under `public/files/demo/`. |
| F-6 | Guided tour — XSS via step content, unsafe `localStorage`, or hostile anchors? | Info | **Accepted (safe).** No `v-html`/`innerHTML` in any of the 5 tour components or the config; all step titles/bodies are hardcoded strings rendered via `{{ }}`. The single `localStorage` key is namespaced + versioned (`icjia-studio-tour-v1`) and only ever stores the literal `'true'`. `data-tour="…"` anchors are static template strings used as `querySelector` targets. |
| F-7 | Markdown/render — `html:false`, DOMPurify, and the attrs allowlist still enforced? | Info | **Accepted (correct).** All three markdown-it instances (`md`, `mdInline`, `mdArticle`) set `html: false`; markdown-it-attrs is restricted to `allowedAttributes: ['id','class']` (no `style`/`on*`/`href`/`src`); `link_open` only adds `target`/`rel`; TOC ids are AST-derived, slug-allowlisted, and attribute-escaped; the three `v-html` sinks are all fed by this pipeline; DOMPurify is used only on SVG uploads. |
| F-8 | CSP/headers — demo + prod sets intact? | Info | **Accepted (correct).** Prod `public/_headers`: `script-src 'self'` (no `unsafe-inline`), tight `connect-src`, `object-src/base-uri/frame-ancestors 'none'`, nosniff, XFO, HSTS, Referrer-Policy, Permissions-Policy. Demo `deploy/headers-demo.txt`: `connect-src 'self'` only (the network backstop), same hardening set. No `<meta http-equiv="Content-Security-Policy">` anywhere that could weaken the header CSP. Icons bundled (`icon.fallbackToApi: false`, `@iconify-json/lucide` pinned exact `1.2.114`). |
| F-9 | Dependencies — any high/critical? | Info | **Accepted.** `npm audit` → 0 critical, 0 high, 0 moderate, **1 low** (esbuild ≤ a known advisory: dev-server arbitrary file read **on Windows only**). Dev-only, not in the production/static build path; tracked via Dependabot. No action required. |
| F-10 | Prior protections still hold? | Info | **Accepted (re-confirmed).** Rate-limited `request-review` (5/10 min → 429), 403-clears-session in `init()`, AST-escaped TOC ids, dataset URL-scheme save-gate, hard zero-base64 write guard in `repository.create/update`, secrets server-only — all unchanged and still covered by their tests. |

**Severity counts (this pass):** Critical 0 · High 0 · Medium 0 · Low 2 (both fixed) · Info 8.

### 8.4 Remediations implemented

- **F-1 — Deep-freeze the public runtime config.** `app/lib/freeze-public-config.ts` exports a pure,
  unit-tested `deepFreeze`; `app/plugins/00.freeze-config.ts` (ordered first via the `00.` prefix, ahead
  of `api.ts`) freezes `useRuntimeConfig().public` on client boot. `demoMode` (and the rest of the
  non-secret public config) can no longer be reassigned from devtools to silently disarm
  `isDemoMode()`/`isDemoData()`/`assertWritesAllowed()`. Reads are unaffected; the demo CSP remains the
  authoritative, JS-independent backstop. Verified the freeze logic ships in the generated demo bundle.
- **F-2 — Demo CSP regression guard.** `tests/unit/security-headers.test.ts` now also reads
  `deploy/headers-demo.txt` and asserts its CSP `connect-src` is **exactly** `'self'` (explicit
  negatives for `v2.hub.icjia-api.cloud`, `api.iconify.design`, `api.mailgun.net`) plus the full
  hardening set — so a future edit that re-opens the demo's network surface fails CI.

### 8.5 Verification

`npx vitest run` → **514 passed** (507 prior + 7 new). `npm run typecheck` → exit **0**.
`NUXT_PUBLIC_DEMO_MODE=true npm run generate` → builds (7 routes prerendered, static `.output/public`).
`npm audit` → 0 critical / 0 high / 0 moderate / 1 low (dev-only esbuild, Windows).

---

## 1–7. Prior audits (2026-06-21) — unchanged below

The original production audit (§1–§6) and the demo/public-deploy audit (§7), both dated 2026-06-21, are
preserved verbatim below for the record.

---

**Target:** `hub-studio-2026` — Nuxt 4 SPA (`ssr: false`) staff content tool
**Reviewed commit:** `0f42014` (branch `main`)
**Date:** 2026-06-21
**Method:** Static, read-only source review. No network tools, no `npm audit`, no external calls.
**Auditor stance:** Adversarial (red team) + defensive credit (blue team), per the engagement brief.

This audit assesses the **production** security model under the brief's stated assumption that the
DEV-ONLY `admin/admin` bypass (`app/lib/dev-auth.ts`) and the dev login footer **are removed/tree-shaken before prod**.
DEV-ONLY caveats are reported separately from real PROD findings and are **not** counted in the
production posture.

---

## 1. Executive Summary

**Overall posture: STRONG for a client-side staff tool.** The application is built with a clear,
single-seam approach to the two highest-risk areas — HTML rendering and URL handling — and those
seams are correct and well-tested. The hard server-side security boundary (authentication and
authorization) is correctly delegated to Strapi's admin API; the client never makes a real trust
decision. Secrets are correctly isolated server-side. There is **no stored XSS sink, no injection
sink, and no secret leak** in the client bundle that I could find. Blue team has done a genuinely
good job on the parts that matter most.

The residual risk is **architectural / hardening**, not a smoking-gun vulnerability: the app ships
**no HTTP security headers (no CSP)**, and it stores the Strapi admin **JWT in a JavaScript-readable
cookie**. Those two facts compound: the *only* thing standing between any future DOM-injection
regression and full admin-session theft is the discipline of the `html:false` / `safeHref` seams.
A CSP would convert that single point of failure into defense-in-depth.

### Severity counts (PRODUCTION findings only)

| Severity  | Count |
| --------- | ----- |
| Critical  | 0     |
| High      | 1     |
| Medium    | 4     |
| Low       | 4     |
| Info      | 4     |

(DEV-ONLY caveats: 3 — see §3. Not counted above.)

### Single biggest PROD risk

**No Content-Security-Policy and no security headers (`nuxt.config.ts`), combined with the admin JWT
stored in a non-`httpOnly` cookie (`app/stores/auth.ts:42-51`).** If *any* HTML/URL sink ever
regresses (a future `v-html` of un-rendered content, a markdown-config change to `html:true`, a new
`:href` that skips `safeHref`), an attacker who lands script in the page can read `document.cookie`
and exfiltrate a live Strapi **admin** JWT — i.e. full content-management compromise. The current
sinks are clean, so this is **High**, not Critical; but it is the one change that would most improve
the production security floor.

### Remediation summary (2026-06-21)

At-a-glance status of each finding (full per-finding detail in §2; the prioritized checklist is in §5).

| Finding | Severity | Remediation | Status |
|---|---|---|---|
| H-1 — No CSP / security headers (admin JWT in a JS-readable cookie) | High | Added a Content-Security-Policy + security headers via `public/_headers` (CSP, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, HSTS, Referrer-Policy) | ✅ Fixed in repo (`e402f3d`); CSP to be confirmed on a deploy preview |
| M-1 — Session kept on transient/5xx boot errors | Medium | `init()` now clears the session on a definitive `403` | ✅ Fixed (`e402f3d`) |
| M-2 — Fragile regex Table-of-Contents id injection | Medium | Heading ids now derived from the Markdown AST and HTML-escaped | ✅ Fixed (`e402f3d`) |
| M-3 / M-4 — SVG + document-upload validation is client-side only | Medium | Enforce MIME/size limits at the Strapi Media Library; serve uploads as non-inline (`attachment` / `nosniff`) | ⏳ Launch-time (Strapi side — Research & Analysis) |
| M-5 — Unthrottled review-email relay | Medium | Rate-limited the endpoint (5 sends / 10 min → HTTP 429) | ✅ Fixed (`e402f3d`) |
| L-4 — Dataset source/datafile URLs not gated at save time | Low | `validateDataset` now rejects `javascript:` / `data:` / `vbscript:` / `file:` URLs | ✅ Fixed (`e402f3d`) |
| L-5 — Error page could surface raw error text | Low | Production error page renders a generic message (detail only in dev) | ✅ Fixed (`e402f3d`) |
| I-5 — Zero-base64 enforced only at the form | Info | `assertNoBase64` wired into the repository write boundary | ✅ Fixed (`e402f3d`) |
| Server-side authorization / admin-JWT lifetime (incl. L-1 token revocation) | — | Verify in the Strapi instance: publisher-only publish, per-role permissions, a sane admin-JWT lifetime | ⏳ Launch-time (Strapi side — R&A) |
| Dev `admin/admin` bypass (D-1/2/3) | Dev-only | Remove end-to-end before production + add a CI check that fails if it ships; meanwhile tree-shaken from production builds | ⏳ Launch-time |

Dependency monitoring (Dependabot) was also added in `e402f3d`.

---

## 2. Production Findings

Grouped by theme. Every finding cites a real `file:line`.

### 2.1 Authentication & Session

#### [HIGH] H-1 — No security headers / no CSP; admin JWT in a JS-readable cookie
- **Files:** `nuxt.config.ts` (entire config — no `routeRules`, no `nitro.routeRules`, no headers; verified absent), `app/stores/auth.ts:42-51`, `app/lib/api.ts:4-8`
- **Red team:** The session credential is a **Strapi admin JWT** persisted by
  `pinia-plugin-persistedstate` into a cookie that is **not** `httpOnly` (the plugin writes a
  client-readable cookie by definition; `app/stores/auth.ts:43` `piniaPluginPersistedstate.cookies({...})`).
  It is attached as `Authorization: Bearer` on every request (`app/lib/api.ts:6`). Because there is
  **no CSP**, any script that executes in the origin can run `document.cookie` and POST the cookie to
  an attacker endpoint, yielding a full admin session. The XSS seams are currently solid (§2.3), so
  there is no *known* injection path — but the blast radius if one appears is maximal, and a CSP is
  the standard mitigation that is simply absent.
- **Blue team / current defense:** Cookie flags are good: `sameSite: 'strict'` (CSRF resistance),
  `secure: !import.meta.dev` (HTTPS-only in prod), `maxAge` 30 days (`app/stores/auth.ts:44-46`).
  The render/URL seams (`html:false`, `safeHref`) mean there is no live exfil path today. Strapi
  enforces authz server-side regardless of the token holder.
- **Remediation (priority):**
  1. Add a strict CSP and standard headers via Nitro `routeRules` / a Netlify `_headers` file:
     `Content-Security-Policy` (at minimum `default-src 'self'`, `connect-src 'self' https://v2.hub.icjia-api.cloud https://api.mailgun.net`, `img-src 'self' https: data:` as needed for Media Library + picsum, `object-src 'none'`, `base-uri 'none'`, `frame-ancestors 'none'`), plus `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` (or rely on `frame-ancestors`), `Referrer-Policy: strict-origin-when-cross-origin`, and `Strict-Transport-Security`.
  2. Because this is a pure SPA hitting Strapi cross-origin, a true `httpOnly` cookie is not
     trivially achievable client-side (the SPA needs to read the token to attach the Bearer header).
     Accept that and instead **minimize blast radius with CSP** and keep the `maxAge` modest. If a
     same-origin BFF/proxy is ever introduced, move the token to an `httpOnly` cookie there.

#### [MEDIUM] M-1 — `init()` keeps the session on transient/5xx boot errors (fail-open re-verify)
- **File:** `app/composables/useAuth.ts:43-55`
- **Red team:** On boot, `init()` calls `fetchMe()`; on a thrown error it is a deliberate no-op that
  **keeps** the persisted session (comment at lines 51-54). A 401 is handled out-of-band by the
  interceptor, but a server returning a non-401 (e.g. a misconfigured gateway 403/5xx, or a network
  error) leaves a possibly-stale session active in the UI until the next real call 401s. This is a
  UX/availability trade-off, not a privilege escalation: every actual data call still carries the
  token and Strapi re-checks it.
- **Blue team:** Correct by design and documented — the server is the authority on every request, so
  a stale *client* session cannot perform any unauthorized *server* action. The 401 interceptor
  (`app/plugins/api.ts:12-19`, `app/lib/api.ts:23-25`) tears down on the first genuine 401.
- **Remediation:** Acceptable as-is. Optionally, on a definitive `403` from `/admin/users/me` (not
  401), also clear the session, to avoid showing a logged-in shell to a deactivated/forbidden user.

#### [LOW] L-1 — Logout is client-only; the Strapi JWT is not invalidated server-side
- **File:** `app/composables/useAuth.ts:37-40` (`store.clearSession()` then redirect)
- **Red team:** `logout()` clears the Pinia store / cookie locally but does **not** revoke the JWT on
  Strapi. A token captured before logout (e.g. from a shared machine, a proxy log, or a prior XSS)
  remains valid until natural expiry. Strapi admin JWTs are stateless and typically long-lived.
- **Blue team:** This matches Strapi's stateless-JWT model (there is no admin token-revocation
  endpoint to call), and `clearSession()` is complete locally — it nulls `jwt`, `user`, and
  `hasProfile` (`app/stores/auth.ts:36-40`), and the persisted cookie is dropped with the state.
- **Remediation:** Keep token lifetime short on the Strapi side (admin JWT `expiresIn`). Document
  that "log out" is a local action. No code change required in the Studio.

### 2.2 Authorization

#### [INFO] I-1 — Client `canPublish` gate is UX-only; server is the real authority (correct)
- **Files:** `app/lib/admin-roles.ts:11-13` (`canPublish`), `app/stores/auth.ts:17`,
  `app/lib/guard.ts:14-24`, `app/middleware/auth.global.ts:1-16`, `app/lib/repository.ts:128-137`
- **Assessment (blue team credit):** The publish gate is honest defense-in-depth. The route guard is
  **default-deny** (`app/lib/guard.ts:18` — only `isPublic` routes are open; everything else requires
  login). `canPublish` is derived purely from role codes returned by `/admin/users/me`
  (`app/lib/admin-roles.ts:7-9`), and the code comments explicitly state Strapi enforces the
  publisher role server-side (an author's JWT → 403 on the publish action;
  `app/lib/repository.ts:130-132`). Nowhere does the client make a *security* decision it isn't
  entitled to: a tampered client that flips `canPublish` to `true` still gets a 403 from Strapi on
  `POST .../actions/publish`. **No finding** — this is the right model.

#### [LOW] L-2 — `roleCodesOf` trusts the client-held user object for the publish *UI*
- **File:** `app/lib/admin-roles.ts:7-13`, consumed by `app/stores/auth.ts:16-17`
- **Red team:** The publish button's visibility derives from `store.user.roles`, which lives in the
  JS-readable cookie and can be edited by the user (add `{code:'strapi-editor'}`). This only changes
  what the UI *shows*; the actual publish call is still server-enforced (see I-1).
- **Blue team:** Purely cosmetic. The server is the gate. Documented as defense-in-depth.
- **Remediation:** None required. Do not ever move an authorization *effect* (not just visibility) to
  this client-trusted value.

#### [LOW] L-3 — First-login onboarding gate is fail-open by design
- **Files:** `app/lib/profile-gate.ts:17-31`, `app/lib/guard.ts:22`, `app/stores/auth.ts:48-50`
- **Red team:** `resolveHasProfile` returns `null` (no gate) on *any* lookup error
  (`app/lib/profile-gate.ts:26-30`), and `hasProfile` is excluded from persistence so it starts
  `null` every boot. An author could thus skip the onboarding nudge by inducing a lookup failure.
- **Blue team:** This is an intentional **availability** choice (the most-emphasized safety property
  in the file header), not a security control — onboarding is a profile-completeness nudge, not an
  access gate. Publishers are never gated. No data is exposed by skipping it.
- **Remediation:** None. Correctly scoped as non-security.

### 2.3 XSS / Injection

#### [INFO] I-2 — Markdown rendering is correctly hardened (`html:false`) — primary XSS defense (blue-team credit)
- **Files:** `app/lib/markdown.ts:25,30,39,43`; sinks at `app/components/MarkdownPreview.vue:13,18`,
  `app/components/PublishedArticlePreview.vue:93,108`
- **Assessment:** There are exactly **three** `v-html` sinks in the codebase and **all three** render
  the output of the single `renderMarkdown`/`renderInline` seam, which constructs markdown-it with
  `html: false` (`app/lib/markdown.ts:25,39`). Raw author HTML/`<script>` is **escaped**, not
  executed — verified by the test `escapes raw HTML / <script> instead of executing it`
  (`tests/unit/markdown.test.ts:23-27`). The `link_open` rule only *adds* `target="_blank"` +
  `rel="noopener noreferrer"` (`app/lib/markdown.ts:13-23`); it does not introduce attacker-controlled
  attributes. KaTeX, footnote, and multimd-table plugins emit trusted, structural HTML only. I
  attempted to construct a markdown payload that yields active script or a dangerous attribute through
  these plugins and could not — `html:false` neutralizes the raw-HTML vector, and none of the enabled
  plugins reflect raw user strings into an executable position. **No finding.**

#### [MEDIUM] M-2 — TOC heading-id is interpolated into `v-html` output without escaping (defended in depth, but fragile)
- **File:** `app/components/PublishedArticlePreview.vue:24-37` (esp. lines 32-33: `return \`<h2 id="${id}">${inner}</h2>\``)
- **Red team:** After `renderMarkdown` runs (already-escaped HTML), this code regex-rewrites each
  `<h2>` to inject an `id`. The `id` comes from `slugify(text)` where `text` is the tag-stripped inner
  HTML. I tried to break out of the `id="..."` attribute: `slugify` (`:19-21`) lowercases and replaces
  `[^\w]+` with `-` and trims leading/trailing `-`, so the resulting id is restricted to
  `[a-z0-9_-]` — **no quote, `<`, `>`, or space can survive**, so attribute-breakout is not possible
  with the current slugify. The `${inner}` re-insertion is the *already-escaped* markdown-it output,
  so it carries no raw HTML. **Result: not currently exploitable.**
- **Blue team:** Safe today because (a) the regex operates on `html:false` output (inner is escaped),
  and (b) `slugify` is a strict allowlist. This is genuinely defended.
- **Remediation:** This is the most fragile pattern in the app — string-rewriting rendered HTML is
  exactly the kind of code that breaks under a future "let authors put inline code in headings" or a
  `slugify` tweak. Harden it: build the TOC from the markdown AST (markdown-it `heading_open` token
  with a `slugify` + collision suffix) instead of regex-rewriting the HTML string, and HTML-escape the
  `id` when interpolating. Keep the strict slug allowlist. Lower priority because it is not currently
  exploitable.

#### [INFO] I-3 — `safeHref` URL allowlist is correct and comprehensive (blue-team credit)
- **File:** `app/lib/safe-url.ts:5-12`; applied at `PublishedAppPreview.vue:22-27,55`,
  `PublishedDatasetPreview.vue:27-30,85,105`, `PublishedArticlePreview.vue:58-61,71`
- **Assessment:** `safeHref` is an **allowlist** (http(s) absolute, root-relative `/path` excluding
  `//host`, and `#fragment`); everything else — `javascript:`, `data:`, `vbscript:`, `file:`,
  `mailto:`, protocol-relative — collapses to `#` (`:11`). The regex `^\/(?!\/)` correctly blocks
  protocol-relative `//evil.com`. Tests cover lowercase/mixed-case `javascript:`, `data:`, `vbscript:`,
  and `//evil.com` (`tests/unit/safe-url.test.ts:17-31`). **Every** user-controlled URL rendered as a
  link or image src passes through it (the parallel sink sweep found no `:href`/`:src` of
  content-derived data that bypasses `safeHref`, except internally-generated `#fragment` anchors and
  server-returned Media Library URLs). Additionally `validateApp` re-blocks `javascript:/data:/vbscript:/file:`
  on the App `url` field at save time (`app/lib/validators/app.ts:12-14`). **No finding.**

#### [LOW] L-4 — Dataset/App URL allowlist not applied at *save* time for the Dataset source/datafile URLs
- **Files:** `app/lib/validators/dataset.ts:6-21` (no URL-scheme check), vs `app/lib/validators/app.ts:12-14` (has one)
- **Red team:** `validateApp` rejects a `javascript:`-style App `url` at save; `validateDataset` has
  **no** equivalent check for `sources[].url` or `datafile`. A stored `javascript:` source URL would,
  however, still be neutralized at *render* time by `safeHref` (`PublishedDatasetPreview.vue:85,105`),
  so it cannot execute — and Strapi may store it harmlessly. The inconsistency is the only issue.
- **Blue team:** Defense at the render layer (`safeHref`) already covers this; the save-time check is
  belt-and-suspenders that App has and Dataset lacks.
- **Remediation:** For consistency and to keep bad data out of the store, add the same
  `^\s*(javascript|data|vbscript|file):` rejection to `validateDataset` for `sources[].url`. Low
  priority (render layer already blocks execution).

#### [INFO] I-4 — Review-email HTML body escapes the user-supplied note (blue-team credit)
- **File:** `app/lib/review-email.ts:66,79-86`
- **Assessment:** The only user free-text that reaches an HTML email body (`message`/`note`) is
  HTML-escaped via `escapeHtml` (`:79-86`, escapes `& < > " '`) before interpolation (`:66`). The
  preview URL is built from `encodeURIComponent(type)`/`encodeURIComponent(documentId)`
  (`:51-53`) and escaped again for the HTML body (`:67,70`). The `documentId` is additionally
  constrained to `^[A-Za-z0-9_-]+$` at the handler boundary (`app/lib/request-review-handler.ts:30,52`).
  No HTML/header-injection path into the email. **No finding.**

### 2.4 Upload

#### [MEDIUM] M-3 — SVG sanitization is client-side only; a crafted client can upload an unsanitized SVG to the Media Library
- **Files:** `app/composables/useUpload.ts:18-27` (`prepareUpload` → `sanitizeSvgText`),
  `app/lib/sanitize-svg.ts:25-34`, `app/lib/upload.ts:32-47`
- **Red team:** SVG is the one accepted image type that can carry script. It is sanitized with
  DOMPurify **in the browser, before upload** (`useUpload.ts:22-25`). But sanitization is *advisory
  from the server's perspective*: an attacker with a valid Studio JWT can bypass the UI and
  `POST /upload` (`app/lib/upload.ts:43`) a raw, scriptful `image/svg+xml` directly. Whether that
  stored SVG is dangerous depends on **how the public Research Hub serves Media Library files** — if
  the SVG is served from the Strapi/CDN origin with `Content-Type: image/svg+xml` and rendered inline
  (e.g. navigated to directly, or `<object>`/`<embed>`), its embedded script executes in *that*
  origin, not the Studio's. This is a real consideration for the **public site**, outside this repo,
  but the Studio is the upload vector.
- **Blue team:** The client-side sanitizer is solid for the normal path: DOMPurify SVG profile strips
  `<script>` and `on*` handlers and the code additionally regex-strips `xlink:href`/`xmlns:xlink`
  (`app/lib/sanitize-svg.ts:29-30`); tests confirm `<script>`, `onload`, and external `xlink:href`
  removal (`tests/unit/sanitize-svg.test.ts:16-29`). The zero-base64 invariant means images are always
  hosted refs, never inline `data:` blobs.
- **Remediation:** Do not rely on client sanitization as the security boundary for stored SVG.
  Mitigate at the serving layer (this is the durable fix): serve Media Library SVGs with
  `Content-Disposition: attachment` or `Content-Security-Policy: sandbox` / `Content-Type-Options:
  nosniff`, or run a server-side sanitizer in Strapi's upload pipeline, or disallow SVG entirely if
  not needed. At minimum, document that the client sanitizer is UX hardening and the serving origin
  must not render uploaded SVG inline as active content.

#### [MEDIUM] M-4 — `uploadDocument()` bypasses the image gate; relies solely on a client-side extension allowlist
- **Files:** `app/composables/useUpload.ts:33-38,55-58` (`prepareDocumentUpload`),
  `app/lib/image-types.ts:21-27` (`hasAllowedDocumentExtension`)
- **Red team:** `uploadDocument()` deliberately skips the image gate and SVG sanitization and applies
  only `hasAllowedDocumentExtension` (allow `pdf, doc, docx, xlsx, csv`). The check is **extension-only
  and client-side** — it inspects the filename string, not the bytes (`app/lib/image-types.ts:21-26`).
  A crafted client can (a) call `uploadFile` directly with any type, bypassing the gate entirely
  (the gate is a function the *caller* chooses to run, not a server rule), or (b) rename a malicious
  payload `evil.pdf`. The bypass is correctly *scoped* — `uploadDocument` passes no `info` and the
  `kind:'file'` intent means no image processing — but the allowlist provides no real assurance about
  *content*. Notably the document allowlist does **not** include `svg`/`html`/`svgz`, so the obvious
  stored-XSS document types are excluded by the (advisory) list.
- **Blue team:** The extension allowlist is a reasonable UX filter, and `csv`/office/pdf are not
  inline-script vectors in a browser the way `.html`/`.svg` are. The real authorization (who may
  upload) is the Strapi JWT on `POST /upload`. The image and document paths are cleanly separated so
  the document path can never re-enter the image-sanitization assumptions.
- **Remediation:** Treat the extension check as UX only. Enforce real file-type and size limits in
  Strapi's upload configuration (allowed MIME types, max size, and — critically — never serve uploaded
  files inline as active content). Consider validating the magic-bytes/MIME server-side. Ensure
  `.html`/`.svg`/`.svgz` stay out of any allowlist that maps to inline rendering.

#### [INFO] I-5 — Zero-base64 invariant is enforced as a UX validator, not a hard write-time assertion
- **Files:** `app/lib/base64-guard.ts:5-18`, validators
  `app/lib/validators/article.ts:15-20`, `app/lib/validators/app.ts:9-10`,
  `app/lib/validators/dataset.ts:17-19`, save gate `app/lib/forms/submit.ts:10-19`
- **Assessment:** The "no `data:...;base64,...` in a write payload" rule is enforced by
  `containsBase64` checks inside the per-type validators, and `submitForm` only persists when
  `validate()` returns no errors (`app/lib/forms/submit.ts:15-18`). The *throwing* helper
  `assertNoBase64` exists but is **not** wired into the repository write path (it is only referenced
  in tests). So the invariant is a soft, form-level gate, not a hard assertion at the
  `repository.create/update` boundary. This is fine for the intended UX flow (the eager-upload
  pipeline structurally produces hosted URLs, `app/lib/editor/image-insert.ts:33-41`), and base64
  payloads are an integrity/bloat concern, not an XSS vector here (they'd render via `html:false`
  markdown which neutralizes any markup). **Info only.**
- **Remediation (optional):** If the invariant is meant to be a guarantee, call `assertNoBase64` (or
  the validator) inside `createRepository.create`/`update` (`app/lib/repository.ts:106-122`) so direct
  repo callers cannot bypass the form layer.

### 2.5 URL / Open-Redirect / SSRF

#### [INFO] I-6 — No open-redirect; all `navigateTo` targets are literals, guard-whitelisted, or server IDs (blue-team credit)
- **Files:** `app/middleware/auth.global.ts:15` + `app/lib/guard.ts` (redirect ∈ `{/, /login, /onboarding}`),
  `app/composables/useAuth.ts:39`, `app/plugins/api.ts:18`, form redirects
  `forms/ArticleForm.vue:48` / `forms/AppForm.vue:45` / `forms/DatasetForm.vue:71`
- **Assessment:** The sink sweep found **no** `navigateTo`/`location.assign`/`window.open` driven by a
  user-controlled string. The guard only ever returns one of three hardcoded paths
  (`app/lib/guard.ts`), and the post-save redirects build `/preview/<type>/<server-returned documentId>`
  from a Strapi-issued id, not free text. The share-link flow reads `window.location.href` to copy it
  (`app/pages/preview/[type]/[documentId].vue:37,40`) — a read, not a navigation. **No open-redirect.**

#### [INFO] I-7 — `/api/request-review` SSRF surface is constrained to fixed hosts (blue-team credit)
- **Files:** `server/api/request-review.post.ts:19-22,29-34`, `app/lib/review-email.ts:97`,
  `app/lib/request-review-handler.ts`
- **Assessment:** The one server route makes two outbound calls, both to **fixed** hosts:
  `config.public.strapiBaseUrl` for caller verification (`:20`) and
  `https://api.mailgun.net/v3/${domain}/messages` (`review-email.ts:97`). The user controls only the
  reviewer email list and a message string; neither becomes a request *URL*. The `documentId` is
  regex-bounded and only appears in the email body, not in an outbound fetch target. No
  user-controlled host/path reaches `$fetch`. **No SSRF.**

### 2.6 The Review-Email Endpoint (the real server attack surface)

#### [MEDIUM] M-5 — Authenticated email relay: any signed-in user can send Studio-branded email to arbitrary addresses, no rate limit
- **Files:** `app/lib/request-review-handler.ts:70-107`, `server/api/request-review.post.ts:8-41`,
  `app/components/RequestReviewForm.vue:51-80`
- **Red team:** `POST /api/request-review` sends a Mailgun email (from the Studio's own domain) to
  any `reviewers[]` the caller supplies (`request-review-handler.ts:53-60` only checks email *format*,
  not membership/allowlist), with an attacker-influenced free-text `message` (HTML-escaped, but still
  attacker-chosen prose) and a link. There is **no rate limiting** and **no recipient allowlist**. A
  malicious or compromised insider (anyone with a valid Studio JWT — review is *not* publish-gated,
  `RequestReviewForm.vue` is available to all signed-in users) can use the endpoint as a
  **phishing/spam relay** that sends mail *from the government domain* to arbitrary external
  recipients. The content is constrained (fixed template + escaped note + a real `/preview/...` link),
  which limits but does not eliminate phishing value (domain reputation, plausible "you've been asked
  to review" pretext).
- **Blue team:** This is **not an open relay** — the handler enforces auth **first**
  (`request-review-handler.ts:74-77`: missing/invalid token → 401) by forwarding the caller's own JWT
  to Strapi `/admin/users/me` (`server/api/request-review.post.ts:17-27`), so only authenticated
  Studio users can send. Inputs are strictly validated: type allowlist, `documentId` regex
  (`:30,52`), per-address email-format validation at parse time and in `buildReviewEmail`
  (`:58-60`, `review-email.ts:46-48`), and the note is HTML-escaped (`review-email.ts:66,79-86`).
  The Mailgun key never leaves the server (see I-8). Error responses are generic (502 on Mailgun
  failure, `request-review-handler.ts:102-103`).
- **Remediation:** (1) Add **rate limiting** per caller (e.g. N sends/hour) at the route. (2) Consider
  restricting recipients to a known domain allowlist (e.g. `@icjia.illinois.gov`) unless cross-domain
  review is a hard requirement. (3) Log sender + recipients for abuse auditing (server-side only).
  Medium severity: bounded by authentication and template constraints, but the lack of a rate limit
  and recipient allowlist makes insider abuse trivial.

### 2.7 Secrets / Config / Data Exposure

#### [INFO] I-8 — Secrets are correctly isolated server-side; nothing sensitive ships to the client (blue-team credit)
- **Files:** `nuxt.config.ts:21-31`, `server/api/request-review.post.ts:9,32,35`,
  `app/lib/review-email.ts:92-122`, `docs/deploy-rebuild-and-email.md:36-56`, `.env.example`, `.gitignore`
- **Assessment:** Mailgun credentials live in the **non-public** `runtimeConfig`
  (`mailgunApiKey/mailgunDomain/mailgunFrom`, `nuxt.config.ts:23-25`) and are read **only** inside the
  Nitro route via `useRuntimeConfig(event)` (`request-review.post.ts:9,32,35`) — never under
  `runtimeConfig.public`, never in `app/`. Given `ssr:false`, the email is sent by the deployed
  Netlify Function (the one server route), not the browser; `RequestReviewForm.vue` only POSTs the
  reviewer list + note + the caller's own Bearer token to the same-origin route
  (`RequestReviewForm.vue:60-69`). The only `public` values are non-secret URLs
  (`strapiBaseUrl`, `publicBaseUrl`, `nuxt.config.ts:28-30`). `.env` is gitignored and only
  `.env.example` (no secret) is tracked. The deploy doc explicitly warns not to move the key public
  (`docs/deploy-rebuild-and-email.md:48-49`). **No secret leak.**

#### [LOW] L-5 — Generic error page may surface raw `error.message` to the user
- **File:** `app/error.vue:9`
- **Red team:** For non-404 errors, the page renders `error.message` directly. A thrown error
  bubbling from a lib could disclose internal detail (path, dependency message) to the user. Low
  impact for a staff-only tool, but it's an information-hygiene gap.
- **Blue team:** Scope is limited (staff users, not anonymous public); 404 path is generic; most
  caught errors in the app already map to friendly toasts (e.g. login `app/pages/login.vue:24-26`,
  publish `PublishButton.vue`). API error *bodies* from Strapi are not deliberately surfaced.
- **Remediation:** In production, show a generic "Unexpected error" string and log the detail to the
  console/monitoring rather than rendering `error.message`.

#### [INFO] I-9 — No tokens/credentials are logged (blue-team credit)
- **Files:** all `console.*` calls — `app/composables/useAuth.ts:26` (dev-only string),
  `app/lib/profile-gate.ts:28` (error object, no token), `app/components/RequestReviewForm.vue:47`
  (error object, no token)
- **Assessment:** A full sweep of `console.log/warn/error/info/debug` found **no** logging of the JWT,
  password, user object, headers, or request bodies. The few `console.warn`s log only a caught error
  object or a dev banner. **No finding.**

#### [INFO] I-10 — Demo content is inert and dev-gated (blue-team credit)
- **Files:** `app/lib/demo.ts:1-11` (`isDemoSession` returns `false` unless `import.meta.dev` *and*
  the synthetic token is active), `app/lib/demo-content.ts` (pure in-memory factories, no `Math.random`,
  all phony lorem-ipsum), `app/lib/demo-repository.ts`
- **Assessment:** The demo dataset is generated in-memory and only reachable via the dev-admin
  synthetic session (`isDemoSession` is hard-`false` in production builds, `app/lib/demo.ts:8`). It
  contains no real people/PII (header `demo-content.ts:4`) and the demo image URLs are
  `picsum.photos`/`example.com` placeholders. It cannot be written to Strapi (demo refs have `id ≤ 0`
  → `mediaIdForWrite` returns `null`, `app/lib/strapi-rest.ts:45-49`). **Inert. No finding.**

#### [INFO] dependency posture (no network audit)
- **File:** `package.json`
- Static observation only (no `npm audit` per scope): dependencies are current major lines —
  `nuxt ^4`, `vue ^3.5`, `markdown-it ^14.2`, `dompurify ^3.4.11`, `@nuxt/ui ^4`, `pinia ^2.2`,
  `pinia-plugin-persistedstate 4.1.3`. `dompurify ^3.4.11` is a modern, maintained line. Nothing
  obviously abandoned or pinned to a known-vulnerable old major. Recommend running `npm audit` /
  Dependabot in CI (out of scope here) for transitive CVEs. **Info.**

---

## 3. DEV-ONLY Caveats (NOT counted in production posture)

These are explicitly dev-gated and, per the brief, are removed/tree-shaken before production. They are
listed for completeness and to confirm the gating is structurally sound.

- **D-1 — Fixed `admin/admin` login bypass.** `app/lib/dev-auth.ts` mints a synthetic super-admin
  session. Every call site is guarded by `import.meta.dev` (`app/composables/useAuth.ts:23,45`;
  `app/plugins/api.ts:16`; `app/pages/login.vue:17`), which Vite statically replaces with `false` in
  `npm run build`, tree-shaking the branch. Defense-in-depth: the synthetic token
  (`'dev-admin-session-not-a-real-jwt'`, `dev-auth.ts:24`) is a sentinel Strapi rejects, so even if it
  leaked it fails closed (401 → interceptor). **Confirm removal before prod** as the file header
  instructs; the build "fails loudly on the dangling import" once `dev-auth.ts` is deleted.
- **D-2 — Dev login footer exposes the fixed credentials.** `app/pages/login.vue:63-80` renders the
  `admin/admin` hint only when `showDevAdmin = import.meta.dev` (`:17`). Tree-shaken in prod.
- **D-3 — `$api` 401 interceptor skips teardown for the synthetic session.** `app/plugins/api.ts:16`
  (`if (import.meta.dev && isDevAdminToken(...)) return`). Dev-only; removed with the bypass.

**Verdict on the gating:** The `import.meta.dev` pattern is the correct, statically-eliminable guard
for Vite/Nuxt. As long as the documented deletion (file + the three guards + the login footer) is
performed before the production build — and CI should assert `dev-auth` is gone — there is **no**
dev backdoor in the shipped bundle.

---

## 4. Strapi-Only Production Model — Residual Risks

Assuming the dev bypass is fully removed and **all** authentication flows through Strapi
(`/admin/login` → JWT → `/admin/users/me`), the residual risk surface is:

1. **JWT theft via any future XSS (the dominant residual risk).** The admin JWT is in a JS-readable
   cookie with **no CSP** (H-1). Today there is no injection path; the entire defense rests on the
   `html:false` + `safeHref` seams staying intact. Any regression (a new `v-html` of raw content, a
   `markdown-it({html:true})` change, the fragile TOC rewrite M-2 breaking, a `:href`/`:src` that
   skips `safeHref`) becomes a full admin-session compromise. **A CSP is the single highest-value
   addition** because it changes this from a single-point-of-failure to defense-in-depth.

2. **Stolen/leaked JWT is valid until expiry (L-1).** No server-side revocation on logout (Strapi
   stateless model). Mitigate with a short admin-JWT `expiresIn` on Strapi and HTTPS-everywhere (HSTS).

3. **Insider abuse of the review-email relay (M-5).** Authenticated, but unthrottled and
   unrestricted-recipient — a phishing/spam vector from the gov domain. Independent of the dev bypass.

4. **Authorization is entirely Strapi's responsibility — verify the server side.** The client gates
   are UX-only (correct, I-1). The production guarantee that "authors cannot publish" and "users only
   see their own content" depends 100% on Strapi's role config and content-type permissions. This repo
   cannot enforce it; confirm in the Strapi instance: (a) the publish action 403s for `strapi-author`,
   (b) content-manager read/write permissions match the intended per-role model, (c) admin-JWT
   lifetime is reasonable, (d) the Media Library MIME/size limits are set and uploaded SVG is **not**
   served inline as active content (M-3/M-4).

5. **Stored-SVG / uploaded-document handling at the serving origin (M-3/M-4).** The Studio sanitizes
   SVG client-side, but the durable control lives on whatever origin serves Media Library files (Strapi
   /CDN / the public Hub). Client sanitization is bypassable by a crafted authenticated `POST /upload`.

6. **No transport/headers hardening (H-1).** No HSTS, `X-Content-Type-Options`, `frame-ancestors`,
   etc. — leaves clickjacking and MIME-sniffing avenues open by omission.

Nothing in the Strapi-only model is **Critical**: there is no unauthenticated access, no secret in the
bundle, and no live XSS sink. The residuals are about **reducing blast radius** (CSP), **server-side
config** (Strapi roles, upload limits, JWT TTL), and **abuse controls** (email rate limit).

---

## 5. Prioritized Remediation Checklist

**P0 — Do before / at production launch**
- [ ] **Remove the dev bypass** end-to-end (delete `app/lib/dev-auth.ts`; remove the `import.meta.dev`
      guards in `useAuth.ts` login+init and `plugins/api.ts`; remove the login footer in `login.vue`).
      Add a CI check that fails if `dev-auth` or `admin/admin` strings ship. (D-1/D-2/D-3)
- [ ] **Add a Content-Security-Policy and security headers** (CSP, `X-Content-Type-Options: nosniff`,
      `Referrer-Policy`, `frame-ancestors 'none'`/`X-Frame-Options`, HSTS) via Nitro `routeRules` or a
      Netlify `_headers` file. This is the top blast-radius reducer. (H-1)
- [ ] **Verify Strapi server-side authz** in the live instance: publisher-only publish (author → 403),
      per-role content permissions, sane admin-JWT `expiresIn`. (I-1, §4)
- [ ] **Lock down Strapi Media Library**: allowed MIME types + max size; ensure uploaded SVG/HTML is
      served `attachment`/`nosniff` and never rendered inline as active content. (M-3, M-4)

**P1 — Soon after launch**
- [ ] **Rate-limit + (optionally) recipient-allowlist** `POST /api/request-review`; add server-side
      send auditing. (M-5)
- [ ] **Harden the TOC builder**: derive heading ids from the markdown-it AST and HTML-escape the
      injected `id`, instead of regex-rewriting rendered HTML. (M-2)
- [ ] **Production error page**: render a generic message, log detail out-of-band. (L-5)

**P2 — Hardening / consistency**
- [ ] Add the `javascript:/data:/vbscript:/file:` save-time rejection to `validateDataset` (parity
      with `validateApp`). (L-4)
- [ ] Wire `assertNoBase64` into `repository.create/update` if the zero-base64 rule must be a hard
      guarantee, not just a form gate. (I-5)
- [ ] On a definitive `403` (not 401) from `/admin/users/me` in `init()`, clear the session. (M-1)
- [ ] Stand up `npm audit` / Dependabot in CI for transitive-CVE coverage (out of scope for this
      static review).

### Remediation status (2026-06-21)

In-repo hardening landed this date (commit on `main`). Strapi-side items and the dev-bypass removal
remain open and are deferred to launch (as designed — the `admin/admin` bypass is intentionally kept
for demos until launch). Each item below was implemented WITH a test; the suite is green
(375 passing) and `npm run typecheck` exits 0.

**Addressed in-repo:**
- [x] **H-1 — Security headers / CSP added.** `public/_headers` (Netlify) sets CSP, HSTS,
      `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`. The CSP pins
      `connect-src` to `'self' https://v2.hub.icjia-api.cloud https://api.mailgun.net` (the
      blast-radius control) and uses `script-src 'self'` (no `'unsafe-inline'`).
      **PENDING DEPLOY-VERIFY:** confirm on a Netlify deploy preview that no Nuxt bootstrap inline
      script is blocked (add its `sha256` to `script-src` if so — never `'unsafe-inline'`). If the
      Studio is not on Netlify, port the headers to the host / Nitro `routeRules`. Test:
      `tests/unit/security-headers.test.ts`.
- [x] **M-5 — Review-email rate limit.** Pure fixed-window limiter (`app/lib/rate-limit.ts`, 5
      sends / 10 min) wired into the handler keyed by the authenticated user (fallback IP) →
      HTTP 429 when exceeded. Per-instance (resets on restart; multi-instance needs a shared store).
      Tests: `tests/unit/rate-limit.test.ts`, `tests/unit/request-review-handler.test.ts`.
- [x] **M-2 — AST-based, escaped TOC ids.** `renderArticleBody` (`app/lib/markdown.ts`) assigns h2
      ids + collects the TOC from the markdown-it token AST (core rule), not by regex-rewriting
      rendered HTML; ids use the strict `slugify` allowlist and markdown-it's native attribute
      escaping. `PublishedArticlePreview.vue` now uses it (the `/<h2>…<\/h2>/g` regex is gone).
      Test: `tests/unit/markdown.test.ts`.
- [x] **L-5 — Generic production error page.** `app/error.vue` renders a generic body in production
      (heading + "something went wrong" + a link home); only `import.meta.dev` surfaces
      `error.message`. Logic extracted to `app/lib/error-display.ts`. Test:
      `tests/unit/error-display.test.ts`.
- [x] **L-4 — Dataset save-time URL rejection.** `validateDataset` now rejects
      `javascript:/data:/vbscript:/file:` on `sources[].url` and `datafile.url`, via the shared
      `app/lib/validators/url-scheme.ts` helper (which `validateApp` also now uses). Test:
      `tests/unit/validators.test.ts`.
- [x] **I-5 — Hard zero-base64 write guard.** `assertNoBase64` is now called inside
      `repository.create`/`update` (`app/lib/repository.ts`), so a `data:`/base64 payload is
      rejected at the write boundary, not just by the form. Test: `tests/unit/repository.test.ts`.
- [x] **M-1 — Clear session on a definitive 403 in `init()`.** `app/composables/useAuth.ts` tears
      down the session (same teardown the 401 path uses) on a 403 from `/admin/users/me`, while
      keeping the existing keep-session behavior for transient/5xx/network errors. Tests:
      `tests/nuxt/use-auth-init.test.ts`, `tests/unit/auth-status-of.test.ts`.
- [x] **Dependabot.** `.github/dependabot.yml` (npm + github-actions, weekly).

**Still open (launch-time / Strapi-side — unchanged):**
- [ ] Remove the dev `admin/admin` bypass end-to-end (P0; intentionally kept until launch).
- [ ] Verify Strapi server-side authz; lock down the Media Library (MIME/size; SVG/HTML served
      `attachment`/`nosniff`, never inline as active content). (I-1, M-3, M-4, §4)
- [ ] (Optional) recipient-allowlist + server-side send auditing for the review email. (M-5)

---

## 6. Blue-Team Scorecard (what's already done right)

- **Single, correctly-configured Markdown seam** with `html:false` — raw HTML/script is escaped, not
  executed; three `v-html` sinks, all fed by it. (I-2)
- **`safeHref` URL allowlist** applied to every content-derived link/image src, with strong tests. (I-3)
- **Default-deny route guard**; client authz is honestly UX-only with Strapi as the real authority. (I-1)
- **Secrets fully server-isolated**; nothing sensitive in the client bundle; `.env` gitignored. (I-8)
- **No token/credential logging anywhere.** (I-9)
- **Client-side SVG sanitization** (DOMPurify) + **zero-base64 invariant** + **hosted-only image
  pipeline**. (M-3, I-5)
- **Email endpoint is authenticated (not an open relay)** with strict input validation and an escaped
  HTML body; SSRF surface pinned to fixed hosts. (M-5, I-4, I-7)
- **Demo content inert and dev-gated**, with no real PII. (I-10)
- **Dev bypass is structurally tree-shakeable** and fails closed even if it shipped. (§3)

**Bottom line:** No Critical or Confirmed-exploitable vulnerability in the production code path. The
work to do is hardening (CSP first), server-side Strapi/Media config verification, and an email-relay
rate limit — plus the mandatory removal of the documented dev bypass before launch.

---

## 7. Demo Mode & Public Deploy Audit (2026-06-21)

A second red/blue-team pass covering the additions that turn the Studio into a **public, self-contained
Netlify demo**: `studio.config.ts`; demo mode (`app/lib/demo.ts` — `isDemoMode`/`isDemoSession`/
`isDemoData`, the login lockdown in `app/pages/login.vue`, the hard write-block in
`app/lib/repository.ts`, the review-email no-op); the static deploy (`netlify.toml`,
`deploy/headers-demo.txt`); icon bundling (`@nuxt/icon` `clientBundle` + `@iconify-json/lucide`); and the
bundled demo images (`public/images/demo/`).

**Threat model.** Anyone on the internet with the demo URL and full browser devtools — they can edit
running JS, mutate Pinia/localStorage/cookies, replay or forge network requests, and download the entire
client bundle. (The demo is an *open link*, by design.)

**Method.** Three parallel red-team probes (write/auth-bypass; secrets/disclosure;
CSP-XSS-supply-chain-deploy), read-only, against the built static artifact (`.output/public`) and source.

### Bottom line — safe to expose publicly

An attacker **cannot** (a) create/update/delete/publish in the real Strapi, (b) authenticate as a real
Strapi user, or (c) reach real data. This is defense-in-depth with an **independent network-layer
backstop**:

1. **In-memory data.** Content composables serve the in-memory demo repository; the real repository's
   `create`/`update`/`remove`/`publish` (and every upload) call `assertWritesAllowed()`, which throws
   **before any `$api` call** when `isDemoMode()`.
2. **No usable credential.** The only token the demo ever holds is a synthetic sentinel
   (`dev-admin-session-not-a-real-jwt`) the real Strapi never issued and rejects with 401; real
   `login()` throws in demo mode before contacting `/admin/login`.
3. **Network backstop.** The demo CSP `connect-src 'self'` makes `v2.hub.icjia-api.cloud` unreachable
   from the browser — this holds **even if every JavaScript guard is defeated**.

The build ships **no secrets, no source maps, and no PII** (Mailgun keys are server-only and verified
absent; demo content + image EXIF are synthetic).

### Findings & remediations

| ID | Finding | Severity | Status |
|----|---------|:--------:|--------|
| D-1 | Dev Strapi admin URL baked into every demo HTML page (unused — the demo is in-memory) | Medium | **Fixed** — `strapiBaseUrl` blanked when `demoMode` (`studio.config.ts`) |
| D-2 | `demoMode` is a runtime-mutable `runtimeConfig.public` property, not a frozen constant; devtools can flip it to re-select the real repo and disarm the JS write-guard | Medium | **Mitigated** — neutralized by the CSP `connect-src 'self'` backstop + the rejected sentinel token; optional hardening documented below |
| D-3 | `@nuxt/icon` registered `api.iconify.design` (+ simplesvg/unisvg) as runtime providers; a non-bundled icon would attempt a runtime fetch | Medium | **Fixed** — `icon.fallbackToApi: false` (`nuxt.config.ts`); all 46 used icons bundled; CSP blocks any fetch regardless |
| D-4 | Content reads gated only on the sentinel token (`isDemoSession`); a devtools-swapped token would make the demo attempt a real Strapi read (CSP-blocked, but noisy) | Low | **Fixed** — composables now gate on `isDemoData()` (true for the whole demo build) |
| D-5 | The dev `admin/admin` credential + sentinel token ship in the demo bundle | Low | **Documented** — the sentinel is worthless against real Strapi; D-1 removes the only target it could pair with. Optional: split a `demo-auth` module with opaque labels |
| D-6 | `@icjia.illinois.gov` appears in form-field *placeholders*, disclosing the real email domain | Low | **Documented** — minor; optional generic placeholder for the demo build |
| D-7 | `@iconify-json/lucide` pinned with a `^` range (drift on fresh installs) | Low | **Fixed** — pinned exact `1.2.114`; lock committed |
| D-8 | No `Permissions-Policy` header (powerful browser features unrestricted) | Low | **Fixed** — `camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()` on both header sets |
| D-9 | HSTS without `preload` | Low | **Documented** — add `preload` + submit once the prod domain is stable |
| D-10 | Auth cookie is JS-readable (no `HttpOnly`) | Low (prod) | **Documented** — same as prod H-1; **harmless in the demo** (cookie holds only the sentinel token) |

**No Critical or High findings. 5 of 10 fixed in code; the remainder documented (four are prod-scoped or
cosmetic; D-2's risk is fully absorbed by the CSP backstop).**

### Detail — D-2 (the one genuine residual)

Nuxt does **not** freeze `runtimeConfig.public`, so `window.__NUXT__.config.public.demoMode` is a
writable property. An attacker can set it `false` in the console, which (a) re-selects the real Strapi
repository in the content composables and (b) turns `assertWritesAllowed()` into a no-op. **This changes
nothing reachable:** the resulting write/login request targets `https://v2.hub.icjia-api.cloud`, which is
**not** in the demo CSP `connect-src` allowlist, so the browser refuses to send it; and the session
carries only the sentinel token, which Strapi rejects anyway. The CSP (served via `_headers`, with no
`<meta>` CSP or service worker able to override it) is the authoritative, JS-independent control.
**Recommended hardening (not blocking for the demo):** inline a build-time `define` constant for the demo
decision and/or `Object.freeze` the public config in an early client plugin, and add a CI check that
fails the demo build if the demo CSP's `connect-src` ever gains a non-`'self'` entry.

### Positive confirmations (verified safe)

- **No real writes** — triple-blocked (`assertWritesAllowed` on all four repo writes + three upload
  paths; no valid JWT; CSP `connect-src 'self'`).
- **No real auth** — `login()` throws in demo mode before `/admin/login`; only the sentinel token is ever
  minted; even chained with a flag-flip, `/admin/login` is CSP-blocked.
- **No secrets in the bundle** — `MAILGUN_*` are server-only `runtimeConfig`; a grep of all built JS
  chunks + every HTML page found zero secret material; the `public` payload carries only
  `appName`/`demoMode`/`publicBaseUrl` (and, in real builds, `strapiBaseUrl`).
- **No source maps** emitted to `.output/public`.
- **No PII** — demo authors/titles/DOIs are lorem; bundled splash images are already-public Research Hub
  cover photos with no GPS/author EXIF.
- **Static-only deploy** — `nuxt generate` emits no `.output/server` and no `netlify/functions`; the
  `server/api/request-review` route is absent from the published artifact; the only build env var is
  `NUXT_PUBLIC_DEMO_MODE=true` (no secrets).
- **XSS-safe renderer** — markdown-it `html:false` on all three instances; `safeHref` blocks
  `javascript:`/`data:`/protocol-relative URLs; `v-html` sinks are fed only by the trusted pipeline.
- **SPA fallback is a 200 rewrite**, not a 3xx redirect — no open-redirect.

**Bottom line:** the public demo is a hardened, self-contained sandbox. The real Strapi backend is
unreachable from it by construction, and the CSP is an independent backstop that holds even if all
client-side guards are bypassed.
