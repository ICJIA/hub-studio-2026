# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### 2026-07-05

_Added_

- **Annotations Phase 2 — the Strapi adapter (spec §4b), dormant until launch.** `createStrapiAnnotationStore` implements the same `AnnotationStore` contract as localStorage against the `review-annotation` content type via the Content-Manager admin API: filtered + fully-paginated list (no silent 100-row cap), create returning the server row (the Strapi `documentId` becomes the annotation id), read-modify-write reply/resolve, delete, and a write-boundary validator that fires before any network call. New `lib/mappers/annotation.ts` (flattened-anchor mapping, defensive comments-JSON parsing), `lib/validators/annotation.ts`, `repositories/annotations.ts`. The seam in `useAnnotations` now selects by session: demo builds/sessions keep localStorage forever (zero-network audit posture untouched — the public demo is byte-for-byte unaffected); a real signed-in session gets shared, server-stored threads. 18 new tests.
- **Runbook verification pass:** every claim audited against the code; added the missing steps it surfaced — Strapi CORS for the Studio origin, an explicit **staging-writes-to-production-Strapi** warning (`strapiBaseUrl` is hardcoded when the demo flag is unset) with test-content hygiene, first-login onboarding-gate check, custom-domain/DNS + HSTS step, optional `X-Robots-Tag: noindex`, and a pointer to the Phase-1 a11y hardening backlog. Corrected two rows (login bypass is unreachable, not stripped; sample-content shortcuts are local-dev-only, already absent from the deployed demo).
- **Demo → production cutover runbook** (`docs/demo-to-production.md`) — the exact path from the public demo to the live deploy: what flips automatically with the demo flag, Strapi-side install steps, the staging validation checklist, Netlify build/env configuration, the ~30-minute cutover sequence, rollback, and the documented launch-posture decisions (annotation freshness = refetch on open + after write; last-write-wins threads).

- **Expandable Live-preview modal — fullscreen by default.** The editor's Live preview now opens **fullscreen** (the most visual review surface); a **Restore/Expand** toggle in the modal header (all three content types) drops to the centered `max-w-6xl` dialog and back (UModal `fullscreen`).
- **Arming the highlighter auto-opens the comments rail.** The select→comment flow ends in a thread there, and the narrower prose column keeps the composer clear of the preview's edge. Deliberately asymmetric: disarming leaves the rail open — reviewers disarm to read or reply without accidental captures.
- **Armed-highlighter selection tint.** With the highlighter armed, the click-and-drag selection previews in the chosen highlight color (same four pastels as the saved marks) instead of the browser's default grey; unarmed selection stays native. Chromium renders the drag slightly translucent — a usable pending-vs-committed cue. Contrast stays AA: the preview surface is always light with near-black prose.

_Fixed (accessibility — full axe-core WCAG 2.1 AA sweep, light AND dark)_

- **Semantic color tokens darkened for light mode** (`--ui-primary` → 700, `--ui-success`/`--ui-warning` → 800; dark mode keeps the measured-clean 400s). Kills a family of AA contrast failures the sweep found: white labels on solid warning buttons (Unpublish, the demo-entry button — 1.91:1), color-on-tint soft chips and buttons (status chips, sample shortcuts, the rail's Resolve button, soft/outline primary labels — 1.7–4.3:1). All surfaces now measure 0 violations in both themes.
- **Type-list dropdown had no accessible name** (axe `button-name`, critical) — labelled.
- **Markdown editor host carried `aria-labelledby` on a generic div** (axe `aria-prohibited-attr`) — now `role="group"`.

_Added (later 2026-07-05)_

- **Word-style comment alignment.** Desktop comment cards now sit level with the passage they annotate — measured from the painted highlight, with overlapping cards pushed down by a pure collision pass (`lib/annotations/rail-layout.ts`) and re-measured on reflows (images, resizes, the rail mounting). Cards glide to new spots; clicking a card/highlight still cross-links the pair. A wider gutter separates the text column from the cards.
- **Clean view toggle** in the reviewer bar: read the article exactly as published — no highlights painted, no comments panel, review controls collapsed to the one toggle. Pure overlay; stored threads untouched.

_Added (later 2026-07-05)_

- **Fourth red/blue security audit** (§9 in `docs/security-audit.md`, summarized in the README's running log): the annotations/tab-preview/card-view surface. **0 Critical / 0 High / 0 Medium**; one defense-in-depth fix landed with the audit — card artwork `img src` is now scheme-pinned through the `safeHref` allowlist (bad schemes render the placeholder; regression-tested). Measured WCAG contrast on every new card element: 5.78–17.83:1 across light AND dark (AA floor 4.5) — Published badge 7.13/10.02, red Draft badge 6.42/6.17.
- **README currency pass:** four-audit summary, 647-test totals (95 files: 65 unit + 30 Nuxt) with expanded coverage lists, new feature sections (tab-only preview + Close-vs-Back behavior, Word-style reviewer annotations, card view lists), the Strapi drop-in and cutover runbook in the structure tree, and the 2026-06-22 audit moved into the collapsed history.
- **Card view polish:** the Draft badge is now **red** (green = published, red = draft — a go/stop read at a glance; light-mode `--ui-error` darkened to the 700 shade so the white-on-red badge clears AA, same discipline as the other tokens), and the **card artwork is clickable** — the image links to the editor with a proper accessible name.
- **Card view for content lists — and it's the default.** Every list (dashboard + manage, all three types) now opens as visual media cards: splash/image on the left with the **status badge riding the artwork corner** (Published/Draft at a glance), title + date + type chip + authors and a clean plain-text excerpt (markdown stripped via `lib/text-excerpt.ts`) on the right, plus the same tools as the table — Edit, Preview (named tab), and the publish toggle slot. A **Cards / List** toggle switches to the original columnar table; the choice persists per browser (`icjia-studio-content-view-v1`). Entries without an image get a quiet placeholder block. Measured 0 axe violations in both themes.

_Changed (later 2026-07-05, third pass — architecture simplification)_

- **The preview tab never duplicates the editor.** When the review page was opened *from* the Studio (it has a `window.opener`), the bar shows **Close preview** — closing the tab, since your editor is in the tab you came from. A shared-link visit (no opener — closing would strand the reviewer) keeps the **Back to editor** link, which navigates in place.

- **Preview is TAB-ONLY: the Live-preview modal is removed entirely** (user decision). Every preview entry point — the editor's **Live preview** / **Preview as published** buttons and the content list's **Preview** action — opens the standalone review page in a **per-document named tab** (`studio-preview-{id}`), so repeated clicks reuse and refresh one preview tab instead of piling up. Unsaved create-mode disables the button ("Save the draft first to preview"); save just saves. One surface = no modal-vs-page confusion, browser-native close/switch, editor-and-preview side-by-side on wide screens; the review page keeps annotations, Clean view, Back to editor, and Copy share link. Removes the UModal blocks from all three forms and the `.preview-modal-light` scope; the whole modal bug class (dark-mode chrome, fullscreen composition, scale-animation measurement) goes with it.

_Changed (later 2026-07-05, second pass)_

- **Saving a draft now opens the fullscreen preview modal — never the standalone page.** Edit-mode saves open it in place; a first-time create moves to the new `/edit/...` route and reopens the modal there (`?preview=1` hand-off), so "save" feels identical in both modes and the modal/page confusion is gone. The standalone page remains the shareable reviewer URL (Live preview view, the list's Preview action).
- **Fullscreen preview keeps prose and comment cards composed together** (centered `max-w-6xl`) instead of letting the cards drift to the far right edge of wide screens, and the reviewer bar now sits flush under the modal header (the padding gap is gone).

_Fixed (later 2026-07-05, second pass)_

- **Alignment hardening for the Word-style cards:** mark offsets are stored in layout pixels (any ancestor transform scale — e.g. the modal's open animation mid-flight — is divided out), only >1px changes republish (no oscillation), a slow self-heal re-measure runs while the rail is open, and the modal scroll area reserves its scrollbar gutter so the bar appearing can never reflow the prose.

_Fixed (later 2026-07-05)_

- **The shareable preview page is no longer a dead end.** Saving a draft lands on `/preview/{type}/{id}` (and the modal's Live-preview-view link opens it in a tab) with no way back — the reviewer bar now leads with **Back to editor** and **Dashboard** links.
- **Saving an annotation no longer yanks the preview to the top.** The rail scrolled the just-created active card into view before its aligned position was measured (it transiently sat at 0). Aligned cards land beside their highlight — exactly where the reader already is — so that scroll is skipped until the card's top is known.

- **Preview-modal controls invisible in dark mode.** The modal surface is pinned white (the published look), but dark mode flipped the semantic tokens to light-on-dark — making Restore/Close/link chrome light-on-white. A `.preview-modal-light` scope re-declares the light token set inside the modal (custom-property proximity wins), and the annotation card/composer surfaces moved from literal `dark:` classes to semantic tokens so they follow whichever scope they render in. Modal + preview page re-measured: 0 axe violations, both themes.

_Changed_

- **Live preview opens with comments hidden** (user decision): the preview starts as a clean read; the rail appears via Show comments, opening a highlight, or arming the highlighter. Also keeps the mobile drawer from covering content on load.
- **Clearer comments toggle.** The reviewer bar's "Comments (n)" button is now an explicit **Hide comments (n) / Show comments (n)** toggle with `aria-expanded` and panel open/close icons.
- **"Review view" → "Live preview view".** The modal-header link to the shareable `/preview/{type}/{id}` page is renamed to stay consistent with the Live preview button naming.

_Fixed_

- **Comment composer no longer clips at the preview modal's edges.** Inside the modal, `position: fixed` anchors to the dialog (its `translate` creates the containing block; its `overflow-hidden` clips), so the composer's viewport-only clamps let bottom/right-edge selections cut the popover off. Placement math is extracted to `lib/annotations/composer-position.ts`: it detects the containing block, clamps to viewport ∩ dialog, and converts coordinates — unchanged behavior on the standalone `/preview` page.

### 2026-07-04

_Added_

- **Reviewer-annotations design spec** (`docs/superpowers/specs/2026-07-04-reviewer-annotations-design.md`) — approved design for Word-style review on the `/preview` draft page: highlight a passage, attach threaded comments, pick a highlight color, resolve/reopen. Pure overlay (never touches the article markdown or publish pipeline). Anchoring via text-quote selectors; painting via accessible `<mark>` elements; storage behind an `AnnotationStore` seam — `localStorage` for the demo weeks, a Strapi 5 `review-annotation` collection type (drop-in schema included in the spec) for production. Implementation to follow.
- **Reviewer annotations on the draft preview (Phase 1).** On `/preview/:type/:documentId`, any signed-in user can highlight a passage (4 colors), attach a comment, reply in threads, and resolve/reopen — Word-style review for drafts. Highlights are anchored by quote (survive edits elsewhere; orphaned threads stay listed as "text changed"), painted as accessible `<mark>` elements (keyboard + screen-reader reachable), excluded from print, and stored in versioned `localStorage` (`icjia-studio-annotations-v1:*`) behind an `AnnotationStore` seam — zero network calls, demo posture unchanged. The article markdown is never modified. Phase 2 (Strapi 5 persistence) ships as a drop-in content type under `deploy/strapi/review-annotation/` with an install guide.
- **Annotations in the editor's Live-preview modal + "Review view" link (spec Addendum A).** The whole annotation overlay was extracted into a reusable `<AnnotatedPreview>` component, so the editor's **Live preview / Preview as published** modal now carries the same tools and the same threads as the `/preview` page for **saved** entries (all three content types); unsaved create-mode previews stay plain (no stable id to key threads to). The modal header gains a **Review view** link opening the shareable `/preview/{type}/{id}` page in a new tab. The reviewer bar is now **sticky** (pinned under the app nav on the page; to the top of the modal's scroll area), fixing it scrolling out of reach on long articles.

_Changed_

- **Dev server: dependency pre-bundling.** CodeMirror, markdown-it (+ plugins), KaTeX, and DOMPurify are pre-bundled via `vite.optimizeDeps.include`, eliminating Vite's lazy-discovery full-page reloads on the first editor/preview visit in dev. Production builds unaffected.

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
