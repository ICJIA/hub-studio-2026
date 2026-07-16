# Manager-docs workflow — design

**Date:** 2026-07-16 · **Status:** Approved (design reviewed in-session) · **Owner:** cschweda

Managers monitor this project through its documents. Today the repo has a strong CHANGELOG
and a current spec, but no single "what's changed / what's still to go / what hasn't been
touched" surface, no version stamp on the docs themselves, and no in-app path for a manager
to read the latest docs. The sibling hub repo (`copperhead-20`) solved this in its v0.24.0
("Manager-facing docs & status bar"); this design ports that workflow to the Studio so both
Copperhead repos read the same way.

## 1. Scope

**In scope**

- **`ROADMAP.md`** (repo root, new) — living roadmap with the hub's exact headings: *Done
  (recent)* / *In progress* / *Next (proposed)* / *Deferred (with rationale)* / *Blocked on
  R&A (not code)*, opening with `_Last updated: <date> · Current version: v<version>_`.
  Seeded truthfully: Done = v0.3.0 body linter, CI pipeline, noindex, four audits;
  In progress = media-library picker (spec/plan committed 2026-07-16); Next = the approved
  priority list (unsaved-work guard, title search, edit-conflict detection, staging host
  override, error monitoring); Blocked on R&A = `studio-profile` + `review-annotation`
  types, Mailgun keys, rebuild webhook, real staff accounts.
- **Bottom nav** in the four manager-facing .md docs — `README.md`,
  `docs/ICJIA-Studio-20-rewrite-copperhead.md`,
  `docs/ICJIA-Studio-20-analysis-roadmap-copperhead.md`, `ROADMAP.md` — a marked footer
  block (`<!-- studio-bottom-nav -->`) with the current version and clickable **absolute
  GitHub `blob/main` links** (Spec & status · Changelog · Roadmap · README · Live demo),
  so the links always open the latest rendered doc from anywhere, including the .docx
  editions (ordinary external hyperlinks — never Word field codes).
- **"What's changed recently"** section in the rewrite spec doc: a short dated digest of
  the latest few substantive changes + a link to the full CHANGELOG; updated whenever the
  doc is updated.
- **`AppStatusBar.vue`** (ported from the hub) at the bottom of the Studio layout: version
  pill (`runtimeConfig.public.version` ← `package.json`), links to in-app **Spec & status**,
  and GitHub **Changelog** / **Roadmap** / **Repository**. Renders in demo and production
  (links are navigations, not fetches — demo CSP unaffected).
- **`/spec` in-app page** (ported from the hub): imports the rewrite doc `?raw` at build
  time, renders through the Studio's existing `renderMarkdown` pipeline, offers `.md` /
  `.docx` downloads (a `scripts/copy-spec.mjs` copies both into `public/spec/` on
  dev/build/generate; `public/spec/` is git-ignored). Marked `public` (readable before
  sign-in — the sources already live in a public repo and demo).
- **Docs-nav guard test** — the "always update" rule enforced as a test, in this repo's
  style: asserts ROADMAP exists with the Last-updated line, all four docs carry the
  bottom-nav marker, and every version stamp equals `package.json`'s version. Stale docs
  fail the suite (and CI).
- **Release:** ships as **v0.4.0** (app surface changed); CHANGELOG entry; both Word
  editions regenerated and verified free of field codes.

**Out of scope**

- No in-app rendering of CHANGELOG/ROADMAP (GitHub's rendered view serves those; the hub
  made the same choice). No doc search, no versioned doc history UI.
- No hub-repo changes.

## 2. Decisions and rationale

| Decision | Choice | Why |
|---|---|---|
| Roadmap format | The hub's exact headings + Last-updated/version line | Managers read both repos; identical structure means zero relearning. |
| Nav links | Absolute `https://github.com/ICJIA/copperhead-studio-20/blob/main/...` URLs | Work from rendered GitHub, from local previews, and from the .docx (plain external hyperlinks; the docx field-code rules stay satisfied). |
| Version source | `package.json` → `runtimeConfig.public.version` (nuxt.config import) | One source of truth; the hub does the same. |
| Currency enforcement | Unit guard test on marker + version stamps | This repo's philosophy: promises are tests, not intentions — README drift already happened once (647 vs 649). |
| `/spec` access | `public: true` route meta | A manager evaluating the demo shouldn't need an account to read the spec; content is already public. |
| Downloads | Build-time copy to `public/spec/` (git-ignored) | Mirrors the hub's `copy-spec.mjs`; keeps the repo clean and the downloads current per deploy. |

## 3. Testing

- Unit: `docs-nav.test.ts` — ROADMAP presence + `_Last updated:` line; all four docs
  contain `<!-- studio-bottom-nav -->`; every `Studio build v<semver>` stamp in the four
  docs equals `package.json` version; nav links use the absolute repo URL.
- Nuxt: `app-status-bar.test.ts` — renders version pill, the four links with correct
  hrefs, GitHub links `target="_blank" rel="noopener"`. `spec-page.test.ts` — renders the
  doc's H1 through the markdown pipeline, download links point at `/spec/*.md|.docx`,
  route meta is public.
- Existing suite + typecheck stay green; freeze-config test tolerates the added public key.

## 4. Maintenance rule (standing)

Every substantive change: move shipped items to ROADMAP *Done*, reconcile *Next*/*Deferred*,
update the rewrite doc's "What's changed recently", keep CHANGELOG discipline, and bump the
version stamps with each release commit (the guard test fails the build otherwise).
