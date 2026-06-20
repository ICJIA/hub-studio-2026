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
The point is to make the iceberg visible.

### 2.1 "Just let them log in" → secure login **and** who-is-allowed-to-publish

A login you can actually trust has to do several things at once that aren't
visible on the screen. It keeps your session secure across page reloads so you
aren't asked to sign in again every few minutes. It re-checks with the server on
every app start that your account is still valid and still has the access it had
yesterday — because the answer can change between visits (an account can be
disabled, a role can be reduced) and the app must honor that immediately rather
than trust a stale local copy. It sends you back to the login screen the moment
your access expires, mid-session, without losing or corrupting work in progress.
And — the part that carries the most weight — it has to know **what you are
allowed to do** once you are in.

That last part is the real work, and it is harder than it sounds because it is a
*security boundary*, not a screen behavior. The whole tool hinges on a rule:
**Authors can write and save drafts but cannot publish; Editors and Super Admins
can publish (make content live).** Hiding the Publish button from an author is
trivial and worthless on its own — the button is just paint. The browser is a
fundamentally untrusted place: a determined person can read the page's code, see
every request it makes, and replay those requests by hand with the button out of
the picture entirely. So the rule has to be enforced where the request actually
lands — by the server that owns the content — and the rule the *server* applies
and the rule the *screen* implies have to agree exactly, in every state, or you
get either a silent security hole or a confusing app that offers actions it then
refuses. Reconciling those two layers, and proving they agree, is the genuine
work hiding behind "just let them log in."

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
anything. The difficulty is not the count of fields — it is that several of them
are not flat values but *structures*: a list of authors, a list of figures each
with its own image and caption, a time period with a start and end, links from
one article out to related apps and datasets. Each of those has to survive a full
round trip — read from the content system, shown in a form, edited, and saved
back — landing in exactly the shape the system expects, because a single field
read or written in the wrong shape doesn't fail loudly; it quietly produces a
record that looks fine in Studio and is broken on the public site. And the only
trustworthy source for what each field's "correct shape" actually is, is the live
content system itself, not a document or an assumption — which is why the real
field shapes here were confirmed by inspecting the live data directly rather than
taken on faith.

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

"Add an image" carries four separate requirements that pull in different
directions, and the work is in satisfying all four at once:

1. **No image stored as embedded text (base64).** The old tool stored each image
   by converting it into an enormous block of text — base64 — and writing that
   text directly into the content record alongside the article. The consequences
   compound: the database swells with image data it was never meant to hold,
   every read and backup drags the images along whether you need them or not, and
   the same picture used in three places is stored three separate times because a
   record can't share text with another record. The new Studio refuses this
   outright. Each image is uploaded once to a shared Media Library and the record
   keeps only a link to it. Holding that line is not a one-time decision; an
   embedded image can sneak in through a pasted editor, a copied field, or an
   import, so the prohibition has to be actively guarded rather than assumed.
2. **Accessibility is a legal-grade requirement, not polish.** Every image needs
   **alt-text** — a short written description that a screen reader speaks aloud to
   someone who can't see the image — and may carry an optional **caption**. For a
   public government website this is a compliance obligation, not a nicety, which
   means the tool can't merely *offer* an alt-text box; it has to make supplying
   one the path of least resistance so that accessible content is what naturally
   gets produced.
3. **SVG uploads are an attack surface.** An SVG is not a flat picture like a JPG;
   it is a text document that can legally contain executable instructions, which
   is exactly what makes it dangerous to accept from a logged-in user — a booby-
   trapped SVG can carry a script that runs in the browser of the next person who
   views it. Studio strips the dangerous parts out of every SVG **before** it is
   stored, so a hostile file is defused at the door rather than trusted and served
   to the public.
4. **Accept valid formats without over-rejecting.** The tool accepts real image
   formats (JPG, PNG, SVG) and turns away the rest with a clear message. The
   subtle part is the second half: the old tool was *too* strict and rejected
   legitimate files, so getting this right means being precise about what counts
   as valid rather than merely cautious.

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

Staff should not have to learn a markup language to write a heading, a list, a
table, or a link. They need formatting **buttons**, a visual table builder, and a
**live preview** that shows what they are creating as they create it — the same
experience they already expect from any modern editor. A rich text editor is one
of the genuinely hard pieces of software to build well; the polished ones
represent years of work, because the moment you let people format text freely you
inherit a long tail of edge cases — pasting from Word, nested lists, tables
inside tables, undo that behaves the way a human expects. The right move here is
therefore *not* to build one. Studio adapts a capable editor ICJIA already owns,
which converts most of that cost into a smaller, sharper problem: making someone
else's editor handle images and render its live preview with the exact same rules
the public site uses, so that what an author sees while typing is genuinely what
will publish.

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
there are no surprises after Publish. The difficulty is that the preview and the
live site are produced by two *separate* applications. "Exactly the same" is only
true if both turn the author's text into a page using the identical set of
formatting rules — and ICJIA's content leans on the rules that are easiest to get
subtly wrong: footnotes, mathematical notation, and multi-row tables. If the
preview's rules and the public site's rules drift even slightly apart, the
preview becomes a confident lie, and the author finds out only after the content
is already public. Keeping the two renderers provably in step is the real task
hiding inside the word "preview."

> **For developers:** The preview route renders the `markdown` body using the
> **same markdown-it plugin set as the public renderer** (footnotes, KaTeX,
> tables) and the public CSS/layout. The styling sits behind **one swappable
> stylesheet** so the official project CSS can be dropped in later for
> pixel-exact fidelity. There is a lighter inline live-preview in the editor and
> a dedicated, shareable preview route (`/preview/:documentId`) that renders a
> draft as published.

### 2.6 "Just hit publish" → a review/approval step with email notification

In organizations, content often gets a second set of eyes before it goes public.
Studio supports a **review step**: an author can request review, which sends the
author's manager(s) an **email** containing a **preview link** to the exact
draft. The manager opens the link, sees the article as it will be published, and
proceeds. Sending email reliably from a web app is its own small system, for a
reason that isn't obvious from the outside: the app runs in the user's browser,
and a browser is the wrong place to send mail from. The credential that lets you
send mail through the email service is a secret — anyone who obtains it can send
mail as ICJIA — and anything the browser holds, the user can read. So the send
has to happen on a server the public can't inspect, with the browser merely
*asking* that server to send, and the server deciding whether the request is
legitimate before it does. That split — keep the secret off the browser, verify
the request, then send — is a small piece of back-end machinery standing behind a
feature that, on screen, is one button labeled "Request review."

> **For developers:** A "Request review" action emails the author's manager(s)
> the preview URL via **Mailgun**, sent from a **server-side** Netlify Function /
> Nitro route that holds the Mailgun key (never shipped to the browser). Manager
> email addresses come from the onboarding profile (§2.8).

### 2.7 "Publishing is one button" → publishing that rebuilds the public website

Clicking **Publish** does two things, not one. First, it marks the content as
published in the content system. Second, it **rings a doorbell** that tells the
*separate* public Research Hub website to rebuild itself with the new content.
Those two steps live in two different systems, which creates the real engineering
question here: what happens when the first succeeds and the second fails? The
content is marked published but the public site hasn't picked it up, and an
author who is told "published!" and then can't find their article on the live
site has every reason to distrust the tool. So the publish flow has to treat the
two steps honestly — report "published, but the site rebuild didn't trigger" as
its own distinct outcome rather than a flat success or a flat failure. And the
doorbell itself is a liability if it's left lying around: the address that
triggers a public rebuild has to stay private, because a rebuild is something only
a publisher should be able to set off, not anyone who happens to find the URL.

> **For developers:** Publish issues the Content-Manager publish action
> (`POST /content-manager/collection-types/:uid/:documentId/actions/publish`),
> then triggers a **Netlify build hook** for the public site. The build-hook URL
> is held **server-side** (Netlify Function / Nitro route) and the proxy verifies
> the caller's publisher JWT before firing — so the hook stays secret and only
> publishers can trigger a rebuild. The dev target site is `v2hub.netlify.app`.

### 2.8 "Just sign them in" → first-time onboarding

The review-by-email feature can't email a manager it doesn't know about, so the
information has to be captured somewhere — and the first sign-in is the one moment
you can require it without nagging people later. The first time a staff member
signs in, Studio collects a short profile: their manager email(s), which
**center** they belong to, and their own (prefilled, editable) author email, and
it holds the rest of the tool closed until that profile exists. Two things make
this more than a form. First, "hold the tool closed until complete" is an
enforced gate, which means every path into the app has to route through it — a
gate with one unguarded side door isn't a gate. Second, the profile has to be
*stored* somewhere durable and tied to the person, which (as §2.9 gets into) the
content system doesn't offer for free — a place to keep it has to be added.

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
published items, how images attach, how relationships are read and written. Those
rules have to be learned and respected precisely, and the only authoritative
source for what they actually are is the running system, not its documentation.

And here is the single best example of *why this isn't simple* — a genuine
discovery made **while building**, and since **resolved**:

When the project set out, the plan was for Studio to talk to Strapi's *public*
API and for the team to configure the publish permissions by hand. Mid-build, a
better path surfaced: ICJIA staff are **Strapi admin-panel users** (Super Admin /
Editor / Author), and Strapi **already enforces exactly the rule we want** at the
admin level — *authors draft; editors and super-admins publish* — with **zero
backend changes**. But that enforcement only works through Strapi's **admin
Content-Manager API**, which is a different "door" than the one the first login
used. The catch is that this isn't visible from outside the system; you can only
learn that the admin door enforces the rule, and the public door doesn't, by
building far enough to knock on both.

That discovery has now been acted on. The login and all content access have been
**retargeted to the admin Content-Manager API**, and that change is **built,
tested, and merged.** The payoff is exactly what was hoped for: "who can publish"
is now decided by each person's real Strapi role, natively, with no custom
permission code to build or maintain — and the change was small and surgical
rather than a redo, because the original code had been structured so that only the
"door" needed to move. This is the nature of a disciplined first iteration: *you
find the deep requirements by building toward them, then you adjust* — and here
the adjustment is already behind us. This single episode answers "what's the
issue?" on its own: a correct, role-enforced publishing tool has constraints you
cannot see from the outside, and finding them is part of the genuine work.

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
> revised mid-build from the public REST API to this contract; the auth retarget
> (Phase 1.5) has since moved login to match and is merged to `main`. This retired
> the spec's original "publish via Users & Permissions" open question entirely.

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
| **Auth / Content-Manager pivot** | Mid-build, we discovered — and have since shipped — a move of login and content access to Strapi's admin API, so your real roles now enforce who-can-publish, natively, with no backend changes. (The marquee "why not simple" example.) |
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
> - **Auth / Content-Manager:** see §2.9 and §4. The pivot is **built and merged**
>   (Phase 1.5) and retired the original spec §4.1 "publish via Users &
>   Permissions" open item; publish-gating is now native (`strapi-author`
>   create/update/delete but **publish ❌**; `strapi-editor` and
>   `strapi-super-admin` publish ✅).
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
| 1.5. Auth Retarget (Admin API) | Sign in with your real Strapi admin account; your real role decides who can publish | **Built** (merged to `main`) |
| 2. Content Engine / Data Layer | The app can read and save articles, apps, and datasets correctly and safely | **Built** (81 tests, merged) |
| 3. Media & Images | Add images properly: shared library, alt-text/captions, safe SVGs, valid formats | **Built** |
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
> Permissions API (`/api/auth/local`); Phase 1.5 has since retargeted it to the
> admin API (see below) and is also merged — so the login in `main` today is the
> admin-API version. Phase 1's structure (pure functions + thin wiring) carried
> through the retarget unchanged; only the endpoints and the role model moved.

### Phase 1.5 — Auth Retarget to the Admin API  ·  Status: **BUILT (merged to `main`)**

**Plain-English deliverable.** Staff sign in with their **real Strapi admin
accounts**, and **who can publish is decided by their real Strapi roles** — Super
Admin and Editor can publish; Author cannot. This was a small, surgical fix, not a
redo: nothing about the content, the zero-base64 rule, or the design changed.
**What it delivered:** the tool now authenticates against the real admin system
and reads each person's actual role from it, which is what unblocks live
Content-Manager reads and writes for every phase that follows.

**For developers — technical scope.** Retargeted Phase 1 auth from Users &
Permissions (`/api/auth/local`) to the **admin API** (`/admin/login` +
`/admin/users/me`). Phase 1's exact structure (pure functions + thin wiring) was
kept; only the endpoints, the user/role shape, and the capability getter changed.
Login stays a two-step flow (login → fetch-me) because `/admin/login` returns an
empty `roles` array. Added: `app/types/admin.ts` (`AdminRole`, `AdminUser`,
response types) and `app/lib/admin-roles.ts` (`PUBLISHER_ROLE_CODES`,
`roleCodesOf`, `canPublish`). Modified: `auth.ts`, the auth store (now exposes
`roleCodes`/`canPublish`/`displayName`), `useAuth`, the route guard, and the UI.
The `admin/admin` dev bypass is preserved (mints a synthetic super-admin session)
and remains flagged **REMOVE BEFORE DEPLOY**. Six TDD tasks plus one fix commit,
each with a commit; the Phase 1 security posture (Secure cookie, boot re-verify,
401 logout) carried over unchanged.

**Why this isn't trivial.** This phase is the concrete consequence of the
mid-build discovery in §2.9 — the realization that staff are admin-panel users and
that Strapi enforces the publish rule natively at the admin level. Two things make
it more than a find-and-replace of one URL for another. First, the two doors don't
just have different addresses; they hand back differently *shaped* answers — the
admin login returns no roles at all until you ask a second time, roles arrive as
machine codes rather than display names, and the whole notion of "what this person
may do" has to be recomputed from that new shape and kept consistent everywhere it
is consulted. Second, this is the load-bearing change for everything downstream:
nothing can safely read or write live content until the login hands back the right
kind of credential, so it had to be correct, not merely working. That it landed
small and surgical is the dividend of capturing the discovery cleanly and having
structured the original code so only the door needed to move.

> **Status note (developer):** Built, tested, and merged to `main` — six TDD tasks
> plus one fix commit; **84 automated tests passing, `nuxt typecheck` clean**.
> Plan: `docs/superpowers/plans/2026-06-20-auth-admin-retarget.md`. Role codes
> confirmed against the live instance: `strapi-super-admin`, `strapi-editor`
> (publishers), `strapi-author` (drafts only). The `admin/admin` dev bypass
> remains in `main`, flagged **REMOVE BEFORE DEPLOY**. This unblocks live
> Content-Manager reads and writes for the phases that follow.

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
> branch deleted. Of the two hand-offs this phase logged, one is now closed: the
> auth retarget (Phase 1.5) that Content-Manager writes depend on for the admin JWT
> has since landed and merged. The remaining hand-off — wiring the validators /
> `assertNoBase64` into the live submit path — is carried to Phase 5 when forms
> land. Relation-write and the publish action were intentionally deferred to later
> phases.

### Phase 3 — Media & Images  ·  Status: **BUILT**

**Plain-English deliverable.** Staff can add images the right way: upload to the
shared Media Library or pick an existing image, see a real preview (never a giant
embedded copy), provide alt-text and an optional caption, and upload only valid
image formats — with SVGs automatically cleaned of anything dangerous.

**What it delivered.** A Strapi Upload-API library (upload/list/delete via
`POST /upload` + `GET /upload/files`), a `useUpload` composable (extension gate →
SVG sanitize → eager upload), a **MediaPicker** (upload-new or pick-existing,
**alt-text required**, optional caption), and an **ImageDropzone** (drag-drop →
eager upload → thumbnails → click-to-insert `![alt](url "caption")`). An
image-format allowlist enforces `jpg/jpeg/png/svg`. A cross-cutting guard test
confirms the **zero-base64 invariant**: no `data:` URL ever enters state. All
shipped to `main` and pushed.

**For developers — technical scope.** An eager-upload composable (upload on
select/drop → store `{ id, url }` → preview from the returned URL, never a client
data URL) backs a reusable `MediaPicker` for every media field (upload-new and
pick-existing via Media Library browse). The DOMPurify SVG sanitization step
(SVG profile — strips `<script>`, `on*` handlers, and external `xlink:href`
across all quote styles) runs **before** upload, defusing hostile files at ingest.
The allowed-extension accept-filter (`jpg/jpeg/png/svg`, case-insensitive) lives in
`lib/image-types.ts`. Inline article figures insert as `![alt](url "caption")`
at the cursor and append `{ title, src, alt?, caption? }` to the `images` JSON
array (URLs only). A cross-cutting guard test asserts the zero-base64 invariant
end-to-end (no `data:` URI can reach a write payload) — the build fails if the
invariant is violated.

**Why this isn't trivial.** This is where the four hidden image requirements
from §2.3 (no base64, accessibility, SVG safety, valid formats) stopped being
principles and became concrete UI and upload behavior — and the four pull against
each other. The most natural way to show someone the image they just picked is to
display it straight from their own machine, which is precisely the embedded-image
habit the whole project bans; avoiding it means the file must travel to the shared
library *first* and the preview must come back from there, so the very first thing
that happens on "choose file" is a network round trip that has to succeed, fail,
or retry gracefully while the person waits. Layered on top is the content system's
own rule that a file can't be attached while a record is being created — it must be
uploaded on its own and then linked by reference — which inverts the order older
tools used and means the upload and the record-save are two separate moments that
have to be sequenced correctly. The SVG-cleaning step sits in the middle of all of
it, because a dangerous file has to be defused *before* it is stored, not after.
All four requirements are now satisfied, tested, and merged.

> **Status note (developer):** Built, reviewed, merged to `main`, and pushed.
> **108 automated tests passing, `nuxt typecheck` clean** across foundation + auth
> + data + media. The zero-base64 invariant is verified by a cross-cutting guard
> test; the build fails if a `data:` URI can reach a write payload.

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

**Why this isn't trivial.** Reusing an existing editor rather than rebuilding one
is the efficient choice and avoids the years-of-work trap described in §2.4, but
"reuse" is not the same as "free." The editor has to be lifted out of the project
it lives in today and made into a clean, shared building block that Studio can
pull in without dragging along the rest of that project — and then extended at a
seam it doesn't currently expose, so an author dropping a picture into the middle
of a paragraph triggers the §2.3 upload, gets the file back from the shared
library, and has the correct reference inserted at exactly the cursor position.
The subtler half is fidelity: the editor's own live preview and the public site
have to interpret the author's text by the identical rules — footnotes, math,
tables — or the comfortable in-editor preview quietly stops matching what
publishes. Borrowing the editor saves the cost of building one; it does not remove
the cost of making it Studio's.

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

**Why this isn't trivial.** This is the convergence point: the structured-content
(§2.2), exact-preview (§2.5), and onboarding (§2.8) requirements all turn into
real screens here, and the zero-base64 guarantee — proven by tests since Phase 2 —
finally stands between an author and a live save. The density is the difficulty.
Three content types, each with its own fields and several of them structured
rather than flat, become editing forms that have to read an existing record into
the right inputs, let a person change it, and write it back in exactly the shape
the content system expects — every type, every field, in both directions, with
mistakes caught before they reach the server rather than after. Folded into the
same phase are an exact-as-published preview that has to stay honest, and a
first-login gate that has to be genuinely closed on every route into the app.
Each of those is a feature on its own; this phase is where they all have to work
together and agree.

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
requirements both live here, and both force this otherwise browser-only tool to
grow a small piece of *server*. The reason is the same in both cases: each one
depends on a secret the browser cannot be allowed to hold — the key that sends
mail, the address that triggers a public rebuild — and anything the browser holds,
a user can read. So a sliver of code has to run somewhere private, take the
browser's request, confirm the person making it is actually allowed to publish,
and only then act. On top of that, publish is two steps in two systems (§2.7), so
this phase also has to handle the honest-but-awkward middle case where the content
goes live but the public site's rebuild doesn't fire — reporting it as its own
outcome instead of pretending the click either fully worked or fully failed.
Standing up even a minimal trustworthy back end inside a front-end project is a
real shift, not a footnote.

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
"last 20%" that separates a demo from a tool people can rely on. Accessibility is
not a coat of paint applied at the end: making the manager queue and the authoring
forms genuinely usable by keyboard alone and by a screen reader means the order
elements receive focus, the way controls announce themselves, and the handling of
every interactive piece all have to be right — work that is far cheaper when it is
designed in than when it is retrofitted, which is why it gets its own deliberate
pass rather than being assumed. Error handling is the same kind of unglamorous
substance: a tool people trust is one that fails *legibly* — every way a save, an
upload, or a publish can go wrong has to surface as a clear message a non-technical
author can act on, instead of a dead end. The sample-article demo, meanwhile, does
quiet double duty: it exercises the entire pipeline end to end with real
library images and every field populated, which is both a convincing thing to show
a stakeholder and a stringent test that the whole system actually holds together.

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
> and captured future work. Evidence of the rigor: the project now has 108 passing tests with a clean
> typecheck across foundation + auth + data + media, and a clean whole-branch
> review at every phase boundary.

---

## 8. Status dashboard (for managers)

A clean done-vs-planned view of the whole project.

| Area | Status | Notes |
|---|---|---|
| Foundation & secure login | **Done** | Built and merged; updated by the auth retarget |
| Auth retarget (real Strapi roles) | **Done** | Built, 84 tests passing, typecheck clean, merged to `main` |
| Content engine (read/save 3 types) | **Done** | 81 automated tests, typecheck clean, merged |
| Zero-base64 guarantee | **Done (enforced by tests)** | Wires into live forms in Phase 5 |
| Media & images (library, alt, SVG safety) | **Done** | 108 tests passing, typecheck clean, merged to `main` |
| Authoring editor (buttons + live preview) | **Planned** | Reuses ICJIA editor as a layer |
| Screens, exact preview & onboarding | **Planned** | — |
| Publish + rebuild + review email | **Planned** | Needs build-hook URL + Mailgun key |
| Polish, accessibility & launch | **Planned** | Includes sample-article demo |

**One-line summary for a manager:** the secure front door, the content engine, and
the full media-and-images layer are **built and tested** (108 passing tests, 4
phases merged to `main`); the authoring editor, screens, preview, publishing, and
onboarding are **designed and planned**, ready to build in sequence.

> **For developers:** "Done" items are merged to `main` **and pushed to `origin`**
> (the public GitHub repo) — the foundation, the admin-API auth retarget, the
> content engine, and the media layer are all live on GitHub. Note `main` includes
> the dev-only `admin/admin` bypass, flagged **REMOVE BEFORE DEPLOY**. With
> Phases 1–3 landed, **Phase 4 (Authoring Editor)** is the next recommended
> execution target.

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
