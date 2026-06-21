# ICJIA Research Hub Studio 2026

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> This website is funded through a grant from the Bureau of Justice Statistics, Office of Justice Programs, U.S. Department of Justice. Neither the U.S. Department of Justice nor any of its components operate, control, are responsible for, or necessarily endorse, this website (including, without limitation, its content, technical infrastructure, and policies, and any services or tools provided).

## TL;DR — the 30-second version

- **What it is:** the internal tool ICJIA staff use to write, preview, and publish Research Hub content (articles, apps, datasets).
- **Status:** built and working in development — you can click through a complete demo today.
- **How it works:** authors draft in a plain-English editor with a live "exactly-as-published" preview; a manager clicks **Publish**.
- **Security:** independently red/blue-team audited — **0 critical issues**; in-repo fixes done and covered by 375 automated tests ([`docs/security-audit.md`](docs/security-audit.md)).
- **What's left:** setup on the Strapi / email side (Research &amp; Analysis) and a short launch checklist — not new building.

*That's the whole project in five lines. Everything below is supporting detail — read only what you need.*

**Non-technical readers:** the TL;DR above and the [Design &amp; Implementation Spec](docs/ICJIA-Research-Hub-Studio-2026-Design-and-Implementation-Spec.md) are all you need — everything below is developer reference.

---

## Developer reference

Internal authoring &amp; publishing tool (**"Studio"**) for managing **ICJIA Research Hub** content — **articles, apps, and datasets** — backed by Strapi 5.

This is a ground-up rebuild of the 2019 [`researchhub-studio`](https://github.com/icjia/researchhub-studio) on a modern stack, with a simplified two-role workflow and proper (non-base64) image handling.

## Status: built and working in development (pre-launch)

The core Studio is **built and working** — authoring, the live "exactly-as-published" preview, publishing, image handling, and a full clickable demo are all in place and covered by automated tests. It remains in **active development** ahead of launch: requirements are still refined as we go (for example, authentication moved from the public REST API to Strapi's admin **Content-Manager API** once we confirmed how the publish roles work), and the Strapi / email setup plus a short launch checklist remain. The full design and the security review live here:

- 📄 [**Design &amp; Implementation Spec**](docs/ICJIA-Research-Hub-Studio-2026-Design-and-Implementation-Spec.md) ([Word version](docs/ICJIA-Research-Hub-Studio-2026-Design-and-Implementation-Spec.docx)) — plain-English for managers **and** technical detail for developers; opens with a 30-second TL;DR.
- 🔒 [**Security audit**](docs/security-audit.md) — independent red/blue team review (running log below).

## Workflow

- **Authors** log in, write an article in a friendly markdown editor (formatting buttons + live preview, no code), add images from the Media Library, and save a **draft**.
- **Managers** review the list of pending drafts and click **Publish** — which marks the content published in Strapi and triggers a rebuild of the public site.

That's the whole lifecycle: **Authors draft → Managers publish.**

## Security audits

A running log of red / blue team security audits. The **latest** summary is shown; earlier audits are collapsed under *Previous audits*. Full reports live in [`docs/security-audit.md`](docs/security-audit.md).

<!-- Maintenance: when a new audit is run, move the current "Latest" block into a new entry under "Previous audits" below, then replace the Latest block with the new summary. -->

### Latest — 2026-06-21 · Red / Blue Team

**Posture: strong** for a client-side staff tool — **0 Critical**, nothing confirmed-exploitable in the production path.

| Critical | High | Medium | Low | Info |
|:--:|:--:|:--:|:--:|:--:|
| 0 | 1 | 4 | 4 | 4 |

- **Top risk (H-1):** no Content-Security-Policy / security headers, plus the admin JWT in a JS-readable cookie → **add a CSP**.
- **Other findings:** unthrottled review-email relay (M-5); client-only SVG / document-upload validation (M-3, M-4); fragile TOC id injection (M-2).
- **Blue-team credit:** single `html:false` markdown seam, `safeHref` URL allowlist, default-deny routing with Strapi as the real authority, server-isolated secrets, dev bypass fails closed.
- **Report:** [`docs/security-audit.md`](docs/security-audit.md) — reviewed `0f42014`, committed `5f4c951`.
- **Remediation (2026-06-21):** in-repo findings addressed in `e402f3d` — security headers + CSP, email rate-limit, AST-based TOC ids, dataset URL gate, hard base64 write-guard, 403 logout, Dependabot (375 tests). Open: the CSP needs a Netlify deploy-preview check; the dev-login removal + Strapi-side config are launch-time.

<details>
<summary><strong>Previous audits</strong></summary>

_No earlier audits yet — 2026-06-21 is the first._

</details>

---

## Architecture

The Studio is a **Nuxt 4 SPA** (`ssr: false`) that talks exclusively to Strapi 5's **admin Content-Manager API** (`/content-manager/collection-types/…`, `/admin/login`, `/admin/users/me`). There is no public REST or GraphQL surface in the critical path; everything requires a valid Strapi admin JWT.

**Layer model** (thin to thick):

```
Pages / Components
    └── Composables  (useAuth, useArticles, useUpload, …)
          └── app/lib/  (pure TypeScript: validators, repository, markdown, safe-url, …)
                └── $api  (ofetch client, injected by plugins/api.ts, attaches Bearer JWT)
                      └── Strapi 5 admin API  (https://v2.hub.icjia-api.cloud)
```

**Author → publish data flow:**

```
Author fills form
  → field-level validate (app/lib/validators/)
  → save-gate: assertNoBase64 + field validation before any write
  → repository.create / .update  (POST / PUT to Content-Manager)
  → Strapi saves draft
  → MarkdownPreview / PublishedArticlePreview shows "exactly-as-published" output
  → Manager clicks Publish → repository.publish (POST .../actions/publish)
  → Strapi sets publishedAt → triggers site-rebuild webhook
```

**State management:** Pinia store (`auth.ts`) persisted to cookies; everything else is composable-local reactive state.

---

## Tech stack

Exact versions from `package.json`:

| Package | Version | Role |
|---|---|---|
| `nuxt` | ^4.0.0 | Framework (SPA mode, `ssr: false`) |
| `vue` | ^3.5.0 | UI runtime |
| `vue-router` | ^4.4.0 | Client-side routing |
| `@nuxt/ui` | ^4.0.1 | Component library (Tailwind CSS v4) |
| `pinia` | ^2.2.0 | State management |
| `@pinia/nuxt` | ^0.6.1 | Pinia Nuxt module |
| `pinia-plugin-persistedstate` | 4.1.3 | Cookie persistence for auth store |
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
| `markdown-it-footnote` | ^4.0.0 | Footnote plugin |
| `markdown-it-multimd-table` | ^4.2.3 | Advanced table plugin |
| `@vscode/markdown-it-katex` | ^1.1.2 | KaTeX math rendering |
| `dompurify` | ^3.4.11 | SVG sanitization |
| `vitest` | ^4.0.0 | Test runner |
| `@nuxt/test-utils` | ^4.0.3 | Nuxt component testing |
| `@vue/test-utils` | ^2.4.6 | Vue component helpers |
| `happy-dom` | ^20.0.0 | DOM environment for tests |
| `typescript` | ^5.6.0 | Type system |
| `vue-tsc` | ^2.1.0 | Vue type-checking |

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

- **Publisher roles** (`strapi-super-admin`, `strapi-editor`): `canPublish = true` → can publish and see the Manage page.
- **Author role** (`strapi-author`): `canPublish = false` → can draft, save, and request review only.

`canPublish` is a **Strapi-enforced server rule**: an author's JWT gets a 403 from `/actions/publish`. The Studio's `canPublish` flag is defence-in-depth UX only.

### Route guard

`app/middleware/auth.global.ts` is a global Nuxt route middleware. It delegates all logic to `app/lib/guard.ts` (`resolveAuthRedirect`), which is pure and unit-tested. Default-deny: every route requires authentication unless explicitly marked `meta.public = true`.

### Dev bypass

`app/lib/dev-auth.ts` provides an `admin`/`admin` login shortcut for local development. It is **tree-shaken in production builds** (all call sites are inside `import.meta.dev` guards, which Vite replaces with `false`). The synthetic JWT is a sentinel string Strapi will never accept, so any API call made with it fails closed (401). See [`docs/security-audit.md`](docs/security-audit.md) for the full audit note; remove the file and its three call sites before production.

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

### Save-gate

Forms call `app/lib/forms/submit.ts` which validates all fields before any network write. Only if validation passes does the form proceed to `repository.create` / `.update`. After that, `assertNoBase64` fires as a hard second layer at the repository boundary.

### Markdown rendering &amp; TOC

`app/lib/markdown.ts` exports three functions:

- `renderMarkdown(source)` — full markdown-it instance with `html: false`, footnotes, KaTeX, multimd-table, link → `target="_blank"`.
- `renderInline(source)` — inline-only (no footnotes); for abstract/summary fields.
- `renderArticleBody(source)` → `{ html, toc }` — same plugin set + an AST-level h2 core rule that assigns slugified, de-duplicated, HTML-attribute-escaped ids to every `<h2>` in a single pass over the token stream (audit M-2 fix — never touches rendered HTML strings).

---

## Testing

**Runner:** Vitest `^4.0.0` with `@nuxt/test-utils ^4.0.3` and `happy-dom ^20.0.0`.

**Current totals:** **375 tests** across **66 test files** (46 unit + 20 Nuxt component).

**Structure:**

```
tests/
  unit/       # 46 files — pure app/lib/ logic (no DOM, no network)
  nuxt/       # 20 files — components via mountSuspended (Nuxt test environment)
  fixtures/   # shared data helpers
```

**Unit coverage includes:** auth store, guard logic, all validators, repository logic, mappers (article/app/dataset), markdown rendering + TOC, base64 guard, safe-url/safeHref, rate limiter, request-review handler, review-email composition, sanitize-svg, slug, upload orchestration, field-options, error-display, demo repository and demo session, profile gate, form submit, studio-profile repository.

**Component coverage includes:** login, dashboard, content-list, article/app/dataset forms, markdown editor, markdown field, media picker, media field, image dropzone, repeatable field, publish button, request-review form, preview page, onboarding form, routing smoke.

**Commands:**

```bash
npm test            # run all 375 tests once (vitest run)
npm run test:watch  # watch mode (vitest)
npm run typecheck   # vue-tsc type-check
```

---

## Security

### Security headers &amp; CSP (`public/_headers`)

Netlify's `_headers` file applies a hardened header set to every response:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Content-Security-Policy` — tight `connect-src` limiting outbound requests to `'self'`, `https://v2.hub.icjia-api.cloud`, and `https://api.mailgun.net`; `script-src 'self'` (no `'unsafe-inline'`); `object-src 'none'`; `frame-ancestors 'none'`.

**Action required before launch:** verify the CSP on a Netlify deploy-preview — if a Nuxt bootstrap inline script is blocked, add its `sha256` hash to `script-src`. Never add `'unsafe-inline'` to `script-src`. If not hosting on Netlify, port these headers to the host's config or Nuxt `routeRules`.

### Markdown XSS seam

The single `html: false` flag on the markdown-it instance (`app/lib/markdown.ts`) escapes all raw HTML in author-supplied markdown. Only trusted plugin output (footnotes, KaTeX, tables) is emitted as HTML. This is the only point where markdown reaches the DOM as `v-html`.

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

```bash
npm test          # run 375 tests
npm run typecheck # TypeScript type-check
npm run build     # production build
```

---

## Repository layout

```
app/
  assets/          # CSS (main.css, prose-preview.css)
  components/      # Vue components
    fields/        # ChipsField, DateField, MediaField, RelationList, RepeatableField, SelectField, TextField
    forms/         # ArticleForm, AppForm, DatasetForm
    ContentList.vue, MarkdownEditor.vue, MarkdownField.vue, MarkdownPreview.vue
    MediaPicker.vue, ImageDropzone.vue, PublishButton.vue, RequestReviewForm.vue
    PublishedArticlePreview.vue, PublishedAppPreview.vue, PublishedDatasetPreview.vue
  composables/     # useAuth.ts, useArticles.ts, useApps.ts, useDatasets.ts, useUpload.ts, useStudioProfile.ts
  lib/             # pure TypeScript logic (no Vue, unit-testable in Node)
    admin-roles.ts, api.ts, auth.ts, base64-guard.ts, dev-auth.ts, guard.ts
    markdown.ts, rate-limit.ts, repository.ts, safe-url.ts, sanitize-svg.ts, slug.ts
    upload.ts, text-import.ts, review-email.ts, request-review-handler.ts
    editor/        # CodeMirror 6 config (image-insert.ts, studio-editor-state.ts, vendor/)
    forms/         # blank-models + submit logic (article.ts, app.ts, dataset.ts)
    mappers/       # fromStrapi / toWrite converters (article, app, dataset)
    validators/    # field-level validation rules (article.ts, app.ts, dataset.ts, url-scheme.ts)
  middleware/      # auth.global.ts (default-deny route guard)
  pages/           # index.vue, login.vue, manage.vue, onboarding.vue
    create/[type].vue, edit/[type]/[id].vue, preview/[type]/[id].vue
  plugins/         # api.ts ($api ofetch client with Bearer + 401 interceptor)
  repositories/    # articles.ts, apps.ts, datasets.ts, studio-profile.ts (wire lib/repository to Strapi UIDs)
  stores/          # auth.ts (Pinia auth store with cookie persistence)
  types/           # TypeScript interfaces (admin.ts, content.ts, …)

server/
  api/
    request-review.post.ts   # Nitro/Netlify Function: JWT-verified, rate-limited Mailgun relay

public/
  _headers         # Netlify security headers + CSP
  images/          # static image assets

tests/
  unit/            # 46 test files — pure app/lib/ logic
  nuxt/            # 20 test files — Nuxt component tests (mountSuspended)
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
