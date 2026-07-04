# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### 2026-07-04

_Added_

- **Reviewer-annotations design spec** (`docs/superpowers/specs/2026-07-04-reviewer-annotations-design.md`) — approved design for Word-style review on the `/preview` draft page: highlight a passage, attach threaded comments, pick a highlight color, resolve/reopen. Pure overlay (never touches the article markdown or publish pipeline). Anchoring via text-quote selectors; painting via accessible `<mark>` elements; storage behind an `AnnotationStore` seam — `localStorage` for the demo weeks, a Strapi 5 `review-annotation` collection type (drop-in schema included in the spec) for production. Implementation to follow.

## [0.1.0] - 2026-06-22

The core Studio is built and working in development (pre-launch). Highlights since the design phase.

### Public demo & authoring polish — 2026‑06‑20 → 2026‑06‑22 (newest first)

_Added_

- **Article type on the content list + a type filter.** Each article row now shows a **Type chip** (the stored enum rendered in plain words — `annualReport` → "Annual report", `researchAtAGlance` → "Research at a glance"), and a **Type dropdown** above the list filters by type. The filter runs **across all articles through the repository** — not just the loaded page — and re‑paginates from page 1; **All types** clears it. The list shows everyone's articles (published + drafts together), so the dropdown sweeps the full set. Demo seed now spreads articles across **all 14** article types so every option has matching content. (The onboarding tour's content‑list step was reworded to match — it no longer implies the list is only your own drafts.)
- **Guided onboarding tour** — a first‑run, skippable walkthrough on the dashboard. Two intro slides ("What is the ICJIA Research Hub 2.0?" and "Why Markdown?") then role‑aware spotlight steps (Create, your content list, the role badge, the light/dark toggle, the demo banner, and — **editors only** — the Publish queue). Auto‑starts once per browser (versioned `localStorage` key), dismisses on Esc / backdrop / Skip, and replays anytime from **Tour** in the top nav. Built from the [ICJIA `nuxt-guided-tour`](https://github.com/ICJIA/nuxt-guided-tour) runtime **ported into the app as plain code** under a renamed `useGuidedTour` composable — deliberately not the npm module, so it can never collide with Nuxt UI's own `useTour`. Tour icons are bundled lucide (no runtime Iconify fetch under the demo CSP).
- **Demo role comparison** — enter the demo as **Author** or **Editor**: an author drafts & previews while the Publish/Unpublish control is **hidden entirely** (it never renders for them); an editor also publishes. A single clickable **role chip** in the navbar shows your role and explains it.
- **Multiple Main Files** — drop one or more **PDFs** (max 3, configurable in `studio.config.ts`), each listed by filename; the published preview shows a distinct **download button per file** under the Table of Contents. Main‑file type defaults to **PDF**.
- **Live Publish/Unpublish in the demo** — toggling updates the article lists and the publish queue live for the session (shared in‑memory store; resets on reload).
- **Sticky article toolbar** under the main nav — article title (truncating) + **Live preview** + color‑coded **Publish/Unpublish** (soft‑blue preview, green publish, amber unpublish), visible while scrolling.
- **Inline research figures** — synthetic chart/table SVGs in every demo article (≥1 each); a sidebar body‑image insert panel (alt required, caption optional, position above/below/none, align center/left); **Add Author** (max 10).
- **Markdown extras** — `markdown-it-attrs` (class/id allowlist), centered images & tables, and figure captions (above/below, center/left).
- **Demo login & onboarding** — a dismissable session demo banner; a "new user → contact **Research & Analysis**" note (no live signups) shown in every build; an illustrative (non‑functional) sign‑in form on the demo login.

_Changed_

- **Role UX — one clickable chip + publish hidden from authors.** The navbar now shows a single, keyboard‑accessible **role chip** — **Editor** (blue) or **Author** (neutral) — replacing the "Dev Editor" name + separate "Publisher" badge; clicking it opens a plain‑language permissions popover written for non‑technical R&A staff. Publish/Unpublish is now **hidden entirely** for authors everywhere (default‑deny — the control simply doesn't render), reverting the earlier dimmed‑with‑"editors only" approach. User‑facing terminology is **"Editor"** consistently (no more "Publisher"); the publishing superadmin still reads as "Editor". The label + permissions text live in a pure, unit‑tested helper (`roleLabel` / `rolePermissions` in `lib/admin-roles`). Internal `canPublish` and role codes are unchanged.
- **Splash image** uses Strapi's `large_` format and renders **edge‑to‑edge** (full‑bleed) above the article body, with the body text/TOC kept inset & readable.
- **`studio.config.ts`** — central, non‑secret config (app name, Strapi URL, demo mode, `maxMainFiles`) surfaced via `runtimeConfig.public`.
- Varied demo article spread — distinct titles, a realistic figure distribution (none / one / 2–3), Markdown tables, and top/bottom/no captions.

_Fixed_

- **Markdown preview legible in dark mode.** The in‑editor split‑pane preview and the standalone `/preview` page now render the published prose on a **white surface** in both light and dark mode — the published article is always on white, so in dark mode the near‑black prose was previously dark‑on‑dark and unreadable.
- **Dark‑mode contrast → WCAG 2.1 AA.** The dim blue‑on‑dark controls now meet AA: the dashboard **New article / New app / New dataset** and **Open queue** buttons switched from the low‑contrast `subtle` primary variant to **solid** (white‑on‑blue in light, dark‑on‑blue in dark; ~5–7:1, passes both modes — was ~4:1), and **`--ui-primary` is brightened to blue‑400 in dark mode** (`:root.dark`) so all blue‑on‑dark text/links — the **Edit / Preview** row actions and article‑title links — clear AA (was ~3.4:1, now ~6.8:1). Verified with contrastcap (dashboard 201/201, login 14/14). Light mode unchanged (primary stays blue‑600).
- Login note switched to high‑contrast text (WCAG AA; was low‑contrast gray). Demo article‑title year ranges always render ascending. Netlify deploy targets `dist/` (Nuxt's static output), fixing the publish‑dir error.

_Security_

- **Red/blue team audit of the demo‑roles / Main‑Files / guided‑tour / dependency surface (§8, 2026‑06‑22)** — 0 Critical / 0 High / 0 Medium. Confirmed: publish/unpublish enforced server‑side (Strapi 403) with the UI gate as default‑deny defense‑in‑depth; demo identities dev/demo‑only (tree‑shaken from prod); Main‑File download links pass through `safeHref` and the array mapper is numeric/type‑strict; the guided tour has zero `v-html` and a namespaced+versioned `localStorage` key; markdown stays `html:false` with an `id`/`class`‑only `markdown-it-attrs` allowlist; both CSP sets intact; `npm audit` clean (1 known dev‑only esbuild Low). Two defense‑in‑depth fixes: **deep‑freeze `runtimeConfig.public`** so devtools can't flip `demoMode` to disarm the write‑guards (F‑1, the §7 D‑2 residual), and a **CI guard on the demo CSP** `connect-src 'self'` (F‑2).
- **Red/blue team audit of demo mode + public deploy** (findings D‑1…D‑10, all remediated): blanked the dev Strapi URL in the demo, in‑memory‑only with a hard write‑block, bundled icons (no runtime fetch under a tight CSP), an `isDemoData` read‑guard, and a Permissions‑Policy header. Audit log ordered newest‑first.

_Build / dependencies_

- **Refreshed the stack to current within majors** — manifest floors raised to match the resolved tree: **Nuxt 4.4.8**, **Vue 3.5.38**, **@nuxt/ui 4.9.0**, **Vitest 4.1.9**, **@vue/test-utils 2.4.11**, **happy‑dom 20.10.6** (Pinia 3 / @pinia/nuxt / persistedstate, vue‑router 5, TypeScript 6, vue‑tsc 3, the CodeMirror/Lezer + markdown‑it families, dompurify, and @vscode/markdown‑it‑katex were already at latest). `markdown-it-attrs` **stays pinned at 4.5.0** (v5 breaks Vite interop). Dropped the deprecated **@types/dompurify** stub (dompurify ships its own types). 514 tests + typecheck (0 errors) + demo `generate` green; dashboard and an edit page render with no error boundary.
- Public **demo deploy** on Netlify (`NUXT_PUBLIC_DEMO_MODE`) — fully self‑contained, demo‑login‑only, no secrets, no Strapi writes.
- Bumped **vue‑router 4→5, TypeScript 5→6, vue‑tsc 2→3** (vue‑router 5 is what Nuxt 4 expects; the bump also cleared a recurring Volar warning).
- Dependabot **groups** so coupled packages move together: the Pinia family, and vue‑router + vue‑tsc.

---

### Added

- **Authentication** — Strapi 5 admin sign-in (JWT bearer, persisted in a `SameSite=Strict`/`Secure` cookie), boot-time session re-verification, a default-deny route guard, a login page, and a protected dashboard.
- **Content authoring** — create/edit **Articles, Apps, and Datasets** as drafts, with a validate-before-write save-gate and columnar forms (writing column + a Details sidebar).
- **Markdown editor** — the vendored ICJIA Markdown Editor (CodeMirror 6) with a formatting toolbar (bold/italic/code, an H1–H3 dropdown, lists, quote, code block, rule, link, image, undo/redo) styled as raised 3D buttons, a live "exactly-as-published" preview toggle, and a zero-base64 image pipeline (paste/drop/upload → hosted URL).
- **Abstract** as a compact, inline-only markdown editor (no references; links open in a new window); **App description** as a full markdown editor.
- **Media handling** — required alt-text + optional caption, a clear selected-state (thumbnail + filename + Replace/Remove, no native "no file chosen"), a `file` kind for PDF/document uploads (no alt/caption), and a **body-image gallery** (upload → thumbnails → insert at the cursor).
- **Published preview** — faithful Research Hub styling (Oswald + Georgia), a bordered abstract, an all-authors byline, a print button, About-the-Authors / Funding / Suggested-Citation end matter, and a **sticky Table of Contents** (from `h2` headings, with AST-derived ids). Available as a modal from the form and as a shareable `/preview/:type/:documentId` page with **Copy share link**.
- **Content list** — paginated and sortable (newest first) with Date · Title · Author(s) · Draft/Published status.
- **Sample content** — one-click "Add sample article / app / dataset" that fills a complete, realistic, **100%-phony** draft (lorem ipsum + made-up names), full-length with working footnote references.
- **Demo mode** (dev `admin/admin`) — 200+ in-memory, full-length sample articles in a paginated list; nothing is ever saved to the server.
- **Onboarding** — a first-login author-profile gate (fail-open; publishers exempt) with reviewer prefill.
- **Publish & review email** — a `canPublish`-gated Publish (Strapi Content-Manager publish action), an auth-gated, **rate-limited** Nitro `request-review` route that emails the preview link via Mailgun, and a publish → site-rebuild webhook.
- **Theme & branding** — a light/dark toggle (defaults to light) and the official ICJIA logo in the nav + login.
- **Security headers** — `public/_headers` (CSP + `nosniff`, `X-Frame-Options: DENY`, HSTS) and a Dependabot config.

### Changed

- Authentication and content access moved from the public REST API to **Strapi's admin Content-Manager API** once the publish roles were confirmed.
- A modern, high-contrast theme (Inter, WCAG AA contrast), crisper corners, and horizontal (columnar) forms.
- **Docs** — the [Design & Implementation Spec](docs/ICJIA-Research-Hub-Studio-2026-Design-and-Implementation-Spec.md) refreshed for a skeptical, non-technical manager (TL;DR, verifiable "receipts," a Security section); the README now leads with a 30-second TL;DR and adds a developer reference plus a running security-audit log.

### Fixed

- Accessibility label associations (dropped a dangling `for`, aria-labelled the editor).
- Kept the session across transient/`5xx` boot errors (the 401 interceptor handles real auth failures).
- The content list sorts by article date (newest first).

### Security

- **Independent red/blue team audit (2026-06-21)** — 0 critical findings; every in-repo finding fixed and covered by automated tests (375): CSP/security headers, review-email rate-limiting, AST-based escaped TOC ids, a dataset URL-scheme gate, a hard zero-base64 write guard, and 403-clears-session. Full report in [`docs/security-audit.md`](docs/security-audit.md), with a running log in the README.
- The dev `admin/admin` bypass is **dev-only** (statically tree-shaken from production builds), clearly labeled on the sign-in screen, and documented in the audit (to be removed before launch).

### Notes

- Pre-launch: remaining work is Strapi/email configuration (Research & Analysis), a deploy-preview CSP check, and removing the dev bypass — not new construction.
- Backend (Strapi 5) is managed separately and must not be modified without coordination.

[Unreleased]: https://github.com/icjia/hub-studio-2026/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/icjia/hub-studio-2026/releases/tag/v0.1.0
