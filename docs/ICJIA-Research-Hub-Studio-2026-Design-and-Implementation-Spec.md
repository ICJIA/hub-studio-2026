# ICJIA Research Hub Studio 2026

## Design & Implementation Specification

| | |
|---|---|
| **Document** | Design & Implementation Specification |
| **Status** | **Draft 1 — first iteration** (in active development) |
| **Date** | 2026-06-20 |
| **Replaces** | ICJIA Research Hub Studio v1 (2019: Vue 2 / Vuetify 2 + Strapi 3) |
| **Backend** | Strapi 5 — dev/sandbox at `https://v2.hub.icjia-api.cloud` |
| **Repository** | `github.com/ICJIA/hub-studio-2026` (public) |
| **Audience** | Project managers (primary) and developers (secondary) |

> **This is Draft 1: the first exploratory iteration.** Requirements are being
> discovered *as the build proceeds*, and design decisions evolve as we learn.
> This is disciplined, test-driven iteration — not disorganization. Where this
> document describes something as "planned," it means the design is settled and
> the construction recipe is written, but the code has not yet been built. Where
> it says "built," the code exists, is tested, and is merged.

---

## Who should read what

This document serves two readers at once.

- **If you are a manager or stakeholder:** read the **Executive Summary**, the
  section titled **"Is this a simple project? An honest answer,"** the
  **Implementation Phases** summary, the **Status Dashboard**, the **Risks &
  Open Decisions**, and the **Glossary**. Every major section opens in plain
  English. You can stop reading at the first "**For developers:**" block in any
  section — everything above it is written for you.

- **If you are a developer:** read everything. The "**For developers:**" blocks
  carry the technical detail (stack, API surface, data shapes, enforcement
  mechanisms). The plain-English lead-ins still matter — they state the intent
  the technical work has to satisfy.

A short word on tone: this document is meant to make the genuine engineering
scope of the project **visible and credible** to a non-technical reader. It is
not a sales pitch and it is not a complaint. It is an honest accounting of what
"let staff post articles to the website" actually requires when you build it
properly.

---

## 1. Executive summary (for managers)

**What it is.** "Studio" is an internal authoring and publishing tool for ICJIA
staff. It is the *back room* where staff prepare three kinds of content for the
public ICJIA Research Hub — **articles, apps, and datasets** — and then send
them live. The public Research Hub website is the *storefront*; Studio is where
the merchandise is prepared before it goes on the shelves.

**Who uses it.** Two kinds of staff, organized around two jobs:

- **Authors** write content. They log in, write an article in a friendly editor
  (formatting buttons and a live preview — **no code**), add images from a shared
  library, and save a **draft**. A draft is private; it is not on the public site.
- **Editors and Super Admins** publish content. They review a draft and click
  **Publish**. The content goes live on the public Research Hub, and the public
  website automatically rebuilds to show it.

That is the entire lifecycle: **Authors draft → Editors/Super Admins publish.**

**What it replaces.** A tool ICJIA built in 2019. That tool still runs, but it is
built on technology that has reached end-of-life, it stores images in a wasteful
way that bloats the database, and it carries a confusing multi-step approval
workflow. The new Studio uses current, supported technology, handles images
properly, and deliberately simplifies the workflow to two roles.

**The value.** A non-technical author can write and illustrate an article
without ever seeing code. A non-technical editor can open a clean list of
pending drafts and publish with one click. No image is ever stored as a giant
embedded blob. The public site reflects published content automatically. And the
whole thing is built on a maintainable, well-tested, modern foundation that ICJIA
can support for years.

**An honest scope statement.** From the outside, this can look like a small
project — "just let staff post articles to the website." It is not a *huge*
project, but it is genuinely deeper than it looks, and the depth is real
engineering, not padding. Secure login with roles, three structured content types
with dozens of fields each, professional and accessible image handling, a
friendly editor with live preview, an exact "preview as published" view, a
review-and-approval step with email, one-click publishing that rebuilds the
public site, and first-time onboarding — each of those is a reasonable
expectation that hides real work. The next section walks through exactly why,
in plain English.

---

## 2. Is this a simple project? An honest answer

A reasonable, busy manager might look at this and think: *we just need staff to
post articles to a website — what's the issue?* That is a fair question, and it
deserves a straight answer.

The honest answer is: **the "post an article" part is the small part.** Almost
everything that makes such a tool *safe, usable, accessible, and trustworthy*
lives in the requirements that "post an article" quietly assumes. Below, each
assumption is made concrete. The pattern in every case is the same: *a
reasonable person might assume X is trivial — here is the real work behind it.*

None of this is a complaint. Each item below is normal, professional software
engineering, and the team has either already built it or has a written plan to.
The point is simply to make the iceberg visible.

### 2.1 "Just let them log in" → secure login **and** who-is-allowed-to-publish

A login box looks like one text field, one password field, and a button. But a
login that you can trust has to: keep your session secure across page reloads,
re-check with the server on every app start that you are still who you say you
are, send you back to the login screen the moment your access expires, and —
critically — know **what you are allowed to do** once you are in.

That last part is the real work. The whole tool hinges on a rule: **Authors can
write and save drafts but cannot publish; Editors and Super Admins can publish
(make content live).** That rule has to be enforced by the system itself — not
merely by hiding a button — so that no one can publish who shouldn't, even if
they go looking for a way around the screen.

> **For developers:** Authentication targets Strapi 5's **admin
> Content-Manager API**. Login is `POST /admin/login`; the user's roles come from
> `GET /admin/users/me` (the login response returns an empty `roles` array).
> Capability is gated on **role codes**, not display names:
> `strapi-super-admin` and `strapi-editor` may publish; `strapi-author` is
> drafts-only. The JWT is persisted to a **Secure, `SameSite=Strict` cookie**
> (not `localStorage`) and **re-verified on every app boot**; a 401 clears the
> session and redirects to `/login`. A global Nuxt route middleware makes every
> route private except `/login`. Publish-gating is enforced **natively by Strapi**
> at the admin level — the client `canPublish` getter only decides which controls
> render; the server is the real authorization boundary.

### 2.2 "It's just articles" → structured content with three types and dozens of fields

"An article" is not a single blob of text. A Research Hub article has a title, a
slug (the URL-friendly name), a date, a type, an abstract, a markdown body,
authors, categories, tags, a hero image, a thumbnail, inline figures, a main PDF,
optional extra files, a DOI, a citation, funding text, and links to related apps
and datasets. That is one content type. There are **three** — articles, apps, and
datasets — each with its own set of fields, its own rules, and its own
relationships to the others.

Getting this right means modeling every field precisely, validating each one
(required fields, correct formats, valid values), and faithfully reading and
writing each shape to and from the content system without losing or corrupting
anything.

> **For developers:** Three content types with TypeScript models mirrored from
> the live Strapi schema: `Article`, `App`, `Dataset`, plus the JSON sub-shapes
> (`Author`, `Contributor`, `ImageRef`, `Source`, `Variable`, `TimePeriod`).
> Relationships (apps ⇄ datasets ⇄ articles) are first-class. Field facts were
> confirmed by read-only introspection of the live instance — e.g. the article
> `type` enum has 14 confirmed values; app `contributors` is `{ title }[]` in the
> live data; dataset `timeperiod` is `{ yeartype, yearmin, yearmax }`. Each type
> has a mapper (Strapi ⇄ domain) and a validator. This is the bulk of Phase 2,
> shipped with 81 automated tests.

### 2.3 "Just let them add a picture" → professional, accessible, safe image handling

"Add an image" hides four separate requirements:

1. **No giant embedded blobs.** The old tool stored each image by converting it
   into an enormous block of text and stuffing that text directly into the
   content record (a technique called "base64"). It bloats the database, slows
   everything down, and makes images impossible to reuse. The new Studio
   **never** does this. Every image is uploaded once to a shared Media Library
   and referenced by a link.
2. **Accessibility.** Every image needs **alt-text** (a short text description so
   screen-reader users and search engines understand the image) and may carry an
   optional **caption**. This is not optional polish; it is what makes the public
   content usable by everyone and compliant with accessibility expectations.
3. **Safe SVGs.** SVG image files are actually little programs and can carry
   hidden scripts. Allowing staff to upload SVGs without cleaning them would be a
   security hole. Studio strips anything dangerous out of an SVG **before** it is
   ever stored.
4. **Only valid image formats.** The tool accepts real image formats (JPG, PNG,
   SVG) and rejects the rest, with a clear message — without over-rejecting valid
   files, which was a bug in the old tool.

> **For developers:** Zero-base64 is a **hard invariant**, enforced structurally
> and by an automated guard (`lib/base64-guard.ts`: `containsBase64` /
> `assertNoBase64`) that is asserted in validator tests for articles, apps, and
> datasets — the build fails if a `data:` URI can reach a write payload. Images
> are Media Library references (numeric file `id` on write, URL for display). Alt
> and caption are modeled natively: `MediaRef` carries `alternativeText` +
> `caption`; `ImageRef` is `{ title, src, alt?, caption? }`; figures embed as
> `![alt](url "caption")`. Allowed extensions
> (`['jpg','jpeg','png','svg']`, case-insensitive) live in `lib/image-types.ts`.
> SVGs are sanitized client-side with **DOMPurify** (SVG profile — strip
> `<script>`, `on*` handlers, external entity / `xlink:href`) **before** upload.

### 2.4 "They can just type it in" → a friendly authoring experience for non-technical staff

Non-technical staff should not have to learn a markup language to write a
heading, a list, a table, or a link. They need formatting **buttons**, a visual
table builder, and a **live preview** that shows what they are creating as they
create it — the same comfortable experience as any modern editor. Building (or in
our case, adapting) such an editor, and teaching it to handle images, is a real
piece of work.

> **For developers:** Rather than build an editor, Studio reuses the **ICJIA
> Markdown Editor 2026** (Nuxt 4 / Vue 3.5 / Nuxt UI / CodeMirror 6 / markdown-it)
> consumed as a **Nuxt layer**. The one capability that editor lacks today —
> image handling — is the piece this project adds: a configurable `uploadHandler`
> that performs the eager Media-Library upload and returns `{ url, alt }` for
> insertion. We keep markdown-source editing with live preview (not a lossy
> rich-text serializer) because the content uses footnotes, KaTeX/LaTeX, and
> multi-row tables that must round-trip faithfully.

### 2.5 "They can see it before it's live" → an exact "preview as published" view

"Preview" is easy to under-build. A preview that shows *roughly* what the article
will look like is not good enough for staff who are about to publish to a public
government website. They need to see it rendered **exactly as it will appear on
the live Research Hub** — same formatting rules, same layout, same styling — so
there are no surprises after Publish.

> **For developers:** The preview route renders the `markdown` body using the
> **same markdown-it plugin set as the public renderer** (footnotes, KaTeX,
> tables) and the public CSS/layout. The styling sits behind **one swappable
> stylesheet** so the official project CSS can be dropped in later for
> pixel-exact fidelity. There is a lighter inline live-preview in the editor and
> a dedicated, shareable preview route (`/preview/:documentId`) that renders a
> draft as published.

### 2.6 "Just hit publish" → a review/approval step with email notification

In a real organization, content often gets a second set of eyes before it goes
public. Studio supports a **review step**: an author can request review, which
sends the author's manager(s) an **email** containing a **preview link** to the
exact draft. The manager opens the link, sees the article as it will be
published, and proceeds. Sending reliable email from a web app — securely, without
exposing credentials — is its own small system.

> **For developers:** A "Request review" action emails the author's manager(s)
> the preview URL via **Mailgun**, sent from a **server-side** Netlify Function /
> Nitro route that holds the Mailgun key (never shipped to the browser). Manager
> email addresses come from the onboarding profile (§2.8).

### 2.7 "Publishing is one button" → publishing that rebuilds the public website

Clicking **Publish** does two things, not one. First, it marks the content as
published in the content system. Second, it **rings a doorbell** that tells the
*separate* public Research Hub website to rebuild itself with the new content.
Until that rebuild finishes (typically a minute or two), the content isn't
visible publicly. Wiring that up — and keeping the "doorbell" address private so
not just anyone can trigger a public rebuild — is real work.

> **For developers:** Publish issues the Content-Manager publish action
> (`POST /content-manager/collection-types/:uid/:documentId/actions/publish`),
> then triggers a **Netlify build hook** for the public site. The build-hook URL
> is held **server-side** (Netlify Function / Nitro route) and the proxy verifies
> the caller's publisher JWT before firing — so the hook stays secret and only
> publishers can trigger a rebuild. The dev target site is `v2hub.netlify.app`.

### 2.8 "Just sign them in" → first-time onboarding

The review-by-email feature needs to know *who your managers are*. The first time
a staff member signs in, Studio collects a little profile: their manager
email(s), which **center** they belong to, and their own (prefilled, editable)
author email. The Studio is gated behind this on first login until it's complete.
Collecting, storing, and enforcing that profile is, again, a small feature in its
own right.

> **For developers:** First-login onboarding (required if the profile is missing)
> collects manager email(s), center (a dropdown — placeholder list until the real
> one is supplied), and a prefilled author email. Storage is an approved
> `studio-profile` Strapi collection type (`userEmail` key, `authorEmail`,
> `managerEmails` JSON array, `center`, `firstLoginComplete`). Creating the
> collection type may require the Strapi dev environment or source repo, because
> the deployed sandbox likely runs in production mode where the content-type
> builder is disabled — to be settled at build time.

### 2.9 "It's just a website" → a real content system with its own rules (and a real mid-build discovery)

All of the above runs against **Strapi 5**, a real content-management system with
its own contracts and rules — how records are identified, how drafts differ from
published items, how images attach, how relationships are read and written. You
have to learn and respect those rules precisely.

And here is the single best example of *why this isn't simple* — a genuine
discovery made **while building**:

When we set out, the plan was for Studio to talk to Strapi's *public* API and for
us to configure the publish permissions ourselves. Mid-build, we confirmed
something important: ICJIA staff are **Strapi admin-panel users** (Super Admin /
Editor / Author), and Strapi **already enforces exactly the rule we want** at the
admin level — *authors draft; editors and super-admins publish* — with **zero
backend changes**. But that enforcement only works through Strapi's **admin
Content-Manager API**, which is a different "door" than the one our first login
used.

So we made a surgical change: we **retargeted the login and all content access to
the admin Content-Manager API.** The payoff is large — "who can publish" is now
decided by your real Strapi roles, natively, with no custom permission code to
build or maintain. But discovering this required actually building far enough to
hit it. That is the nature of a first iteration: *you find the deep requirements
by building toward them, then you adjust.* This one discovery, on its own,
answers "what's the issue?" — the issue is that a correct, role-enforced
publishing tool has constraints you cannot see from the outside.

> **For developers:** The two Strapi APIs are separate: a Users & Permissions REST
> token returns **401** on `/content-manager`. The admin JWT from `/admin/login`
> is the Bearer for both `/admin/*` and `/content-manager/*`. The Content-Manager
> contract differs from the public REST contract in concrete ways — list envelope
> is `{ results, pagination }` (key `results`, not `data`); single/create/update
> is `{ data }`; entities are flattened (no `.attributes` wrapper); media is
> populated inline (with `alternativeText` + `caption`); **relations appear as
> `{ count: N }` only** and must be hydrated from a separate
> `/content-manager/relations/...` endpoint; writes are **flat** bodies (not
> wrapped in `{ data }`) and set media by numeric `id`. The data-layer plan was
> revised mid-build from the public REST API to this contract; the auth-retarget
> plan moves login to match. This retired the spec's original "publish via Users &
> Permissions" open question entirely.

### 2.10 So — is it simple?

The *workflow* is simple, on purpose: authors draft, editors publish. That
simplicity for the user is itself an achievement — it is the result of
deliberately removing the old tool's confusing multi-stage approval chain.

But "simple to use" is built on top of secure login with real roles, three
fully-modeled content types, accessible and safe image handling, a friendly
editor with exact preview, review-by-email, one-click publish-and-rebuild,
first-time onboarding, and faithful integration with a real content system whose
rules forced a mid-build pivot. None of those are optional if the result is going
to be safe, accessible, and trustworthy for a public government website. That is
the genuine scope — visible, credible, and entirely ordinary professional work.

---

## 3. Why a rebuild (v1 → v2)

**In plain English.** The 2019 tool isn't broken, but it is showing its age in
three ways that matter, and the rebuild fixes all three while making the tool
*simpler* to use.

| Concern | Old tool (v1, 2019) | New Studio (v2, 2026) |
|---|---|---|
| Technology | Vue 2 / Vuetify 2 + Strapi 3; end-of-life | Nuxt 4 / Vue 3 / Nuxt UI 4 + Strapi 5; current |
| Images | Stored as bloated base64 text in records | Shared Media Library, referenced by link |
| Workflow | Multi-stage approval, 3 roles, confusing | Two roles: Author (draft), Editor/Super Admin (publish) |
| Editor | Plain text box | Friendly editor: buttons, live preview, image insert |
| Publishing | Manual steps | One Publish button that also rebuilds the public site |
| Accessibility | Inconsistent | Required alt-text, optional captions, safe SVGs |

- **End-of-life technology.** Vue 2 and the rest of the 2019 stack are no longer
  actively supported. Continuing on them means rising maintenance cost and
  security exposure over time. The new stack is current and well-supported.
- **base64 image bloat.** The old approach of embedding images as text inside
  records is the single biggest technical debt. It is removed entirely.
- **Overly complex legacy workflow.** The old `created → submitted → published`
  chain with three roles is replaced by the two-role rule. Less to learn, less to
  go wrong.

The Strapi 5 backend has **already** been modernized to content parity with the
old Strapi 3 data (about 236 records in the sandbox), with real media relations
and native draft/publish. Studio's job is to do its part correctly against that
modern backend.

> **For developers:** v1 was Vue 2 + Vuetify 2 against Strapi 3 with a hybrid
> REST/GraphQL client; it stored display images (`splash`, `thumbnail`, article
> `images[].src`) as base64 while large binaries were real uploads, and it
> implemented a custom `status` workflow. v2 keeps the content model and the
> build-hook-on-publish idea; it discards base64 storage, the custom workflow,
> and the v1 codebase (kept only as a field-semantics reference). The legacy
> `status` field is ignored in v2 — native Draft & Publish is the source of truth.

---

## 4. High-level design

**In plain English.** Studio is one fast browser app — think Gmail: it loads
once and then responds instantly without full page reloads. It talks over the web
to Strapi 5, the content system where all articles, apps, and datasets live. When
an editor publishes, Studio also pings the public Research Hub website to rebuild
itself. That's the whole shape of it.

The lifecycle, end to end:

```text
  AUTHOR                         EDITOR / SUPER ADMIN            PUBLIC
  ------                         --------------------           ------
  log in                                                         
    |                                                            
  write article  ---- save ----> [ DRAFT in Strapi 5 ]          
  add images                          |                          
  (from Media Library)                |                          
  request review (optional) -- email w/ preview link -->        
                                      |                          
                                  review draft                   
                                  (exact "preview as published") 
                                      |                          
                                  click PUBLISH                  
                                      |                          
                          [ Strapi marks it published ]          
                                      |                          
                          [ build hook rings the doorbell ] ---> public site
                                                                 rebuilds &
                                                                 shows content
                                                                 (~1-2 min)
```

The architecture, drawn out:

```text
  +-------------------------------------------------------------+
  |  STUDIO  (Nuxt 4 single-page app, runs in the browser)      |
  |                                                             |
  |   login   dashboard   create/edit forms   preview   publish |
  |     |         |              |               |         |    |
  |     +---------+--------------+---------------+---------+    |
  |                         |                                   |
  |          admin JWT (from /admin/login) on every call        |
  +-------------------------|-----------------------------------+
                            |
              +-------------+-------------------+----------------+
              |                                 |                |
              v                                 v                v
   +---------------------+        +--------------------+   +-----------+
   |  Strapi 5 ADMIN     |        |  Server-side proxy |   |  Mailgun  |
   |  Content-Manager    |        |  (Netlify Function |   | (review   |
   |  API + Media Library|        |  / Nitro route):   |   |  emails)  |
   |                     |        |  holds secrets,    |   +-----------+
   |  articles / apps /  |        |  verifies JWT,     |
   |  datasets, uploads, |        |  then fires...     |
   |  native Draft&Publish|       +---------+----------+
   +---------------------+                  |
                                            v
                                 +----------------------+
                                 |  Netlify build hook  |
                                 |  -> public Research  |
                                 |     Hub rebuilds     |
                                 +----------------------+
```

**For developers — stack:**

| Concern | Choice |
|---|---|
| App framework | Nuxt 4, **SPA mode** (`ssr: false`) |
| UI | Nuxt UI 4 (Tailwind CSS v4) |
| State | Pinia (auth session persisted to a Secure cookie) |
| Language | TypeScript throughout |
| HTTP | `ofetch` (`$api`) with an auth + base-URL interceptor |
| Backend API | Strapi 5 **admin Content-Manager API** (`/content-manager/*`) + admin auth (`/admin/*`) |
| Editor | ICJIA Markdown Editor 2026, consumed as a Nuxt layer |
| Email | Mailgun, via a server-side function |
| Image safety | DOMPurify (SVG sanitization) |
| Deployment | Netlify (static SPA + one server route for the build-hook proxy and email) |

**For developers — API surface & auth note.** Studio authenticates staff as
Strapi **admin-panel** users via `POST /admin/login`, then loads roles from
`GET /admin/users/me`. The returned admin **JWT** is the Bearer token for every
authenticated call — both `/admin/*` and `/content-manager/*`. Records are
addressed by **`documentId`** (string), never numeric `id`. Native Draft &
Publish is the source of truth (`publishedAt: null` = draft). Reads list with
`?status=draft|published`; the publish action is a dedicated Content-Manager
endpoint. The public REST API and a Users & Permissions token are **not** used
for content access — they cannot drive the admin publish-gating that the
two-role workflow depends on.

---

## 5. Key engineering decisions & discoveries

**In plain English.** A few decisions shape the whole project. The first one —
the auth/Content-Manager discovery — is the marquee example of why this work is
deeper than it looks, and it's covered in detail in §2.9. The rest are summarized
here.

| Decision / discovery | What it means, in plain English |
|---|---|
| **Zero base64 images** | Images live in a shared library and are referenced by link, never embedded as bloated text. Enforced automatically by tests. |
| **Auth / Content-Manager pivot** | Mid-build, we moved login and content access to Strapi's admin API so your real roles enforce who-can-publish, natively, with no backend changes. (The marquee "why not simple" example.) |
| **Accessibility built in** | Every image carries alt-text and an optional caption; these are first-class fields, not afterthoughts. |
| **Safe SVGs** | SVG uploads are cleaned of any hidden scripts before they are stored. |
| **Onboarding profile** | First login collects manager email(s) and center so the review-by-email feature knows whom to notify. |
| **Review by email** | Authors can request review; managers get an email with an exact preview link (sent securely via Mailgun). |
| **Preview URLs** | A shareable link renders a draft *exactly* as it will appear on the public site. |
| **Discovered-while-building** | This is Draft 1. We surface deep requirements by building toward them, then adjust — disciplined iteration, captured in writing. |

> **For developers:**
>
> - **Zero-base64** is enforced by `lib/base64-guard.ts` and asserted in
>   validator tests for all three content types; the guard must be wired into the
>   write/submit path when forms land (a tracked hand-off from the data-layer
>   review).
> - **Auth / Content-Manager:** see §2.9 and §4. The pivot retired the original
>   spec §4.1 "publish via Users & Permissions" open item; publish-gating is now
>   native (`strapi-author` create/update/delete but **publish ❌**; `strapi-editor`
>   and `strapi-super-admin` publish ✅).
> - **Accessibility:** `alternativeText` + `caption` on `MediaRef`; `alt?` +
>   `caption?` on `ImageRef`; required-alt enforcement is UX-layer (forms) with an
>   optional validator assist.
> - **SVG sanitization:** DOMPurify (SVG profile) client-side, before upload —
>   neutralizes XSS at ingest.
> - **Onboarding profile:** approved `studio-profile` Strapi collection type;
>   creation-environment wrinkle noted in §2.8 and §10.
> - **Review email & preview:** Mailgun via a server-side function; preview route
>   reuses the public renderer's markdown-it plugin set behind one swappable
>   stylesheet.
> - **Iteration model:** README, spec, and all plans carry a "Draft 1 — first
>   iteration" banner; the build ledger (`.superpowers/sdd/progress.md`) is the
>   durable record of discoveries and captured future features.

---

## 6. Implementation phases

**In plain English.** The work is broken into phases. Each phase is independently
shippable — it delivers something that works and is tested on its own — and each
is built **test-first** (we write the test that defines "correct," then write the
code to pass it). The table below says, for each phase, *what a staff member can
actually do once it's done*, and where it stands. Detailed subsections follow.

| Phase | What you can do when it's done | Status |
|---|---|---|
| 1. Foundation & Secure Login | Sign in securely; the app remembers your session; only publishers see Publish controls | **Built** |
| 1.5. Auth Retarget (Admin API) | Sign in with your real Strapi admin account; your real role decides who can publish | **Planned** (plan written) |
| 2. Content Engine / Data Layer | The app can read and save articles, apps, and datasets correctly and safely | **Built** (81 tests, merged) |
| 3. Media & Images | Add images properly: shared library, alt-text/captions, safe SVGs, valid formats | **Planned** |
| 4. Authoring Editor | Write with formatting buttons, a table builder, and live preview — no code | **Planned** |
| 5. Screens, Preview & Onboarding | Use real dashboards/forms; preview exactly-as-published; complete first-login profile | **Planned** |
| 6. Publish, Rebuild & Review Email | Publish with one click (rebuilds the public site); request review by email | **Planned** |
| 7. Polish, Accessibility & Launch | A refined, accessible, launch-ready tool, plus a one-click sample-article demo | **Planned** |

> **For developers:** Phases map to the project's seven implementation plans
> (plus the auth-retarget as Phase 1.5). Each plan is TDD task-by-task with an
> independent review checkpoint per task and a whole-branch review before merge.
> Phases are sequenced but loosely coupled: endpoint-agnostic foundations can be
> built ahead of API-coupled work, as was done in Phase 2.

### Phase 1 — Foundation & Secure Login  ·  Status: **BUILT**

**Plain-English deliverable.** A staff member can sign in to Studio; the app
remembers them for the session and across page reloads; if their access expires
they are sent back to the login screen; and only publishers see Publish-related
controls. This is the secure front door.

**For developers — technical scope.** A Nuxt 4 SPA (`ssr: false`) with Nuxt UI 4,
Pinia, and TypeScript. A single configured `ofetch` instance (`$api`) attaches
the JWT and handles 401s. Auth state lives in a persisted Pinia store. Pure,
dependency-injected functions (`loginRequest`, `fetchMe`, `resolveAuthRedirect`)
hold the logic; composables, plugins, and pages are thin wiring. A global route
middleware gates every route; `/login` is the only public one. Delivered:
scaffold, `$api` client + interceptor, persisted auth store, login/`fetchMe`
requests, the `useAuth` composable, the route guard, the login page, the default
layout, and a protected dashboard — each step test-first with a commit.

**Why this isn't trivial.** "A login" hides session security (Secure cookie, not
`localStorage`), boot-time re-verification, automatic logout on expiry, and — the
real substance — a role model that decides what each user may do. Getting the
*security boundary* right (server-enforced, not screen-deep) is the whole game,
and it has to be in place before any content work can safely begin.

> **Status note (developer):** Built and merged on `main` (commit `d1c3bc7`).
> A dev-only fixed admin login (`admin/admin`) exists for local development and is
> flagged **REMOVE BEFORE DEPLOY**. As originally built, Phase 1 used the Users &
> Permissions API (`/api/auth/local`); Phase 1.5 retargets it to the admin API
> (see below) — that retarget is the reason this phase, though built, is revised
> rather than final.

### Phase 1.5 — Auth Retarget to the Admin API  ·  Status: **PLANNED (plan written)**

**Plain-English deliverable.** Staff sign in with their **real Strapi admin
accounts**, and **who can publish is decided by their real Strapi roles** — Super
Admin and Editor can publish; Author cannot. This is a small, surgical fix, not a
redo: nothing about the content, the zero-base64 rule, or the design changes.

**For developers — technical scope.** Retarget Phase 1 auth from Users &
Permissions (`/api/auth/local`) to the **admin API** (`/admin/login` +
`/admin/users/me`). Keep Phase 1's exact structure (pure functions + thin wiring);
only the endpoints, the user/role shape, and the capability getter change. Login
stays a two-step flow (login → fetch-me) because `/admin/login` returns an empty
`roles` array. New: `app/types/admin.ts` (`AdminRole`, `AdminUser`, response
types) and `app/lib/admin-roles.ts` (`PUBLISHER_ROLE_CODES`, `roleCodesOf`,
`canPublish`). Modified: `auth.ts`, the auth store (now exposes
`roleCodes`/`canPublish`/`displayName`), `useAuth`, the route guard, and the UI.
The `admin/admin` dev bypass is preserved (mints a synthetic super-admin session).
Six TDD tasks, each with a commit; the Phase 1 security posture (Secure cookie,
boot re-verify, 401 logout) carries over unchanged.

**Why this isn't trivial.** This phase exists *because* of the mid-build
discovery in §2.9 — it is the concrete consequence of learning that staff are
admin-panel users and that Strapi enforces the publish rule natively at the admin
level. It is the unlock for live Content-Manager reads and writes. The fact that
it is small and surgical is precisely because the discovery was captured cleanly
and the original code was structured for change.

> **Status note (developer):** Plan written
> (`docs/superpowers/plans/2026-06-20-auth-admin-retarget.md`); not yet executed.
> Role codes confirmed against the live instance: `strapi-super-admin`,
> `strapi-editor` (publishers), `strapi-author` (drafts only).

### Phase 2 — Content Engine / Data Layer  ·  Status: **BUILT (81 tests, merged)**

**Plain-English deliverable.** The invisible engine that lets Studio read the
three kinds of content out of the content system and save new drafts back into
it — *correctly and safely*. It has no screens of its own (those come later); what
it has is strict rules about the shape of every article, app, and dataset, and
one rule we care about a lot: **no image is ever stored as base64** — every image
is a Media Library reference. This plan turned that promise into automated tests
that fail the build if anyone breaks it.

**For developers — technical scope.** A typed, tested data-access layer:
Content-Manager API repositories addressed by `documentId`, with mappers
(Strapi ⇄ domain) and validators (including the hard zero-base64 gate), v1
text-import parsers (paste delimited text → structured rows), and thin
`useArticles` / `useApps` / `useDatasets` composables. A generic
`createRepository(...)` factory takes the configured `$Fetch` client (carrying
the admin JWT) and returns `list`/`findOne`/`create`/`update`/`remove`. All logic
lives in pure, dependency-injected functions; everything is unit-tested against
fixtures captured from the live Strapi 5 Content-Manager API (no network in
tests). Field facts (the 14-value article `type` enum, app `contributors`,
dataset `timeperiod`/`variables`/`sources`, option lists) were confirmed by
read-only introspection.

**Why this isn't trivial.** This is the plumbing, and plumbing is where the
content system's real rules live — stable IDs, draft-vs-published, inline media,
relationships returned as counts that must be hydrated separately, flat write
bodies. **This plan was itself revised mid-build** from the public REST API to
the Content-Manager API (the §2.9 discovery), which changed envelope shapes,
relation handling, and write formats. Getting the headline invariant
(no base64) *guaranteed by tests rather than hope* across three content types is
the substance here.

> **Status note (developer):** 12 TDD tasks complete; **81 automated tests
> passing, `nuxt typecheck` clean**; merged to `main` (fast-forward to `1d0ca9b`),
> branch deleted. Two tracked hand-offs remain for later phases: (1) wire the
> validators / `assertNoBase64` into the live submit path when forms land; (2) the
> auth retarget (Phase 1.5) must land before live writes, since Content-Manager
> needs the admin JWT. Relation-write and the publish action were intentionally
> deferred to later phases.

### Phase 3 — Media & Images  ·  Status: **PLANNED**

**Plain-English deliverable.** Staff can add images the right way: upload to the
shared Media Library or pick an existing image, see a real preview (never a giant
embedded copy), provide alt-text and an optional caption, and upload only valid
image formats — with SVGs automatically cleaned of anything dangerous.

**For developers — technical scope.** An eager-upload composable (upload on
select/drop → store `{ id, url }` → preview from the returned URL, never a client
data URL), a reusable `MediaPicker` backing every media field (upload-new and
pick-existing via Media Library browse), per-field type/size constraints, the
DOMPurify SVG sanitization step before upload, the allowed-extension accept-filter
(`jpg/jpeg/png/svg`), and a lint/test guard reinforcing zero-base64. Inline
article figures upload to the Media Library and insert as `![alt](url "caption")`
at the cursor; each insertion also appends `{ title, src, alt?, caption? }` to the
`images` JSON array (URLs only).

**Why this isn't trivial.** This is where the four hidden image requirements
from §2.3 (no base64, accessibility, SVG safety, valid formats) become concrete
UI and upload behavior. The Strapi 5 "no upload at entry creation" rule means
files must be uploaded standalone first and attached by id — a real change from
older patterns.

### Phase 4 — Authoring Editor  ·  Status: **PLANNED**

**Plain-English deliverable.** Authors write with formatting buttons, a visual
table builder, and a live preview — no code. They can drop an image into the body
and have it inserted for them.

**For developers — technical scope.** Extract the ICJIA Markdown Editor 2026 into
a shared **Nuxt layer** and consume it via `extends`; add the configurable
`uploadHandler` (and optional `mediaPicker`) hook — the one capability the editor
lacks today — wired to the Phase 3 eager-upload + Media-Library pick, returning
`{ url, alt }` for insertion. Align the in-editor live preview's markdown-it
plugin set with the public renderer (footnotes, KaTeX, tables) so what authors see
matches what publishes. Markdown-source editing is retained (not a lossy
rich-text serializer) to preserve footnote/LaTeX/table fidelity.

**Why this isn't trivial.** Reusing an existing editor as a layer (rather than
rebuilding one) is the efficient choice, but it still requires extracting it
cleanly, adding the missing image capability, and matching the public renderer so
the preview is faithful. The §2.4 "friendly experience" expectation is delivered
here.

### Phase 5 — Screens, Preview & Onboarding  ·  Status: **PLANNED**

**Plain-English deliverable.** The real working screens: a dashboard with
role-aware task cards, type-aware create/edit forms for all three content types,
a reverse-chronological article listing (authors edit their own), a dedicated
**preview that renders a draft exactly as published** (shareable by link), and a
**first-login onboarding** flow that collects the staff member's manager email(s),
center, and author email before the Studio unlocks.

**For developers — technical scope.** Pages: `/login`, `/` (dashboard),
`/create/:type`, `/edit/:type/:documentId`, `/manage` (publish queue, publisher
only), `/preview/:type/:documentId`. Forms built from shared field components
(text, date, repeatable-row lists, relation pickers, `MediaPicker`, editor) with
client validation mirroring v1 rules; **the zero-base64 validators are wired into
the submit path here** (the tracked hand-off from Phase 2). The preview route
reuses the public renderer's plugin set behind one swappable stylesheet for
later pixel-exact CSS. Onboarding is gated on first login and backed by the
approved `studio-profile` Strapi collection type.

**Why this isn't trivial.** This is where the structured-content (§2.2), exact-
preview (§2.5), and onboarding (§2.8) requirements all turn into real UI, and
where the zero-base64 guarantee finally guards live writes. It is the densest UI
phase.

### Phase 6 — Publish, Rebuild & Review Email  ·  Status: **PLANNED**

**Plain-English deliverable.** Publishers publish with one click — which makes the
content live **and** rebuilds the public Research Hub. Authors can request review,
which emails their manager(s) an exact preview link.

**For developers — technical scope.** The Content-Manager publish action
(`.../actions/publish`) wired to a publisher-only control; a **server-side**
build-hook proxy (Netlify Function / Nitro route) that holds the Netlify
build-hook URL secret, verifies the caller's publisher JWT, then triggers the
rebuild of the public site (`v2hub.netlify.app` in dev). The "Request review"
action emails manager(s) the preview URL via **Mailgun**, sent from a server-side
route holding the Mailgun key. Publish/build-hook failures are reported distinctly
("published but rebuild trigger failed").

**Why this isn't trivial.** The §2.6 (review email) and §2.7 (publish-and-rebuild)
requirements both live here, and both involve a server-side component to keep
secrets off the browser and to verify authorization before firing — a small but
real backend surface in an otherwise client-only app.

### Phase 7 — Polish, Accessibility & Launch  ·  Status: **PLANNED**

**Plain-English deliverable.** A refined, accessible, launch-ready tool — keyboard-
and screen-reader-friendly, with good error states — plus an **"Add Sample
Article"** action that instantly creates a fully-decked-out demo article (real
Media-Library images, all fields) as a draft, so the look and workflow can be
shown off on demand.

**For developers — technical scope.** Accessibility hardening (Nuxt UI's accessible
baseline plus the editor's axe-tested setup; the manager queue and forms are the
primary non-technical surfaces), central error normalization, an end-to-end happy-
path test (author drafts with image → publisher publishes → build hook called,
mocked), deploy configuration, and removal of the dev-admin bypass. The "Add
Sample Article" demo action creates ~2 phony-but-complete draft articles for
variety.

**Why this isn't trivial.** Accessibility and error handling are exactly the
"last 20%" that separates a demo from a tool people can rely on, and they cannot
be bolted on at the end without intention. The sample-article demo also makes the
whole system's value immediately visible to stakeholders.

---

## 7. How we build it (quality & process)

**In plain English.** The way this project is built is as important as what it
builds, because *how* it's built is what makes it trustworthy and maintainable.
Three practices define the approach:

- **Test-driven development.** For each small piece, we first write a test that
  defines what "correct" means, then write the code to make that test pass. This
  is a decades-old, mainstream method. It means the headline promises — like "no
  image is ever stored as base64" — are guaranteed by automated checks that fail
  the build if anyone ever breaks them, rather than relying on someone remembering
  to be careful.
- **Independent review of each step.** Every step ends with a save point (a
  version-control commit, so nothing is lost and every change is traceable and
  reversible) and an independent review against the plan and coding standards
  before the next step begins. A whole-branch review happens before anything
  merges.
- **The living-first-draft approach.** This is Draft 1. Rather than pretend we
  knew every requirement up front, we discover deep requirements by building
  toward them and then capture and adjust — in writing, in the build ledger. The
  mid-build auth pivot (§2.9) is the prime example: caught early, documented, and
  turned into a small surgical plan instead of a crisis.

**Why this rigor means fewer surprises.** Tests catch regressions before they
reach anyone. Per-step review catches mistakes while they're small and cheap to
fix. Capturing discoveries in writing means a requirement found in week three
isn't lost or forgotten — it becomes a tracked plan. The result is a tool that is
correct, reviewable, safe to change, and maintainable for years — which is the
entire point of rebuilding on a modern foundation in the first place.

> **For developers:** Concretely — pure functions with dependency injection so
> logic is unit-testable without a network; fixtures captured from the live
> instance so tests verify real shapes; Vitest + `@nuxt/test-utils`;
> `nuxt typecheck` run per task (a Phase 2 lesson: vitest/esbuild missed type
> errors that `nuxt typecheck` caught); conventional commits with **no AI
> co-author trailer**; per-task and whole-branch reviews. The build ledger
> (`.superpowers/sdd/progress.md`) is the durable record of status, discoveries,
> and captured future work. Evidence of the rigor: Phase 2 shipped 81 passing
> tests with a clean typecheck and a clean whole-branch review.

---

## 8. Status dashboard (for managers)

A clean done-vs-planned view of the whole project.

| Area | Status | Notes |
|---|---|---|
| Foundation & secure login | **Done** | Built and merged; revised by the auth retarget |
| Auth retarget (real Strapi roles) | **Planned** | Plan written; small, surgical |
| Content engine (read/save 3 types) | **Done** | 81 automated tests, typecheck clean, merged |
| Zero-base64 guarantee | **Done (enforced by tests)** | Wires into live forms in Phase 5 |
| Media & images (library, alt, SVG safety) | **Planned** | — |
| Authoring editor (buttons + live preview) | **Planned** | Reuses ICJIA editor as a layer |
| Screens, exact preview & onboarding | **Planned** | — |
| Publish + rebuild + review email | **Planned** | Needs build-hook URL + Mailgun key |
| Polish, accessibility & launch | **Planned** | Includes sample-article demo |

**One-line summary for a manager:** the secure front door and the content engine
are **built and tested**; the screens, image handling, editor, preview,
publishing, and onboarding are **designed and planned**, ready to build in
sequence.

> **For developers:** "Done" items are merged to `main` **and pushed to `origin`**
> (the public GitHub repo) — the foundation and content engine are live on GitHub.
> Note `main` includes the dev-only `admin/admin` bypass, flagged
> **REMOVE BEFORE DEPLOY**. Phase 1.5 (auth retarget) is the next recommended
> execution target, as it unblocks live Content-Manager writes.

---

## 9. Risks & open decisions (for managers)

**In plain English.** Every honest project has open items. These are normal
project hygiene, not red flags — each is known, tracked, and has a sensible
default or a clear owner. Listing them is part of being straight with you.

| Open item | Plain-English meaning | How it's handled |
|---|---|---|
| HttpOnly-cookie hardening | The login token is currently readable by the page's own code; the stronger form makes it invisible to scripts | Scheduled as a separate, approval-gated **backend** task; meanwhile the server enforces all permissions, so this is a hardening step, not a hole |
| Author test account | To verify that authors *cannot* publish, we need a real author login to test with | Requested from the backend owner; we don't create accounts ourselves |
| Pixel-exact preview CSS | The preview already matches published formatting; making it *pixel-identical* needs the official public-site stylesheet | Preview is built behind one swappable stylesheet; drop in the official CSS when provided |
| The real "centers" list | Onboarding asks which center a staff member belongs to; we're using a placeholder list until the real one is supplied | Placeholder dropdown now; swap in the real list when provided |
| Onboarding profile storage | Storing the onboarding profile needs a small, approved addition to Strapi | `studio-profile` collection type **approved**; may need the Strapi dev environment to create it (sandbox likely runs in production mode) |
| Build-hook URL & Mailgun key | Publishing-rebuild and review-email need two secret values | Provided at Phase 6 build time; both held server-side, never in the browser |

> **For developers:** These mirror the spec's open-items table and the plan
> follow-ups. Resolved during this iteration and **no longer open:** publish
> permissions (now native via admin role codes — retired spec §4.1); build-hook
> secrecy (server-side proxy with JWT verification). Carried forward: HttpOnly
> hardening (backend), the validators-into-write-path wiring (Phase 5), the author
> test account, the official preview CSS, the centers list, and the
> `studio-profile` creation environment.

---

## 10. Glossary (plain-English translations)

| Term | What it means here |
|---|---|
| **Studio** | The internal staff tool this document describes (the "back room"). |
| **Research Hub** | The public ICJIA website where published content appears (the "storefront"). |
| **Strapi 5** | The content system / "warehouse" where all articles, apps, and datasets are stored and served. |
| **Content-Manager API** | Strapi's **admin** door for managing content. Studio uses it because it natively enforces who-can-publish by the staff member's real Strapi role. |
| **Users & Permissions API** | Strapi's *public* door (a different one). We originally used it, then moved to the admin door — see §2.9. |
| **SPA (Single-Page App)** | A fast web app that runs in the browser like Gmail — no full page reloads. |
| **Nuxt 4 / Vue** | The technology Studio is built with. |
| **Nuxt UI 4 / Tailwind** | Ready-made, accessible building blocks for Studio's buttons, forms, and tables. |
| **Nuxt layer** | A way to reuse another project (the ICJIA editor) as a shared building block instead of rebuilding it. |
| **Pinia** | The small library that holds Studio's in-app state, including the signed-in session. |
| **TypeScript** | A safer dialect of the web's programming language that catches many mistakes before the app even runs. |
| **JWT / auth token** | The secure "pass" issued at login that proves who you are on each request. |
| **base64** | The old, wasteful way of storing an image as a giant block of text inside a record. **Banned here.** |
| **Media Library** | A shared folder of uploaded images/files, reused by reference (like a shared Drive). |
| **Media reference** | A link from a record to a file in the Media Library — the proper, lightweight way to attach an image. |
| **Draft vs. publish** | Strapi's built-in switch: drafts are private; publishing makes content public. |
| **Webhook / build hook** | A "doorbell" URL that tells the public website to rebuild itself with new content. |
| **documentId** | The stable internal ID Strapi 5 uses to refer to each record. |
| **Markdown** | A simple text-formatting system; in Studio, authors use buttons and a live preview instead of typing code. |
| **alt-text** | A short written description of an image, so screen-reader users and search engines understand it. |
| **SVG sanitization** | Cleaning a vector-image file of any hidden scripts before it is stored, so it can't carry an attack. |
| **DOMPurify** | The well-known tool Studio uses to perform that SVG cleaning. |
| **Mailgun** | The service Studio uses to send review-notification emails. |
| **Netlify** | Where Studio (and the public Research Hub) are deployed; also where the "build hook" rebuild is triggered. |
| **Repository** | Two meanings: (1) the code home on GitHub; (2) in code, the small module that reads/writes one content type. |
| **Author / Editor / Super Admin** | The three Strapi admin roles. Authors draft; Editors and Super Admins publish. |
| **Draft 1 / first iteration** | This stage: an exploratory first pass where requirements are discovered while building, and captured in writing. |

---

*End of specification. This is a living first-draft document; as a first
iteration it will evolve as the build surfaces requirements. The build ledger at
`.superpowers/sdd/progress.md` is the most current record of status.*
