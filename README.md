# ICJIA Research Hub Studio 2026

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> This website is funded through a grant from the Bureau of Justice Statistics, Office of Justice Programs, U.S. Department of Justice. Neither the U.S. Department of Justice nor any of its components operate, control, are responsible for, or necessarily endorse, this website (including, without limitation, its content, technical infrastructure, and policies, and any services or tools provided).

## Table of contents

- [TL;DR — the 30-second version](#tldr--the-30-second-version)
- [Why this matters — the audience the Studio serves](#why-this-matters--the-audience-the-studio-serves)
- [Developer reference](#developer-reference)
- [Status: built and working in development (pre-launch)](#status-built-and-working-in-development-pre-launch)
- [Workflow](#workflow)
- [Security audits](#security-audits) — running red/blue team log (newest first)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Authentication & authorization](#authentication--authorization) — roles, demo mode, dev bypass
- [Content authoring & the editor](#content-authoring--the-editor)
- [Data layer & validation](#data-layer--validation)
- [Demo mode & the guided tour](#demo-mode--the-guided-tour)
- [Testing](#testing)
- [Security](#security) — CSP, XSS seam, URL allowlist, rate limiting
- [Build & deployment](#build--deployment)
- [Local development](#local-development)
- [Repository layout](#repository-layout)
- [Reference](#reference)
- [License](#license)

## TL;DR — the 30-second version

- **What it is:** Hub Studio 2.0 — the internal tool Research & Analysis (R&A) staff use to write, preview, and publish Research Hub content (articles, apps, datasets); the authoring-and-publishing component of the wider **Hub 2.0** project.
- **A proven platform, now modernized:** this is not a new bet. Under **Hub 1.0** (in production since 2019), the Research Hub became the most-read content on ICJIA's public site — about **45–50% of all pageviews** (up to ~66% of visitors). **Hub 2.0** carries that track record forward on a modern web stack and content management system, with a faster, friendlier authoring experience for R&A authors.
- **Status:** built and working in development — you can click through a complete demo today, **as an Author or an Editor**, with a first-run **guided tour**.
- **How it works:** authors draft in a plain-English editor with a live "exactly-as-published" preview; a manager (Editor) clicks **Publish**.
- **Security:** independently red/blue-team audited three times (production, the public demo, and the demo-roles/main-files/tour/dependency surface) — **0 critical issues**; in-repo fixes done and covered by **514 automated tests** ([`docs/security-audit.md`](docs/security-audit.md)).
- **What's left:** setup on the Strapi / email side (Research &amp; Analysis) and a short launch checklist — not new building.

*That's the whole project in six lines. Everything below is supporting detail — read only what you need.*

## Why this matters — the audience the Studio serves

The Research Hub is the most-visited part of ICJIA's public site, so the tool that produces it is worth doing well.

### Most-visited pages — trailing 12 months

Total site: **56.3K visitors / 452.4K pageviews** (Plausible analytics, `icjia.illinois.gov`). Percentages reflect each page's share of total site visitors; they do not sum to 100% because a visitor can view several pages.

| Rank | Page | Visitors (12 mo) | % of site visitors |
|:--:|---|--:|--:|
| 1 | Homepage (`/`) | ~19.6K | ~35% |
| 2 | **[RH] Article** — "The Effectiveness and Implications of Police Reform" | ~6.0K | ~11% |
| 3 | **[RH] Article** — "Understanding Police Officer Stress: A Review of the Literature" | ~6.0K | ~11% |
| 4 | **[RH] Article** — "The Victim–Offender Overlap" | ~6.0K | ~11% |
| 5 | **[RH] Article** — "The 2021 SAFE-T Act: ICJIA Roles and Responsibilities" | ~5.7K | ~10% |
| 6 | Grants — Funding (`/grants/funding`) | ~4.5K | ~8% |
| 7 | **[RH] Article** — "Mental Illness and Violence: Is There a Link?" | ~4.5K | ~8% |
| 8 | **[RH] Article** — "An Overview of Police Use-of-Force Policies and Research" | ~3.5K | ~6% |
| 9 | **[RH] Article** — "Trauma-Informed and Evidence-Based Practices and Programs" | ~3.3K | ~6% |
| 10 | Grants — Programs (`/grants/programs`) | ~3.1K | ~6% |
| 11 | **[RH] Article** — "Addressing Police Officer Stress: Programs and Practices" | ~3.0K | ~5% |
| 12 | **[RH] Article** — "Gender Differences in Intimate Partner Violence Service Use" | ~3.0K | ~5% |

**[RH]** = Research Hub article. **9 of the top 12 pages are Research Hub articles. The four most-visited pages after the homepage are all articles.**

### Section share of traffic

Pageview share over the **trailing 6 months** on `icjia.illinois.gov` (31.5K visitors / 240.4K pageviews):

| Section | Visitors (6 mo) | Pageviews (6 mo) | Visitor share | Pageview share |
|---|--:|--:|--:|--:|
| **Research Hub** (`/researchhub`) | ~18.0K | ~107.9K | **~57%** | **~45%** |
| Grants (`/grants`) | — | ~53.1K | — | ~22% |
| Homepage (`/`) | — | ~35.0K | — | ~15% |
| About (`/about`) | — | ~21.9K | — | ~9% |
| News (`/news`) | — | ~11.7K | — | ~5% |
| **Whole site** | **~31.5K** | **~240.4K** | 100% | 100% |

**12-month cross-check (56.3K visitors / 452.4K pageviews):** Research Hub ~50% of pageviews (~228.1K) and ~66% of visitors (~37K) — so the 6-month figures are, if anything, conservative.

### What the data says

Two kinds of traffic share the site. **Grants pages are task traffic** — people finding funding, in visits that spike around application deadlines. **Research Hub articles are editorial content** — the research the agency publishes for the public to read. Among everything meant to be read, the Research Hub is effectively the site's content, and it is read *consistently*: across every window — the last month, 6 months, and 12 months — Research Hub articles are the most-read pages on the site (**9 of the top 12** over the past year; the **4 most-visited pages after the homepage are all articles**). A **majority of all site visitors** reach the Hub — **57%** (6 mo), **66%** (12 mo). The homepage is the single most-visited page — the front door everyone enters through, not a destination — and grants is the next-largest section by volume, but that traffic is transactional, not readership, and it rises and falls with funding deadlines while Research Hub readership holds steady. The difference compounds: a Research Hub article is **permanent** — published once, it keeps drawing readers for years (the same articles top every window), and the library grows with each new one — whereas a grant funding page exists only between its open and close dates, then expires. The Research Hub is a durable, compounding asset the agency keeps for good; grants traffic is necessary churn that resets each cycle.

For contrast, **all meeting-agenda pages combined** drew ~800 visitors / ~1,800 pageviews over 6 months (a typical individual agenda: 15–30 visitors). The Research Hub out-draws meeting content by about **~20× in visitors and ~60× in views**; one popular article out-draws the entire meetings section several times over.

The share is **stable**: the 6-month and 12-month figures are in close agreement, and the 12-month window, if anything, shows a slightly higher Research Hub share.

The Studio manages this content base today: **236 articles, 13 apps, 5 datasets** (counted from the live Research Hub Strapi content API).

The investment in Hub Studio 2.0 is proportional to the audience it serves: the public comes to `icjia.illinois.gov` primarily for the Research Hub, and that content is produced entirely through this tool.

*Sources: Plausible analytics for `icjia.illinois.gov` (page-prefix filters; 6- and 12-month windows ending 2026-06-21) and the live Research Hub Strapi content API.*

**Non-technical readers:** the TL;DR above and the [Design &amp; Implementation Spec](docs/ICJIA-Research-Hub-Studio-2026-Design-and-Implementation-Spec.md) are all you need — everything below is developer reference.

---

## Developer reference

Internal authoring &amp; publishing tool (**"Studio"**) for managing **ICJIA Research Hub** content — **articles, apps, and datasets** — backed by Strapi 5.

This is a ground-up rebuild of the 2019 [`researchhub-studio`](https://github.com/icjia/researchhub-studio) on a modern stack, with a simplified two-role workflow and proper (non-base64) image handling.

## Status: built and working in development (pre-launch)

The core Studio is **built and working** — authoring, the live "exactly-as-published" preview, publishing/unpublishing, image handling, multiple Main Files, a role-aware **public demo** (enter as Author or Editor), and a first-run **guided tour** are all in place and covered by **514 automated tests**. It remains in **active development** ahead of launch: requirements are still refined as we go (for example, authentication moved from the public REST API to Strapi's admin **Content-Manager API** once we confirmed how the publish roles work), and the Strapi / email setup plus a short launch checklist remain. The full design and the security review live here:

- 📄 [**Design &amp; Implementation Spec**](docs/ICJIA-Research-Hub-Studio-2026-Design-and-Implementation-Spec.md) ([Word version](docs/ICJIA-Research-Hub-Studio-2026-Design-and-Implementation-Spec.docx)) — plain-English for managers **and** technical detail for developers; opens with a 30-second TL;DR.
- 🔒 [**Security audit**](docs/security-audit.md) — independent red/blue team review (running log below).

## Workflow

- **Authors** log in, write an article in a friendly markdown editor (formatting buttons + live preview, no code), add images from the Media Library, and save a **draft**.
- **Managers** review the list of pending drafts and click **Publish** — which marks the content published in Strapi and triggers a rebuild of the public site.

That's the whole lifecycle: **Authors draft → Managers publish.**

## Security audits

A running log of red / blue team security audits. The **latest** summary is shown; earlier audits are collapsed under *Previous audits*. Full reports live in [`docs/security-audit.md`](docs/security-audit.md).

<!-- Maintenance: when a new audit is run, move the current "Latest" block into a new entry under "Previous audits" below, then replace the Latest block with the new summary. -->

### Latest — 2026-06-22 · Demo roles, Main Files, guided tour & dependency refresh

**Third adversarial pass (2026-06-22).** Covered the surface added since the demo audit: the **Author/Editor demo roles**, **multiple Main Files** (the PDF array + per-file download links), the in-app **guided tour**, live **Publish/Unpublish** in the demo, and the **dependency refresh** (Nuxt 4.4.8 / Vue 3.5.38 / Pinia 3 / vue-router 5 / TypeScript 6 / Vitest 4 / @nuxt/ui 4.9). **Verdict: 0 Critical, 0 High, 0 Medium.** Every brief concern was already correctly mitigated — publish/unpublish is enforced server-side (Strapi 403) with the UI gate as defense-in-depth; the demo identities are dev/demo-only and tree-shaken from a normal build; Main-File links pass through `safeHref`; the tour has zero `v-html` and a namespaced+versioned `localStorage` key; markdown stays `html:false` with an `id`/`class`-only attrs allowlist. `npm audit` → **0 critical / 0 high / 0 moderate**, 1 known **dev-only Low** (esbuild dev-server file-read, Windows). Two **defense-in-depth** fixes turned prior §7 residuals into tested guarantees.

| Finding | Severity | Remediation | Status |
|---|---|---|---|
| F-1 — `runtimeConfig.public` (incl. `demoMode`) was runtime-mutable (the §7 D-2 residual) | Low | Deep-freeze the public config in an early client plugin (`app/plugins/00.freeze-config.ts`) so devtools can't flip `demoMode` to disarm the JS write-guards; CSP still backstops it | ✅ Fixed (`d8ae8e0`) |
| F-2 — Demo header set had no CI regression guard (the §7 D-2 "CI guard" note) | Low | Test asserts `deploy/headers-demo.txt` keeps `connect-src 'self'` (no Strapi/Mailgun/Iconify) + the full hardening set | ✅ Fixed (`d8ae8e0`) |
| F-3..F-10 — demo isolation, server-side publish/unpublish, Main-Files injection, tour XSS, markdown `html:false`/attrs allowlist, CSP sets, deps, prior protections | Info | Reviewed; already correctly mitigated — accepted with rationale | ✅ Accepted (safe) |

Full detail in [`docs/security-audit.md`](docs/security-audit.md) §8. Verification: **514 tests + typecheck (0) + demo `generate`** green.

<details>
<summary><strong>Previous audits</strong></summary>

### 2026-06-21 · Demo & public-deploy audit

**Demo & public-deploy audit (2026-06-21).** A second adversarial pass covered the new **public-demo** capability — demo mode, the static Netlify deploy, the demo CSP/headers, and icon/image bundling. **Verdict: safe to expose publicly — 0 Critical, 0 High.** The demo cannot write to Strapi, cannot sign in as a real user, and ships no secrets; this holds three deep — in-memory data, a sentinel token Strapi rejects, and a CSP `connect-src 'self'` that makes the backend unreachable *even if every client-side guard is bypassed*. Of 10 findings (all Medium/Low), **5 were fixed in code and 5 documented** (D-2 later hardened in the 2026-06-22 pass — see F-1).

| Finding | Severity | Remediation | Status |
|---|---|---|---|
| D-1 — Dev Strapi URL baked into the public demo bundle | Medium | Blank `strapiBaseUrl` in demo mode (unused — the demo is in-memory) | ✅ Fixed (`cdff530`) |
| D-2 — `demoMode` flag is runtime-mutable (devtools could flip it) | Medium | CSP `connect-src 'self'` backstop + rejected sentinel token; **now also deep-frozen** (2026-06-22, F-1) | ✅ Fixed (`d8ae8e0`) |
| D-3 — Icons could fetch `api.iconify.design` at runtime | Medium | `icon.fallbackToApi:false` + all icons bundled locally | ✅ Fixed (`cdff530`) |
| D-4 — Content reads gated only by the token, not the demo build | Low | `isDemoData()` read-guard (in-memory repo for the whole demo build) | ✅ Fixed (`cdff530`) |
| D-7 — Icon dependency pinned with a `^` range | Low | Pinned exact (`1.2.114`) | ✅ Fixed (`cdff530`) |
| D-8 — No `Permissions-Policy` header | Low | Added to both header sets | ✅ Fixed (`cdff530`) |
| D-5, D-6, D-9, D-10 — minor disclosure / prod-scoped | Low | Documented (sentinel creds worthless vs real Strapi; email-domain placeholder; HSTS `preload`; cookie `HttpOnly` = prod H-1) | 📄 Documented |

Full detail in [`docs/security-audit.md`](docs/security-audit.md) §7.

### 2026-06-21 · Production red/blue team

**Posture: strong** for a client-side staff tool — **0 Critical**, nothing confirmed-exploitable in the production path.

| Critical | High | Medium | Low | Info |
|:--:|:--:|:--:|:--:|:--:|
| 0 | 1 | 4 | 4 | 4 |

- **Top risk (H-1):** no Content-Security-Policy / security headers, plus the admin JWT in a JS-readable cookie → **add a CSP**.
- **Other findings:** unthrottled review-email relay (M-5); client-only SVG / document-upload validation (M-3, M-4); fragile TOC id injection (M-2).
- **Blue-team credit:** single `html:false` markdown seam, `safeHref` URL allowlist, default-deny routing with Strapi as the real authority, server-isolated secrets, dev bypass fails closed.
- **Report:** [`docs/security-audit.md`](docs/security-audit.md) — reviewed `0f42014`, committed `5f4c951`.

**Findings & remediation**

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
| Server-side authorization / admin-JWT lifetime (incl. L-1 token revocation) | — | Verify in the Strapi instance: publisher-only publish, per-role permissions, a sane admin-JWT lifetime | ⏳ Launch-time (Strapi side — Research & Analysis) |
| Dev `admin/admin` bypass (D-1/2/3) | Dev-only | Remove end-to-end before production and add a CI check that fails if it ships; meanwhile it is tree-shaken out of production builds | ⏳ Launch-time |

Dependency monitoring (Dependabot) was also added in `e402f3d`; the full detail is in [`docs/security-audit.md`](docs/security-audit.md).

</details>

---

## Architecture

The Studio is a **Nuxt 4 SPA** (`ssr: false`) that talks exclusively to Strapi 5's **admin Content-Manager API** (`/content-manager/collection-types/…`, `/admin/login`, `/admin/users/me`). There is no public REST or GraphQL surface in the critical path; everything requires a valid Strapi admin JWT.

In the **public demo build** (`NUXT_PUBLIC_DEMO_MODE=true`) the composables read an **in-memory** repository instead (`isDemoData()`), and every real write is hard-blocked (`assertWritesAllowed()` throws before `$api`) — so the bottom two layers below are never reached.

**Layer model** (thin to thick):

```
Pages / Components
    └── Composables  (useAuth, useArticles, useUpload, …)   ── demo: in-memory repo (isDemoData)
          └── app/lib/  (pure TypeScript: validators, repository, markdown, safe-url, …)
                └── $api  (ofetch client, injected by plugins/api.ts, attaches Bearer JWT)
                      └── Strapi 5 admin API  (https://v2.hub.icjia-api.cloud)
```

**Author → publish data flow:**

```
Author fills form
  → field-level validate (app/lib/validators/)
  → save-gate: assertNoBase64 + field validation before any write
  → repository.create / .update  (assertWritesAllowed, then POST / PUT to Content-Manager)
  → Strapi saves draft
  → MarkdownPreview / PublishedArticlePreview shows "exactly-as-published" output
  → Editor clicks Publish → repository.publish (POST .../actions/publish; Strapi 403s a non-Editor)
  → Strapi sets publishedAt → triggers site-rebuild webhook
  (Unpublish mirrors this via repository.unpublish → POST .../actions/unpublish)
```

**State management:** Pinia store (`auth.ts`) persisted to cookies; everything else is composable-local reactive state.

---

## Tech stack

Exact versions from `package.json`:

| Package | Version | Role |
|---|---|---|
| `nuxt` | ^4.4.8 | Framework (SPA mode, `ssr: false`) |
| `vue` | ^3.5.38 | UI runtime |
| `vue-router` | ^5.1.0 | Client-side routing (router 5 is what Nuxt 4 expects) |
| `@nuxt/ui` | ^4.9.0 | Component library (Tailwind CSS v4) |
| `pinia` | ^3.0.4 | State management |
| `@pinia/nuxt` | ^0.11.3 | Pinia Nuxt module |
| `pinia-plugin-persistedstate` | ^4.7.1 | Cookie persistence for auth store |
| `@codemirror/state` | ^6.6.0 | CodeMirror 6 editor state |
| `@codemirror/view` | ^6.43.1 | CodeMirror 6 editor view |
| `@codemirror/lang-markdown` | ^6.5.0 | Markdown language support |
| `@codemirror/commands` | ^6.10.3 | Editor keyboard commands |
| `@codemirror/autocomplete` | ^6.20.3 | Autocomplete extension |
| `@codemirror/search` | ^6.7.1 | Search extension |
| `@codemirror/language` | ^6.12.3 | Language utilities |
| `@codemirror/language-data` | ^6.5.2 | Language data |
| `@lezer/highlight` | ^1.2.3 | Syntax highlighting |
| `markdown-it` | ^14.2.0 | Markdown renderer (`html: false`) |
| `markdown-it-attrs` | 4.5.0 | `{.class #id}` attrs (allowlist: `id`/`class` only; v5 pinned out — breaks Vite interop) |
| `markdown-it-footnote` | ^4.0.0 | Footnote plugin |
| `markdown-it-multimd-table` | ^4.2.3 | Advanced table plugin |
| `@vscode/markdown-it-katex` | ^1.1.2 | KaTeX math rendering |
| `dompurify` | ^3.4.11 | SVG sanitization (ships its own types — the `@types/dompurify` stub was dropped) |
| `@iconify-json/lucide` | 1.2.114 | Lucide icons, bundled into the client (exact pin; no runtime Iconify fetch) |
| `vitest` | ^4.1.9 | Test runner |
| `@nuxt/test-utils` | ^4.0.3 | Nuxt component testing |
| `@vue/test-utils` | ^2.4.11 | Vue component helpers |
| `happy-dom` | ^20.10.6 | DOM environment for tests |
| `typescript` | ^6.0.3 | Type system |
| `vue-tsc` | ^3.3.5 | Vue type-checking |

Google Fonts loaded via `@nuxt/fonts`: **Inter** (UI), **Oswald** (preview headings — matches the live Research Hub), **JetBrains Mono** (editor).

---

## Authentication &amp; authorization

### Login flow

The Studio uses Strapi's **admin JWT** (not the public content API's user JWT). Login posts to `/admin/login`; the returned token is then used immediately for a second call to `/admin/users/me` to fetch the user record with roles attached.

### Session persistence

`app/stores/auth.ts` uses `pinia-plugin-persistedstate` with cookie storage:

```ts
persist: {
  storage: piniaPluginPersistedstate.cookies({
    sameSite: 'strict',
    secure: !import.meta.dev,   // secure in production, not in dev
    maxAge: 60 * 60 * 24 * 30,  // 30 days
  }),
  pick: ['jwt', 'user'],   // hasProfile excluded — re-resolved on every boot
}
```

`hasProfile` is always re-derived on boot (never persisted) to avoid a stale `false` blocking authors at onboarding.

### Boot re-verification (`init()`)

On every app load, `useAuth().init()` re-calls `/admin/users/me` with the persisted JWT:

- **401** → the `$api` interceptor catches it, calls `clearSession()`, and redirects to `/login`.
- **403** → explicit `init()` catch: `clearSession()` + return (deactivated/forbidden user — audit M-1).
- **Network/5xx** → deliberate no-op: session is kept (server enforces authz on every real request; don't log out on a transient failure).

### Role-based authorization

`app/lib/admin-roles.ts` defines two role tiers:

- **Publisher roles** (`strapi-super-admin`, `strapi-editor`): `canPublish = true` → can publish/unpublish and see the Manage page.
- **Author role** (`strapi-author`): `canPublish = false` → can draft, save, and request review only.

`canPublish` is a **Strapi-enforced server rule**: an author's JWT gets a 403 from `/actions/publish` (and `/actions/unpublish`). The Studio's `canPublish` flag is **defence-in-depth UX only** — and it is **default-deny**: the Publish/Unpublish control is hidden entirely for authors (`<div v-if="canPublish">` in `PublishButton.vue` — it never renders), so an author can never even invoke the action.

**User-facing terminology** is just two labels, written for non-technical R&A staff: an account that can publish is an **"Editor"** (a super-admin also reads as "Editor" — no "Superadmin" label is surfaced), everything else is an **"Author"**. The navbar shows a single, keyboard-accessible **role chip** whose popover explains the role in plain language; both the label and the text come from pure, unit-tested helpers (`roleLabel` / `rolePermissions` in `app/lib/admin-roles.ts`).

### Route guard

`app/middleware/auth.global.ts` is a global Nuxt route middleware. It delegates all logic to `app/lib/guard.ts` (`resolveAuthRedirect`), which is pure and unit-tested. Default-deny: every route requires authentication unless explicitly marked `meta.public = true`.

### Dev bypass & demo identities

`app/lib/dev-auth.ts` provides an `admin`/`admin` login shortcut. Both the local-dev bypass **and** the public demo's "Enter as Author / Enter as Editor" buttons mint the **same synthetic sentinel session** (`makeDevAdminSession(role)`); the two demo identities differ **only** in their Strapi role codes (`strapi-editor` → `canPublish` true; `strapi-author` → false), which is what lets a manager compare both views. The whole path is gated by `import.meta.dev || isDemoMode()`, so:

- In a **normal production build** (not dev, `demoMode` false) it is fully **tree-shaken / inert** — `login()` and `loginAsDemo()` never mint a synthetic session, and `init()` / the `$api` 401 interceptor never honor the sentinel token.
- The synthetic JWT is a **sentinel string Strapi will never accept**, so any API call made with it fails closed (401).

The public demo additionally **hard-blocks all writes** (`assertWritesAllowed()` throws before any `$api` call) and serves **in-memory content** (`isDemoData()`), with the demo CSP `connect-src 'self'` as an independent network backstop. The non-secret public runtime config (including `demoMode`) is **deep-frozen on boot** (`app/plugins/00.freeze-config.ts`) so devtools cannot flip it to disarm the guards (audit §8 F-1). See [`docs/security-audit.md`](docs/security-audit.md) §7–§8 for the full notes; remove `app/lib/dev-auth.ts` and its call sites before the real production launch.

---

## Content authoring &amp; the editor

### Markdown editor

The Studio consumes the **ICJIA Markdown Editor 2026** ([github.com/ICJIA/icjia-markdown-editor-2026](https://github.com/ICJIA/icjia-markdown-editor-2026)) as a Nuxt layer. It is built on **CodeMirror 6** (packages vendored in `app/lib/editor/vendor/`): `@codemirror/state`, `@codemirror/view`, `@codemirror/lang-markdown`, `@codemirror/commands`, `@codemirror/search`, `@codemirror/autocomplete`, `@codemirror/language`, `@codemirror/language-data`, `@lezer/highlight`. The editor exposes a formatting toolbar (bold, italic, headings, links, lists, code fences, tables) requiring no markdown knowledge from authors.

### Live "exactly-as-published" preview

`app/components/PublishedArticlePreview.vue` (and sibling `PublishedAppPreview` / `PublishedDatasetPreview`) renders output using the same `renderArticleBody()` function and the same CSS (`assets/css/prose-preview.css` — faithful hub styles with Oswald headings) as the public Research Hub. A **sticky Table of Contents** (h2-level) is generated from the markdown AST in a single pass (see [Data layer &amp; validation](#data-layer--validation) below).

### Body-image gallery

Authors pick images from the Strapi Media Library via `app/components/MediaPicker.vue` and `app/components/ImageDropzone.vue`. The editor's `app/lib/editor/image-insert.ts` inserts the hosted URL as a standard markdown image reference. Alt-text is required.

### Zero-base64 pipeline

Every image must be a Strapi Media Library upload. `app/lib/base64-guard.ts` defines `assertNoBase64()`, which walks the entire write payload recursively and throws if any `data:...;base64,...` blob is present. This guard runs at the repository write boundary (`create` and `update`) independently of the form validators — a direct repository caller cannot bypass the form layer and persist an inline base64 image.

---

## Data layer &amp; validation

### Content models

Three typed domain models: **Article**, **App**, **Dataset**. Each has a corresponding:

- `app/repositories/{articles,apps,datasets}.ts` — wires the generic repository to its Strapi UID and mapper.
- `app/lib/mappers/` — pure `fromStrapi` / `toWrite` functions (unit-tested).
- `app/lib/validators/{article,app,dataset}.ts` — field-level validation rules.
- `app/lib/forms/{article,app,dataset}.ts` — blank model factories and submit logic.

### Repository pattern (`app/lib/repository.ts`)

A single generic `createRepository<TRaw, TDomain, TWrite>` factory produces typed repositories. Key operations:

| Method | Strapi call |
|---|---|
| `list(opts)` | `GET /content-manager/collection-types/{uid}` |
| `listPage(opts)` | Same, returns `PagedResult<T>` with pagination |
| `findOne(id, opts)` | `GET .../uid/id` + relations hydration from `/content-manager/relations/…` |
| `create(model)` | `POST` with flat body (no `{data}` wrapper) |
| `update(id, model)` | `PUT` with flat body |
| `remove(id)` | `DELETE` |
| `publish(id)` | `POST .../id/actions/publish` (Strapi enforces publisher role) |
| `unpublish(id)` | `POST .../id/actions/unpublish` (mirror of publish; Strapi enforces publisher role) |

Every **write** method (`create`/`update`/`remove`/`publish`/`unpublish`) first calls `assertWritesAllowed()`, which **throws before any `$api` call** in the public demo build — a hard, belt-and-suspenders write-block independent of the in-memory demo repository.

**Multiple Main Files:** an article carries an array of Main Files (PDFs, max `studio.config.ts` → `maxMainFiles`, default 3). The mapper (`app/lib/mappers/article.ts`) reads them via `mediaListFromStrapi` and writes only numeric upload ids via `mediaIdsForWrite` (placeholder/demo refs with `id <= 0` are dropped) — numeric/type-strict, so no user string reaches Strapi as an id.

### Save-gate

Forms call `app/lib/forms/submit.ts` which validates all fields before any network write. Only if validation passes does the form proceed to `repository.create` / `.update`. After that, `assertNoBase64` fires as a hard second layer at the repository boundary.

### Markdown rendering &amp; TOC

`app/lib/markdown.ts` exports three functions, each backed by a `markdown-it` instance with **`html: false`** (raw author HTML/script is escaped, never executed) and `markdown-it-attrs` restricted to an **`id`/`class`-only allowlist** (no `style`, `on*`, `href`, or `src` overrides):

- `renderMarkdown(source)` — full instance with footnotes, KaTeX, multimd-table, link → `target="_blank"` + `rel="noopener noreferrer"`.
- `renderInline(source)` — inline-only (no footnotes); for abstract/summary fields.
- `renderArticleBody(source)` → `{ html, toc }` — same plugin set + an AST-level h2 core rule that assigns slugified, de-duplicated, HTML-attribute-escaped ids to every `<h2>` in a single pass over the token stream (audit M-2 fix — never touches rendered HTML strings).

The published preview renders a **per-file download button** for each Main File under the Table of Contents; every download `href` passes through `safeHref` (no `javascript:` / `data:`), and the filename is rendered as Vue-escaped text.

---

## Demo mode &amp; the guided tour

### Public demo mode

Setting `NUXT_PUBLIC_DEMO_MODE=true` at build (read by `studio.config.ts` → `runtimeConfig.public.demoMode`) produces a **fully self-contained, safe-to-expose public deploy**:

- **Demo login only** — the real Strapi login is impossible; a manager enters via **"Enter as Author"** or **"Enter as Editor"** to compare both views (the Author never sees the Publish control).
- **In-memory content** — `isDemoData()` routes every read to an in-memory repository (`app/lib/demo-repository.ts`) seeded with synthetic, 100%-phony content; Publish/Unpublish update the lists and the publish queue **live for the session** (a shared in-memory store; resets on reload).
- **Zero Strapi writes** — `assertWritesAllowed()` throws before any `$api` call; uploads are blocked the same way.
- **No secrets, no real host** — `strapiBaseUrl` is **blanked** in demo mode; Mailgun keys are server-only and absent from the static build.
- **Independent network backstop** — the demo CSP (`deploy/headers-demo.txt`) pins `connect-src 'self'`, so the real backend is unreachable from the browser **even if every JS guard were bypassed**. The non-secret public config is **deep-frozen on boot** so `demoMode` can't be flipped from devtools (audit §8 F-1).

The demo deploys statically on Netlify (`netlify.toml`: `nuxt generate` + a build step that copies `deploy/headers-demo.txt` over the published `_headers`).

### Guided onboarding tour

A first-run, skippable walkthrough on the dashboard (`app/composables/useGuidedTour.ts` + `app/components/tour/*`): two intro slides, then role-aware spotlight steps (Create, your content list, the role chip, the light/dark toggle, the demo banner, and — **editors only** — the Publish queue). It **auto-starts once per browser** (a namespaced, versioned `localStorage` key — `icjia-studio-tour-v1`), dismisses on Esc / backdrop / Skip, and replays anytime from **Tour** in the top nav. The runtime is **ported from [ICJIA `nuxt-guided-tour`](https://github.com/ICJIA/nuxt-guided-tour) as plain app code** under a renamed `useGuidedTour` composable (deliberately not the npm module, so it can never collide with Nuxt UI's own `useTour`). All step content is **hardcoded** (no `v-html`, no user data); `data-tour="…"` anchors are static `querySelector` targets; tour icons are bundled lucide (no runtime Iconify fetch under the demo CSP).

---

## Testing

**Runner:** Vitest `^4.1.9` with `@nuxt/test-utils ^4.0.3` and `happy-dom ^20.10.6`.

**Current totals:** **514 tests** across **78 test files** (54 unit + 24 Nuxt component).

**Structure:**

```
tests/
  unit/       # 54 files — pure app/lib/ logic (no DOM, no network)
  nuxt/       # 24 files — components via mountSuspended (Nuxt test environment)
  fixtures/   # shared data helpers
```

**Unit coverage includes:** auth store, guard logic, all validators, repository logic (incl. publish/unpublish + the demo write-block), mappers (article/app/dataset, incl. the Main-Files array), markdown rendering + TOC + the `markdown-it-attrs` allowlist, base64 guard, safe-url/safeHref, rate limiter, request-review handler, review-email composition, sanitize-svg, slug, upload orchestration, field-options, error-display, demo repository / demo session / demo content, the guided-tour config, the deep-freeze public-config guard, the security-header sets (production **and** demo), profile gate, form submit, studio-profile repository.

**Component coverage includes:** login (incl. demo-role entry), dashboard, content-list, article/app/dataset forms, the Main-Files field, body-images field, markdown editor, markdown field, media picker, media field, image dropzone, repeatable field, publish button, request-review form, preview page (incl. print), onboarding form, demo mode, routing smoke.

**Commands:**

```bash
npm test            # run all 514 tests once (vitest run)
npm run test:watch  # watch mode (vitest)
npm run typecheck   # vue-tsc type-check
```

---

## Security

### Security headers &amp; CSP — two sets

Two hardened header sets are maintained, each applied to every response (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` denying camera/mic/geolocation/etc., `Strict-Transport-Security: max-age=31536000; includeSubDomains`, plus a CSP with `object-src/base-uri/frame-ancestors 'none'` and `form-action 'self'`):

- **Production** (`public/_headers`) — tight `connect-src` limiting outbound requests to `'self'`, `https://v2.hub.icjia-api.cloud`, and `https://api.mailgun.net`; **`script-src 'self'`** (no `'unsafe-inline'`).
- **Public demo** (`deploy/headers-demo.txt`, copied over `_headers` by `netlify.toml`) — **`connect-src 'self'` only** (the independent network backstop: the real backend is unreachable from the browser); `script-src 'self' 'unsafe-inline'` is acceptable here because the demo holds no admin JWT or secrets, and is required for the static Nuxt bootstrap. A unit test guards the demo `connect-src` against re-opening to any non-`'self'` host (audit §8 F-2).

**Action required before launch (production set):** verify the CSP on a Netlify deploy-preview — if a Nuxt bootstrap inline script is blocked, add its `sha256` hash to `script-src`. Never add `'unsafe-inline'` to the production `script-src`. If not hosting on Netlify, port these headers to the host's config or Nuxt `routeRules`.

### Markdown XSS seam

The **`html: false`** flag on every `markdown-it` instance (`app/lib/markdown.ts`) escapes all raw HTML in author-supplied markdown; only trusted plugin output (footnotes, KaTeX, tables) is emitted as HTML. `markdown-it-attrs` is restricted to an **`id`/`class`-only allowlist** (no `style`/`on*`/`href`/`src`). All three `v-html` sinks in the app are fed exclusively by this pipeline.

### URL allowlist (`app/lib/safe-url.ts`)

`safeHref(url)` allows only `https?://`, root-relative `/path`, and `#fragment` links. All other schemes (`javascript:`, `data:`, `vbscript:`, `file:`, protocol-relative `//host`) collapse to `'#'`.

### Rate-limited email endpoint

`server/api/request-review.post.ts` is a Nitro server route (deploys as a Netlify Function). It validates the caller's JWT against Strapi (`/admin/users/me`), then applies a **fixed-window rate limit** (5 requests / 10 minutes per authenticated user, keyed by Strapi user id) before dispatching via Mailgun. Mailgun credentials (`MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_FROM`) are server-only `runtimeConfig` values — never exposed to the client.

Full details and all findings: [`docs/security-audit.md`](docs/security-audit.md). See the [Security audits](#security-audits) log above for the remediation summary.

---

## Build &amp; deployment

### SPA build

```bash
npm run build     # nuxt build → .output/
npm run generate  # nuxt generate → .output/public/ (static export)
```

The app is `ssr: false` throughout — Nuxt generates a single-page application. Server routes (the review-email endpoint) are bundled separately as Nitro/Netlify Functions.

### Deploy

Hosted on Netlify. The `public/_headers` file is served at `/_headers` and applied to every response. After launch, verify the CSP on a deploy-preview before merging to production (see [Security](#security) above).

### Publish → site-rebuild webhook

When a Manager publishes content in the Studio, Strapi's native **Draft &amp; Publish** sets `publishedAt`. The rebuild hook that triggers the public Research Hub regeneration is configured on the Strapi side — see [`docs/deploy-rebuild-and-email.md`](docs/deploy-rebuild-and-email.md) for the setup checklist.

---

## Local development

### Prerequisites

- Node.js **≥ 20.0.0** (see `engines` in `package.json`)
- Access to the Strapi admin API at `https://v2.hub.icjia-api.cloud` (or a local Strapi instance with the `strapiBaseUrl` overridden in `.env`)

### Environment variables (optional for dev)

| Variable | Purpose |
|---|---|
| `MAILGUN_API_KEY` | Mailgun API key (review-email endpoint) |
| `MAILGUN_DOMAIN` | Mailgun sending domain |
| `MAILGUN_FROM` | Mailgun sender address |
| `PUBLIC_BASE_URL` | Absolute origin of the deployed Studio (used in review-email preview links) |

None are required for local development — the review-email endpoint will return an error if called without them, but the rest of the Studio works without them.

### Steps

```bash
npm install       # install dependencies
npm run dev       # start dev server (default: http://localhost:3000)
```

On the login screen, use `admin` / `admin` to enter the dev bypass (a synthetic session — no Strapi account needed). See `app/lib/dev-auth.ts` for details; this bypass is tree-shaken from production builds.

To run the **public demo** locally (in-memory, demo-login-only, no Strapi):

```bash
NUXT_PUBLIC_DEMO_MODE=true npm run generate   # static demo build → .output/public
```

```bash
npm test          # run 514 tests
npm run typecheck # TypeScript type-check
npm run build     # production build
```

---

## Repository layout

```
app/
  assets/          # CSS (main.css, prose-preview.css, guided-tour.css)
  components/      # Vue components
    fields/        # ChipsField, DateField, MediaField, RelationList, RepeatableField, SelectField, TextField
    forms/         # ArticleForm, AppForm, DatasetForm, MainFilesField, BodyImagesField
    tour/          # GuidedTour, GuidedWelcome, GuidedIntro, GuidedOverlay, GuidedTrigger (in-app tour)
    ContentList.vue, MarkdownEditor.vue, MarkdownField.vue, MarkdownPreview.vue
    MediaPicker.vue, ImageDropzone.vue, PublishButton.vue, RequestReviewForm.vue
    PublishedArticlePreview.vue, PublishedAppPreview.vue, PublishedDatasetPreview.vue
  composables/     # useAuth, useArticles, useApps, useDatasets, useUpload, useStudioProfile
    useGuidedTour.ts, guided-tour-config.ts, guided-tour-types.ts   # ported tour runtime + config
  lib/             # pure TypeScript logic (no Vue, unit-testable in Node)
    admin-roles.ts, api.ts, auth.ts, base64-guard.ts, dev-auth.ts, guard.ts
    markdown.ts, rate-limit.ts, repository.ts, safe-url.ts, sanitize-svg.ts, slug.ts
    upload.ts, text-import.ts, review-email.ts, request-review-handler.ts
    demo.ts, demo-repository.ts, demo-content.ts          # public-demo: flags, in-memory repo, content
    freeze-public-config.ts                               # deep-freeze runtimeConfig.public (audit F-1)
    sample-{article,app,dataset,files,figures,images}.ts  # one-click sample / demo fixtures
    editor/        # CodeMirror 6 config (image-insert.ts, studio-editor-state.ts, vendor/)
    forms/         # blank-models + submit logic (article.ts, app.ts, dataset.ts)
    mappers/       # fromStrapi / toWrite converters (article, app, dataset)
    strapi-rest.ts # Content-Manager envelopes + media helpers (mediaListFromStrapi, mediaIdsForWrite)
    validators/    # field-level validation rules (article.ts, app.ts, dataset.ts, url-scheme.ts)
  middleware/      # auth.global.ts (default-deny route guard)
  pages/           # index.vue, login.vue, manage.vue, onboarding.vue
    create/[type].vue, edit/[type]/[id].vue, preview/[type]/[id].vue
  plugins/         # 00.freeze-config.ts (deep-freeze public config first), api.ts ($api + Bearer + 401)
  repositories/    # articles.ts, apps.ts, datasets.ts, studio-profile.ts (wire lib/repository to Strapi UIDs)
  stores/          # auth.ts (Pinia auth store with cookie persistence)
  types/           # TypeScript interfaces (admin.ts, content.ts, …)

server/
  api/
    request-review.post.ts   # Nitro/Netlify Function: JWT-verified, rate-limited Mailgun relay

public/
  _headers         # Netlify PRODUCTION security headers + CSP
  files/demo/      # bundled static demo PDFs (Main Files)
  images/          # static image assets (icjia-logo.png, images/demo/ splash + figures)

deploy/
  headers-demo.txt # PUBLIC DEMO header set (connect-src 'self'); netlify.toml copies it over _headers

tests/
  unit/            # 54 test files — pure app/lib/ logic
  nuxt/            # 24 test files — Nuxt component tests (mountSuspended)
  fixtures/        # shared test data

docs/
  ICJIA-Research-Hub-Studio-2026-Design-and-Implementation-Spec.md
  ICJIA-Research-Hub-Studio-2026-Design-and-Implementation-Spec.docx
  security-audit.md
  deploy-rebuild-and-email.md
  onboarding-studio-profile-setup.md
```

---

## Reference

- Legacy app (v1): https://github.com/icjia/researchhub-studio
- Markdown editor: https://github.com/ICJIA/icjia-markdown-editor-2026

## License

[MIT](LICENSE) © 2026 Illinois Criminal Justice Information Authority
