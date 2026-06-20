# ICJIA Research Hub Studio 2026

## Design & Implementation Specification

| | |
|---|---|
| **Document** | Design & Implementation Specification |
| **Status** | **Draft 1 — first iteration** (in active development, not yet live) |
| **Date** | 2026-06-20 |
| **Replaces** | ICJIA Research Hub Studio (built 2019) |
| **Audience** | Project managers, directors, and stakeholders (no technical background required) |

> **This is Draft 1: the first iteration.** The tool is being built right now, and
> some requirements are still being discovered as the work proceeds. That is by
> design — it is careful, test-checked iteration, not disorganization. Nothing
> here is live to the public yet. Where this document says a piece is **built**,
> it means the work exists, has been checked, and is part of the shared project.
> Where it says **planned**, the approach is decided but the work hasn't been
> done yet.

---

## How to read this document

This document is written for an intelligent reader who does not write software.
You should be able to read sections 1 through 5 from start to finish and come away
able to explain — to your own leadership — what this tool is, why it is real work,
what is finished, and why the work can be trusted. There is no jargon you are
expected to already know; where a technical word is genuinely necessary, it is
explained in one plain line right where it appears.

Section 6 is an optional appendix for the technically curious. You can skip it
entirely without missing anything you need.

A word on intent: this is not a sales pitch and it is not a complaint. It is an
honest accounting of what "let staff post articles to our website" actually
involves when it is built to be safe, accessible, and dependable for a public
government audience.

---

## 1. What the Studio is

The Studio is a private, staff-only website where ICJIA's researchers write and
edit content — articles, the interactive apps ICJIA publishes, and datasets — in
a safe, controlled place before any of it goes public. When a piece is approved,
it flows out to the public **Research Hub**, the website the public actually
visits. The public Research Hub is the storefront; the Studio is the back room
where the work is prepared, reviewed, and signed off before it reaches the shelf.

In one sentence a non-technical executive can repeat: *the Studio is the
secure, staff-only workspace where ICJIA researchers prepare and approve content,
and from which approved content is published to the public Research Hub.*

The tool replaces one ICJIA built in 2019. That older tool still runs, but it is
built on technology that is no longer supported, it stores images in a wasteful
way that bloats the system, and it carries a confusing multi-step approval
process. The new Studio is built on current, well-supported technology, handles
images properly, and deliberately simplifies the process down to two clear roles:
people who **write** and people who **approve and publish**.

---

## 2. "Is this a simple project?"

It is fair to look at this and ask: *we just need staff to post articles to a
website — isn't that simple?* It is a reasonable question and it deserves a
straight answer.

The honest answer is that "posting an article" is the small, visible part. Almost
everything that makes such a tool genuinely **safe, usable, accessible, and
trustworthy** lives in the requirements that "post an article" quietly assumes
but never states. None of what follows is padding. Each item is ordinary,
professional work — and each is real. The point of this section is to make the
part of the iceberg that sits below the waterline visible.

### Modeling the research content faithfully

"An article" is not one block of text. A Research Hub article carries a title, a
publication date, a type, a summary, the body itself, a list of authors,
categories and tags, a main image, a thumbnail, figures inside the text, an
attached report file, optional extra files, citation and funding information, and
links to related apps and datasets. That is *one* of the three kinds of content.
There are three — articles, apps, and datasets — each with its own fields, its own
rules, and its own connections to the others.

The difficulty is not the number of fields. It is that several of them are not
simple values but small structures: a list of authors, a list of figures each
with its own image and caption, a span of years with a start and end, links from
one article out to several related items. Every one of those has to survive a full
round trip — read out of the content system, shown in a form, edited by a person,
and saved back — landing in *exactly* the shape the system expects. Get a single
field's shape wrong and nothing fails loudly; instead you quietly produce a record
that looks fine in the Studio and is broken on the public site. And the only
trustworthy source for what each field's correct shape really is, is the live
content system itself — not a document, not an assumption. So the team confirmed
the real shapes by inspecting the live data directly rather than taking them on
faith.

### A real sign-in, tied to who is actually allowed to publish

A sign-in you can genuinely trust has to do several things at once that never show
up on screen. It has to keep you signed in across page reloads so you are not
nagged to log in every few minutes. It has to re-check with the server, every time
the tool starts, that your account is still valid and still has the access it had
yesterday — because that answer can change between visits, and the tool must honor
the change immediately rather than trust a stale local copy. It has to return you
to the login screen the moment your access expires, without corrupting work in
progress.

And — the part that carries the most weight — it has to know **what you are
allowed to do** once you are in. The whole tool hinges on one rule: people who
write may save drafts but may not publish; people who approve may make content
live. Hiding the "Publish" button from a writer is easy and, on its own,
worthless: the button is just a picture. A web browser is fundamentally an
untrusted place — a determined person can read the page, watch every request it
sends, and re-send those requests by hand with the button out of the picture
entirely. So the rule has to be enforced where the request actually lands: at the
server that owns the content. And the rule the server enforces and the rule the
screen implies have to agree *exactly*, in every situation, or you get either a
silent security hole or a confusing tool that offers an action and then refuses
it. Making those two layers agree, and being able to show they agree, is the
genuine work hiding behind "just let them log in."

### Handling images without bloating the site or opening a security hole

"Add a picture" carries several requirements at once that pull against each other.

The old tool stored each image by converting it into an enormous block of text and
writing that block directly into the content record. The cost compounds: the
system swells with image data it was never meant to hold, every read and every
backup drags those images along whether you need them or not, and the same picture
used in three places is stored three separate times. The new Studio refuses this
outright — each image is uploaded once to a shared library and the record keeps
only a lightweight link to it. Holding that line is not a one-time decision; a
bloated image can sneak back in through a pasted editor, a copied field, or an
import, so the rule has to be actively guarded, not merely intended.

Images are also an accessibility and a legal-grade obligation, not a polish item.
Every image needs **alt-text** — a short written description that a screen reader
speaks aloud to a person who cannot see the image — and may carry an optional
caption. For a public government website this is a compliance requirement. That
means the tool cannot simply *offer* a description box; it has to make supplying a
description the path of least resistance, so that accessible content is what
naturally gets produced.

And certain image files are an attack surface. One common image format is not a
flat picture at all but a small text document that can legally contain hidden,
runnable instructions — which is exactly what makes it dangerous to accept from a
signed-in user, because a booby-trapped file could carry something that runs in
the browser of the next person who views it. The Studio strips the dangerous parts
out of every such file *before* it is stored, defusing a hostile file at the door
rather than trusting it and serving it to the public. At the same time, the tool
has to accept all the genuinely valid image formats without turning away
legitimate files — the old tool erred the other way and frustrated people by
rejecting good images, so being precise about what counts as valid matters as much
as being cautious.

### Preventing bad or oversized data from ever being saved

Before anything is written, the Studio checks it. Required fields must be present,
formats must be correct, values must be from the allowed set, and — the rule the
project cares about most — no image may ever be smuggled in as one of those giant
embedded text blocks. This check stands between a person and a save: if something
is invalid, the save is blocked and the person is told what to fix, in plain
terms, *before* anything reaches the content system. The hard part is that this
guarantee has to hold for every content type and every field, in both directions,
every single time — a guarantee is only as good as the one case nobody remembered
to check, which is why the checks are written as automated tests that fail the
whole build if anyone ever weakens them.

### Showing an exact preview of what will publish

A preview that shows *roughly* what an article will look like is not good enough
for staff who are about to publish to a public government website. They need to see
it rendered exactly as it will appear on the live Research Hub — same formatting,
same layout — so there are no surprises after they approve it. The difficulty is
that the preview and the live site are produced by two *separate* programs.
"Exactly the same" is only true if both turn the author's text into a page using
the identical set of formatting rules — and ICJIA's content leans on the rules
that are easiest to get subtly wrong: footnotes, mathematical notation, and
complex tables. If the preview's rules and the public site's rules drift even
slightly apart, the preview becomes a confident lie, and the author discovers it
only after the content is already public. Keeping the two in genuine step is the
real task hiding inside the word "preview."

### And underneath all of it: a real content system with its own rules

Everything above runs against a professional content-management system with its
own firm rules — how records are identified, how a draft differs from a published
item, how images attach, how related items connect. Those rules have to be learned
and respected precisely, and the only authoritative source for what they actually
are is the running system itself. Learning them, and discovering that the best way
into the system was not the one the project first assumed, is itself part of the
genuine work — and it is the single clearest illustration of why this is not a
trivial project. (Section 5 tells that story in plain terms.)

### So — is it simple?

The *workflow* is simple, deliberately: writers draft, approvers publish. That
simplicity for the user is itself an achievement — it is the direct result of
removing the old tool's confusing multi-stage approval chain. But "simple to use"
sits on top of a real sign-in with real roles, three fully-modeled content types,
accessible and safe image handling, a guard that blocks bad data before it is
saved, an exact preview, and faithful integration with a professional content
system. None of those are optional if the result is going to be safe, accessible,
and trustworthy for a public government audience. That is the genuine scope —
real, credible, and entirely ordinary professional work.

---

## 3. What's working today

Everything in this section is **built** and part of the shared project today. It
has been checked by an automated test suite — currently **149 automated tests, all
passing, with a clean type-check** (a separate automatic check that catches whole
categories of mistakes before the tool is ever run). What is *not* yet built is
described in Section 4; the line between the two is drawn honestly.

A reminder of the stage: this is Draft 1, in active development. It is **not yet
deployed** to the public — none of this is live to the public audience. What
follows is the foundation, built to be trusted and built upon.

### (a) The foundation

The skeleton of the application is in place — the structure every later feature
plugs into. On its own it is not a feature a staff member would notice, but it is
the load-bearing groundwork: get it right and everything built on top is steadier;
get it wrong and every later piece inherits the problem. It is built and tested.

### (b) A real sign-in, with roles deciding who may publish

Staff sign in with their **real ICJIA accounts** — the same accounts that already
govern the content system — and the tool reads each person's actual role to decide
what they may do. The rule is enforced for real, not just shown on screen:

| Role | Can write & save drafts | Can publish (make content live) |
|---|---|---|
| Super Admin | Yes | Yes |
| Editor | Yes | Yes |
| Author | Yes | **No — drafts only** |

The value here is a genuine security boundary: who is allowed to publish is
decided by each person's real, existing role, not by anything a clever user could
work around in their browser. The session stays secure across page reloads, is
re-checked every time the tool starts, and expires safely. This is built and
merged.

### (c) The content engine — reads and saves all three content types, safely

Beneath the screens is an engine that reads articles, apps, and datasets out of
the content system and saves new drafts back into it — correctly, and safely. It
carries strict rules about the exact shape of every field for every content type,
and one rule the project treats as non-negotiable: **no image is ever stored as a
giant embedded block of text.** That promise is not a hope; it is enforced by
automated tests that fail the build if anyone ever breaks it. The safeguard this
provides is that content cannot quietly become corrupt or bloated — the engine
refuses it. This is built and tested.

### (d) Image handling done properly

The full image layer is built: a **shared media library** (upload a picture once,
reuse it anywhere by reference, never a bloated embedded copy), **required
alt-text plus optional captions** on every image so the content is accessible by
default, **safe handling of the riskier image format** (dangerous hidden content
is stripped out before the file is ever stored), and a sensible **allow-list of
valid image formats** so good files are accepted and bad ones are turned away with
a clear message. The safeguard: images can't bloat the site, can't carry an
attack, and can't ship without the description that accessibility requires. Built
and merged.

### (e) The first usable screens

The first real screens a staff member would actually touch are built:

- **Create and edit forms** for all three content types — articles, apps, and
  datasets — so a researcher can fill in a structured record and save it as a
  private draft.
- A built-in **safety gate** that runs on every save and **blocks saving anything
  invalid** — missing required information, a wrong value, or a forbidden embedded
  image — telling the person what to fix before anything is written. This is the
  guarantee from Section 2 made real, standing directly between a person and a
  save.
- A **shareable preview** that renders a draft using the same formatting rules the
  public site uses, so what a person sees is what will publish. (The body of an
  article is edited today in a straightforward writing area with a live preview
  beside it; the richer, button-driven editor described in Section 4 slots into
  this same place later without disturbing anything around it.)
- A **role-aware dashboard** that shows each person the tasks that match their
  role — writers see create-and-edit tasks; approvers additionally see the queue
  of drafts awaiting review.

The value: a researcher can already sign in, create a structured draft, be
protected from saving something broken, and see an accurate preview of it.

### Status at a glance

| Capability | What it gives us | Status |
|---|---|---|
| Foundation | The groundwork every feature builds on | **Built** |
| Real sign-in with roles | Who-can-publish enforced by real ICJIA roles | **Built** |
| Content engine (3 types) | Safe reading and saving; no bloated images, ever | **Built** |
| Image handling | Shared library, alt-text/captions, safe formats | **Built** |
| Create/edit forms | Structured drafts for all three content types | **Built** |
| Save-time safety gate | Bad or oversized data can't be saved | **Built** |
| Exact-as-published preview | No surprises after approval | **Built** |
| Role-aware dashboard | Each person sees the right tasks | **Built** |
| Rich button-driven editor | Friendly writing for non-technical staff | **Planned** |
| One-click Publish + site rebuild | Make content live in a single step | **Planned** |
| Review-by-email | Notify a reviewer with an exact preview link | **Planned** |
| First-time author onboarding | Capture who a new author's reviewer is | **Planned** |
| Final polish & accessibility pass | Launch-ready, fully accessible | **Planned** |

---

## 4. What's still ahead

These are the planned next steps, in sequence. They are designed but not yet
built, and the team is honest about that.

- **The full rich-text editing experience.** Today an author writes in a
  straightforward writing area with a live preview beside it. The planned step
  gives non-technical authors formatting *buttons*, a visual table builder, and
  drag-and-drop images — so no one ever has to learn any formatting syntax. Rather
  than build such an editor from scratch (a notoriously deep undertaking), the
  Studio will adapt a capable editor ICJIA already owns and teach it to handle
  images, which is the one capability it lacks.

- **One-click publishing, with the public site rebuilding automatically.** The
  planned "Publish" button will do two things in one click: mark the content live,
  and automatically tell the separate public Research Hub website to rebuild itself
  with the new content (with a short, normal delay of a minute or two before it
  appears publicly).

- **Review-by-email.** An author will be able to request review, which sends their
  reviewer an email containing a link to the exact preview of the draft. The
  reviewer opens the link, sees precisely what will publish, and proceeds.

- **First-time author onboarding.** The very first time a staff member signs in,
  the Studio will collect a short profile — chiefly who their reviewer is — so the
  review-by-email step knows whom to notify. This is the one natural moment to ask
  for that information without nagging anyone later.

- **Final polish, accessibility, and a demo article.** A dedicated pass to make
  the whole tool refined, fully usable by keyboard and screen reader, and clear in
  how it reports any error — plus a one-click "sample article" that instantly
  creates a complete, realistic demo draft so the tool can be shown on demand.

---

## 5. How we work — and why you can trust it

The way this tool is built is as important as what it builds, because *how* it is
built is what makes it dependable and maintainable for years. Three disciplines
define the approach, and together they are the reason a manager can have
confidence in work that is still in progress.

- **Every piece is built test-first.** For each small piece of work, the team
  first writes an automated check that defines what "correct" means, then writes
  the code to satisfy that check. This is a mainstream, decades-old engineering
  practice. Its practical payoff here is concrete: the project's headline promises
  — for example, "no image is ever stored as a bloated embedded block" — are
  guaranteed by automatic checks that fail the build the instant anyone breaks
  them, rather than relying on someone remembering to be careful.

- **Every step is independently reviewed and security-checked before it is
  accepted.** Each piece of work ends with a recorded save point (so nothing is
  lost and every change is traceable and reversible) and an independent review
  against the plan and the project's standards before the next step begins. A
  broader review happens before any body of work is accepted into the shared
  project. Nothing is hand-waved through.

- **We learn as we build, in writing.** This is Draft 1. Rather than pretend every
  requirement was known on day one, the team surfaces the deeper requirements by
  building toward them, then captures what was learned and adjusts — in writing, in
  a durable project record. The clearest example happened mid-build and is worth
  stating plainly, because it answers "what's the issue?" better than anything
  else could:

  > When the project began, the plan was for the Studio to reach the content
  > system through one "door," with the publish permissions to be configured by
  > hand. Partway through, a better path surfaced: ICJIA staff already have
  > accounts in the content system, and the system **already enforces the exact
  > rule the Studio wants** — authors draft, editors and super-admins publish —
  > with no changes to the content system at all. But that built-in enforcement
  > only works through a *different* door than the one first used. The catch is
  > that you cannot see this from the outside; you can only learn that one door
  > enforces the rule and the other does not by building far enough to knock on
  > both. The team did, switched to the better door, and that change is now built,
  > checked, and accepted. The payoff is exactly what was hoped for: who can
  > publish is now decided by each person's real role, with no custom permission
  > code to build or maintain — and because the original work had been structured
  > carefully, the switch was small and surgical rather than a do-over.

The evidence that this rigor is real, not aspirational: the project currently
stands at **149 automated tests, all passing, with a clean type-check**, across
the foundation, the sign-in, the content engine, and the image layer. The
no-bloated-images rule, the accessibility requirements, and the security handling
of risky files are each backed by their own automatic guards. The result the
process is aiming at is a tool that is correct, reviewable, safe to change, and
maintainable for years — which is the entire reason to rebuild on a modern
foundation in the first place.

A note in the interest of being straight with you: during development only, there
is a temporary local convenience login that lets a developer open the tool on
their own machine without a full account. It is disabled in any real build, it
grants no access to live data, and it will be removed before launch. It is
mentioned here only so the record is complete, not because it presents any risk to
live information.

---

## 6. Appendix — for the technically curious

*This appendix is optional. Everything a non-technical reader needs is in Sections
1–5. What follows condenses the architecture and the implementation plan for
readers who want the deeper detail, and is where the remaining technical terms
live.*

### 6.1 At a glance

The Studio is a single-page web application (it loads once and then responds
instantly, like Gmail) built with **Nuxt 4 / Vue 3** and **Nuxt UI 4**, written in
**TypeScript** throughout. It runs in the browser and talks to **Strapi 5** — the
content-management system where all articles, apps, and datasets live — over the
web. Application state, including the signed-in session, is held in **Pinia**, with
the session persisted to a secure browser cookie. The tool is intended for
deployment on **Netlify**.

A key early discovery shaped the whole data layer: Strapi exposes two different
programmatic "doors." Staff are administrative users of Strapi, and Strapi's
**admin Content-Manager interface** natively enforces the publish rule the project
wants (authors draft; editors and super-admins publish) with no backend changes —
whereas the public interface does not. Sign-in and all content access were
therefore targeted at the admin Content-Manager interface. The credential issued
at sign-in proves identity on every request; records are addressed by a stable
identifier; and the system's native draft/published distinction is the single
source of truth for what is live.

### 6.2 The end-to-end lifecycle

The intended flow, end to end (publishing and review email are planned; drafting,
the save-gate, and preview are built):

```text
  AUTHOR                         EDITOR / SUPER ADMIN            PUBLIC
  ------                         --------------------           ------
  sign in
    |
  write content  --- save ---->  [ DRAFT in the content system ]
  add images
  (from the shared library)           |
  request review (optional) -- email w/ preview link -->
                                      |
                                  review the draft
                                  (exact "preview as published")
                                      |
                                  click PUBLISH
                                      |
                          [ system marks it published ]
                                      |
                          [ a "doorbell" pings the public site ] ---> public site
                                                                      rebuilds &
                                                                      shows content
                                                                      (~1-2 min)
```

### 6.3 Why a rebuild (old tool → new Studio)

| Concern | Old tool (2019) | New Studio (2026) |
|---|---|---|
| Technology | End-of-life stack | Current, supported stack |
| Images | Stored as bloated embedded text | Shared library, referenced by link |
| Workflow | Multi-stage approval, three roles | Two roles: draft vs. publish |
| Editor | Plain text box | Friendly editor (buttons, live preview, image insert) — planned |
| Publishing | Manual steps | One button that also rebuilds the public site — planned |
| Accessibility | Inconsistent | Required alt-text, optional captions, safe image handling |

The content system itself was modernized ahead of this project to content parity
with the old data, with proper media handling and native draft/publish. The
Studio's job is to do its part correctly against that modern foundation. The old
codebase is retained only as a reference for what each field means.

### 6.4 What is built, in technical terms

- **Sign-in & roles.** Authentication targets Strapi 5's admin interface; the
  signed-in credential authorizes every request. Capability is decided by **role
  codes**, not display names: `strapi-super-admin` and `strapi-editor` may publish,
  `strapi-author` is drafts-only. The session is persisted to a Secure,
  `SameSite=Strict` cookie (not browser local storage) and re-verified on every
  application start; an expired or invalid session clears and redirects to login.
  A global route guard makes every screen private except the login screen.
  Publish-gating is enforced **natively by the content system** at the admin level
  — the client only decides which controls render; the server is the real
  authorization boundary.

- **Content engine.** A typed, tested data-access layer reads and writes Articles,
  Apps, and Datasets, addressing records by their stable identifier, with
  translators between the system's shape and the application's shape, and
  validators for every type. A hard zero-base64 rule is enforced by an automated
  guard asserted across all three content types. The field shapes were confirmed
  by read-only inspection of the live system (for example, the article `type` has
  a fixed set of allowed values; a dataset's time period is a start/end year
  structure).

- **Image layer.** Images are uploaded once to the shared media library and
  referenced thereafter; the preview always renders from the returned library URL,
  never from a local copy. Alt-text is required and caption optional on every
  image. The riskier vector-image format is sanitized (scripts and event handlers
  stripped) *before* upload. A case-insensitive allow-list governs accepted
  formats. A cross-cutting guard test asserts the zero-base64 rule end to end — no
  embedded-image data can reach a write.

- **First screens & the save-gate.** Create and edit pages exist for all three
  content types, built from shared field components. A single save-gate runs the
  matching validator *before* any write and only persists when validation passes —
  this is where the zero-base64 guarantee meets the live save path. A shareable
  preview route renders a draft's body through the same formatting-rule set
  intended for the public renderer, behind a single swappable stylesheet so the
  official public-site styling can be dropped in later for pixel-exact fidelity. A
  role-aware dashboard and a publisher-only draft queue are in place (the queue
  lists drafts; the publish action itself is planned).

### 6.5 What is planned, in technical terms

- **Authoring editor.** Adapt the existing ICJIA Markdown Editor as a shared,
  reusable building block, and add the one capability it lacks: an image-upload
  hook wired to the built image layer. Markdown-source editing with live preview is
  retained (rather than a lossy rich-text conversion) so footnotes, mathematical
  notation, and complex tables round-trip faithfully. The editor slots into the
  existing body-editing seam without disturbing the surrounding forms.

- **Publish, rebuild & review email.** A publisher-only publish action; a
  **server-side** proxy that holds the public-site rebuild trigger secret, verifies
  the caller is actually a publisher, then fires the rebuild; and a server-side
  email step that holds the email-service credential and sends the reviewer a
  preview link. Because publishing is two steps in two systems, the awkward middle
  case — content live but rebuild not triggered — is reported as its own distinct
  outcome rather than a flat success or failure. The reason these need a sliver of
  server-side code is that each depends on a secret the browser cannot be trusted
  to hold.

- **Onboarding.** A first-login profile (reviewer email(s), the staff member's
  center, and a prefilled author email) stored in a small, approved addition to the
  content system, with the rest of the tool gated closed until the profile exists.

- **Polish, accessibility & launch.** An accessibility hardening pass focused on
  the approver queue and the authoring forms, central error normalization, an
  end-to-end happy-path test, deployment configuration, removal of the temporary
  development-only login, and a one-click "sample article" demo.

### 6.6 Open items being tracked

These are normal project hygiene — each is known, tracked, and has a sensible
default or a clear owner.

| Open item | Plain meaning | Handling |
|---|---|---|
| Stronger session hardening | Make the login token invisible even to the page's own scripts | A separate, approval-gated backend task; meanwhile the server enforces all permissions, so this is a hardening step, not a hole |
| Author test account | A real author login is needed to confirm authors truly cannot publish | Requested from the backend owner; the team does not create accounts itself |
| Pixel-exact preview styling | The preview already matches published formatting; making it pixel-identical needs the official public-site stylesheet | Built behind one swappable stylesheet; drop in the official styling when provided |
| The real "centers" list | Onboarding asks which center a staff member belongs to; a placeholder list is used for now | Swap in the real list when supplied |
| Onboarding profile storage | Storing the profile needs a small, approved addition to the content system | Approved; may need the system's development environment to create it |
| Rebuild trigger & email credential | Publishing-with-rebuild and review-email need two secret values | Supplied at build time; both held server-side, never in the browser |

Resolved during this iteration and no longer open: publish permissions (now native
via real roles) and keeping the public-site rebuild trigger secret (a server-side
proxy that verifies the caller before firing).

### 6.7 Glossary

| Term | What it means here |
|---|---|
| **Studio** | The internal, staff-only tool this document describes (the "back room"). |
| **Research Hub** | The public ICJIA website where published content appears (the "storefront"). |
| **Content-management system (Strapi 5)** | The professional system where all articles, apps, and datasets are stored and served. |
| **Admin (Content-Manager) interface** | The content system's administrative "door," which natively enforces who-can-publish by each staff member's real role. |
| **Single-page app** | A web app that runs in the browser like Gmail — no full page reloads. |
| **Nuxt 4 / Vue 3** | The technology the Studio is built with. |
| **Nuxt UI 4** | Ready-made, accessible building blocks for the Studio's buttons, forms, and tables. |
| **TypeScript** | A safer dialect of the web's programming language that catches many mistakes before the tool is ever run. |
| **Pinia** | The small library that holds the Studio's in-app state, including the signed-in session. |
| **Sign-in token** | The secure "pass" issued at login that proves who you are on each request. |
| **base64 / embedded image** | The old, wasteful way of storing an image as a giant block of text inside a record. Banned here. |
| **Media library** | A shared store of uploaded images and files, reused by reference (like a shared drive). |
| **Draft vs. publish** | The content system's built-in switch: drafts are private; publishing makes content public. |
| **alt-text** | A short written description of an image, so screen-reader users and search engines understand it. |
| **Sanitizing an image** | Cleaning a vector-image file of any hidden runnable content before it is stored, so it cannot carry an attack. |
| **Build hook / "doorbell"** | A private trigger that tells the public website to rebuild itself with new content. |
| **Author / Editor / Super Admin** | The roles in the content system. Authors draft; Editors and Super Admins publish. |
| **Draft 1 / first iteration** | This stage: an exploratory first pass where requirements are discovered while building, and captured in writing. |

---

*End of specification. This is a living first-draft document; as a first iteration
it will evolve as the build surfaces new requirements. Nothing described here is
live to the public yet.*
