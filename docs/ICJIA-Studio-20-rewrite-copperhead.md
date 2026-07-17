# Hub Studio 2.0

## ICJIA Research Hub Studio — Design & Implementation Specification

### A component of the Hub 2.0 publishing project (the modernization of the ICJIA Research Hub)

| | |
|---|---|
| **Document** | Design & Implementation Specification |
| **Part of** | The **Hub 2.0 publishing project** — the modernization of the ICJIA Research Hub (internal program codename: **Copperhead**; this repository: `copperhead-studio-20`, alongside `copperhead-hub-20` for the public site). The codename is internal only — the public never sees it |
| **This component** | **Hub Studio 2.0** — the internal authoring-and-publishing tool within Hub 2.0 |
| **Status** | **Feature-complete in the workshop** — the full tool is built and a public demo is clickable at <https://studio-2026.netlify.app>; not yet switched on for real publishing |
| **Date** | 2026-06-21 · **revised 2026-07-11** (test counts, four audits, features shipped since — annotations, tab-only preview, card view, guided tour, public demo roles, CI) |
| **Replaces** | ICJIA Research Hub Studio (built 2019) |
| **Audience** | Two readers, addressed separately: a **manager** (Sections 1–6) and a **developer** (Section 7) |

> **Where the project stands, in one breath.** Hub Studio 2.0 is built. Every feature
> a researcher will touch — signing in, writing, previewing exactly what will
> publish, Word-style reviewer comments on drafts, and publishing — exists today,
> runs on the team's shared, official copy of the project, and is checked by
> **677 automated tests, all passing**, re-run automatically on every change (CI).
> Anyone can click through the real tool in the **public demo**
> (<https://studio-2026.netlify.app>) as an Author or an Editor. What is *not* done
> is the set of setup steps that only ICJIA's own Research & Analysis staff can do
> (creating two storage types, supplying the email keys and the "rebuild the public
> site" trigger) and a final dress rehearsal with real staff accounts before it goes
> live — all captured step-by-step in the cutover runbook
> (`docs/demo-to-production.md`). This document marks each claim as **built**
> (it exists, it's been checked, you can see it) or **still ahead** (a named,
> owned next step). Nothing here is live to the public yet — and where it isn't, it
> says so.

---

## TL;DR — the 30-second version

- **What it is:** Hub Studio 2.0 — the internal tool ICJIA staff use to write, preview, and publish Research Hub content (articles, apps, datasets). It is the authoring-and-publishing component of the wider **Hub 2.0 publishing project**, the modernization of the ICJIA Research Hub.
- **A proven platform, now modernized:** this is not a new bet. Under **Hub 1.0** (in production since 2019), the Research Hub became the most-read content on ICJIA's public site — about **45–50% of all pageviews** (and up to ~66% of visitors) on icjia.illinois.gov. **Hub 2.0** carries that track record forward: the same publishing mission for Research & Analysis (R&A) authors, rebuilt on a modern web stack and content management system, with a faster, friendlier authoring experience.
- **Status:** built and working — the **public demo is clickable today at <https://studio-2026.netlify.app>**, as an Author or an Editor, with a first-run guided tour.
- **How it works:** authors draft in a formatting editor (no formatting codes to learn) with a live "exactly-as-published" preview; reviewers highlight passages and leave Word-style margin comments on the draft; an editor clicks **Publish**.
- **Security:** independently red/blue-team audited **four times** (production; the public demo; the demo-roles/files/tour surface; the annotations/preview/card-view surface) — **0 critical issues, 0 open high or medium**; the in-repo fixes are done and covered by 677 automated tests, re-run in CI on every change (`docs/security-audit.md`).
- **What's left:** setup on the Strapi / email side (Research & Analysis) and a short launch checklist — not new building. The exact path is a written runbook (`docs/demo-to-production.md`); the cutover itself is about 30 minutes once the setup is done.

*That is the whole project in six lines. Everything below is the supporting evidence, organized by section — read what you need.*

---

## Why this matters — the audience the Studio serves

This is scope-setting, not a victory lap: it explains why the investment in Hub
Studio 2.0 is in proportion to the audience the Research Hub already reaches. The
figures below come from two live sources — Plausible analytics for
icjia.illinois.gov and the live Research Hub content API (Strapi). Every figure
is labeled with its timeframe.

### Most-visited pages — trailing 12 months

Total site over the trailing 12 months: **56.3K visitors / 452.4K pageviews**.
Percentages reflect each page's share of total site visitors; they do not sum to
100% because one visitor can view several pages.

| Rank | Page | Visitors (12 mo) | % of site visitors |
|:----:|------|----------------:|------------------:|
| 1 | Homepage (`/`) | ~19.6K | ~35% |
| 2 | **[RH]** "The Effectiveness and Implications of Police Reform" | ~6.0K | ~11% |
| 3 | **[RH]** "Understanding Police Officer Stress: A Review of the Literature" | ~6.0K | ~11% |
| 4 | **[RH]** "The Victim–Offender Overlap" | ~6.0K | ~11% |
| 5 | **[RH]** "The 2021 SAFE-T Act: ICJIA Roles and Responsibilities" | ~5.7K | ~10% |
| 6 | Grants — Funding (`/grants/funding`) | ~4.5K | ~8% |
| 7 | **[RH]** "Mental Illness and Violence: Is There a Link?" | ~4.5K | ~8% |
| 8 | **[RH]** "An Overview of Police Use-of-Force Policies and Research" | ~3.5K | ~6% |
| 9 | **[RH]** "Trauma-Informed and Evidence-Based Practices and Programs" | ~3.3K | ~6% |
| 10 | Grants — Programs (`/grants/programs`) | ~3.1K | ~6% |
| 11 | **[RH]** "Addressing Police Officer Stress: Programs and Practices" | ~3.0K | ~5% |
| 12 | **[RH]** "Gender Differences in Intimate Partner Violence Service Use" | ~3.0K | ~5% |

**[RH]** = Research Hub article. **9 of the top 12 most-visited pages are Research
Hub articles. The four most-visited pages after the homepage are all articles.**

### Section share of traffic — trailing 6 months

Total site over the trailing 6 months: **31.5K visitors / 240.4K pageviews**.

| Section | Visitors (6 mo) | Pageviews (6 mo) | Visitor share | Pageview share |
|---------|----------------:|-----------------:|-------------:|---------------:|
| **Research Hub** (`/researchhub`) | ~18.0K | ~107.9K | **~57%** | **~45%** |
| Grants (`/grants`) | — | ~53.1K | — | ~22% |
| Homepage (`/`) | — | ~35.0K | — | ~15% |
| About (`/about`) | — | ~21.9K | — | ~9% |
| News (`/news`) | — | ~11.7K | — | ~5% |
| **Whole site** | **~31.5K** | **~240.4K** | 100% | 100% |

**12-month cross-check:** over the trailing 12 months the Research Hub accounts
for about **50% of pageviews (~228.1K) and 66% of visitors (~37K)** — so the
6-month figures above are, if anything, conservative.

### What these figures mean for this project

Two kinds of traffic share this site, and separating them sharpens the picture.
Some pages are **task traffic** — people who arrive to *do* something, most
visibly to find grant funding, in visits that spike around application deadlines.
The Research Hub is the other kind: **editorial content** — the research the
agency publishes for the public to *read*. Among everything on the site meant to
be read, the Research Hub is not merely ahead; it is effectively the site's
content.

And it is read consistently, not occasionally. Across every sustained window —
the last month, the last six months, the last twelve — Research Hub articles are
the most-read pages on the site: the **four most-visited pages after the homepage
are all articles, and nine of the top twelve overall**. A **majority of everyone
who visits the site reaches the Research Hub** — about **57% over six months and
66% over twelve**. (The homepage is the single most-visited page, as on any site;
it is the front door everyone enters through, not a destination.) Grants is the
next-largest section by volume, but that is task-driven, deadline-bound traffic —
people transacting, not readers — so it rises and falls with funding cycles while
Research Hub readership holds steady.

The difference compounds over time. A Research Hub article is **permanent**:
published once, it keeps drawing readers for years — the same articles top the
6-month and 12-month rankings, so this is durable readership, not a passing
spike — and the library grows with every new article. A grant funding page is
**temporary by design**: it exists only between its open and close dates, then
expires. So the Research Hub is a durable, compounding asset the agency keeps for
good, while grants traffic is necessary churn that resets with each cycle. That is
the strongest case of all for investing well in the tool that produces the
durable side of the site.

For calibration, all meeting-agenda pages combined — agendas, minutes, the
meetings listing — drew on the order of **800 visitors and 1,800 pageviews** over
six months (the meetings listing itself: 514 visitors; a typical individual
agenda: 15–30). The Research Hub out-draws meeting content by about **20× in
visitors and 60× in views**; a single popular article out-draws the entire
meetings section several times over.

The pattern is stable: the 6-month and 12-month figures are in close agreement,
and the 12-month window shows, if anything, a slightly higher Research Hub share.

The Studio manages this content base. Live in the Research Hub today: **236
articles, 13 apps, and 5 datasets** (counted directly from the live Strapi
content API, 2026-06-21).

The takeaway: the public comes to icjia.illinois.gov primarily for the Research
Hub. Its articles are the most-read content on the entire site. Hub Studio 2.0 is
the production line for that flagship content, and the level of care in the build
is matched to the size of the audience it serves.

*Sources: Plausible analytics for icjia.illinois.gov (page-prefix filters;
6-month and 12-month windows ending 2026-06-21); live Research Hub Strapi content
API.*

---

## How to read this document

This document is written for **two readers**, and you can go straight to the part
that fits your role:

- **If you are a manager, director, or stakeholder** — you want the *what*, the
  *why*, the *status*, and the evidence behind it, not the engineering internals.
  **Sections 1 through 6 are written for you.** They assume a sharp reader in a
  different profession, not a software developer: where a technical term is
  genuinely necessary, it is defined in a clause the first time it appears, the way
  one professional would brief another. Read 1–6 start to finish and you can explain
  to your own leadership what Hub Studio 2.0 is, why it is substantial work, what is
  finished, and what the evidence shows.
- **If you are a developer** — you want the full technical detail: the architecture,
  the data layer, the security model, and the implementation plan. **Section 7 — the
  developer reference — is written for you**, and the code-level specifics live
  there.

**This document shows its work.** Throughout Sections 1–6, claims of "built" come
with something you can examine for yourself — offered in the spirit of one
colleague handing another the evidence, not as an argument to win. Three kinds of
evidence recur:

- **A running demonstration you can use.** The public demo at
  <https://studio-2026.netlify.app> is the real tool with a safety switch on: click
  **Enter as Author** or **Enter as Editor** (no account needed), take the built-in
  guided tour, and open, edit, and preview hundreds of sample articles directly —
  without changing or saving anything to any real system. Wherever a feature says
  "you can see this," this demonstration is where you see it. (Developers running
  the code locally can also use the temporary `admin` / `admin` shortcut.)
- **An automated test suite.** The project carries **677 automated tests** — small
  programs that re-check the tool's promises every time the code changes and stop
  the work if a promise breaks; a continuous-integration pipeline re-runs all of
  them automatically on every change. When this document says a promise is
  "guaranteed," a test enforces it.
- **The shared project record.** Every piece of work is a dated, reversible entry in
  the project's shared history, independently reviewed before it was accepted.
  "Built" here means *accepted into the shared project*, not sitting on one person's
  laptop.

Section 7 is the developer reference. A manager can skip it; Sections 1–6 stand on
their own.

A word on intent: this is neither a sales pitch nor a complaint. It is a candid
accounting of what "let staff post articles to our website" actually involves when
it is built to be safe, accessible, and dependable for a public government
audience — and of how much of that is now finished and how much remains.

---

## 1. What the Studio is

**Hub Studio 2.0** is one component of the **Hub 2.0 publishing project** — the
agency-wide modernization of the ICJIA Research Hub. Within that project, the Studio
is the internal, staff-only tool: a private workspace where ICJIA's researchers
write and edit content — articles, the interactive apps ICJIA publishes, and
datasets — in a controlled place before any of it goes public. When a piece is
approved, it flows out to the public **Research Hub**, the website the public
visits. The public Research Hub is the storefront; the Studio is the back room where
the work is prepared, reviewed, and signed off before it reaches the shelf.

Stated once, plainly: *the Studio is the secure, staff-only workspace where ICJIA
researchers prepare and approve content, and from which approved content is
published to the public Research Hub — the authoring half of Hub 2.0.*

The tool replaces one ICJIA built in 2019. That older tool still runs, but it is
built on technology that is no longer supported, it stores images in a wasteful way
that bloats the system, and it carries a confusing multi-step approval process. Hub
Studio 2.0 is built on current, well-supported technology, handles images properly,
and deliberately reduces the process to two clear roles: people who **write** and
people who **approve and publish**.

One boundary shapes everything else, so it is stated up front: **staff do not sign
themselves up.** ICJIA's Research & Analysis unit creates each person's account; the
sign-in screen says so and points anyone without an account to Research & Analysis.
This is deliberate. A controlled, staff-only workspace works only if entry is
granted by ICJIA, not by a self-service form.

---

## 2. The real scope behind "post an article"

A fair question to put to this project is: *we need staff to post articles to a
website — isn't that straightforward?* It deserves a direct answer, because the
honest scope is larger than the visible task suggests.

"Posting an article" is the small, visible part. Almost everything that makes such a
tool **safe, usable, accessible, and trustworthy** lives in the requirements that
"post an article" assumes but never states. None of what follows is padding — each
item is ordinary, professional work, and each one is real. This section makes the
part below the waterline visible, so the scope is on the table rather than implied.

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
worthless: the button is only a picture. A web browser is fundamentally an
untrusted place — a determined person can read the page, watch every request it
sends, and re-send those requests by hand with the button out of the picture
entirely. So the rule has to be enforced where the request actually lands: at the
server that owns the content. And the rule the server enforces and the rule the
screen implies have to agree *exactly*, in every situation, or you get either a
silent security hole or a confusing tool that offers an action and then refuses
it. Making those two layers agree, and being able to show they agree, is the
genuine work behind "let them log in."

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
means it is not enough for the tool to *offer* a description box; it has to make
supplying a description the path of least resistance, so that accessible content is
what naturally gets produced.

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
trivial project. (Section 5 tells that story.)

### So — is it straightforward?

The *workflow* is, deliberately: writers draft, approvers publish. That simplicity
for the user is itself an achievement — it is the direct result of removing the old
tool's confusing multi-stage approval chain. But "simple to use" sits on top of a
real sign-in with real roles, three fully-modeled content types, accessible and safe
image handling, a guard that blocks bad data before it is saved, an exact preview,
and faithful integration with a professional content system. None of those are
optional if the result is going to be safe, accessible, and trustworthy for a public
government audience. That is the genuine scope — real, credible, and entirely
ordinary professional work.

Every one of those pieces is now built. The next section walks through them one at a
time, and points to where each can be seen directly.

---

## 3. What's working today

Everything in this section is **built**, lives on the team's official, shared copy
of the project (what developers call "main"), and is checked by an automated test
suite — currently **677 automated tests, all passing**, re-run automatically on
every change. What is *not* yet done is described in Section 4, and it is mostly
setup that only ICJIA's Research & Analysis unit can perform. The line between the
two is drawn honestly.

A reminder of the stage: the tool is **not yet switched on for real publishing** —
nothing here writes to the live system. It is a finished workshop build with a
public demonstration, waiting on its final setup and a dress rehearsal.

**How to verify this whole section yourself.** Open the public demo at
<https://studio-2026.netlify.app> and click **Enter as Author** (to see a writer's
view) or **Enter as Editor** (to also see publishing) — no account needed, and a
first-run guided tour walks you through the screens. You are now inside the real
tool, looking at 210 realistic sample articles (plus 40 sample apps and 40
datasets, spread across all fourteen article types), and you can click into any of
them to edit, preview, comment on, and — as Editor — publish, all of it held in
memory and never touching any live system. Everything described below is something
you can do, see, or click in that demonstration.

### (a) Signing in — and who is allowed to do what

Staff sign in with their **real ICJIA accounts** — the same accounts that already
govern the content system — and the tool reads each person's actual role to decide
what they may do. There is **no self-signup**: Research & Analysis creates accounts,
and the login screen tells anyone without one to contact Research & Analysis.

The rule that matters most is enforced for real, not merely shown on screen:

| Role | Can write & save drafts | Can publish (make content live) |
|---|---|---|
| Super Admin | Yes | Yes |
| Editor | Yes | Yes |
| Author | Yes | **No — drafts only** |

The value here is a genuine security boundary: who is allowed to publish is decided
by each person's real, existing role, recorded in the content system — not by
anything a clever user could rearrange in their own browser. The session stays
signed in across page reloads (no nagging), is re-checked with the server every
time the tool starts (so a revoked account is locked out immediately, not a day
later), and expires safely back to the login screen.

*See it:* the login screen, the "contact Research & Analysis" message, and the
official ICJIA logo are the first thing you see in the demonstration. The role rule
is backed by its own automated tests.

### (b) Writing content — three kinds, saved as private drafts

A researcher can create and edit all three kinds of content — **Articles, Apps, and
Datasets** — as private drafts. Each is a proper structured record (title,
date, authors, summary, body, images, files, citation and funding details, links to
related items), not a single box of text.

The centerpiece for writing the main body is a **friendly formatting editor with a
full toolbar**. The buttons are styled as clear, raised buttons so they read as
buttons, and they cover everything a writer needs: **bold, italic, a Headings menu,
bullet and numbered lists, quote, code, a link button, an image button, and
undo/redo**. Beside it is a one-click **live Preview** so the writer sees their
formatting render as they type. No one has to learn any formatting codes.

Two deliberate, smaller choices round this out:

- The **Abstract** (the short summary) uses a *compact* version of the same editor —
  bold, italic, and links only. References and footnotes are intentionally **not**
  allowed in the abstract, because a summary is not the place for them. Links in the
  abstract open in a new window.
- The **App description** uses the full editor, the same as an article body.

*See it:* open any sample article in the demonstration and you will see the toolbar,
the Headings menu, and the live Preview, and you can type into them yourself.

### (c) Images and files — accessible and safe by construction

Adding an image requires **alt-text** (a short written description a screen reader
speaks aloud to a person who cannot see the image — a legal accessibility
requirement for a public government site) and allows an optional **caption**. The
alt-text and caption boxes are right there in the picker, so supplying a description
is the natural path, not an afterthought.

Authors also have a **body-image gallery**: upload several images at once, see them
as thumbnails in a small panel beside the editor, and click any thumbnail to insert
that image at the current cursor position in the article body. This means an author
can stage all the images for an article first, then drop them in where they want
them — without leaving the editing screen.

The main report file or data file is a simpler **document-or-PDF upload** with no
alt-text or caption (it's a file to download, not a picture to describe).

Under the hood, the project holds one line without exception: **an image is never
stored as a giant block of embedded text.** Every image and every file is uploaded
once to a shared store and referenced by a lightweight link — which is exactly what
the old 2019 tool got wrong, bloating itself with image data. This is the single
rule the team treats as non-negotiable, and it is guaranteed by automated tests that
stop the build the instant anyone weakens it.

*See it:* the picker shows the alt-text and caption fields and the name of the
file you selected; the body-image gallery thumbnails are visible in the editing
panel when images have been uploaded to an article; the no-bloated-images rule is
enforced by a dedicated guard test that runs across all three content types.

### (d) The save gate — bad or unsafe content can't be saved

Before anything is written, the Studio checks it. Required fields must be present,
values must come from the allowed set, and no forbidden embedded image may sneak in.
If something is wrong, the **save is blocked** and the person is told, in plain
terms, what to fix — *before* anything reaches the content system. This is the
guarantee from Section 2 made real, standing directly between a person and a save.

*See it:* try to save an incomplete draft in the demonstration and the gate stops
you with a plain-language message; the gate's rules are covered by automated tests
for every content type.

### (e) "Preview as published" — exactly what the public will see

A "Preview as published" view shows an article **exactly as it will appear on the
public Research Hub** — not roughly, exactly. It uses the same fonts (condensed
headings, serif body), shows the bordered abstract, lists all authors, includes a
sticky **Table of Contents** that follows you as you scroll, the end matter
(About-the-Authors, Funding Acknowledgment, Suggested Citation), and a **Print**
button. This is what staff approve against, so there are no surprises after they
sign off.

Each saved draft also gets a **shareable preview link** that opens for any signed-in
staff member — exactly how a reviewer or a manager opens a specific draft and sees
what will publish.

Two capabilities have joined the preview since this document was first issued:

- **The preview is now its own browser tab.** Every preview button opens the draft
  in one dedicated, reusable tab per document — so the editor and the preview can
  sit side by side, repeated clicks refresh the same tab instead of piling up
  copies, and closing the preview returns you to the editor you came from. The
  preview page doubles as the **shareable review link**.
- **Word-style reviewer comments on drafts.** On the preview, any signed-in
  reviewer can switch on a highlighter, select a passage (four colors), and attach
  a threaded comment — reply, resolve, reopen — with the comment cards sitting in
  the margin level with the highlighted text, exactly like margin comments in
  Microsoft Word. Highlights are anchored to the quoted text (they survive edits
  elsewhere in the article; if the quoted passage itself changes, the thread is
  kept and labeled "text changed" rather than lost). A **Clean view** toggle shows
  the plain article. The article text itself is never modified — comments are a
  pure overlay, and they never affect what publishes.

*See it:* open the "Preview as published" view on a sample article in the
demonstration — the sticky Table of Contents, the all-authors byline, the end
matter, and the Print button are all there; turn on **Highlight**, select a
sentence, and leave a comment to see the review workflow.

### (f) Finding and managing content

- Content lists open as **visual cards** (the default): each item's artwork with a
  green **Published** / red **Draft** badge riding the image corner, the title,
  date, type, authors, and a clean text excerpt — plus the same Edit / Preview /
  Publish tools as before. A **Cards / List** toggle switches to the original
  columnar table (Date · Title · Author(s) · Status), and the choice is remembered
  per browser. Articles also get a **Type filter** that sweeps the whole library,
  not just the visible page.
- **One-click "Add sample article / app / dataset"** buttons (local development
  only) instantly fill in a complete, realistic draft, so the tool can be
  demonstrated on demand without typing one out by hand.
- **Light and dark mode** (it defaults to light; dark is opt-in) with the official
  ICJIA logo in the header — measured **WCAG 2.1 AA accessible in both** (zero
  automated-checker violations). The theme toggle is the last button in the
  navigation.
- A first-run, skippable **guided tour** spotlights the main controls
  (role-aware: editors also get the Publish-queue step) and can be replayed
  anytime from **Tour** in the top navigation.

*See it:* all three are visible the moment you sign in to the demonstration — the
sortable list, the sample buttons, and the theme toggle.

### (g) A self-contained public demo for safe demonstrations

The **public demo** (<https://studio-2026.netlify.app>) is a fully self-contained
build of the real tool: **210 full-length sample articles** — each with complete
sections, figures, and working footnote references — plus 40 apps and 40 datasets,
held in memory, fully clickable for editing, previewing, commenting, and (as
Editor) publishing, that **never save anything to any live system**. A visitor
enters as an **Author** or an **Editor** to compare both views — the Author never
even sees a Publish control. Every word in the demo is fake: lorem ipsum body text
and made-up names. No real ICJIA person, topic, grant, or finding is ever shown on
a demo screen.

The isolation has been independently audited (twice) and holds **three layers
deep**: the demo build serves only in-memory content, every write is hard-blocked
in code before any network call, and the demo's browser security policy makes the
real backend **unreachable even if every in-page guard were bypassed**. It ships
no secrets and no real server address. That is why it can sit on a public URL.
(The separate `admin` / `admin` shortcut remains a local developer convenience;
in a real production build neither path can activate — see Sections 4–6.)

*See it:* this is the demonstration you have been using to check every other item.
Open any sample article and you will see full multi-section body text, figures, and
footnotes — all entirely fabricated.

### (h) Built but waiting to be switched on

Three capabilities are **fully built and documented** but depend on a setup step
that only Research & Analysis can perform, so they are described here as built and
listed again in Section 4 with the owner of the remaining step:

- **First-login onboarding.** The first time an author signs in, the Studio asks for
  a short profile — chiefly who their reviewer is, and their ICJIA center. The code
  is built and, importantly, **safe in the meantime**: until Research & Analysis
  creates the matching storage type in the content system, onboarding stays
  *dormant* and the rest of the Studio works normally; the moment the type exists,
  onboarding turns on automatically. It cannot lock anyone out by being half-finished.
- **Publish + review-request email.** A "Publish" action, plus a button that emails a
  reviewer a link to the exact preview of a draft, are built. The email sends through
  **Mailgun** (an email-delivery service) once its keys are supplied.
- **Automatic public-site rebuild on publish.** When content is published, the public
  Research Hub rebuilds itself with the new content (a one-time configuration that
  connects the content system to the public site's hosting). The trigger is built and
  documented; it is switched on by setting one connection in the content system.
- **Shared reviewer comments.** The Word-style draft comments work fully today,
  stored per browser (right for the demo weeks). The **shared** version — where two
  reviewers on different machines see each other's threads — is also fully built
  and tested, ships dormant, and switches itself on for real signed-in sessions the
  moment Research & Analysis installs the ready-made `review-annotation` storage
  type (a drop-in folder with its own install guide, `deploy/strapi/review-annotation/`).

### Status at a glance

| Capability | What it gives us | Status |
|---|---|---|
| Sign-in with real roles (no self-signup) | Who-can-publish enforced by real ICJIA roles | **Built** |
| Create/edit Articles, Apps, Datasets | Structured private drafts for all three | **Built** |
| Formatting editor + toolbar + live Preview | Friendly writing; no formatting codes to learn | **Built** |
| Compact abstract editor | Inline formatting only; no stray footnotes | **Built** |
| Accessible image uploads (alt-text required) | Accessible by default; optional captions | **Built** |
| Body-image gallery (thumbnails → insert) | Stage multiple images, click to insert | **Built** |
| Media-library picker (browse ~20 newest, search, upload tab) | Reuse existing library images; alt write-back for alt-less picks | **Built** (v0.5.0) |
| Document/PDF file upload | Simple report-file attachment | **Built** |
| No-bloated-images rule | Images never stored as embedded text | **Built** |
| Save gate | Invalid or unsafe content can't be saved | **Built** |
| Unsaved-work guard (leave warning, 30 s local backup, restore banner) | Authors can't silently lose in-progress work | **Built** (v0.6.0) |
| "Preview as published" (TOC, end matter, Print) | Exactly what the public will see | **Built** |
| Tab-only preview + shareable per-draft link | Editor and preview side by side; reviewers open a draft directly | **Built** |
| Word-style reviewer comments on drafts | Highlight a passage, comment, reply, resolve — a pure overlay | **Built** (per-browser today; shared storage dormant until R&A installs the type) |
| Card-view content lists (+ table toggle, type filter) | Find and track every item at a glance | **Built** |
| Title search on content lists (debounced, whole-library) | Find any item by title — 236 real articles arrive at launch | **Built** (v0.7.0) |
| Guided onboarding tour | First-run walkthrough; replay anytime | **Built** |
| One-click sample article / app / dataset (local dev) | Demonstrate on demand | **Built** |
| Light/dark mode + ICJIA logo (WCAG 2.1 AA, both) | Comfortable, on-brand, accessible | **Built** |
| Public demo with Author/Editor entry | 210 phony articles + 40 apps + 40 datasets; zero live reach — <https://studio-2026.netlify.app> | **Built & audited** |
| Continuous integration (automated checks per change) | Typecheck + all 677 tests + both builds on every push | **Built** |
| First-login onboarding | Capture a new author's reviewer & center | **Built; dormant until R&A creates the storage type** |
| Publish + review-request email (Mailgun) | One-step publish; notify a reviewer | **Built; awaits R&A's email keys & live test** |
| Auto rebuild of the public site on publish | New content appears publicly | **Built; awaits R&A wiring the trigger** |
| Shared reviewer comments (cross-device) | Two reviewers see each other's threads | **Built; dormant until R&A installs `review-annotation`** |

---

## 4. What's still ahead

Here is the honest part. The *features* are built (Section 3). What remains is
almost entirely **setup that only ICJIA's Research & Analysis (R&A) unit can do**,
plus a final dress rehearsal and one piece of cleanup before launch. None of it is
new feature-building; it is connecting the finished tool to ICJIA's own live
services. Each step below names **who does it**.

| # | Remaining step | Who does it | Why it can't be done yet by the developer |
|---|---|---|---|
| 1 | **Create the `studio-profile` storage type** in the content system (this is the one piece that *turns on* first-login onboarding). | **R&A** | Adding a storage type must be done in R&A's own content-system environment; until then the Studio stays fully usable with onboarding dormant. |
| 2 | **Install the ready-made `review-annotation` storage type** (a drop-in folder shipped in this project, `deploy/strapi/review-annotation/`, with its own install guide) — this switches reviewer comments from per-browser to shared. | **R&A** | Same reason as step 1: content types are created in R&A's content-system environment, not from the Studio. |
| 3 | **Set the email keys** (Mailgun) so review-request emails can send. | **R&A** | These are secret credentials that belong to ICJIA and live in ICJIA's hosting, not in the code. |
| 4 | **Wire the "publish → rebuild the public site" trigger** (one connection from the content system to the public site's hosting). | **R&A** | The trigger is a secret URL that, by design, lives only in the content system — never in the Studio's code. |
| 5 | **Dress rehearsal with real staff accounts** on a staging copy: the full checklist in the cutover runbook (`docs/demo-to-production.md` §2) — live login for both roles, a real edit, a cross-user comment round-trip, a publish round-trip, the review email, and confirming a real Author truly cannot publish. | **Developer, with R&A providing real test accounts** | The team does not create staff accounts itself; an actual Author login is needed to prove the rule under real conditions. |
| 6 | **The cutover itself** — flip the production build settings and secrets per the runbook (§3–§4); about 30 minutes plus smoke tests, with one-click rollback. | **Developer + whoever owns the hosting** | Needs the production hosting configuration and the go decision. |
| 7 | *Optional, later:* **public (no-login) share links** for previews, if ICJIA wants reviewers outside the staff sign-in to open a draft. | **Developer, if requested** | Not required for launch; today's preview links open for any signed-in staff member, which covers the reviewers. |

One earlier item has changed shape rather than remaining open: the temporary
`admin` / `admin` convenience login now also powers the public demo's
**Enter as Author / Enter as Editor** buttons, so it stays in the project as long
as the demo site runs. In a real production build it cannot activate (both of its
switches are off, and its credential is a dummy the content system rejects) — a
posture the independent audits reviewed and accepted — and the project's automated
pipeline carries a prepared "launch gate" check that will prove production bundles
ship without it entirely, for the day the demo is retired and the code is deleted.

Plainly: steps 1–4 are ICJIA's setup, step 5 is the joint go-live rehearsal, step 6
is the switch itself, and step 7 is an optional nicety. Every setup step is
documented in the project so R&A can follow it directly, and the whole sequence —
including rollback — is written up as the cutover runbook
(`docs/demo-to-production.md`). Nothing on this list is an unknown or a research
problem — they are known tasks with named owners.

---

## 5. How we work — and why the result is dependable

How this tool is built matters as much as what it builds, because the method is what
makes it dependable and maintainable for years. Three disciplines define the
approach, and together they are why the work holds up to scrutiny even before it is
switched on for the public.

- **Every piece is built test-first.** For each small piece of work, the team
  first writes an automated check that defines what "correct" means, then writes
  the code to satisfy that check. This is a mainstream, decades-old engineering
  practice. Its practical payoff here is concrete and checkable: the project's
  headline promises — for example, "no image is ever stored as a bloated embedded
  block" — are guaranteed by automatic checks that fail the build the instant
  anyone breaks them, rather than relying on someone remembering to be careful.
  This is why "built" in this document means more than "it appears to work."

- **Every step is independently reviewed and security-checked before it is
  accepted.** Each piece of work ends with a recorded save point (so nothing is
  lost and every change is traceable and reversible) and an independent review
  against the plan and the project's standards before the next step begins. A
  broader review happens before any body of work is accepted into the shared
  project. Nothing is hand-waved through, and the entire history is on the record.

- **We learn as we build, in writing.** Rather than pretend every requirement was
  known on day one, the team surfaces the deeper requirements by building toward
  them, then captures what was learned and adjusts — in writing, in a durable
  project record. The clearest example happened mid-build and is worth stating
  plainly, because it answers "what's the catch?" better than anything else could:

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
stands at **677 automated tests, all passing**, across the sign-in and roles, the
content engine for all three content types, the image and file handling, the save
gate, the editor, the "preview as published" view, the reviewer-comments engine,
the demo mode, the security-header sets, and the publish/email/onboarding code —
and a continuous-integration pipeline re-runs every one of them (plus both
production and demo builds) automatically on every change. The no-bloated-images
rule, the accessibility requirements, and the security handling of risky files are
each backed by their own automatic guards. The result the process is aiming at is a tool that is
correct, reviewable, safe to change, and maintainable for years — which is the
entire reason to rebuild on a modern foundation in the first place.

### Three questions worth asking

These are the questions a project at this stage should expect. Here are direct
answers.

- ***Is it overbuilt?*** No, and Section 2 makes the case in detail. The *workflow*
  is deliberately as simple as it can be (writers draft, approvers publish) — itself
  a simplification of the old tool's confusing approval chain. Everything beneath it
  — real roles, accessible images, the save gate, the exact preview — is the minimum
  a public **government** site requires to be safe and accessible by law. None of it
  is decoration; remove any of it and the result is unsafe, inaccessible, or
  unreliable. The one piece added for convenience rather than necessity is the demo
  mode, and it earns its place by letting anyone verify the rest without risk.

- ***What is the evidence?*** It is built into this document, by design. You can
  open the public demo (<https://studio-2026.netlify.app>) and use the tool
  directly; the test suite re-checks 677 promises every time the code changes, and
  a continuous-integration pipeline runs them automatically on every change; and
  every change is an independently reviewed, reversible entry in the official
  record. The tool has also been through **four** independent red/blue-team
  security audits (Section 6), which found zero critical issues. Every claim here
  points to something that can be examined.

- ***Is it on track?*** Yes, and the remaining work is small and named. The features
  are built. What is left (Section 4) is ICJIA's own setup (three steps), a joint
  go-live rehearsal, and one piece of cleanup — not new construction and not
  unknowns. The genuine risks are the ordinary ones: the live email, publish, and
  onboarding flows still need to be exercised against real ICJIA services and a real
  Author account, which is exactly what step 4 of the roadmap is for.

One detail noted for completeness: there is a convenience login path — the
`admin` / `admin` shortcut for local development, whose machinery also powers the
public demo's **Enter as Author / Enter as Editor** buttons. It lets a person open
the tool without a full account so the workflow can be shown and checked. It is
**inert in any real production build** (both of its activation switches are off
there, and its credential is a dummy the content system will never accept — a
posture the independent audits reviewed and accepted), and it grants **no access
to live data** anywhere. It stays in the project while the public demo runs; the
automated pipeline carries a prepared check that will prove production bundles
ship without it entirely once the demo is retired and the code deleted (Section 4).
It appears here and in the roadmap so the record is complete — it presents no risk
to live information.

---

## 6. Security & independent audit

The two areas most likely to hurt a content tool — turning author text into a web
page, and handling links/files — are each funneled through a single, hardened,
well-tested piece of code, so there is one place to get right rather than many.
Sign-in goes through Strapi's staff accounts (the same system that holds the
content); the Studio itself never makes the final security decision — Strapi
re-checks every request on the server, so a tampered browser cannot publish or see
anything it shouldn't.

The Studio has now been through **four** independent red/blue-team audits —
2026-06-21 (production), 2026-06-21 (the public demo and its deploy), 2026-06-22
(demo roles, multiple main files, the guided tour, and a dependency refresh), and
2026-07-05 (reviewer annotations, the tab-only preview, and the card-view lists).
Combined verdict across all four: **zero critical issues, and zero open high- or
medium-severity findings**; every in-repo finding is fixed and covered by
automated tests (**677** of them, re-run in CI on every change). The full reports
live in the repository (`docs/security-audit.md`), and the README keeps a running
log of every audit so the review history is visible at a glance.

**The first audit (2026-06-21, production)** is summarized below; the later three
are summarized after it.

- **See it:** open `docs/security-audit.md` — each finding names the exact file,
  the attack, the existing defense, and the fix.
- **The demo entry** (the public demo's Author/Editor buttons, and the local
  `admin / admin` developer shortcut behind them) is a deliberate convenience that
  **cannot activate in a real production build** — both of its switches are off
  there and its credential is a dummy the content system rejects, a posture the
  audits reviewed and accepted. The live site authenticates **only** through
  Strapi staff accounts.
- **Before go-live:** the short, documented checklist now lives in the cutover
  runbook (`docs/demo-to-production.md`) — confirm the security headers / CSP on a
  deploy preview, set the email + publish keys, verify Strapi's role permissions,
  install the two storage types, and run the staged dress rehearsal.

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

Dependency monitoring (Dependabot) was also added in `e402f3d`; the full detail is in `docs/security-audit.md`.

**Demo & public-deploy audit (2026-06-21).** A second adversarial pass covered the
new **public-demo** capability — demo mode, the static Netlify deploy, the demo
CSP/headers, and icon/image bundling. **Verdict: safe to expose publicly — zero
Critical, zero High.** The demo cannot write to Strapi, cannot sign in as a real
user, and ships no secrets; this holds three deep — in-memory data, a sentinel token
Strapi rejects, and a CSP `connect-src 'self'` that makes the backend unreachable
*even if every client-side guard is bypassed*. Of 10 findings (all Medium/Low),
**5 were fixed in code and 5 documented.**

| Finding | Severity | Remediation | Status |
|---|---|---|---|
| D-1 — Dev Strapi URL baked into the public demo bundle | Medium | Blank `strapiBaseUrl` in demo mode (unused — the demo is in-memory) | ✅ Fixed (`cdff530`) |
| D-2 — `demoMode` flag is runtime-mutable (devtools could flip it) | Medium | CSP `connect-src 'self'` backstop + rejected sentinel token; **later fully closed** — the flag is deep-frozen on boot and a test guards the demo header set (2026-06-22 audit, F-1/F-2) | ✅ Fixed |
| D-3 — Icons could fetch `api.iconify.design` at runtime | Medium | `icon.fallbackToApi:false` + all 46 icons bundled locally | ✅ Fixed (`cdff530`) |
| D-4 — Content reads gated only by the token, not the demo build | Low | `isDemoData()` read-guard (in-memory repo for the whole demo build) | ✅ Fixed (`cdff530`) |
| D-7 — Icon dependency pinned with a `^` range | Low | Pinned exact (`1.2.114`) | ✅ Fixed (`cdff530`) |
| D-8 — No `Permissions-Policy` header | Low | Added to both header sets | ✅ Fixed (`cdff530`) |
| D-5, D-6, D-9, D-10 — minor disclosure / prod-scoped | Low | Documented (sentinel creds worthless vs real Strapi; email-domain placeholder; HSTS `preload`; cookie `HttpOnly` = prod H-1) | 📄 Documented |

Full detail in `docs/security-audit.md` §7.

**Third audit (2026-06-22) — demo roles, main files, guided tour, dependencies.**
Covered everything added for the public demo's Author/Editor entry, the multiple
report files, the in-app tour, and a full dependency refresh. **Verdict: 0
Critical / 0 High / 0 Medium.** Every concern examined was already correctly
defended; two belt-and-suspenders fixes landed with the audit (the deep-freeze
above, plus a test that locks the demo's network policy so it can never silently
re-open). Full detail in `docs/security-audit.md` §8.

**Fourth audit (2026-07-05) — reviewer comments, tab-only preview, card view.**
Covered the entire annotation feature end to end (including the dormant
shared-storage adapter), the new preview-tab architecture, and the card-view
lists. **Verdict: 0 Critical / 0 High / 0 Medium.** One belt-and-suspenders fix
landed with the audit (card artwork addresses now pass through the same URL
allowlist as every other link); measured color contrast on all the new interface
pieces runs well above the accessibility floor in both light and dark. Full
detail in `docs/security-audit.md` §9.

*(A dated maintenance log at the top of `docs/security-audit.md` records
security-relevant changes between audits — most recently the search-engine
exclusion headers and the CI bundle guard, 2026-07-11.)*

---

## 7. Appendix — Developer reference (technical detail)

*This appendix is written for the developer audience. A manager has the complete
picture from Sections 1–6 and can stop there. What follows condenses the
architecture and the implementation plan for readers who want the full technical
detail, and is where the remaining technical terms live.*

### 7.1 At a glance

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

### 7.2 The end-to-end lifecycle

The flow, end to end — every step below is now built; the email relay and the
rebuild "doorbell" await their operator-side keys (Section 4):

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

### 7.3 Why a rebuild (old tool → new Studio)

| Concern | Old tool (2019) | New Studio (2026) |
|---|---|---|
| Technology | End-of-life stack | Current, supported stack |
| Images | Stored as bloated embedded text | Shared library, referenced by link |
| Workflow | Multi-stage approval, three roles | Two roles: draft vs. publish |
| Editor | Plain text box | Friendly editor (buttons, live preview, image insert) — **built** |
| Publishing | Manual steps | One button that also rebuilds the public site — **built** (rebuild trigger awaits R&A wiring) |
| Draft review | Email chains outside the tool | Word-style highlights & threaded comments on the exact preview — **built** |
| Accessibility | Inconsistent | Required alt-text, optional captions, safe image handling |

The content system itself was modernized ahead of this project to content parity
with the old data, with proper media handling and native draft/publish. The
Studio's job is to do its part correctly against that modern foundation. The old
codebase is retained only as a reference for what each field means.

### 7.4 What is built, in technical terms

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

### 7.5 What was planned at first writing — all of it has since shipped

Each track below was "planned" in the 2026-06-21 edition of this document and is
now built, tested, and on `main`:

- **Authoring editor — shipped.** The ICJIA Markdown Editor (CodeMirror 6,
  vendored) is integrated with a formatting toolbar, split-pane live preview, and
  the image-insert hook wired to the media layer. Markdown-source editing was
  retained as designed, so footnotes, math, and complex tables round-trip
  faithfully. A body **linter** ("Check" button flagging heading/link/image
  problems, with jump-to-line results) is merged and shipping (2026-07-11).

- **Publish, rebuild & review email — shipped** (operator keys pending). The
  publisher-only publish/unpublish actions are live against the content system's
  own enforcement (a non-publisher gets a server-side refusal); the rebuild
  trigger is configured as a content-system webhook holding the secret (per the
  design — the Studio never sees it), documented in
  `docs/deploy-rebuild-and-email.md`; and the review email is a server-side,
  sign-in-verified, **rate-limited** relay (5 sends / 10 minutes per user) holding
  the Mailgun credential server-side only.

- **Onboarding — shipped, dormant.** The first-login profile (reviewers, center)
  is built end to end and deliberately **fails open** until R&A creates the
  `studio-profile` storage type — an API error can never lock an author out.

- **Polish, accessibility & launch — shipped and then some.** Full WCAG 2.1 AA
  sweeps (zero automated-checker violations, light *and* dark), central error
  handling with a generic production error page, deployment configuration for
  both the demo and production header sets, the one-click sample-content
  shortcuts (local dev), the guided tour, and — beyond the original plan —
  Word-style reviewer annotations, the tab-only preview, card-view lists, the
  public demo with role entry, and a CI pipeline with the dev-bypass bundle
  guard. (The "remove the dev login" cleanup became conditional: the demo's role
  entry depends on it — see Section 4.)

### 7.6 Open items being tracked

These are normal project hygiene — each is known, tracked, and has a sensible
default or a clear owner.

| Open item | Plain meaning | Handling |
|---|---|---|
| Stronger session hardening | Make the login token invisible even to the page's own scripts | A separate, approval-gated backend task; meanwhile the server enforces all permissions, so this is a hardening step, not a hole |
| Author test account | A real author login is needed to confirm authors truly cannot publish | Requested from the backend owner; the team does not create accounts itself |
| ~~Pixel-exact preview styling~~ | **Resolved:** the preview now ships the faithful Hub stylesheet (same fonts, same layout rules) behind the single swappable-stylesheet seam | Done — `assets/css/prose-preview.css` |
| The real "centers" list | Onboarding asks which center a staff member belongs to; a placeholder list is used for now | Swap in the real list when supplied |
| Onboarding profile storage | Storing the profile needs a small, approved addition to the content system | Approved; may need the system's development environment to create it |
| Rebuild trigger & email credential | Publishing-with-rebuild and review-email need two secret values | Supplied at build time; both held server-side, never in the browser |

Resolved during this iteration and no longer open: publish permissions (now native
via real roles) and keeping the public-site rebuild trigger secret (a server-side
proxy that verifies the caller before firing).

### 7.7 Glossary

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
| **Feature-complete in the workshop** | This stage: every feature is built and on the team's shared project, checked by automated tests, but not yet switched on for the public. |

---

## What's changed recently

A short digest for managers, newest first — the complete version-by-version record is the
[changelog](https://github.com/ICJIA/copperhead-studio-20/blob/main/CHANGELOG.md), and the
living list of what's in flight and what's next is the
[roadmap](https://github.com/ICJIA/copperhead-studio-20/blob/main/ROADMAP.md).

- **2026-07-16 — Title search shipped (v0.7.0).** A labeled, 300 ms-debounced search box
  now sits beside the Type filter on every content list — Articles, Apps, and Datasets
  alike — filtering by title, case-insensitive, across the **whole library**, server-side,
  identically in live and demo modes; a search change re-pages to 1, and a distinct "No
  matches" message replaces the generic empty state. Ahead of launch's 236 real articles
  (analysis-roadmap §5.3-6). The release also fixes a **latent live-mode defect the
  whole-branch review uncovered**: filter parameters (including the existing type filter)
  were serialized in a form the live content system would reject — invisible until now
  because the demo and dev sessions run in-memory. The wire format now matches the
  sandbox-validated pattern, with a final confirmation step added to the staging
  rehearsal checklist. Verified live in the demo (whole-library filtering, no-matches
  state, and the unsaved-work guard's leave warning intercepting a real navigation).
  **822 automated tests / 107 files.**
- **2026-07-16 — Unsaved-work guard shipped (v0.6.0).** Authors can no longer silently
  lose in-progress work: a native leave-page warning, a 30-second local draft snapshot
  while a form is dirty, and a non-blocking restore banner ("Restore" / "Discard") when a
  surviving snapshot is found; every successful save clears the backup. **Live builds
  only** — the public demo deliberately takes no snapshots, so its "nothing is saved /
  resets each session" promise stays literally true; the demo still shows both warnings.
  Built test-first over six reviewed tasks with per-task adversarial review, then verified
  end-to-end in the running app (snapshot, restore, clear-on-save, and the demo's
  zero-write policy all observed live). **800 automated tests / 107 files.**
- **2026-07-16 — Manager-docs workflow (v0.4.0).** This document, the README, the analysis
  document, and the new roadmap now carry a version-stamped bottom nav; the Studio itself
  gained a bottom status bar (version + doc links) and an in-app **Spec & status** page
  rendering this document, so a manager can always read the latest state without asking a
  developer. Doc currency is enforced by an automated test.
- **2026-07-16 — Media-library picker shipped (v0.5.0).** Every image surface now opens on
  the ~20 newest Media Library images (searchable) with upload-from-desktop one tab away;
  picking an image that lacks alt text requires supplying it, which is written back to the
  shared library so it improves for everyone. Works identically in the public demo, where
  new images live only for the session and nothing persists. Built test-first over ten
  adversarially-reviewed tasks and verified end-to-end in the running demo before merge.
  **757 automated tests / 104 files.**
- **2026-07-11 — Body markdown linter shipped (v0.3.0).** A "Check" button in the editor
  flags heading/link/image problems in plain language with jump-to-line results.
  **677 automated tests / 97 files.**
- **2026-07-11 — CI pipeline + search-engine exclusion (v0.2.0).** Every push and pull
  request now re-runs the typecheck, the full test suite, and both builds automatically;
  the Studio's pages are excluded from search engines.

---

*End of specification. First issued 2026-06-21; revised 2026-07-11 to reflect the
shipped state (677 tests, four audits, annotations/preview/card-view/tour/demo
roles/CI), and 2026-07-16 for the manager-docs workflow ("What's changed recently,"
the roadmap, the bottom navs, and the in-app Spec & status page). The Studio is
feature-complete in the workshop with a public demonstration at
<https://studio-2026.netlify.app>; this document will evolve as the remaining setup
and go-live steps in Section 4 are completed. Nothing described here publishes to
the live system yet.*

---

<!-- studio-bottom-nav -->
**Hub Studio 2.0 · Studio build v0.7.0** — for managers monitoring this project:
[Spec & status](https://github.com/ICJIA/copperhead-studio-20/blob/main/docs/ICJIA-Studio-20-rewrite-copperhead.md) ·
[What's changed (changelog)](https://github.com/ICJIA/copperhead-studio-20/blob/main/CHANGELOG.md) ·
[What's next (roadmap)](https://github.com/ICJIA/copperhead-studio-20/blob/main/ROADMAP.md) ·
[README](https://github.com/ICJIA/copperhead-studio-20/blob/main/README.md) ·
[Live demo](https://studio-2026.netlify.app)

*These links always open the latest rendered version of each document.*
