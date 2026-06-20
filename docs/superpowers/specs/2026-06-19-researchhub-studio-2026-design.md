# ICJIA Research Hub Studio 2026 — Design Spec

- **Date:** 2026-06-19
- **Status:** Draft for review
- **Replaces:** ICJIA Research Hub Studio v1 (Vue 2 / Vuetify 2 → Strapi 3)
- **Backend:** Strapi 5 at `https://v2.hub.icjia-api.cloud` (GraphQL + REST). Schema already modernized; content at parity with the old Strapi 3 data.

---

## How to read this document

This spec has **two audiences**:

- **Part A — For Managers (Plain English):** what we're building, who uses it, what changes, what we need from you, and the risks. No technical knowledge required.
- **Part B — For Developers:** the full technical design.

Throughout Part B, look for **📘 In plain English** callouts — they translate the dense bits for non-technical readers. There's also a **Glossary** at the end that defines every piece of jargon.

> **📘 In plain English:** Think of this document as a blueprint for a new "back office" tool that ICJIA staff will use to write and publish research content. Managers only need **Part A** and the glossary. The rest is builder's detail.

---

# PART A — For Managers (Plain English)

## What are we building?

A new internal website — call it **"Studio"** — where ICJIA staff create and publish three kinds of content for the public Research Hub: **articles**, **apps**, and **datasets**.

It replaces an older tool (built in 2019) that still works but is out of date, hard to maintain, and stores images in a wasteful way. The new Studio uses modern, supported technology and a much simpler workflow.

> Analogy: the public Research Hub website is the **storefront**. Studio is the **back room** where staff prepare the merchandise before it goes on the shelves.

## Who uses it, and how?

There are two kinds of users. The whole tool is organized around these two jobs:

**1. Authors** — the people who write content.
- They log in.
- They write an article in a friendly editor (formatting buttons, live preview — **no code**).
- They add images by uploading them or picking from a shared image library.
- They save. Their work is a **draft** — it is **not** public yet.

**2. Managers** — the people who approve and publish.
- They log in and see a **list of drafts waiting to be published**.
- They review a draft.
- They click **Publish**. The content goes live on the public Research Hub, and the public website automatically refreshes to show it.

That's the entire workflow: **Authors draft → Managers publish.** Nothing more complicated.

> **📘 Why this is simpler than before:** The old system had a confusing multi-step approval chain ("created → submitted → published") with several roles. We are deliberately removing all of that. The new rule is just: *authors write, managers publish.*

## What's actually changing (and why you should feel good about it)

| Concern | Old tool | New Studio |
|---|---|---|
| Technology | 2019-era, increasingly unsupported | Current, actively supported tools |
| Images | Stored as bloated text inside the database ("base64") | Stored properly in a shared image library, referenced by link |
| Workflow | Multi-stage approval, 3 roles, confusing | Two roles: **Author** (draft) and **Manager** (publish) |
| Editor | Plain text box | Friendly editor with buttons, live preview, and image insertion |
| Publishing | Manual steps | One **Publish** button that also refreshes the public site |

## The one technical rule worth understanding: "no base64 images"

The old tool saved each image by converting it into a gigantic block of text and stuffing it directly into the content record. That's called **base64**. It bloats the database, slows everything down, and makes images hard to reuse.

The new Studio **never** does this. Instead, every image is uploaded once to a **shared media library** (like a shared Drive folder) and then **referenced by a link**. Upload once, reuse anywhere, nothing bloated.

> **📘 In plain English:** Old way = photocopying a picture and taping the photocopy onto every page. New way = keeping one good copy in a binder and writing "see photo #12" wherever you need it. Cleaner, faster, reusable. The Strapi 5 database has **already** been upgraded to work this way — Studio just does its part correctly.

## What "Publish" really does

When a Manager clicks **Publish**:
1. Strapi marks the content as "published."
2. Studio rings a **"doorbell"** (a build hook) that tells the **public** Research Hub website to rebuild itself with the new content.

So "Publish" means **"make it appear on the public site"** — end to end, in one click.

> **📘 Note:** The public site is rebuilt rather than updated live, so there may be a short delay (typically a minute or two) between clicking Publish and the content appearing publicly. That's normal and expected.

## What we still need decisions on (manager-relevant)

These are flagged in detail in Part B (§14). The ones a manager might care about:

1. **Who is allowed to publish?** We assume only **Managers**. We need to confirm the exact list of who gets that power in the system.
2. **Build-hook delay is acceptable?** Confirm that a short rebuild delay after Publish is fine (it almost always is).
3. **Old content** stays as-is for now; converting any remaining legacy bits is a separate, later task — not part of this build.

## Risks, in plain terms

| Risk | Plain-English meaning | How we handle it |
|---|---|---|
| Editor reuse | We're adapting an existing ICJIA editor that has no image feature yet | We add image upload to it as part of this project; it's the same modern technology |
| "Unpublish" support | Taking something *back* down may need a small backend tweak | Flagged early (§14); we confirm before building, and we will **not** change your live database without asking |
| Publish permissions | The system must enforce that only Managers can publish | Enforced by the server, not just hidden in the screen |

## What success looks like

- A non-technical author can write and illustrate an article without seeing any code.
- A non-technical manager can open a clean list of pending drafts and publish with one click.
- No image is ever stored as base64.
- The public site reflects published content automatically.

---

# PART B — For Developers

## 1. Goals and non-goals

**Goals**
- Rebuild Studio on a modern, supported stack: **Nuxt 4 (SPA) + Nuxt UI 4 + Pinia + TypeScript**, talking to **Strapi 5 via REST**.
- Full content parity with v1: **articles, apps, datasets** (all fields, relations, JSON structures).
- **Zero base64 images.** Every image/file is a Strapi Media Library upload referenced by relation or URL.
- Reuse the **ICJIA Markdown Editor 2026** via a shared **Nuxt layer**, extended with a Strapi image-upload capability.
- Replace the v1 workflow with **native Strapi 5 Draft & Publish**: Authors draft, Managers publish; publish fires a **build hook** to rebuild the public site.
- A WYSIWYG-grade authoring experience for non-technical authors (toolbar + visual table builder + live preview + media picker), while preserving full markdown fidelity (footnotes, KaTeX, tables).

**Non-goals (this project)**
- Migrating/transforming legacy data (already at parity; "migrate later" is a separate effort).
- Changing the Strapi 5 schema or backend code **without explicit approval**.
- Rebuilding the public Research Hub site.
- Server-side rendering / static generation of Studio itself (it's an internal SPA).

> **📘 In plain English:** We're building the staff tool, on modern tech, with proper image handling and a simple publish flow. We are *not* rebuilding the public website or touching the live database without permission.

## 2. Background: v1 → v2

v1 was Vue 2 + Vuetify 2 against Strapi 3, using a hybrid REST/GraphQL client. It stored display images (`image`, `splash`, `thumbnail`, article figure `images[].src`) as **base64** inside the entry, while large binaries (`mainfile`, `extrafile`, `datafile`) were real uploads. It implemented a custom `status` workflow (`created → submitted → published`) with roles **Author / Administrator / Data Manager**, preview links, and a Netlify build hook on publish.

v2 keeps the **content model** and the **build-hook-on-publish** idea, and discards the custom workflow, the base64 storage, and the v1 codebase (referenced for field semantics only).

The Strapi 5 backend has already been modernized (verified by read-only introspection, 2026-06-19): image fields are now real media relations, native Draft & Publish is enabled, and records are addressed by `documentId`.

## 3. Stack and architecture

| Concern | Choice |
|---|---|
| App framework | **Nuxt 4**, **SPA mode** (`ssr: false`) |
| UI | **Nuxt UI 4** (Tailwind CSS v4 underneath) |
| State | **Pinia** (with persistence for the auth session) |
| Language | **TypeScript** |
| HTTP | `ofetch` (`$fetch`) with a request interceptor for auth + base URL |
| Backend | **Strapi 5 REST** (`/api/*`) + **Upload** (`/api/upload`) |
| Editor | **ICJIA Markdown Editor 2026** consumed as a **Nuxt layer** |
| Deployment | **Netlify** (static SPA + one Netlify Function / Nitro server route for the build-hook proxy) |

**Module/layer view:**

```
studio (Nuxt 4 app, ssr:false)
├── app/                      # pages, layouts, middleware
├── components/               # forms, MediaPicker, tables, dialogs
├── composables/              # useAuth, useArticles, useApps, useDatasets, useUpload, usePublish
├── stores/                   # auth (pinia, persisted)
├── lib/                      # strapi client (ofetch), mappers, validators, parsers
├── types/                    # TS models mirrored from the Strapi schema
└── nuxt.config.ts            # extends: [<markdown-editor layer>]; runtimeConfig

markdown-editor layer (from ICJIA Markdown Editor 2026)
└── exposes <MarkdownEditor> with a configurable uploadHandler hook
```

> **📘 In plain English:** Studio is one fast browser app (like Gmail). It reuses the existing ICJIA editor as a plug-in building block. It talks to the Strapi content system over a standard web API.

### 3.1 Configuration (`runtimeConfig` / env)

- `STRAPI_BASE_URL` (e.g. `https://v2.hub.icjia-api.cloud`)
- `PUBLIC_SITE_BASE_URL` (for preview links to the public Research Hub)
- `PUBLISH_BUILD_HOOK_URL` — **server-side only** (Netlify Function / Nitro env), never exposed to the client; see §11
- No secrets in the client bundle beyond what an SPA inherently exposes; the build-hook URL handling is addressed in §11/§14.

## 4. Strapi 5 backend contract

Verified mechanics (Strapi 5, docs v5.2.x):

- **Identifiers:** entries are addressed by **`documentId`** (string), not numeric `id`. A `legacyId` field preserves the old Strapi 3 id.
- **Draft & Publish:** native; entries have `publishedAt` (null = draft).
  - Read drafts: `GET /api/{plural}?status=draft`
  - Read published: `GET /api/{plural}?status=published`
  - Publish (update-and-publish): write carrying `status=published` (Document Service `update(..., { status: 'published' })`; REST equivalent `PUT /api/{plural}/{documentId}?status=published`).
- **Uploads (changed in v5):** **no upload-at-entry-creation.** Two steps:
  1. `POST /api/upload` (multipart, field `files`) → returns file objects with **numeric `id`**, `url`, `formats`.
  2. Create/update the entry with the media field set to that **numeric file id** (e.g. `splash: 42`).
  - One-call linking to an **existing** entry still works: `POST /api/upload` with `files`, `ref` (`api::article.article`), `refId` (entry id), `field` (`splash`).
  - Media Library browse: `GET /api/upload/files` (+ filters); delete: `DELETE /api/upload/files/:id`.
- **Relations** (`apps`/`articles`/`datasets`) are set by referencing related `documentId`s on write.

> **📘 In plain English:** The content system gives every record a stable ID, knows the difference between "draft" and "published," and keeps images in a separate library you attach by reference. New in this version: you upload the image first, then attach it — you can't do both at once anymore.

### 4.1 Publish/unpublish open question

Publishing via the authenticated **Users & Permissions** REST API using the `status` parameter is the intended path. **Unpublish** (and the exact U&P permission for publishing) must be confirmed against the live instance. If U&P cannot express it directly, options are (a) a minimal custom controller/route on the backend (**requires approval — backend change**), or (b) driving it through an authenticated admin Content-Manager call. See §14.

## 5. Data model

Confirmed by introspection on 2026-06-19. `UploadFile` = media relation. `JSON` fields carry structured arrays/objects (shapes below, semantics ported from v1 — reference only).

### 5.1 Article
| Field | Type | Notes |
|---|---|---|
| `documentId` | ID | primary handle |
| `title` | String! | |
| `slug` | String! | auto-generated from title on create; editable on update |
| `date` | Date! | |
| `external` | Boolean | |
| `type` | enum `ENUM_ARTICLE_TYPE` | **confirm allowed values** (§14) |
| `hideFromBanner` | Boolean | new in v2 |
| `categories` | JSON | `string[]` (options from v1 `fieldOptions.js`) |
| `tags` | JSON | `string[]` |
| `authors` | JSON | `{ title, description }[]` (v1 "name \| description") |
| `abstract` | String | |
| `markdown` | String | article body (editor output) |
| `splash` | UploadFile | hero image (media relation) |
| `thumbnail` | UploadFile | derive from `splash` formats; **confirm** (§14) |
| `images` | JSON | `{ title, src }[]` — `src` = **Media Library URL only, never base64** |
| `mainfiletype` | String | `'full report' \| 'pdf version'` |
| `mainfile` | UploadFile | PDF |
| `extrafile` | UploadFile | any |
| `doi` | String | |
| `citation` | String | |
| `funding` | String | |
| `apps` / `datasets` | relations | related content by `documentId` |
| `status` (legacy) | String | **ignored** in v2 (native D&P is source of truth) |

### 5.2 App
| Field | Type | Notes |
|---|---|---|
| `documentId` | ID | |
| `title` | String! | |
| `slug` | String! | |
| `date` | Date | nullable |
| `external` | Boolean | |
| `categories` / `tags` | JSON | `string[]` |
| `contributors` | JSON | `{ title, description }[]` — **confirm shape** (§14) |
| `image` | UploadFile | media relation |
| `description` | String | |
| `url` | String | |
| `citation` / `funding` | String | |
| `datasets` / `articles` | relations | |
| `status` (legacy) | String | ignored |

### 5.3 Dataset
| Field | Type | Notes |
|---|---|---|
| `documentId` | ID | |
| `title` | String! | |
| `slug` | String! | |
| `date` | Date! | |
| `external` | Boolean | |
| `project` | Boolean | v1: author-only flag / visibility nuance |
| `categories` / `tags` | JSON | `string[]` |
| `sources` | JSON | `{ title, url }[]` (v1 "title \| url") |
| `unit` | String | options from v1 `fieldOptions.js` |
| `timeperiod` | JSON | `{ yeartype, yearmin, yearmax }` — **confirm shape** (§14) |
| `description` | String | |
| `notes` | JSON | `string[]` |
| `variables` | JSON | `{ name, type, definition, values }[]` |
| `citation` / `funding` | String | |
| `datafile` | UploadFile | CSV |
| `apps` / `articles` | relations | |
| `status` (legacy) | String | ignored |

> **📘 In plain English:** Three content types, each a form with text fields, some lists (authors, tags, sources, variables), image/file attachments, and links to related items. This table is the master list of "what fields exist."

### 5.4 Typed models and mappers
- `types/` mirrors each content type as a TS interface (`Article`, `App`, `Dataset`) plus the JSON sub-shapes (`Author`, `ImageRef`, `Source`, `Variable`, `TimePeriod`).
- `lib/mappers` converts Strapi REST payloads ⇄ form models. v1 used delimited strings (`authorString`, `sourceString`, `variableString`, `tagString`) parsed on submit; v2 stores/edits these as **native arrays** with proper repeatable-row inputs. Parsing helpers from v1 are ported as a fallback/import convenience only.

## 6. Auth and roles

- **Login:** `POST /api/auth/local` (`identifier`, `password`) → `{ jwt, user }`. v1 used `user.role.name`.
- **Session & token storage (security):** Pinia `auth` store holds `{ jwt, user }`. The JWT is persisted to a **Secure, `SameSite=Strict` cookie** (not `localStorage`), and the user/role is **re-verified from Strapi on every app boot** via `GET /api/users/me?populate=role` — so a tampered or stale persisted role cannot enable admin UI, and an invalid/expired token logs the user out. An `ofetch` `onRequest` interceptor attaches `Authorization: Bearer <jwt>`; a 401 clears the session and redirects to `/login`.
  - **Residual risk + scheduled fix:** a non-HttpOnly token is still JS-readable under XSS. The full fix — issuing the JWT as an **HttpOnly** cookie via a small backend auth proxy (or Strapi cookie config) — is scheduled as a separate, **approval-gated backend task**. Until then, server-side permission checks remain the real authorization boundary (the client role only decides which controls render).
- **Route protection (auth gates the entire Studio):** the Studio is private — a **global** Nuxt route middleware makes **every** route require a valid Strapi login; only `/login` is public. Unauthenticated visitors are redirected to `/login` before any Studio content renders (no anonymous access). Role-gated routes (publish/manage) additionally require the publisher role (`admin`).
- **Roles (capabilities) — assumed, pending confirmation (§14 #1):**
  - **`author`:** create/read/update drafts; upload media; **cannot publish**. (Per-author scoping — "only *my* drafts" — is **not** expressible from the current schema: there is no author→user relation. Treat the draft pool as shared among authenticated authors unless an owner field + policy is added; see §14 #12.)
  - **`admin`:** everything an author can do **+ publish/unpublish** + view all drafts. (This is the "Manager"/publisher capability referred to elsewhere in this doc — e.g. Part A.)
- **Enforcement:** server-side via Strapi Users & Permissions (publish/unpublish actions granted only to `admin`). The UI mirrors permissions but is **not** the security boundary.
- **Open item:** exact Strapi role names/mapping confirmed later; for now assume `author` (edit/update, no publish) and `admin` (publish/unpublish). See §14 #1.

> **📘 In plain English:** Secure login. The system itself — not just the screen — enforces that only Managers can publish. If your session expires, you're sent back to the login page.

## 7. Image and file handling — the zero-base64 core

**Hard invariant:** No image is ever encoded as base64 / `data:` URI in app state, requests, or stored fields. Enforced structurally and by lint guard (ban `FileReader.readAsDataURL`, `canvas.toDataURL`, `data:` image assignment).

### 7.1 Eager upload pattern
On file select/drop:
1. Immediately `POST /api/upload` (the file only) → `{ id, url, formats }`.
2. Store `{ id, url }` in form state. **Preview renders from the returned `url`** (or `formats.thumbnail.url`) — never from a client-side data URL.
3. On entry save, set the media relation field to the numeric `id` (e.g. `splash: id`).

This sidesteps the v5 "no upload at creation" rule (files are uploaded standalone first) and works identically for create and edit.

### 7.2 `MediaPicker` component
Reusable component backing every media field (`splash`, `thumbnail`, app `image`, `mainfile`, `extrafile`, `datafile`):
- **Upload new:** drag/drop or browse → eager upload → real-URL preview.
- **Pick existing:** browse the Media Library via `GET /api/upload/files` (search, type filter, pagination) → select → reuse its `id`/`url`.
- **Implementation note:** "drop zone" means the drag-and-drop *interaction*, not a specific library. **Prefer** native HTML5 drag-and-drop / Nuxt UI file primitives (no extra dependency); the legacy `dropzone.js` is **also acceptable** if it turns out to be the cleanest path. Decide at build time — the only hard requirement is drag-an-image-and-drop-to-upload.
- Per-field constraints (accepted types, max size) carried as props; defaults ported from v1 (confirm in §14):
  - app `image`: jpg/png · article `splash`: jpg/png ~0.5 MB · article figures: jpg/png ~0.1 MB (multiple) · `mainfile`: pdf ~5 MB · `extrafile`: any ~10 MB · `datafile`: csv ~100 MB.

### 7.3 Inline article figures (`images` JSON + markdown)
- **Image dropzone + click-to-insert (primary author flow):** an always-available **dropzone** (drag-and-drop, plus click-to-browse) uploads dropped images straight to the Strapi Media Library via `/api/upload` (eager upload — never base64). Uploaded images render as a **clickable thumbnail gallery**; **clicking a thumbnail inserts that image's Media Library URL** into the markdown body as `![alt](url)` at the cursor (and copies the URL to the clipboard for manual paste). Previously-uploaded images can be picked from the Media Library the same way.
- Each insertion also appends `{ title, src: url }` to the `images` JSON array (kept for public-site parity).
- `images[].src` is **always** a Media Library URL.
- **thumbnail:** prefer deriving from `splash`'s Strapi-generated `formats` (drop v1's canvas thumbnail generation). Confirm whether the public site needs a distinct `thumbnail` media id or can read a `splash` format (§14).

> **📘 In plain English:** When an author adds a picture, it's uploaded to the shared library instantly and shown from there. The article just remembers *where* the picture lives, never a giant copy of it. Authors can also reuse pictures already in the library.

## 8. Markdown editor (shared Nuxt layer)

- **Consumption:** the ICJIA Markdown Editor 2026 (Nuxt 4 / Vue 3.5 / Nuxt UI / CodeMirror 6 / markdown-it 14) is restructured to expose a reusable editor component via a **Nuxt layer**; Studio adds it through `extends`. Exact mechanism (npm package vs git `extends`) pinned in §14.
- **Image hook (new):** the editor accepts a configurable `uploadHandler` (and optional `mediaPicker`) prop/inject. The standalone editor app can pass a no-op; Studio passes a handler that performs the eager upload + Media-Library pick and returns `{ url, alt }` for insertion. **This is the one capability the editor lacks today and that this project adds.**
- **Render parity:** align the preview's markdown-it plugin set (footnotes, KaTeX, tables, etc.) with whatever the **public Research Hub** renderer uses, so the in-editor preview matches published output. Capture the public renderer's plugin list as an input (§14).
- **Fidelity:** because the stored field is `markdown` and content uses footnotes / LaTeX / multi-row tables, we keep markdown-source editing (toolbar + live preview), **not** a lossy rich-text serializer. (Decision: "Markdown + live preview.")

> **📘 In plain English:** We reuse ICJIA's existing modern editor instead of building one, and we teach it to handle images (its only missing piece). Authors get formatting buttons, a table builder, and a live preview — they don't write code.

## 9. Views and UX

| Route | Who | Purpose |
|---|---|---|
| `/login` | all | Strapi local login |
| `/` (dashboard) | all | task cards by role (Create, My Drafts; Managers also: Publish Queue) |
| `/create/:type` | Author+ | type-aware create form (article/app/dataset) |
| `/edit/:type/:documentId` | Author+ | edit a draft |
| `/manage` | Manager | **publish queue**: list `status=draft`, review, Publish/Unpublish |
| `/preview/:type/:documentId` | Author+ | in-app rendered preview (+ optional public draft-preview link) |
| `/404` | all | not found |

- **Forms:** built from shared field components (text, date, repeatable-row lists, relation pickers, `MediaPicker`, editor). Articles are the richest; apps/datasets reuse the same primitives. Client validation mirrors v1 rules (required fields, slug format, time-period `yyyy-yyyy`, no leading/trailing whitespace).
- **Manager queue:** clean table of pending drafts (title, type, author, updated) → row → review → **Publish**. This is the primary non-technical-manager surface; keep it minimal and obvious.
- **Preview:** render `markdown` with the parity plugin set; show splash/figures from their Media URLs.

> **📘 In plain English:** Authors get a dashboard with "Create" and "My Drafts." Managers get an extra "Publish Queue" — a simple list of things waiting for a thumbs-up. Everything a manager needs is on that one screen.

## 10. Validation, parsing, and field semantics (ported from v1, reference only)

- **Slug:** auto-generated from title on create (`lowercase`, spaces/slashes → `-`, strip non-word); editable only on update.
- **Repeatable structures** replace v1 delimited strings:
  - authors/contributors: rows of `{ title, description }`
  - sources: rows of `{ title, url }`
  - variables: rows of `{ name, type, definition, values }`
  - notes: list of strings; tags/categories: chips/multiselect
- An **import-from-text** affordance may preserve v1's fast bulk entry (paste delimited lines → rows), but storage is always structured JSON.
- Option lists (categories, units, time-period types, `mainfiletype`) sourced from v1 `fieldOptions.js` — **confirm/curate** (§14).

## 11. Publish workflow and build hook

1. **Author** saves → entry written as **draft** (`publishedAt: null`).
2. **Manager** opens `/manage` (`status=draft`), reviews, clicks **Publish**.
3. Studio issues the publish write (`status=published`) for that `documentId`.
4. On success, Studio calls a **server-side build-hook proxy** (a Netlify Function or Nuxt Nitro server route) that holds the hook URL secret and, after verifying the caller's `admin` JWT, POSTs the Netlify build hook to rebuild the public site. (v1 fired the hook for apps & articles only — **confirm** whether datasets also trigger a rebuild, §14 #4.)
5. **Unpublish** (in scope) reverses step 3 and may re-fire the hook. Mechanism per §4.1.

- **Build-hook secrecy (resolved):** Studio deploys to **Netlify**. The build-hook URL is a **server-side** env var POSTed by a **Netlify Function** (or a Nuxt Nitro server route via the Netlify preset) — never shipped to the browser. The proxy verifies the caller's `admin` JWT against Strapi before triggering, so the hook URL stays secret **and** only admins can trigger a rebuild. SPA page rendering (`ssr: false`) is unaffected; this adds exactly one server endpoint.

> **📘 In plain English:** "Publish" flips the content to public **and** rings the doorbell that rebuilds the public website. One click, fully live (after a short rebuild). The only wrinkle is keeping that "doorbell" address private — we have a couple of standard ways to do that.

## 12. Repo and project structure

- **Studio** — new Nuxt 4 repo (this project).
- **Editor layer** — the ICJIA Markdown Editor 2026 repo, restructured to also export a reusable Nuxt layer/component consumed by both the standalone editor and Studio. Changes to that repo are **in scope** (chosen: "shared Nuxt layer").
- This working directory currently holds only the v1 code dump under `/docs` and this spec under `/docs/superpowers/specs/`. It is **not yet a git repository** — initialization/commit deferred to the user (no commits without request).

## 13. Error handling, testing, accessibility

- **Errors:** central `ofetch` error normalization; 401 → logout; 413 (payload too large — far less likely now without base64) → friendly size hint; upload failures surfaced per-file in `MediaPicker`; publish/build-hook failures reported distinctly ("published but rebuild trigger failed").
- **Testing:** unit tests for mappers/parsers/validators; component tests for `MediaPicker` (asserting **no `data:` URLs** ever enter state) and forms; an e2e happy path (author drafts with image → manager publishes → build hook called, mocked). Reuse the editor repo's existing Vitest/Playwright + axe setup.
- **Accessibility:** Nuxt UI is accessible by default; keep the editor's axe-tested baseline; the Manager queue and forms must be keyboard- and screen-reader-friendly (primary non-technical surface).

## 14. Open items / confirm-at-build

| # | Item | Why it matters | Default if unanswered |
|---|---|---|---|
| 1 | Exact Strapi **role names** + publish permission wiring | Security boundary for publish | **Confirm later.** For now assume `author` (edit/update, no publish) and `admin` (publish/unpublish) |
| 2 | **Unpublish** via REST/U&P (or custom route) | ✅ **In scope (approved).** Admins need take-down | Implement via `status` toggle / Document Service `unpublish`; if U&P can't express it, add a minimal custom route (**coordinate backend change**); re-fire build hook |
| 3 | **Build-hook URL secrecy** — ✅ **resolved** | SPA would expose client config | **Netlify Function / Nitro server route** holds the hook server-side, verifies the `admin` JWT, then triggers (see §11) |
| 4 | Does **dataset** publish trigger a rebuild? | v1 skipped datasets | Match v1: apps/articles fire hook, datasets don't |
| 5 | `thumbnail` handling (derive from `splash` formats vs distinct upload) | Public-site rendering contract | Derive from `splash` formats |
| 6 | Public renderer's **markdown-it plugin set** | Preview-vs-published parity | Mirror the editor's current plugins |
| 7 | Article **`type` enum** allowed values; `hideFromBanner` semantics | Form controls | Read enum at build (read-only introspection) |
| 8 | `contributors` (app) and `timeperiod` (dataset) **JSON shapes** | Form modeling | Assume v1 shapes above |
| 9 | Per-field **size/type limits** | Upload UX | Port v1 limits (§7.2) |
| 10 | Editor **layer delivery** (npm vs git `extends`) | Build wiring | git `extends` for first iteration |
| 11 | Keep maintaining `images` JSON array **and** inline markdown? | Public-site parity | Maintain both (URLs only) |
| 12 | Per-author draft **ownership scoping** ("only my drafts") | Needs an owner→user relation + policy = **backend change** (needs approval) | Shared draft pool for all authenticated authors |

## 15. Out of scope / future

- Legacy data migration/cleanup (already at parity).
- Public Research Hub site changes.
- Bulk import tooling beyond the optional paste-to-rows affordance.
- Role/user administration UI (unless Admin role is required).

---

## Glossary (plain-English translations)

| Term | What it means here |
|---|---|
| **Strapi 5** | The content system/"warehouse" where all articles, apps, and datasets are stored and served. |
| **Nuxt 4 / Vue** | The technology Studio (the staff web app) is built with. |
| **SPA (Single-Page App)** | A fast web app that runs in the browser, like Gmail — no page reloads. |
| **Nuxt UI 4 / Tailwind** | The ready-made, accessible building blocks for Studio's buttons, forms, and tables. |
| **Nuxt layer** | A way to reuse another project (the ICJIA editor) as a shared building block instead of rebuilding it. |
| **Media Library** | A shared folder of uploaded images/files, reused by reference (like a shared Drive). |
| **base64** | The old, wasteful way of storing an image as a giant block of text inside a record. **Banned here.** |
| **Media relation / reference** | A link from a record to a file in the Media Library — the proper, lightweight way to attach images. |
| **Draft & Publish** | Strapi's built-in switch: drafts are private; publishing makes content public. |
| **Build hook** | A "doorbell" URL that tells the public website to rebuild itself with new content. |
| **Markdown** | A simple text-formatting system; in Studio, authors use buttons and a live preview instead of typing code. |
| **documentId** | The stable internal ID Strapi 5 uses to refer to each record. |
| **JWT / auth token** | The secure pass issued at login that proves who you are on each request. |
| **REST API** | The standard way Studio and Strapi talk over the web. |
| **Author / Manager** | The two roles: Authors write drafts; Managers publish them. |
```
