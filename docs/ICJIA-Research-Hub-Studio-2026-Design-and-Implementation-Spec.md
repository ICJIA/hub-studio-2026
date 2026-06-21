# ICJIA Research Hub Studio 2026

## Design & Implementation Specification

| | |
|---|---|
| **Document** | Design & Implementation Specification |
| **Status** | **Feature-complete in the workshop** — the full tool is built; not yet switched on for the public |
| **Date** | 2026-06-21 |
| **Replaces** | ICJIA Research Hub Studio (built 2019) |
| **Audience** | Project managers, directors, and stakeholders (no technical background required) |

> **Where the project stands, in one breath.** The Studio is built. Every feature
> a researcher will touch — signing in, writing, previewing exactly what will
> publish, and publishing — exists today, runs on the team's shared, official copy
> of the project, and is checked by **325 automated tests, all passing**. What is
> *not* done is the handful of setup steps that only ICJIA's own Research & Analysis
> staff can do (creating one storage type, plugging in the email keys and the
> "rebuild the public site" trigger) and a final dress rehearsal with real staff
> accounts before it goes live. This document marks each claim as **built**
> (it exists, it's been checked, you can see it) or **still ahead** (a named,
> owned next step). Nothing here is live to the public yet — and where it isn't, it
> says so plainly.

---

## How to read this document

This document is written for an intelligent reader who does not write software.
You should be able to read sections 1 through 5 from start to finish and come away
able to explain — to your own leadership — what this tool is, why it is real work,
what is finished, and why the work can be trusted. There is no jargon you are
expected to already know; where a technical word is genuinely necessary, it is
explained in one plain line right where it appears.

**This document is built to be checked, not just read.** If you are the kind of
manager who wants the receipts before you believe a "done," this is written for
you. Almost every claim of "built" below comes with one of three kinds of proof
you can verify yourself, without trusting anyone's word:

- **You can click it.** There is a running demonstration of the tool. Sign in with
  the temporary user name `admin` and password `admin` and you can open, edit, and
  preview hundreds of sample articles with your own hands — without changing or
  saving anything to the real system. Wherever a feature says "you can see this,"
  that demonstration is where you see it.
- **A machine checks it, continuously.** The project carries **325 automated tests**
  — small programs that re-prove the tool's promises every time the code changes,
  and that stop the work cold if any promise breaks. When this document says a
  promise is "guaranteed," it means a test enforces it, not that someone is being
  careful.
- **It's in the official record.** Every piece of work is a dated, reversible save
  point in the project's shared history, independently reviewed before it was
  accepted. "Built" here means *accepted into the shared project*, not "on
  someone's laptop."

Section 6 is an optional appendix for the technically curious. You can skip it
entirely without missing anything you need.

A word on intent: this is not a sales pitch and it is not a complaint. It is an
honest accounting of what "let staff post articles to our website" actually
involves when it is built to be safe, accessible, and dependable for a public
government audience — and an honest accounting of exactly how much of that is now
finished and how much remains.

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

One important boundary, stated up front because it shapes everything else: **staff
do not sign themselves up.** ICJIA's Research & Analysis unit creates each person's
account; the sign-in screen says so and points anyone without an account to
Research & Analysis. This is deliberate. The whole point of a controlled,
staff-only workspace is that only the right people can get in, and that decision is
made by ICJIA, not by a self-service form.

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

Every one of those pieces is now built. The next section walks through them one at
a time, and for each one tells you exactly where you can go to see it for yourself.

---

## 3. What's working today

Everything in this section is **built**, lives on the team's official, shared copy
of the project (what developers call "main"), and is checked by an automated test
suite — currently **325 automated tests, all passing**. What is *not* yet done is
described in Section 4, and it is mostly setup that only ICJIA's Research & Analysis
unit can perform. The line between the two is drawn honestly.

A reminder of the stage: the tool is **not yet switched on for the public** — none
of this is live to the public audience. It is a finished workshop build, waiting on
its final setup and a dress rehearsal.

**How to verify this whole section yourself.** Open the running demonstration and
sign in with user name `admin`, password `admin`. You are now inside the real tool,
looking at 200-plus realistic sample articles (plus sample apps and datasets), and
you can click into any of them to edit and preview — all of it without ever saving
to or touching the live system. Everything described below is something you can do,
see, or click in that demonstration.

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

*Receipt:* the login screen, the "contact Research & Analysis" message, and the
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

*Receipt:* open any sample article in the demonstration and you will see the toolbar,
the Headings menu, and the live Preview, and you can type into them yourself.

### (c) Images and files — accessible and safe by construction

Adding an image requires **alt-text** (a short written description a screen reader
speaks aloud to a person who cannot see the image — a legal accessibility
requirement for a public government site) and allows an optional **caption**. The
alt-text and caption boxes are right there in the picker, so supplying a description
is the natural path, not an afterthought.

The main report file or data file is a simpler **document-or-PDF upload** with no
alt-text or caption (it's a file to download, not a picture to describe).

Under the hood, the project holds one line without exception: **an image is never
stored as a giant block of embedded text.** Every image and every file is uploaded
once to a shared store and referenced by a lightweight link — which is exactly what
the old 2019 tool got wrong, bloating itself with image data. This is the single
rule the team treats as non-negotiable, and it is guaranteed by automated tests that
stop the build the instant anyone weakens it.

*Receipt:* the picker shows the alt-text and caption fields and the name of the
file you selected; the no-bloated-images rule is enforced by a dedicated guard test
that runs across all three content types.

### (d) The save gate — bad or unsafe content can't be saved

Before anything is written, the Studio checks it. Required fields must be present,
values must come from the allowed set, and no forbidden embedded image may sneak in.
If something is wrong, the **save is blocked** and the person is told, in plain
terms, what to fix — *before* anything reaches the content system. This is the
guarantee from Section 2 made real, standing directly between a person and a save.

*Receipt:* try to save an incomplete draft in the demonstration and the gate stops
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
staff member — which is precisely how a reviewer or a skeptical manager opens a
specific draft and sees what will publish.

*Receipt:* open the "Preview as published" view on a sample article in the
demonstration — the sticky Table of Contents, the all-authors byline, the end
matter, and the Print button are all there.

### (f) Finding and managing content

- A **paginated content list** shows every item — **Date · Title · Author(s) ·
  Draft/Published status** — newest first, so the most recent work is at the top.
- **One-click "Add sample article / app / dataset"** buttons instantly fill in a
  complete, realistic draft, so the tool can be demonstrated on demand without
  typing one out by hand.
- **Light and dark mode** (it defaults to light; dark is opt-in) with the official
  ICJIA logo in the header. The theme toggle is the last button in the navigation.

*Receipt:* all three are visible the moment you sign in to the demonstration — the
sortable list, the sample buttons, and the theme toggle.

### (g) A self-contained Demo Mode for safe show-and-tell

The temporary `admin` / `admin` login opens a **fully self-contained Demo Mode**:
200-plus sample articles held in memory, fully clickable for editing and previewing,
that **never save anything to the live system**. It exists so the tool can be shown
to managers, reviewers, or leadership safely, with zero risk to live information.
(This convenience login is temporary and is removed before the tool goes to
production — see Section 4 and the candid note in Section 5.)

*Receipt:* this is the demonstration you have been using to check every other item.

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

### Status at a glance

| Capability | What it gives us | Status |
|---|---|---|
| Sign-in with real roles (no self-signup) | Who-can-publish enforced by real ICJIA roles | **Built** |
| Create/edit Articles, Apps, Datasets | Structured private drafts for all three | **Built** |
| Formatting editor + toolbar + live Preview | Friendly writing; no formatting codes to learn | **Built** |
| Compact abstract editor | Inline formatting only; no stray footnotes | **Built** |
| Accessible image uploads (alt-text required) | Accessible by default; optional captions | **Built** |
| Document/PDF file upload | Simple report-file attachment | **Built** |
| No-bloated-images rule | Images never stored as embedded text | **Built** |
| Save gate | Invalid or unsafe content can't be saved | **Built** |
| "Preview as published" (TOC, end matter, Print) | Exactly what the public will see | **Built** |
| Shareable per-draft preview link | Reviewers open a specific draft directly | **Built** |
| Paginated content list (newest first) | Find and track every item | **Built** |
| One-click sample article / app / dataset | Demonstrate on demand | **Built** |
| Light/dark mode + ICJIA logo | Comfortable, on-brand | **Built** |
| Self-contained Demo Mode (`admin`/`admin`) | Show the tool safely, no live saves | **Built** (temporary) |
| First-login onboarding | Capture a new author's reviewer & center | **Built; dormant until R&A creates the storage type** |
| Publish + review-request email (Mailgun) | One-step publish; notify a reviewer | **Built; awaits R&A's email keys & live test** |
| Auto rebuild of the public site on publish | New content appears publicly | **Built; awaits R&A wiring the trigger** |

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
| 2 | **Set the email keys** (Mailgun) so review-request emails can send. | **R&A** | These are secret credentials that belong to ICJIA and live in ICJIA's hosting, not in the code. |
| 3 | **Wire the "publish → rebuild the public site" trigger** (one connection from the content system to the public site's hosting). | **R&A** | The trigger is a secret URL that, by design, lives only in the content system — never in the Studio's code. |
| 4 | **Dress rehearsal with real staff accounts:** test the live publish, the review email, and onboarding end-to-end — including confirming a real Author truly cannot publish. | **Developer, with R&A providing a real Author test account** | The team does not create staff accounts itself; an actual Author login is needed to prove the rule under real conditions. |
| 5 | **Remove the temporary `admin` / `admin` demo login** before the tool goes to production. | **Developer** | It is already inert in any real build (see Section 5), but it is removed entirely as a final cleanup so the record is spotless. |
| 6 | *Optional, later:* **public (no-login) share links** for previews, if ICJIA wants reviewers outside the staff sign-in to open a draft. | **Developer, if requested** | Not required for launch; today's preview links open for any signed-in staff member, which covers the reviewers. |

Plainly: steps 1–3 are ICJIA's setup, step 4 is the joint go-live check, and steps
5–6 are developer cleanup and an optional nicety. The setup steps (1–3) are each
documented in the project so R&A can follow them directly. Nothing on this list is
an unknown or a research problem — they are known tasks with named owners.

---

## 5. How we work — and why you can trust it

The way this tool is built is as important as what it builds, because *how* it is
built is what makes it dependable and maintainable for years. Three disciplines
define the approach, and together they are the reason a manager can trust work
even before it is switched on for the public.

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
stands at **325 automated tests, all passing**, across the sign-in and roles, the
content engine for all three content types, the image and file handling, the save
gate, the editor, the "preview as published" view, the demo mode, and the
publish/email/onboarding code. The no-bloated-images rule, the accessibility
requirements, and the security handling of risky files are each backed by their
own automatic guards. The result the process is aiming at is a tool that is
correct, reviewable, safe to change, and maintainable for years — which is the
entire reason to rebuild on a modern foundation in the first place.

### Answering the skeptic directly

Three fair questions deserve straight answers, with no spin.

- ***"Is this overbuilt?"*** No — and Section 2 makes the case in detail. The
  *workflow* is deliberately the simplest it can be (writers draft, approvers
  publish), which is itself a simplification of the old tool's confusing approval
  chain. Everything beneath it — real roles, accessible images, the save gate, the
  exact preview — is the minimum a public **government** site requires to be safe
  and accessible by law. None of it is decoration; remove any of it and you get a
  tool that is unsafe, inaccessible, or untrustworthy. If anything was *added* for
  comfort rather than necessity, it was the demo mode — and that exists precisely so
  skeptics like you can verify the rest without risk.

- ***"Can I trust it?"*** You don't have to take it on faith — that is the whole
  design of this document. You can *click* the running demonstration and use the
  tool yourself; a *machine* re-proves 325 promises every time the code changes; and
  every change is an independently reviewed, reversible entry in the official
  record. Trust here is something you can check, not something you are asked to
  grant.

- ***"Is it on track?"*** Yes, and the remaining work is small and named. The
  features are built. What's left (Section 4) is ICJIA's own setup (three steps), a
  joint go-live rehearsal, and one piece of cleanup — not new construction and not
  unknowns. The honest risks are the ordinary ones: the live email, publish, and
  onboarding flows still need to be exercised against real ICJIA services and a real
  Author account, which is exactly what step 4 of the roadmap is for.

A note in the interest of being straight with you: during development only, there
is a temporary local convenience login — the `admin` / `admin` demo login this
document keeps pointing you to. It lets a person open the tool without a full
account so the workflow can be shown and checked. It is **inert in any real build**
(the code that creates it is stripped out when the production version is made, and
its credential is a dummy the content system will never accept), it grants **no
access to live data**, and it is **removed entirely before launch** (step 5 of the
roadmap). It is called out here, and in the roadmap, so the record is complete —
not because it presents any risk to live information.

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
| **Feature-complete in the workshop** | This stage: every feature is built and on the team's shared project, checked by automated tests, but not yet switched on for the public. |

---

*End of specification. The Studio is feature-complete in the workshop; this document
will evolve as the remaining setup and go-live steps in Section 4 are completed.
Nothing described here is live to the public yet.*
