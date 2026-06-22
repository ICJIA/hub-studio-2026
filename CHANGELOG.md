# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

The core Studio is built and working in development (pre-launch). Highlights since the design phase.

### Public demo & authoring polish — 2026‑06‑20 → 2026‑06‑22 (newest first)

_Added_

- **Demo role comparison** — enter the demo as **Author** or **Editor**: an author drafts & previews but the Publish/Unpublish control is **dimmed** with an "editors only" popup; an editor publishes. The navbar badge reflects the role.
- **Multiple Main Files** — drop one or more **PDFs** (max 3, configurable in `studio.config.ts`), each listed by filename; the published preview shows a distinct **download button per file** under the Table of Contents. Main‑file type defaults to **PDF**.
- **Live Publish/Unpublish in the demo** — toggling updates the article lists and the publish queue live for the session (shared in‑memory store; resets on reload).
- **Sticky article toolbar** under the main nav — article title (truncating) + **Live preview** + color‑coded **Publish/Unpublish** (soft‑blue preview, green publish, amber unpublish), visible while scrolling.
- **Inline research figures** — synthetic chart/table SVGs in every demo article (≥1 each); a sidebar body‑image insert panel (alt required, caption optional, position above/below/none, align center/left); **Add Author** (max 10).
- **Markdown extras** — `markdown-it-attrs` (class/id allowlist), centered images & tables, and figure captions (above/below, center/left).
- **Demo login & onboarding** — a dismissable session demo banner; a "new user → contact **Research & Analysis**" note (no live signups) shown in every build; an illustrative (non‑functional) sign‑in form on the demo login.

_Changed_

- **Splash image** uses Strapi's `large_` format and renders **edge‑to‑edge** (full‑bleed) above the article body, with the body text/TOC kept inset & readable.
- **`studio.config.ts`** — central, non‑secret config (app name, Strapi URL, demo mode, `maxMainFiles`) surfaced via `runtimeConfig.public`.
- Varied demo article spread — distinct titles, a realistic figure distribution (none / one / 2–3), Markdown tables, and top/bottom/no captions.

_Fixed_

- Login note switched to high‑contrast text (WCAG AA; was low‑contrast gray). Demo article‑title year ranges always render ascending. Netlify deploy targets `dist/` (Nuxt's static output), fixing the publish‑dir error.

_Security_

- **Red/blue team audit of demo mode + public deploy** (findings D‑1…D‑10, all remediated): blanked the dev Strapi URL in the demo, in‑memory‑only with a hard write‑block, bundled icons (no runtime fetch under a tight CSP), an `isDemoData` read‑guard, and a Permissions‑Policy header. Audit log ordered newest‑first.

_Build / dependencies_

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

[Unreleased]: https://github.com/icjia/hub-studio-2026
