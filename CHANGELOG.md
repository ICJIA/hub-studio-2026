# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

The core Studio is built and working in development (pre-launch). Highlights since the design phase:

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
