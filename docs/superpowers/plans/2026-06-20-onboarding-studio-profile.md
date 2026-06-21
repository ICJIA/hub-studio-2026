# First-Login Onboarding (Studio Profile) — Implementation Plan

> **Plan 7 of the ICJIA Studio build.** Follows the auth plan (Plan 1/2), the data-layer plan (retargeted to the Content-Manager API), the media plan (zero-base64), the editor integration (Plan 4), the screens/forms/preview plan (Plan 5), and the publish/rebuild/review-email plan (Plan 6). Plans 5 and 6 both explicitly **deferred** first-login onboarding because it needs a new Strapi collection type (`studio-profile`) that does **not exist yet** on the deployed sandbox (production-mode; the content-type builder is disabled). This plan builds onboarding against the **expected** Content-Manager contract, ships the **Strapi schema doc** so the user can create the type in their Strapi **dev** env, and **closes the loop** from Plan 6 by prefilling the Request-review reviewers from the saved profile. It **wires** the already-built repository factory, auth/roles, the guard, the shared fields, and `RequestReviewForm` — it does not recreate them.

> **Draft 1 — first iteration.** Part of an exploratory first pass; expect the approach to evolve as the build surfaces requirements (the data layer itself was revised mid-build from REST → Content-Manager API). Onboarding is built from the **validated-by-analogy** Content-Manager contract: the CM admin API (list with `filters`, `create`) behaves identically for any collection type, and the data layer already proved that contract live for `article`/`app`/`dataset`. The `studio-profile` type itself is **NOT yet created**, so this plan is **validated-at-runtime** (the user creates the type from the shipped schema and confirms onboarding against dev Strapi as a post-plan check) — it does **not** claim a live `studio-profile` round-trip was run, and it is engineered to **fail open** (never gate) until the type exists.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

---

## 📋 For managers — what is this, and is it legit?

**What this document is.** The construction recipe for a **one-time "set up your profile" step** the first time an ordinary author signs in. Before they can use the Studio, an author answers three short questions: **who reviews/approves my work** (one or more email addresses), **which ICJIA center am I in** (a dropdown), and confirms **my own email** (already filled in, not editable). That answer is saved once and they are never asked again. Managers and editors are **never** shown this step.

**Why this matters.** Two real-world payoffs, handled deliberately:
1. **Less friction at review time.** Plan 6 added a "send this draft to a reviewer" email, but today the author has to **type the reviewer's address every single time**. Onboarding captures the reviewer(s) **once**, and the review form **pre-fills** them from then on. The author can still edit the list per send — it is a convenience, not a cage.
2. **A place to put per-author facts the system needs.** The author's center (and later, more) is captured in a small, private profile record keyed to the author's email.

**The one safety rule we keep guaranteeing.** The collection where this profile is stored **does not exist on the production sandbox yet** — it has to be created in a development copy of the content system first (a five-minute step we ship exact instructions for). So the gate is built to **fail safe**: if the Studio cannot look up a profile for **any** reason (the collection is missing, the network hiccups, the server errors), it **does not block anyone** — it simply lets them through and logs a quiet warning. The "you must complete onboarding" redirect only ever fires when the lookup **succeeds** and definitively says "this author has no profile yet." This is the single most important property in the plan, and it is **tested**: a failing lookup never gates.

**Is it real, or jargon?** Real, and routine:
- Every small step **writes a test first, then the code** (Test-Driven Development).
- Every step ends in a **save point** (a commit) — traceable and reversible.
- The careful logic (is this person an author? did the lookup actually resolve? should we redirect?) lives in **plain, separately-tested functions**, so the page stays simple and the rules are provable.
- **No secrets, no giant pasted images.** Nothing new is exposed to the browser that should not be.

**What you get when this plan is done.** First-login onboarding for authors: a gated `/onboarding` page that captures reviewer email(s) + center + (read-only) email, saved to a new private `studio-profile` record, after which the author goes straight to their dashboard and is never asked again — **and** the review form now pre-fills reviewers from that record. **Not** in this plan (on purpose, and noted below): creating the Strapi type (that is a documented **user** step, shipped here), editing a profile after the fact, the real ICJIA centers list (a placeholder ships; the user supplies the real list), and per-author draft ownership.

**Bottom line.** Legitimate, careful assembly of a one-time author profile + a fail-safe gate — written in detail so the app can **never** be bricked by the not-yet-created collection, so only authors (never managers) see onboarding, and so the review loop from Plan 6 finally closes.

---

**Goal:** Add first-login onboarding for **authors** on top of the existing data + auth + guard + fields layers: (1) a `StudioProfile` domain type + mapper + a `studio-profile` repository (via the generic `createRepository`, uid `api::studio-profile.studio-profile`) plus a **`findByAuthorEmail(email)`** helper (a Content-Manager `list` filtered by `authorEmail` → first result or `null`) and a `useStudioProfile()` composable binding `$api`; (2) a **placeholder** `CENTER_OPTIONS` list (clearly marked "user supplies the real list") + a tiny `blankStudioProfile()` factory and `validateStudioProfile()` (reviewers required + valid, center required); (3) an auth-store **`hasProfile: boolean | null`** flag and a **fail-open** profile check wired into `useAuth().init`/`login` (AFTER `fetchMe`) that, for an author only, calls `findByAuthorEmail` **inside a try/catch** — any error or missing type ⇒ `hasProfile = null` (unknown ⇒ **never gate**); (4) a pure extension to the guard (`resolveAuthRedirect`) — a logged-in author with `hasProfile === false`, not already on `/onboarding`, ⇒ redirect `/onboarding`; `null`/editor/super-admin ⇒ no gate; (5) the `/onboarding` page + form (authorEmail prefilled + read-only, reviewers one-or-more + required + validated, center required) → `create` the profile → set `hasProfile = true` → navigate to the dashboard, with `definePageMeta` so the page is itself reachable while gated; (6) prefill `RequestReviewForm`'s reviewers from the profile (additive, degrades gracefully when there is no profile) + ship `docs/onboarding-studio-profile-setup.md` (the exact Strapi schema + the create-the-type steps).

**Architecture:** Mirror the data/auth layers' **DI-pure-function + thin-wrapper** rule. The `studio-profile` repo is the generic `createRepository` factory with a `studio-profile` uid; `findByAuthorEmail` is a thin function over the repo's `list` (with a `filters` query param), unit-tested against a fake `$Fetch`. `CENTER_OPTIONS`/`blankStudioProfile`/`validateStudioProfile` are pure and node-tested. The **fail-open** profile check is a small async function whose only job is to set `hasProfile` to `true` / `false` / `null`; its node test asserts that a **throwing** `findByAuthorEmail` yields `null` (no gate) and that a resolved-empty lookup for an author yields `false` (gate). The guard extension is a **pure** addition to `resolveAuthRedirect`, unit-tested exactly like the existing guard tests. The `/onboarding` page/form are **thin** over the pure validator + the `useStudioProfile().create`. Component tests use `mountSuspended` + `mockNuxtImport` (mirroring `tests/nuxt/dashboard.test.ts` / `request-review-form.test.ts`); pure logic is unit-tested in the fast node env. **No network in any test.**

**Tech Stack:** Nuxt 4 (SPA, `ssr: false`), Vue 3.5, Nuxt UI 4, Pinia 2.x, TypeScript, `ofetch` (`$api` for Strapi), Vitest + `@nuxt/test-utils` (node + the `nuxt` runtime env). **No new dependencies.**

## Global Constraints

*Every task's requirements implicitly include this section. Values are copied from the design spec (`docs/ICJIA-Research-Hub-Studio-2026-Design-and-Implementation-Spec.md`, §onboarding/profile) and the public shapes of the already-built data/auth/guard/fields layers, plus the LOCKED decisions the user confirmed for this plan.*

- **Stack:** Nuxt 4 **SPA** (`ssr: false`), **Nuxt UI 4**, Pinia 2.x, **TypeScript**. Pages live in `app/pages/`; the global route middleware (`app/middleware/auth.global.ts`) + `definePageMeta({ public, adminOnly })` + the pure `resolveAuthRedirect` already enforce default-deny. **This plan EXTENDS that one pure guard function + the one middleware that calls it** — it adds no second middleware.
- **Wire, do NOT recreate** (read their public shapes; never redefine):
  - **Data layer / repository:** `createRepository<TRaw, TDomain, TWrite>({ api, uid, relationFields, fromStrapi, toWrite })` in `app/lib/repository.ts` returns `{ list, findOne, create, update, remove, publish }` over the Strapi **admin Content-Manager API** (`base = /content-manager/collection-types/{uid}`), admin JWT attached by `$api`. `list(opts)` already forwards `query` params; **this plan passes a `filters` query param through a thin `findByAuthorEmail` helper** built on `list`. Envelopes/flatteners `unwrapList`/`unwrapOne` from `~/lib/strapi-rest` (list → `{ results, pagination }`; single/create → `{ data }`; create body is **FLAT**, not wrapped in `{data}`). Per-type repos `app/repositories/{articles,apps,datasets}.ts` + composables `app/composables/use{Articles,Apps,Datasets}.ts` are the pattern to copy for `studio-profile`.
  - **Auth/roles:** `useAuthStore()` (Pinia, cookie-persisted: `jwt`, `user`; getters `isLoggedIn` / `canPublish` / `roleCodes` / `displayName`; actions `setSession` / `setUser` / `clearSession`); `useAuth()` (`login` / `logout` / `init`, plus `isLoggedIn` / `user` / `canPublish` computeds). `app/lib/admin-roles.ts` (`canPublish(roleCodes)`, `PUBLISHER_ROLE_CODES`, `AUTHOR_ROLE_CODE = 'strapi-author'`). `AdminUser` has `email`. `fetchMe($api)` (`GET /admin/users/me`) populates roles; the profile check runs **after** it.
  - **Guard:** `app/middleware/auth.global.ts` calls `resolveAuthRedirect(ctx)` in `app/lib/guard.ts` (default-deny; `GuardContext = { path, isPublic, isAdminOnly, isLoggedIn, canPublish }`). `definePageMeta({ public, adminOnly })` sets the per-page flags.
  - **Fields + request-review:** `app/components/fields/SelectField.vue` (`{ modelValue: string|null; label; options: readonly string[] }`), `RepeatableField.vue`, `TextField.vue` (reuse — do not recreate); `isValidEmail` from `~/lib/review-email`; `app/components/RequestReviewForm.vue` (exposes `setReviewers(v)`/`setMessage(v)`/`send`/`error`/`busy`; currently the author types reviewer emails manually — onboarding **prefills** them).
- **The `studio-profile` Strapi type does NOT exist yet (LOCKED — the critical dependency).** The deployed sandbox is production-mode (content-type builder disabled), so the type cannot be created there. This plan **ships the Strapi schema** (`docs/onboarding-studio-profile-setup.md`, exact field definitions + schema JSON) for the **user** to create the type in their Strapi **dev** env. The code is built from the **validated-by-analogy** CM contract (the admin `list`+`create` family the data layer proved live for articles/apps/datasets behaves identically for any collection type). This plan does **NOT** claim a live `studio-profile` round-trip — it is **validated-at-runtime** by the user after they create the type.
- **FAIL-OPEN if the type/profile-check errors (LOCKED — the single most important safety property).** Because the type may not exist yet, the onboarding gate's profile lookup MUST be wrapped so that **any** error (404 / 400 / network / unexpected) is treated as "cannot determine — do NOT gate": log a `console.warn` and set `hasProfile = null` (unknown). The gate **only ACTIVATES** (redirect to `/onboarding`) when the lookup **SUCCEEDS** and returns **no profile** for a logged-in author (`hasProfile === false`). `null` (unknown / lookup failed / type missing) ⇒ **never gate**. This prevents bricking the app before the type exists, and is **explicitly tested** (a throwing `findByAuthorEmail` ⇒ `hasProfile === null` ⇒ no redirect).
- **Onboarding gates AUTHORS only (LOCKED).** An "author" here is a **logged-in user who cannot publish** (`isLoggedIn && !canPublish`). **Editors / Super-Admins are NEVER gated** (they can publish; the gate skips them entirely and the profile check never runs for them). The profile is found by `authorEmail == user.email`.
- **The `studio-profile` shape (LOCKED).** Domain `StudioProfile = { documentId: string; authorEmail: string; reviewers: string[]; center: string; publishedAt?: string | null }`. Strapi fields: `authorEmail` (string, **the lookup key — unique**), `reviewers` (a **JSON** field holding an array of email strings), `center` (string / enumeration). **`reviewers` is JSON, not a repeatable component** — chosen deliberately: a JSON array is the simplest shape for the CM `create` body (a plain `string[]` round-trips with no nested-component plumbing or per-item ids), it matches how the form already models the reviewer list (`string[]`), and it avoids a component schema the user would also have to hand-create. The exact Strapi schema is shipped in the setup doc.
- **Reviewers + center required (LOCKED).** The onboarding form requires **at least one valid reviewer email** (validated via `isValidEmail`) and a **center** (a `SelectField` over `CENTER_OPTIONS`). `authorEmail` is **prefilled from `user.email` and read-only**. All three must be present for `create`.
- **`CENTER_OPTIONS` is a PLACEHOLDER (LOCKED).** A handful of plausible ICJIA centers in a clearly-marked `readonly string[] as const`, with a header comment "PLACEHOLDER — user supplies the real list." The user replaces it later (a one-constant change).
- **Request-review prefill closes the Plan-6 loop (LOCKED).** When a profile exists, `RequestReviewForm` prefills its reviewer field from `studio-profile.reviewers`. This is a **small, additive** task that **degrades gracefully**: no profile (or a failing lookup) ⇒ the field is simply empty, exactly as today. The author may still edit the prefilled list before sending.
- **No secrets; no `data:` URLs.** Nothing new is exposed to the client beyond the existing Strapi origin. Pure/DI repo + helpers; thin composable + thin page/form; component/unit tests; mock all network. **Validated-at-runtime** (the type does not exist yet) — do **not** claim live. TDD (red → green → refactor), frequent commits, pristine test output. Commit messages carry **NO AI co-author trailer** (per project CLAUDE.md). **Do not bump the pinned Pinia 2.x stack; no new dependency.** Run `npx vitest run && npm run typecheck` green before the final commit.
- **Ship the Strapi schema doc** (`docs/onboarding-studio-profile-setup.md`) — the **user** creates the type from it; this plan writes no Strapi-side code.

## Explicitly deferred (noted here; NOT built in this plan)

- **Creating the `studio-profile` Strapi type** — a documented **USER** step (the schema + instructions ship in `docs/onboarding-studio-profile-setup.md`); the production sandbox's content-type builder is disabled, so the type is created in the Strapi **dev** env. No Strapi-side code here.
- **The real ICJIA centers list** — `CENTER_OPTIONS` ships as a clearly-marked placeholder; the user supplies the authoritative list (a one-constant change).
- **Editing / re-running onboarding after the fact** (a "Profile settings" page to change reviewers/center later) — not built here; once a profile exists the author is never re-gated. A later plan can add an editable settings surface (the repo already has `update`).
- **Manager / center directory features** (routing a draft to a center's editor, center-scoped queues) — future; this plan only captures the fields.
- **Per-author draft ownership** ("only my drafts") — a separate backend change, unrelated to the profile.
- **Onboarding for editors/super-admins** — out of scope by design; only authors are gated.
- **Full accessibility pass** — the new surfaces use labelled Nuxt UI primitives + `role="alert"` for errors, but the comprehensive a11y audit is a later phase.

## File structure

```
app/
├── types/
│   └── studio-profile.ts          # StudioProfile domain type + StudioProfileWrite + StrapiStudioProfile (raw)
├── lib/
│   ├── mappers/
│   │   └── studio-profile.ts       # studioProfileFromStrapi / studioProfileToWrite (FLAT write body)
│   ├── center-options.ts           # CENTER_OPTIONS (PLACEHOLDER — user supplies the real list)
│   ├── studio-profile-form.ts      # blankStudioProfile() + validateStudioProfile() (pure)
│   ├── profile-gate.ts             # resolveHasProfile(deps): the FAIL-OPEN author profile check
│   └── guard.ts                    # (edit) extend GuardContext + resolveAuthRedirect (onboarding redirect)
├── repositories/
│   └── studio-profile.ts           # createStudioProfileRepository(api) + findByAuthorEmail(repo, email)
├── composables/
│   └── useStudioProfile.ts         # binds $api → the studio-profile repo + findByAuthorEmail
├── stores/
│   └── auth.ts                     # (edit) add hasProfile: boolean|null state + setHasProfile action
├── middleware/
│   └── auth.global.ts              # (edit) pass isAuthor + hasProfile into resolveAuthRedirect
├── components/
│   └── RequestReviewForm.vue       # (edit) prefill reviewers from the profile (additive, graceful)
└── pages/
    └── onboarding.vue              # the first-login profile form (authorEmail RO / reviewers / center)

app/composables/useAuth.ts          # (edit) run the fail-open profile check after fetchMe in init()/login()

docs/
└── onboarding-studio-profile-setup.md  # the EXACT Strapi schema (fields + JSON) + create-the-type steps

tests/
├── unit/
│   ├── studio-profile-repo.test.ts      # fake $Fetch: findByAuthorEmail filters by authorEmail → first|null; create FLAT
│   ├── center-options.test.ts           # CENTER_OPTIONS non-empty, unique, strings
│   ├── studio-profile-form.test.ts      # blankStudioProfile shape; validateStudioProfile (reviewers/center required + valid)
│   ├── profile-gate.test.ts             # resolveHasProfile: error → null (FAIL-OPEN); empty → false; found → true; editor → null
│   └── guard-onboarding.test.ts         # resolveAuthRedirect: author+hasProfile=false → /onboarding; null/editor/on-page → no gate
└── nuxt/
    └── onboarding-form.test.ts          # authorEmail prefilled+RO; invalid/empty reviewers block create; clean create → repo.create + setHasProfile
    └── request-review-prefill.test.ts   # RequestReviewForm prefills reviewers from the profile; no profile → empty (graceful)
```

*(Pure logic tests run in the default node env. The two component specs declare `// @vitest-environment nuxt` and live under `tests/nuxt/` alongside `dashboard.test.ts` / `request-review-form.test.ts`.)*

---

### Task 1: `StudioProfile` type + mapper + the `studio-profile` repo (`findByAuthorEmail`) + `useStudioProfile`

**Files:**
- Create: `app/types/studio-profile.ts`
- Create: `app/lib/mappers/studio-profile.ts`
- Create: `app/repositories/studio-profile.ts`
- Create: `app/composables/useStudioProfile.ts`
- Test: `tests/unit/studio-profile-repo.test.ts`

**Interfaces:**
- `app/types/studio-profile.ts`:
  - `interface StudioProfile { documentId: string; authorEmail: string; reviewers: string[]; center: string; publishedAt?: string | null }`
  - `interface StudioProfileWrite { authorEmail: string; reviewers: string[]; center: string }` — the FLAT create body (no `documentId`, no `publishedAt`).
  - `interface StrapiStudioProfile { documentId: string; authorEmail: string; reviewers: string[] | null; center: string | null; publishedAt?: string | null }` — the raw Content-Manager row.
- `app/lib/mappers/studio-profile.ts`:
  - `studioProfileFromStrapi(raw: StrapiStudioProfile): StudioProfile` — coerces `reviewers ?? []` and `center ?? ''`, passes `documentId`/`authorEmail`/`publishedAt`.
  - `studioProfileToWrite(model: StudioProfile): StudioProfileWrite` — `{ authorEmail, reviewers, center }` only (FLAT, like the other `toWrite`s).
- `app/repositories/studio-profile.ts`:
  - `createStudioProfileRepository(api: $Fetch): Repository<StudioProfile>` — `createRepository` with `uid: 'api::studio-profile.studio-profile'`, `relationFields: []`, the mapper above.
  - `findByAuthorEmail(repo: Repository<StudioProfile>, email: string): Promise<StudioProfile | null>` — calls `repo.list({ filters: { authorEmail: { $eq: email } } })` (passed through `list`'s `query`) and returns the first result or `null`. **NOTE the `list` extension below.**
- `app/composables/useStudioProfile.ts`:
  - `useStudioProfile()` → `{ repo: Repository<StudioProfile>; findByAuthorEmail(email): Promise<StudioProfile | null> }` bound to `$api`.

> **The `findByAuthorEmail` lookup (LOCKED).** The Content-Manager list endpoint supports a `filters` query param (the same admin API the data layer validated). `findByAuthorEmail` is a thin wrapper over `repo.list`, passing `filters: { authorEmail: { $eq: email } }`; it maps to the first row (or `null`). To carry `filters` through, **extend `ListOptions` + the repo's `list` query with an optional `filters?: Record<string, unknown>`** (a minimal, backward-compatible addition — existing callers pass no `filters`, so nothing changes for them). **Validated-by-analogy:** the filtered-list shape is the same `{ results, pagination }` envelope the data layer proved; this plan does not claim a live `studio-profile` query (the type does not exist yet) — the unit test asserts the request shape + the first-or-null mapping with a fake `$Fetch`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/studio-profile-repo.test.ts
import { describe, it, expect, vi } from 'vitest'
import { createStudioProfileRepository, findByAuthorEmail } from '~/repositories/studio-profile'
import type { $Fetch } from 'ofetch'

const UID = 'api::studio-profile.studio-profile'
const BASE = `/content-manager/collection-types/${UID}`

describe('studio-profile repository', () => {
  it('findByAuthorEmail filters the list by authorEmail and returns the FIRST result', async () => {
    const api = vi.fn().mockResolvedValue({
      results: [{ documentId: 'p1', authorEmail: 'author@icjia.illinois.gov', reviewers: ['mgr@icjia.illinois.gov'], center: 'Research & Analysis' }],
      pagination: { page: 1, pageSize: 25, pageCount: 1, total: 1 },
    }) as unknown as $Fetch

    const repo = createStudioProfileRepository(api)
    const out = await findByAuthorEmail(repo, 'author@icjia.illinois.gov')

    // The list GET carries a filters query keyed by authorEmail ($eq).
    expect(api).toHaveBeenCalledWith(
      BASE,
      expect.objectContaining({
        query: expect.objectContaining({ filters: { authorEmail: { $eq: 'author@icjia.illinois.gov' } } }),
      }),
    )
    expect(out).not.toBeNull()
    expect(out!.documentId).toBe('p1')
    expect(out!.reviewers).toEqual(['mgr@icjia.illinois.gov'])
    expect(out!.center).toBe('Research & Analysis')
  })

  it('findByAuthorEmail returns null when no row matches', async () => {
    const api = vi.fn().mockResolvedValue({ results: [], pagination: { page: 1, pageSize: 25, pageCount: 0, total: 0 } }) as unknown as $Fetch
    const repo = createStudioProfileRepository(api)
    expect(await findByAuthorEmail(repo, 'nobody@icjia.illinois.gov')).toBeNull()
  })

  it('create POSTs a FLAT body of { authorEmail, reviewers, center }', async () => {
    const api = vi.fn().mockResolvedValue({
      data: { documentId: 'p2', authorEmail: 'new@icjia.illinois.gov', reviewers: ['m@icjia.illinois.gov'], center: 'Federal & State Grants' },
    }) as unknown as $Fetch
    const repo = createStudioProfileRepository(api)

    await repo.create({ documentId: '', authorEmail: 'new@icjia.illinois.gov', reviewers: ['m@icjia.illinois.gov'], center: 'Federal & State Grants', publishedAt: null })

    expect(api).toHaveBeenCalledWith(
      BASE,
      expect.objectContaining({
        method: 'POST',
        body: { authorEmail: 'new@icjia.illinois.gov', reviewers: ['m@icjia.illinois.gov'], center: 'Federal & State Grants' },
      }),
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/studio-profile-repo.test.ts`
Expected: FAIL — `Cannot find module '~/repositories/studio-profile'`.

- [ ] **Step 3: Extend `ListOptions` + the repo `list` query to carry `filters` (minimal, backward-compatible)**

In `app/lib/repository.ts`, add `filters` to `ListOptions` and forward it in `list`'s `query`:

```ts
// app/lib/repository.ts  — ListOptions (add filters)
export interface ListOptions {
  status?: ContentStatus
  page?: number
  pageSize?: number
  sort?: string
  /** Content-Manager filters, e.g. { authorEmail: { $eq: 'a@x.gov' } }. Backward-compatible: existing callers omit it. */
  filters?: Record<string, unknown>
}
```

```ts
// app/lib/repository.ts  — inside list(), the query object (add filters)
    async list(opts = {}) {
      const res = await cfg.api<StrapiListResponse<TRaw>>(base, {
        query: {
          status: opts.status,
          page: opts.page,
          pageSize: opts.pageSize,
          sort: opts.sort,
          filters: opts.filters,
        },
      })
      return unwrapList(res).map((raw) => cfg.fromStrapi(raw))
    },
```

*`ofetch` omits `undefined` query keys, so existing `list()` calls (no `filters`) send exactly the same request as before — no existing repository test changes.*

- [ ] **Step 4: Write the type + mapper + repo + composable**

```ts
// app/types/studio-profile.ts
// The per-author Studio profile captured at first-login onboarding (Plan 7). Keyed by the
// author's admin email (authorEmail — the unique lookup key). `reviewers` is a JSON array of
// reviewer/manager email strings (prefilled into the Plan-6 Request-review form). `center` is
// the author's ICJIA center. publishedAt is Strapi's Draft & Publish marker (unused by the gate).
export interface StudioProfile {
  documentId: string
  authorEmail: string
  reviewers: string[]
  center: string
  publishedAt?: string | null
}

/** FLAT create/update body (no documentId / publishedAt) — mirrors the other *Write payloads. */
export interface StudioProfileWrite {
  authorEmail: string
  reviewers: string[]
  center: string
}

/** Raw Content-Manager row (reviewers/center may come back null on a partially-filled record). */
export interface StrapiStudioProfile {
  documentId: string
  authorEmail: string
  reviewers: string[] | null
  center: string | null
  publishedAt?: string | null
}
```

```ts
// app/lib/mappers/studio-profile.ts
// Map the Content-Manager studio-profile row ↔ the domain StudioProfile. The write body is FLAT
// (authorEmail/reviewers/center only) like every other *ToWrite — the CM create endpoint takes a
// flat body, NOT a { data } wrapper.
import type { StudioProfile, StudioProfileWrite, StrapiStudioProfile } from '~/types/studio-profile'

export function studioProfileFromStrapi(raw: StrapiStudioProfile): StudioProfile {
  return {
    documentId: raw.documentId,
    authorEmail: raw.authorEmail,
    reviewers: raw.reviewers ?? [],
    center: raw.center ?? '',
    publishedAt: raw.publishedAt ?? null,
  }
}

export function studioProfileToWrite(model: StudioProfile): StudioProfileWrite {
  return { authorEmail: model.authorEmail, reviewers: model.reviewers, center: model.center }
}
```

```ts
// app/repositories/studio-profile.ts
// The studio-profile data access (Plan 7). The generic Content-Manager repository, addressed by
// the studio-profile uid, plus a thin findByAuthorEmail lookup: a filtered list (authorEmail $eq)
// → the first row or null. NOTE: the studio-profile collection type does NOT exist on the
// production sandbox yet — it is created by the user in their Strapi dev env from
// docs/onboarding-studio-profile-setup.md. Built from the validated-by-analogy CM list/create
// contract; the caller (the fail-open gate) treats any lookup error as "unknown" (never gates).
import type { $Fetch } from 'ofetch'
import { createRepository, type Repository } from '~/lib/repository'
import { studioProfileFromStrapi, studioProfileToWrite } from '~/lib/mappers/studio-profile'
import type { StudioProfile, StudioProfileWrite, StrapiStudioProfile } from '~/types/studio-profile'

export const STUDIO_PROFILE_UID = 'api::studio-profile.studio-profile'

export function createStudioProfileRepository(api: $Fetch): Repository<StudioProfile> {
  return createRepository<StrapiStudioProfile, StudioProfile, StudioProfileWrite>({
    api,
    uid: STUDIO_PROFILE_UID,
    relationFields: [],
    fromStrapi: studioProfileFromStrapi,
    toWrite: studioProfileToWrite,
  })
}

/** Find a profile by the author's email (the unique lookup key). Returns the first match or null. */
export async function findByAuthorEmail(
  repo: Repository<StudioProfile>,
  email: string,
): Promise<StudioProfile | null> {
  const rows = await repo.list({ filters: { authorEmail: { $eq: email } } })
  return rows[0] ?? null
}
```

```ts
// app/composables/useStudioProfile.ts
// Studio-profile data access bound to the configured $api client (Plan 7). Exposes the repo plus
// the findByAuthorEmail lookup the onboarding gate uses.
import { createStudioProfileRepository, findByAuthorEmail } from '~/repositories/studio-profile'
import type { StudioProfile } from '~/types/studio-profile'

export function useStudioProfile() {
  const { $api } = useNuxtApp()
  const repo = createStudioProfileRepository($api)
  return {
    repo,
    findByAuthorEmail: (email: string): Promise<StudioProfile | null> => findByAuthorEmail(repo, email),
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/unit/studio-profile-repo.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Confirm the existing repository tests still pass (the `filters` addition is backward-compatible) + typecheck**

Run: `npx vitest run tests/unit/repository.test.ts tests/unit/repositories.test.ts && npm run typecheck`
Expected: all PASS; typecheck exit 0. (The `list` query now also carries `filters: undefined` for filter-less calls; `ofetch` drops `undefined` keys, so the existing `toHaveBeenCalledWith(BASE, objectContaining({ query: objectContaining({ status }) }))` assertions still match.)

- [ ] **Step 7: Commit**

```bash
git add app/types/studio-profile.ts app/lib/mappers/studio-profile.ts app/repositories/studio-profile.ts app/composables/useStudioProfile.ts app/lib/repository.ts tests/unit/studio-profile-repo.test.ts
git commit -m "feat(studio): add studio-profile type/mapper/repo (findByAuthorEmail) + composable"
```

---

### Task 2: `CENTER_OPTIONS` placeholder + `blankStudioProfile()` + `validateStudioProfile()`

**Files:**
- Create: `app/lib/center-options.ts`
- Create: `app/lib/studio-profile-form.ts`
- Test: `tests/unit/center-options.test.ts`, `tests/unit/studio-profile-form.test.ts`

**Interfaces:**
- `app/lib/center-options.ts`:
  - `CENTER_OPTIONS: readonly string[]` — a `readonly string[] as const` PLACEHOLDER list of plausible ICJIA centers, with a clear "user supplies the real list" header.
- `app/lib/studio-profile-form.ts` (pure):
  - `blankStudioProfile(authorEmail = ''): StudioProfile` — `{ documentId: '', authorEmail, reviewers: [], center: '', publishedAt: null }` (seeds the onboarding form, prefilling the email).
  - `validateStudioProfile(p: StudioProfile): FieldError[]` — returns `{ field, message }[]` (reusing the existing `FieldError` shape from `~/lib/validators/article`). Rules: **reviewers** must have at least one entry and **every** entry must pass `isValidEmail` (`field: 'reviewers'`); **center** must be non-empty (`field: 'center'`). `authorEmail` is read-only/prefilled and assumed present (validated by the page guard), but a missing one also errors (`field: 'authorEmail'`) for safety.

> **Why a dedicated validator (mirrors the forms layer):** onboarding does not reuse `validate{Article,App,Dataset}` (different shape), so it gets its own small pure validator returning the same `FieldError[]` type the form surfaces per-field. It reuses `isValidEmail` from `~/lib/review-email` (the same address check Plan 6 uses) so the "valid reviewer email" rule is identical everywhere. `CENTER_OPTIONS` is a placeholder constant — the test asserts only that it is a non-empty, unique list of strings, so swapping in the real centers later does not break the test.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/unit/center-options.test.ts
import { describe, it, expect } from 'vitest'
import { CENTER_OPTIONS } from '~/lib/center-options'

describe('CENTER_OPTIONS (placeholder)', () => {
  it('is a non-empty list of unique non-blank strings', () => {
    expect(CENTER_OPTIONS.length).toBeGreaterThan(0)
    expect(CENTER_OPTIONS.every((c) => typeof c === 'string' && c.trim().length > 0)).toBe(true)
    expect(new Set(CENTER_OPTIONS).size).toBe(CENTER_OPTIONS.length)
  })
})
```

```ts
// tests/unit/studio-profile-form.test.ts
import { describe, it, expect } from 'vitest'
import { blankStudioProfile, validateStudioProfile } from '~/lib/studio-profile-form'

describe('blankStudioProfile', () => {
  it('returns an empty profile, prefilling the author email', () => {
    const p = blankStudioProfile('author@icjia.illinois.gov')
    expect(p.documentId).toBe('')
    expect(p.authorEmail).toBe('author@icjia.illinois.gov')
    expect(p.reviewers).toEqual([])
    expect(p.center).toBe('')
    expect(p.publishedAt).toBeNull()
  })
})

describe('validateStudioProfile', () => {
  const ok = { documentId: '', authorEmail: 'author@icjia.illinois.gov', reviewers: ['mgr@icjia.illinois.gov'], center: 'Research & Analysis', publishedAt: null }

  it('passes a complete, valid profile', () => {
    expect(validateStudioProfile(ok)).toEqual([])
  })

  it('requires at least one reviewer', () => {
    const errs = validateStudioProfile({ ...ok, reviewers: [] })
    expect(errs.some((e) => e.field === 'reviewers')).toBe(true)
  })

  it('rejects an invalid reviewer email', () => {
    const errs = validateStudioProfile({ ...ok, reviewers: ['mgr@icjia.illinois.gov', 'not-an-email'] })
    expect(errs.some((e) => e.field === 'reviewers')).toBe(true)
  })

  it('requires a center', () => {
    const errs = validateStudioProfile({ ...ok, center: '' })
    expect(errs.some((e) => e.field === 'center')).toBe(true)
  })

  it('requires the author email', () => {
    const errs = validateStudioProfile({ ...ok, authorEmail: '' })
    expect(errs.some((e) => e.field === 'authorEmail')).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/center-options.test.ts tests/unit/studio-profile-form.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write the placeholder + the pure helpers**

```ts
// app/lib/center-options.ts
// PLACEHOLDER — user supplies the real list. A handful of plausible ICJIA centers so the
// onboarding center dropdown is functional in development. Replace this single constant with the
// authoritative center list when it is available (no other change is required — the SelectField
// and the validator read this array as-is).
export const CENTER_OPTIONS = [
  'Research & Analysis',
  'Federal & State Grants',
  'Criminal Justice Information',
  'Adjudication & Corrections',
  'Violence Prevention',
  'Other',
] as const
```

```ts
// app/lib/studio-profile-form.ts
// Pure form helpers for first-login onboarding (Plan 7). blankStudioProfile seeds the form
// (prefilling the author's email); validateStudioProfile enforces the required fields BEFORE any
// write — reviewers (≥1, each a valid email via the shared isValidEmail) and center are required;
// authorEmail is prefilled+read-only but also guarded here for safety. Returns the same FieldError[]
// the forms layer surfaces per-field.
import { isValidEmail } from '~/lib/review-email'
import type { FieldError } from '~/lib/validators/article'
import type { StudioProfile } from '~/types/studio-profile'

export function blankStudioProfile(authorEmail = ''): StudioProfile {
  return { documentId: '', authorEmail, reviewers: [], center: '', publishedAt: null }
}

export function validateStudioProfile(p: StudioProfile): FieldError[] {
  const errors: FieldError[] = []

  if (!p.authorEmail || !p.authorEmail.trim()) {
    errors.push({ field: 'authorEmail', message: 'Your email is required.' })
  }

  const reviewers = (p.reviewers ?? []).map((r) => r.trim()).filter(Boolean)
  if (reviewers.length === 0) {
    errors.push({ field: 'reviewers', message: 'Enter at least one reviewer/manager email.' })
  } else {
    const bad = reviewers.find((r) => !isValidEmail(r))
    if (bad) errors.push({ field: 'reviewers', message: `Invalid reviewer email: ${bad}` })
  }

  if (!p.center || !p.center.trim()) {
    errors.push({ field: 'center', message: 'Select your center.' })
  }

  return errors
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/center-options.test.ts tests/unit/studio-profile-form.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add app/lib/center-options.ts app/lib/studio-profile-form.ts tests/unit/center-options.test.ts tests/unit/studio-profile-form.test.ts
git commit -m "feat(studio): add CENTER_OPTIONS placeholder + blank/validate studio-profile helpers"
```

---

### Task 3: The auth-store `hasProfile` flag + the FAIL-OPEN profile check (`resolveHasProfile`) wired into `useAuth`

**Files:**
- Edit: `app/stores/auth.ts` (add `hasProfile: boolean | null` state + `setHasProfile` action)
- Create: `app/lib/profile-gate.ts` (the pure, DI fail-open check `resolveHasProfile`)
- Edit: `app/composables/useAuth.ts` (run the check after `fetchMe` in `init()` + `login()`)
- Test: `tests/unit/profile-gate.test.ts`

**Interfaces:**
- `app/stores/auth.ts`:
  - State adds `hasProfile: boolean | null` (initial `null` = unknown / not-yet-checked). **This is NOT persisted as authoritative** — it is re-derived on every `init`/`login`; `null` is the safe default and means "do not gate." (The cookie persists it harmlessly; `init` overwrites it.)
  - Action `setHasProfile(v: boolean | null)`.
  - `clearSession` also resets `hasProfile = null`.
- `app/lib/profile-gate.ts` (pure, DI — **the fail-open core**):
  - `interface ProfileGateDeps { canPublish: boolean; email: string | null | undefined; findByAuthorEmail: (email: string) => Promise<{ documentId: string } | null> }`
  - `async function resolveHasProfile(deps: ProfileGateDeps): Promise<boolean | null>` —
    - if `deps.canPublish` ⇒ return `null` (editors/super-admins are NEVER gated; skip the check entirely).
    - if no `deps.email` ⇒ return `null` (cannot look up; do not gate).
    - else `try { const p = await deps.findByAuthorEmail(email); return p != null }` — a resolved lookup ⇒ `true` (profile exists) or `false` (no profile for this author).
    - `catch (e) { console.warn('[onboarding] profile lookup failed; not gating', e); return null }` — **ANY error (404/400/network/type-missing) ⇒ `null` ⇒ never gate.** This is the single most important safety property.
- `app/composables/useAuth.ts`:
  - Extract a private `refreshProfileGate()` that builds `resolveHasProfile` deps from the store + `useStudioProfile().findByAuthorEmail`, awaits it, and calls `store.setHasProfile(...)`.
  - `login()`: after `store.setUser(me)`, `await refreshProfileGate()` before returning `me`.
  - `init()`: in the `try` after `store.setUser(me)`, `await refreshProfileGate()`. (Leave the dev-admin early-returns untouched; the dev admin can publish, so the gate resolves to `null` anyway.)
  - Export `hasProfile: computed(() => store.hasProfile)` from `useAuth()` (handy for tests / the page).

> **The fail-open contract (LOCKED — tested):** `resolveHasProfile` is pure and dependency-injected, so its node test passes a **throwing** `findByAuthorEmail` and asserts the result is `null` (never gate) — proving the app cannot be bricked before the `studio-profile` type exists. It also asserts: an editor (`canPublish: true`) ⇒ `null` (skipped, lookup not even called); an author with no email ⇒ `null`; an author whose lookup resolves **empty** ⇒ `false` (the only state that gates); an author whose lookup resolves a profile ⇒ `true`. `useAuth` is the thin wrapper that feeds the real store + composable in — the wiring change is small and the **decision** is entirely in the tested pure function. The check runs **after** `fetchMe` so `canPublish`/`email` are populated.

- [ ] **Step 1: Write the failing test (the pure fail-open check)**

```ts
// tests/unit/profile-gate.test.ts
import { describe, it, expect, vi } from 'vitest'
import { resolveHasProfile } from '~/lib/profile-gate'

describe('resolveHasProfile (FAIL-OPEN author profile check)', () => {
  it('returns null for a publisher (editors/super-admins are never gated; lookup not called)', async () => {
    const findByAuthorEmail = vi.fn()
    const out = await resolveHasProfile({ canPublish: true, email: 'editor@icjia.illinois.gov', findByAuthorEmail })
    expect(out).toBeNull()
    expect(findByAuthorEmail).not.toHaveBeenCalled()
  })

  it('returns null when the author has no email (cannot look up; do not gate)', async () => {
    const out = await resolveHasProfile({ canPublish: false, email: null, findByAuthorEmail: vi.fn() })
    expect(out).toBeNull()
  })

  it('returns false when an author lookup resolves with NO profile (the only state that gates)', async () => {
    const findByAuthorEmail = vi.fn().mockResolvedValue(null)
    const out = await resolveHasProfile({ canPublish: false, email: 'author@icjia.illinois.gov', findByAuthorEmail })
    expect(out).toBe(false)
    expect(findByAuthorEmail).toHaveBeenCalledWith('author@icjia.illinois.gov')
  })

  it('returns true when an author lookup resolves a profile', async () => {
    const findByAuthorEmail = vi.fn().mockResolvedValue({ documentId: 'p1' })
    const out = await resolveHasProfile({ canPublish: false, email: 'author@icjia.illinois.gov', findByAuthorEmail })
    expect(out).toBe(true)
  })

  it('FAIL-OPEN: returns null when the lookup THROWS (type missing / 404 / network) — never gates', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const findByAuthorEmail = vi.fn().mockRejectedValue(new Error('404 Not Found (studio-profile type does not exist)'))
    const out = await resolveHasProfile({ canPublish: false, email: 'author@icjia.illinois.gov', findByAuthorEmail })
    expect(out).toBeNull()
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/profile-gate.test.ts`
Expected: FAIL — `Cannot find module '~/lib/profile-gate'`.

- [ ] **Step 3: Write the pure fail-open check**

```ts
// app/lib/profile-gate.ts
// The FAIL-OPEN first-login profile check (Plan 7 — the single most important safety property).
// Determines whether a LOGGED-IN AUTHOR has completed onboarding, returning:
//   true   — the author has a studio-profile (do not gate)
//   false  — the lookup RESOLVED and the author has NO profile (the ONLY state that gates)
//   null   — unknown / do not gate: a publisher (never gated), no email, OR ANY lookup error
//            (404 / 400 / network / the studio-profile type not existing yet). Pure + DI so the
//            fail-open behaviour is node-tested with a throwing findByAuthorEmail.
export interface ProfileGateDeps {
  /** Editors/super-admins (canPublish) are NEVER gated — the check is skipped for them. */
  canPublish: boolean
  /** The author's admin email (the profile lookup key). */
  email: string | null | undefined
  /** Resolve the author's profile (or null). May THROW if the type does not exist yet. */
  findByAuthorEmail: (email: string) => Promise<{ documentId: string } | null>
}

export async function resolveHasProfile(deps: ProfileGateDeps): Promise<boolean | null> {
  // Publishers are never gated.
  if (deps.canPublish) return null
  // Without an email we cannot look up a profile — do not gate.
  if (!deps.email) return null

  try {
    const profile = await deps.findByAuthorEmail(deps.email)
    return profile != null
  } catch (e) {
    // FAIL-OPEN: any error (incl. the studio-profile type not existing yet) ⇒ unknown ⇒ never gate.
    console.warn('[onboarding] profile lookup failed; not gating', e)
    return null
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/profile-gate.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Add the store flag + wire `useAuth` (with the existing store test still green)**

Add `hasProfile` to the auth store:

```ts
// app/stores/auth.ts  — AuthState
interface AuthState {
  jwt: string | null
  user: AdminUser | null
  /** First-login onboarding gate: true=has profile, false=needs onboarding, null=unknown/skip-gate. */
  hasProfile: boolean | null
}
```

```ts
// app/stores/auth.ts  — state()
  state: (): AuthState => ({ jwt: null, user: null, hasProfile: null }),
```

```ts
// app/stores/auth.ts  — actions (add setHasProfile; reset it in clearSession)
    setHasProfile(value: boolean | null) {
      this.hasProfile = value
    },
    clearSession() {
      this.jwt = null
      this.user = null
      this.hasProfile = null
    },
```

Wire the fail-open check into `useAuth` (after `fetchMe`):

```ts
// app/composables/useAuth.ts  (full file after edits)
import { loginRequest, fetchMe } from '~/lib/auth'
import { resolveHasProfile } from '~/lib/profile-gate'
// DEV-ONLY — remove before production (see app/lib/dev-auth.ts header).
import { matchesDevAdmin, isDevAdminToken, makeDevAdminSession } from '~/lib/dev-auth'

export function useAuth() {
  const store = useAuthStore()
  const { $api } = useNuxtApp()

  /** Re-derive the first-login onboarding gate flag (FAIL-OPEN: any error ⇒ null ⇒ no gate). */
  async function refreshProfileGate() {
    const { findByAuthorEmail } = useStudioProfile()
    const hasProfile = await resolveHasProfile({
      canPublish: store.canPublish,
      email: store.user?.email,
      findByAuthorEmail,
    })
    store.setHasProfile(hasProfile)
  }

  /** Admin login: get token + user, then load the user WITH roles from /admin/users/me. */
  async function login(email: string, password: string) {
    if (import.meta.dev && matchesDevAdmin(email, password)) {
      const session = makeDevAdminSession()
      store.setSession(session)
      console.warn('[dev-auth] Signed in with the fixed dev admin bypass — NOT a real Strapi session.')
      return session.user
    }
    const { jwt, user } = await loginRequest($api, email, password)
    store.setSession({ jwt, user }) // set token first so $api attaches it
    const me = await fetchMe($api)  // /admin/users/me returns the user WITH roles
    store.setUser(me)
    await refreshProfileGate()      // FAIL-OPEN: errors ⇒ hasProfile null ⇒ never gate
    return me
  }

  async function logout() {
    store.clearSession()
    await navigateTo('/login')
  }

  /** Re-verify the persisted session against the admin API on app boot. */
  async function init() {
    if (!store.jwt) return
    if (import.meta.dev && isDevAdminToken(store.jwt)) return // synthetic dev session — keep across reloads
    try {
      const me = await fetchMe($api)
      store.setUser(me)
      await refreshProfileGate()    // FAIL-OPEN: errors ⇒ hasProfile null ⇒ never gate
    } catch {
      // Deliberate no-op: a 401 is handled globally by the $api interceptor (clears session,
      // redirects to /login). For transient failures (network/5xx) keep the session — the
      // token may still be valid on recovery, and the server enforces authz on every request.
    }
  }

  return {
    login,
    logout,
    init,
    isLoggedIn: computed(() => store.isLoggedIn),
    user: computed(() => store.user),
    canPublish: computed(() => store.canPublish),
    hasProfile: computed(() => store.hasProfile),
  }
}
```

*`useStudioProfile` / `useAuthStore` / `useNuxtApp` / `navigateTo` / `computed` are Nuxt auto-imports. `refreshProfileGate` itself never throws (the gate swallows lookup errors); in `init`, even if it somehow did, the surrounding `try/catch` keeps the session — onboarding can never break boot.*

- [ ] **Step 6: Run the auth-store test (still green) + typecheck**

Run: `npx vitest run tests/unit/auth-store.test.ts && npm run typecheck`
Expected: auth-store PASS (the added `hasProfile` defaults to `null` and does not affect the existing assertions); typecheck exit 0.

- [ ] **Step 7: Commit**

```bash
git add app/stores/auth.ts app/lib/profile-gate.ts app/composables/useAuth.ts tests/unit/profile-gate.test.ts
git commit -m "feat(studio): add hasProfile flag + fail-open onboarding profile check in useAuth"
```

---

### Task 4: Extend the guard — author + `hasProfile === false` + not-on-/onboarding ⇒ redirect `/onboarding`

**Files:**
- Edit: `app/lib/guard.ts` (extend `GuardContext` + `resolveAuthRedirect`)
- Edit: `app/middleware/auth.global.ts` (pass `isAuthor` + `hasProfile`)
- Test: `tests/unit/guard-onboarding.test.ts` (the new onboarding branch; the existing `guard.test.ts` stays green)

**Interfaces:**
- `app/lib/guard.ts`:
  - `GuardContext` gains `isAuthor: boolean` and `hasProfile: boolean | null`.
  - `resolveAuthRedirect(ctx)` — **add the onboarding redirect AFTER the existing private/admin checks, before the final `return null`:** if `ctx.isLoggedIn && ctx.isAuthor && ctx.hasProfile === false && ctx.path !== '/onboarding'` ⇒ return `'/onboarding'`. Everything else is unchanged. `hasProfile === null` (unknown) ⇒ no onboarding redirect; a publisher (`isAuthor === false`) ⇒ no onboarding redirect; already on `/onboarding` ⇒ no redirect (so the page itself is reachable).
- `app/middleware/auth.global.ts`:
  - Compute `isAuthor = auth.isLoggedIn && !auth.canPublish` and pass `isAuthor` + `hasProfile: auth.hasProfile` into the context.

> **Pure guard extension (mirrors the existing guard tests):** the onboarding rule is one strict-equality branch added to the already-pure `resolveAuthRedirect`, unit-tested with the same `ctx(over)` helper idiom as `tests/unit/guard.test.ts`. **`hasProfile === false` is the ONLY gating state** — `null` (unknown / lookup failed / type missing — the fail-open default) and `true` both pass, and the path-exclusion keeps `/onboarding` itself reachable while gated. The middleware change is the thin wiring that feeds `isAuthor`/`hasProfile` from the store. **`/onboarding` is NOT marked `public`** (it must stay behind login) and NOT `adminOnly` (authors must reach it); a logged-out user hitting `/onboarding` is still bounced to `/login` by the existing `!isLoggedIn` rule, which runs first.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/guard-onboarding.test.ts
import { describe, it, expect } from 'vitest'
import { resolveAuthRedirect } from '~/lib/guard'

// Default ctx: a logged-in AUTHOR (cannot publish) with a resolved-missing profile on a normal page.
const ctx = (over = {}) => ({
  path: '/', isPublic: false, isAdminOnly: false, isLoggedIn: true,
  canPublish: false, isAuthor: true, hasProfile: false as boolean | null, ...over,
})

describe('resolveAuthRedirect — onboarding gate', () => {
  it('redirects a logged-in author with NO profile to /onboarding', () => {
    expect(resolveAuthRedirect(ctx())).toBe('/onboarding')
  })

  it('does NOT redirect when already on /onboarding (the page stays reachable)', () => {
    expect(resolveAuthRedirect(ctx({ path: '/onboarding' }))).toBeNull()
  })

  it('does NOT gate when hasProfile is null (unknown / lookup failed / type missing — fail-open)', () => {
    expect(resolveAuthRedirect(ctx({ hasProfile: null }))).toBeNull()
  })

  it('does NOT gate when the author already has a profile', () => {
    expect(resolveAuthRedirect(ctx({ hasProfile: true }))).toBeNull()
  })

  it('NEVER gates a publisher (editor/super-admin), even with hasProfile false', () => {
    expect(resolveAuthRedirect(ctx({ isAuthor: false, canPublish: true, hasProfile: false }))).toBeNull()
  })

  it('still sends a logged-out visitor to /login before any onboarding logic', () => {
    expect(resolveAuthRedirect(ctx({ isLoggedIn: false }))).toBe('/login')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/guard-onboarding.test.ts`
Expected: FAIL — `resolveAuthRedirect` does not redirect to `/onboarding` yet (returns `null` for the author-no-profile case), and the `GuardContext` type lacks `isAuthor`/`hasProfile`.

- [ ] **Step 3: Extend the guard + the middleware**

```ts
// app/lib/guard.ts
export interface GuardContext {
  path: string
  isPublic: boolean
  isAdminOnly: boolean
  isLoggedIn: boolean
  canPublish: boolean
  /** A logged-in user who cannot publish (the only role gated by first-login onboarding). */
  isAuthor: boolean
  /** First-login onboarding gate: true=has profile, false=needs onboarding, null=unknown/skip-gate. */
  hasProfile: boolean | null
}

/** Returns a redirect path, or null to allow. Default-deny: only `isPublic` routes are open. */
export function resolveAuthRedirect(ctx: GuardContext): string | null {
  if (ctx.isPublic) {
    return ctx.isLoggedIn && ctx.path === '/login' ? '/' : null
  }
  if (!ctx.isLoggedIn) return '/login'
  if (ctx.isAdminOnly && !ctx.canPublish) return '/'
  // First-login onboarding: gate AUTHORS (only) whose profile RESOLVED as missing (hasProfile===false).
  // null (unknown / lookup failed / type missing) ⇒ fail-open (no gate); /onboarding stays reachable.
  if (ctx.isAuthor && ctx.hasProfile === false && ctx.path !== '/onboarding') return '/onboarding'
  return null
}
```

```ts
// app/middleware/auth.global.ts
import { resolveAuthRedirect } from '~/lib/guard'

export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore()
  const redirect = resolveAuthRedirect({
    path: to.path,
    isPublic: to.meta.public === true,
    isAdminOnly: to.meta.adminOnly === true,
    isLoggedIn: auth.isLoggedIn,
    canPublish: auth.canPublish,
    // An author is a logged-in user who cannot publish — the only role first-login onboarding gates.
    isAuthor: auth.isLoggedIn && !auth.canPublish,
    hasProfile: auth.hasProfile,
  })
  if (redirect && redirect !== to.path) return navigateTo(redirect)
})
```

- [ ] **Step 4: Run both guard tests to verify they pass**

Run: `npx vitest run tests/unit/guard.test.ts tests/unit/guard-onboarding.test.ts`
Expected: PASS — the existing guard tests still pass (their `ctx` omits `isAuthor`/`hasProfile`, which are `undefined`; `undefined !== false`, so the new branch never fires for them), and the new onboarding branch passes.

*Note: the existing `tests/unit/guard.test.ts` `ctx` helper does not set `isAuthor`/`hasProfile`. Because the onboarding branch requires `hasProfile === false` (strict), `undefined` does not trigger it, so those tests remain green WITHOUT editing them. Leave `guard.test.ts` untouched.*

- [ ] **Step 5: Commit**

```bash
git add app/lib/guard.ts app/middleware/auth.global.ts tests/unit/guard-onboarding.test.ts
git commit -m "feat(studio): gate authors with no profile to /onboarding (fail-open; publishers exempt)"
```

---

### Task 5: The `/onboarding` page + form (authorEmail RO / reviewers / center → create → set flag → navigate)

**Files:**
- Create: `app/pages/onboarding.vue`
- Test: `tests/nuxt/onboarding-form.test.ts`

**Interfaces:**
- `app/pages/onboarding.vue`:
  - `definePageMeta({})` — **NOT** `public` (stays behind login), **NOT** `adminOnly` (authors must reach it). It is reachable while gated because the guard excludes `/onboarding` from its own redirect (Task 4).
  - Seeds a local `reactive` model via `blankStudioProfile(user.email)` (the email prefilled, read-only). Fields: a read-only `authorEmail` (a disabled `TextField`/`UInput` showing `user.email`), a `RepeatableField` (or a small reviewer list) for `reviewers` (one-or-more, required + validated), and a `SelectField` over `CENTER_OPTIONS` for `center`.
  - On submit: run `validateStudioProfile(model)`; if errors, surface them per-field + a toast and do **not** write. On clean: `await useStudioProfile().repo.create(model)`, then `useAuthStore().setHasProfile(true)`, then `navigateTo('/')`.
  - Exposes (for tests) `setReviewers(list: string[])`, `setCenter(v: string)`, `submit()`, `errors`, `authorEmail` (a readonly computed of the prefilled email).

> **Thin page over the pure validator + the repo (mirrors `ArticleForm`/`RequestReviewForm`):** all the rules live in `validateStudioProfile` (Task 2) and the fail-open gate (Task 3); the page is a thin form that (a) prefills + locks the email from `useAuth().user`, (b) collects reviewers + center, (c) validates-before-create, (d) on success flips `hasProfile = true` (so the guard immediately stops gating) and navigates to the dashboard. The component test mocks `useStudioProfile` (so `repo.create` is a spy — no network), mocks `useAuth`/`useAuthStore` to provide the prefilled email + a `setHasProfile` spy, and asserts: the email is prefilled + read-only; an empty/invalid reviewer list blocks `create`; a clean submit calls `repo.create` once with `{ authorEmail, reviewers, center }`, calls `setHasProfile(true)`, and (per the `login.test.ts` convention) we assert the repo/flag calls, **not** the `navigateTo` redirect.

- [ ] **Step 1: Write the failing test**

```ts
// tests/nuxt/onboarding-form.test.ts
// @vitest-environment nuxt
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { StudioProfile } from '~/types/studio-profile'

// useAuth provides the prefilled author email.
mockNuxtImport('useAuth', () => () => ({
  user: computed(() => ({ email: 'author@icjia.illinois.gov' })),
  canPublish: computed(() => false),
  isLoggedIn: computed(() => true),
}))

// useAuthStore provides the setHasProfile spy the page calls on success.
const setHasProfile = vi.fn()
mockNuxtImport('useAuthStore', () => () => ({ setHasProfile, user: { email: 'author@icjia.illinois.gov' } }))

// useStudioProfile provides the create spy (no network).
const createMock = vi.fn(async (m: StudioProfile): Promise<StudioProfile> => ({ ...m, documentId: 'p-new' }))
mockNuxtImport('useStudioProfile', () => () => ({
  repo: { list: vi.fn(), findOne: vi.fn(), create: createMock, update: vi.fn(), remove: vi.fn(), publish: vi.fn() },
  findByAuthorEmail: vi.fn(),
}))

import OnboardingPage from '~/pages/onboarding.vue'

describe('onboarding page', () => {
  beforeEach(() => { createMock.mockClear(); setHasProfile.mockClear() })

  it('prefills the author email as read-only', async () => {
    const wrapper = await mountSuspended(OnboardingPage)
    expect(wrapper.vm.$.exposed!.authorEmail.value).toBe('author@icjia.illinois.gov')
    // The email input is rendered disabled/readonly (not editable).
    const emailInput = wrapper.find('input[readonly], input[disabled]')
    expect(emailInput.exists()).toBe(true)
  })

  it('blocks create when reviewers are empty or invalid', async () => {
    const wrapper = await mountSuspended(OnboardingPage)
    wrapper.vm.$.exposed!.setCenter('Research & Analysis')
    // no reviewers
    await wrapper.vm.$.exposed!.submit()
    expect(createMock).not.toHaveBeenCalled()
    expect(wrapper.vm.$.exposed!.errors.value.some((e: { field: string }) => e.field === 'reviewers')).toBe(true)

    // invalid reviewer
    wrapper.vm.$.exposed!.setReviewers(['not-an-email'])
    await wrapper.vm.$.exposed!.submit()
    expect(createMock).not.toHaveBeenCalled()
  })

  it('on a clean submit, creates the profile and flips hasProfile to true', async () => {
    const wrapper = await mountSuspended(OnboardingPage)
    wrapper.vm.$.exposed!.setReviewers(['mgr@icjia.illinois.gov'])
    wrapper.vm.$.exposed!.setCenter('Research & Analysis')
    await wrapper.vm.$.exposed!.submit()
    await new Promise((r) => setTimeout(r, 0))

    expect(createMock).toHaveBeenCalledOnce()
    expect(createMock.mock.calls[0][0]).toMatchObject({
      authorEmail: 'author@icjia.illinois.gov',
      reviewers: ['mgr@icjia.illinois.gov'],
      center: 'Research & Analysis',
    })
    expect(setHasProfile).toHaveBeenCalledWith(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/nuxt/onboarding-form.test.ts`
Expected: FAIL — `Cannot find module '~/pages/onboarding.vue'`.

- [ ] **Step 3: Write the onboarding page**

```vue
<!-- app/pages/onboarding.vue -->
<!--
  /onboarding — first-login profile capture for AUTHORS (Plan 7). Reachable while gated because the
  guard excludes /onboarding from its own redirect; NOT public (stays behind login) and NOT adminOnly
  (authors must reach it). The author confirms their email (prefilled + READ-ONLY), enters one or more
  reviewer/manager emails (required + validated via the shared validateStudioProfile), and picks their
  center (CENTER_OPTIONS — a placeholder list). On a clean submit it creates the studio-profile,
  flips the auth store's hasProfile to true (so the guard immediately stops gating), and returns the
  author to the dashboard. Thin over the pure validator + useStudioProfile().repo.create.
-->
<script setup lang="ts">
import { reactive, ref, computed } from '#imports'
import type { StudioProfile } from '~/types/studio-profile'
import { blankStudioProfile, validateStudioProfile } from '~/lib/studio-profile-form'
import { CENTER_OPTIONS } from '~/lib/center-options'
import type { FieldError } from '~/lib/validators/article'

definePageMeta({})

const { user } = useAuth()
const store = useAuthStore()
const profileApi = useStudioProfile()
const toast = useToast()

const authorEmail = computed(() => user.value?.email ?? '')
const model = reactive<StudioProfile>(blankStudioProfile(authorEmail.value))

const reviewersRaw = ref('')
const errors = ref<FieldError[]>([])
const busy = ref(false)

/** Parse the free-text reviewer input into a clean address list (comma / whitespace separated). */
const reviewers = computed(() =>
  reviewersRaw.value.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean),
)

function errorFor(field: string): string | undefined {
  return errors.value.find((e) => e.field === field)?.message
}

// Test/host hooks: set the reviewer list / center directly.
function setReviewers(list: string[]) { reviewersRaw.value = list.join(', ') }
function setCenter(v: string) { model.center = v }

async function submit() {
  // Keep the model in sync with the inputs before validating.
  model.authorEmail = authorEmail.value
  model.reviewers = reviewers.value

  errors.value = validateStudioProfile(model)
  if (errors.value.length > 0) {
    toast.add({ title: 'Please fix the highlighted fields', color: 'error' })
    return
  }

  busy.value = true
  try {
    await profileApi.repo.create({ ...model })
    store.setHasProfile(true) // the guard immediately stops gating
    toast.add({ title: 'Profile saved', description: 'Welcome to the Studio.', color: 'success' })
    await navigateTo('/')
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Could not save your profile.'
    errors.value = [{ field: 'form', message }]
    toast.add({ title: 'Could not save', description: message, color: 'error' })
  } finally {
    busy.value = false
  }
}

defineExpose({ setReviewers, setCenter, submit, errors, authorEmail })
</script>

<template>
  <div class="max-w-xl mx-auto py-8 space-y-4">
    <div>
      <h1 class="text-2xl font-semibold">Set up your Studio profile</h1>
      <p class="text-sm text-muted">A one-time step. Tell us who reviews your work and which center you are in.</p>
    </div>

    <form class="space-y-4" @submit.prevent="submit">
      <UFormField label="Your email">
        <UInput :model-value="authorEmail" readonly disabled class="w-full" />
      </UFormField>

      <UFormField label="Reviewer / manager email(s)" help="One or more, separated by commas or spaces." :error="errorFor('reviewers')">
        <UInput
          :model-value="reviewersRaw"
          placeholder="manager@icjia.illinois.gov"
          class="w-full"
          @update:model-value="reviewersRaw = String($event)"
        />
      </UFormField>

      <SelectField :model-value="model.center" label="Your center" :options="CENTER_OPTIONS" @update:model-value="model.center = $event ?? ''" />
      <p v-if="errorFor('center')" role="alert" class="text-sm text-error">{{ errorFor('center') }}</p>

      <p v-if="errorFor('form')" role="alert" class="text-sm text-error">{{ errorFor('form') }}</p>

      <UButton type="submit" label="Save profile and continue" :loading="busy" />
    </form>
  </div>
</template>
```

*Notes: `UFormField`/`UInput`/`UButton`/`SelectField`/`useToast`/`useAuth`/`useAuthStore`/`useStudioProfile`/`navigateTo`/`definePageMeta` are auto-imported. The reviewer input is a single free-text field parsed to a `string[]` (mirroring `RequestReviewForm`); if a per-row `RepeatableField` is preferred, swap it in behind the same `model.reviewers` seam — the validator + the test's `setReviewers` hook are unaffected. The read-only email input carries both `readonly` and `disabled` so the test's `input[readonly], input[disabled]` selector matches under the pinned Nuxt UI.*

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/nuxt/onboarding-form.test.ts`
Expected: PASS (3 tests).

*If `SelectField`'s rendered markup makes the read-only email selector ambiguous, scope the assertion to the first `UFormField` input. If `mountSuspended` does not surface `model.center` updates through `SelectField` in the pinned Nuxt UI, drive `setCenter` (the exposed hook the test already uses) — the assertion is the `create` payload, not the select's internals.*

- [ ] **Step 5: Commit**

```bash
git add app/pages/onboarding.vue tests/nuxt/onboarding-form.test.ts
git commit -m "feat(studio): add /onboarding page (author profile: email RO, reviewers, center)"
```

---

### Task 6: Prefill `RequestReviewForm` reviewers from the profile + ship the Strapi setup doc

**Files:**
- Edit: `app/components/RequestReviewForm.vue` (prefill reviewers from the profile on mount; additive, graceful)
- Create: `docs/onboarding-studio-profile-setup.md` (the EXACT Strapi schema + the create-the-type steps)
- Test: `tests/nuxt/request-review-prefill.test.ts`

**Interfaces:**
- `app/components/RequestReviewForm.vue` (additive — the existing props/emits/exposed surface is unchanged):
  - On mount, look up the current author's profile via `useStudioProfile().findByAuthorEmail(useAuthStore().user?.email)` **inside a try/catch that swallows errors** (graceful: any error / no email / no profile ⇒ leave the field empty, exactly as today). When a profile with non-empty `reviewers` resolves, call the existing `setReviewers(profile.reviewers.join(', '))` to prefill the input. The author may still edit before sending.
  - **This is the only change** — the POST, validation, bearer token, and the `sent` emit are untouched (Plan 6).
- `docs/onboarding-studio-profile-setup.md`:
  - The exact `studio-profile` Strapi 5 schema (field-by-field table + the `schema.json` content type definition) and the step-by-step "create this type in your Strapi dev env" instructions, plus a note that the production sandbox's content-type builder is disabled (so it is a dev-env step) and that the app **fails open** until the type exists.

> **Loop-closing prefill (LOCKED — additive + graceful):** this connects onboarding back to Plan 6's Request-review form. The lookup is wrapped exactly like the gate's fail-open check — **any** failure (the type not existing, a network error, no profile, no email) leaves the reviewer field blank, so the form behaves identically to today when there is no profile. The component test mocks `useStudioProfile` to return a profile and asserts the field is prefilled; a second case mocks it to return `null` and asserts the field stays empty (graceful). No network. The `RequestReviewForm` from Plan 6 already exposes `setReviewers`, so the change is a small `onMounted` hook calling it.

- [ ] **Step 1: Write the failing test**

```ts
// tests/nuxt/request-review-prefill.test.ts
// @vitest-environment nuxt
import { describe, it, expect, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'

mockNuxtImport('useAuthStore', () => () => ({ jwt: 'caller-jwt', user: { email: 'author@icjia.illinois.gov' }, isLoggedIn: true }))
;(globalThis as Record<string, unknown>).$fetch = vi.fn().mockResolvedValue({ ok: true })

// Swap the profile lookup per-test via this mutable holder.
const profileHolder: { value: { reviewers: string[] } | null } = { value: { reviewers: ['mgr@icjia.illinois.gov', 'lead@icjia.illinois.gov'] } }
mockNuxtImport('useStudioProfile', () => () => ({
  repo: {},
  findByAuthorEmail: vi.fn(async () => profileHolder.value),
}))

import RequestReviewForm from '~/components/RequestReviewForm.vue'

describe('RequestReviewForm — reviewer prefill from the studio-profile', () => {
  it('prefills the reviewer field from the profile reviewers when a profile exists', async () => {
    profileHolder.value = { reviewers: ['mgr@icjia.illinois.gov', 'lead@icjia.illinois.gov'] }
    const wrapper = await mountSuspended(RequestReviewForm, { props: { type: 'article', documentId: 'a1' } })
    await new Promise((r) => setTimeout(r, 0))
    const input = wrapper.find('input')
    expect((input.element as HTMLInputElement).value).toContain('mgr@icjia.illinois.gov')
    expect((input.element as HTMLInputElement).value).toContain('lead@icjia.illinois.gov')
  })

  it('degrades gracefully: no profile ⇒ the reviewer field stays empty (as before)', async () => {
    profileHolder.value = null
    const wrapper = await mountSuspended(RequestReviewForm, { props: { type: 'article', documentId: 'a1' } })
    await new Promise((r) => setTimeout(r, 0))
    const input = wrapper.find('input')
    expect((input.element as HTMLInputElement).value).toBe('')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/nuxt/request-review-prefill.test.ts`
Expected: FAIL — the form does not prefill yet (the field is empty even when a profile exists).

- [ ] **Step 3: Add the additive prefill to `RequestReviewForm`**

Add the imports + an `onMounted` prefill hook to `app/components/RequestReviewForm.vue` (everything else stays exactly as Plan 6 shipped):

```ts
// app/components/RequestReviewForm.vue  — script setup: add to the imports
import { ref, computed, onMounted } from '#imports'
import { isValidEmail } from '~/lib/review-email'
```

```ts
// app/components/RequestReviewForm.vue  — script setup: add after `function setMessage(...) {}`
// PREFILL (Plan 7, additive + graceful): if the signed-in author has a studio-profile, seed the
// reviewer field from its reviewers. Wrapped fail-open — ANY error (the studio-profile type not
// existing yet, no profile, no email, a network error) leaves the field empty, exactly as before.
onMounted(async () => {
  if (reviewersRaw.value.trim()) return // don't clobber a value the user already typed
  try {
    const email = auth.user?.email
    if (!email) return
    const profile = await useStudioProfile().findByAuthorEmail(email)
    if (profile && profile.reviewers.length > 0) {
      setReviewers(profile.reviewers.join(', '))
    }
  } catch (e) {
    console.warn('[request-review] reviewer prefill skipped', e)
  }
})
```

*`onMounted` and `useStudioProfile` are auto-imported. The existing `setReviewers` helper is reused (it also clears any error). `auth` is the existing `useAuthStore()` reference already in the component. The prefill never blocks rendering and never throws (errors are swallowed), so the form is unchanged when there is no profile.*

- [ ] **Step 4: Run the prefill test + the existing form test to verify both pass**

Run: `npx vitest run tests/nuxt/request-review-prefill.test.ts tests/nuxt/request-review-form.test.ts`
Expected: PASS — the prefill cases pass, and the existing Plan-6 `request-review-form.test.ts` still passes (it never types into the field before submitting; its `useStudioProfile` is unmocked there, so add a default `mockNuxtImport('useStudioProfile', …)` returning `{ findByAuthorEmail: async () => null }` to that file IF the unmocked composable errors under the Nuxt test env — the form swallows the error regardless, so the existing assertions are unaffected either way).

- [ ] **Step 5: Write the Strapi setup documentation**

```markdown
<!-- docs/onboarding-studio-profile-setup.md -->
# First-Login Onboarding — `studio-profile` Strapi Setup

First-login onboarding (Plan 7) stores each author's profile in a new Strapi **collection type**,
`studio-profile`, looked up by the author's admin email. **This type does not exist on the deployed
sandbox** (production mode disables the content-type builder), so it must be created in your Strapi
**dev** environment using the schema below.

> **The app fails open until this type exists.** The onboarding gate's profile lookup is wrapped so
> that any error — including the `studio-profile` type not existing yet — is treated as "unknown"
> and **does not gate** anyone (a console warning is logged). Authors are only redirected to
> `/onboarding` once the lookup **succeeds** and returns no profile for them. So creating this type
> *activates* onboarding; not creating it leaves the Studio fully usable (just without onboarding).

---

## The model

Domain shape (`app/types/studio-profile.ts`):

```ts
interface StudioProfile {
  documentId: string
  authorEmail: string   // the unique lookup key (== the author's admin email)
  reviewers: string[]   // reviewer/manager emails, prefilled into the Request-review form
  center: string        // the author's ICJIA center
  publishedAt?: string | null
}
```

## Fields

| Field         | Strapi type | Settings                                  | Notes                                                        |
| ------------- | ----------- | ----------------------------------------- | ------------------------------------------------------------ |
| `authorEmail` | Text (short)| **Required**, **Unique**                  | The lookup key. One profile per author email.                |
| `reviewers`   | **JSON**    | Required                                  | An array of reviewer/manager email strings (e.g. `["a@x.gov"]`). |
| `center`      | Text (short) *or* Enumeration | Required               | The author's center. Use Enumeration if you want a fixed list. |

**Why `reviewers` is JSON (not a repeatable component):** a JSON array round-trips a plain
`string[]` with no nested-component plumbing or per-item ids, it matches how the onboarding form and
the Request-review prefill already model the reviewer list, and it avoids a component schema you would
also have to hand-create. If you later want structured reviewers (name + email), migrate to a
repeatable component then.

## Create the type (Strapi dev env)

1. In your **dev** Strapi admin, open **Content-Type Builder** → **Create new collection type**.
2. **Display name:** `Studio Profile` (Strapi derives the API ID `studio-profile` and the
   uid `api::studio-profile.studio-profile` — the uid the Studio's repository uses).
3. Add the three fields per the table above (`authorEmail` → mark **Required** + **Unique**;
   `reviewers` → **JSON**, Required; `center` → **Text** or **Enumeration**, Required).
4. **Save** (Strapi restarts to apply the schema).
5. **Permissions:** the Studio talks to the **admin Content-Manager API** with the signed-in admin's
   JWT, so admin users can already read/write content types they have access to — confirm the author
   role can **find** and **create** `Studio Profile` entries in **Settings → Administration Panel →
   Roles** if your instance restricts content-type access per role.

### Equivalent `schema.json` (for reference / a code-first content type)

If you manage content types in code (`src/api/studio-profile/content-types/studio-profile/schema.json`):

```json
{
  "kind": "collectionType",
  "collectionName": "studio_profiles",
  "info": {
    "singularName": "studio-profile",
    "pluralName": "studio-profiles",
    "displayName": "Studio Profile"
  },
  "options": { "draftAndPublish": true },
  "attributes": {
    "authorEmail": { "type": "string", "required": true, "unique": true },
    "reviewers": { "type": "json", "required": true },
    "center": { "type": "string", "required": true }
  }
}
```

## After creating the type — confirm onboarding (post-plan check)

1. Sign in to dev Strapi as a **real author** (a `strapi-author` admin) with **no** profile yet →
   the Studio should redirect you to `/onboarding`.
2. Enter one or more reviewer emails + pick a center → **Save** → you land on the dashboard and are
   not asked again on the next sign-in (the profile now resolves).
3. Open a draft's **Request review** form → the reviewer field is **prefilled** from your profile.
4. Sign in as an **editor / super-admin** → you are **never** sent to `/onboarding`.
5. Temporarily rename/remove the type (or simulate a lookup error) → confirm authors are **not**
   gated (fail-open) and a console warning is logged.
```

- [ ] **Step 6: Run the full suite + typecheck**

Run: `npx vitest run && npm run typecheck`
Expected: all tests pass (the prior plans' baseline + this plan's additions); typecheck exit 0. Fix any type drift (e.g. the `ListOptions.filters` addition, the `GuardContext` additions, or the `hasProfile` store field) before committing — never weaken a test.

- [ ] **Step 7: Commit**

```bash
git add app/components/RequestReviewForm.vue docs/onboarding-studio-profile-setup.md tests/nuxt/request-review-prefill.test.ts
git commit -m "feat(studio): prefill Request-review reviewers from profile; doc studio-profile schema"
```

---

## Post-plan verification (user-gated)

These require a real admin-panel login AND the `studio-profile` collection type created in dev Strapi
(per `docs/onboarding-studio-profile-setup.md`), so they run as a controlled manual check after the
plan lands — they do **not** block merge. **Target the dev Strapi 5 only.** This is the deliberate
**validated-at-runtime** confirmation the plan did NOT claim live (the type does not exist yet).

1. **Author first-login onboarding:** create the type, then sign in as a **real author** with no
   profile → confirm the redirect to `/onboarding`, fill reviewers + center, Save → confirm a
   `POST /content-manager/collection-types/api::studio-profile.studio-profile` with a FLAT body
   `{ authorEmail, reviewers, center }`, then landing on `/`. Sign out + back in → **no** redirect
   (the profile now resolves via `findByAuthorEmail`).
2. **FAIL-OPEN (the critical safety property):** with the type **absent** (or temporarily renamed),
   sign in as an author → confirm you are **NOT** gated (you reach `/` normally) and a
   `[onboarding] profile lookup failed; not gating` warning is logged. This proves the app is not
   bricked before the type exists.
3. **Authors only:** sign in as an **editor / super-admin** → confirm you are **never** sent to
   `/onboarding` (the gate skips publishers; the lookup is not even attempted).
4. **Lookup correctness:** confirm `findByAuthorEmail` returns the profile whose `authorEmail`
   matches the signed-in author's email (filtered list, first row), and `null` for an author with
   none.
5. **Request-review prefill (loop closed):** as an author **with** a profile, open **Request review**
   on a draft → confirm the reviewer field is prefilled from `studio-profile.reviewers`, that you can
   edit it, and that sending still emails the exact `/preview/...` link (Plan 6). As an author with
   **no** profile (or with the type absent), confirm the field is **empty** (graceful), exactly as
   before Plan 7.

## Open items carried into later plans

- **The real ICJIA centers list** — replace the `CENTER_OPTIONS` placeholder with the authoritative
  list (a one-constant change; the `SelectField` + validator read it as-is).
- **Edit / re-run onboarding** — a "Profile settings" surface to change reviewers/center after the
  fact (the repo already has `update`); not built here (authors are never re-gated once a profile
  exists).
- **Structured reviewers** — if reviewers later need name+email, migrate the `reviewers` JSON field
  to a repeatable component and adjust the mapper/form (the JSON shape was chosen for simplicity now).
- **Center-driven workflow** — routing a draft to the center's editor / center-scoped queues; this
  plan only captures the field.
- **Per-author draft ownership** ("only my drafts") — a separate backend change unrelated to the
  profile.
- **Full accessibility pass** — the new surfaces use labelled Nuxt UI primitives + `role="alert"`,
  but the comprehensive audit is a later phase.

## Self-review (performed against the LOCKED decisions + Global Constraints)

- **FAIL-OPEN is the load-bearing safety property, and it is tested.** `resolveHasProfile` (Task 3)
  returns `null` (never gate) for **any** lookup error — its node test passes a **throwing**
  `findByAuthorEmail` and asserts `null` + a console warning (proving the app cannot be bricked
  before the `studio-profile` type exists). The guard (Task 4) gates **only** on `hasProfile === false`
  (strict); `null` ⇒ no gate. The prefill (Task 6) and the page's create-error path are likewise
  wrapped to degrade gracefully. Stated loudly in the manager intro, Global Constraints, Tasks 3/4/6,
  the setup doc, and verification step 2.
- **Authors only; publishers never gated.** "Author" = logged-in + `!canPublish` (`AUTHOR_ROLE_CODE`
  is `strapi-author`; publishers are `PUBLISHER_ROLE_CODES`). `resolveHasProfile` returns `null`
  immediately for a publisher (lookup not even called — Task 3 test); the guard's onboarding branch
  requires `isAuthor` (Task 4 test asserts a publisher with `hasProfile: false` is NOT gated). The
  middleware computes `isAuthor = isLoggedIn && !canPublish`.
- **Find by email.** `findByAuthorEmail` (Task 1) filters the CM list by `authorEmail { $eq }` and
  returns the first row or `null` (asserted against a fake `$Fetch`); the page prefills + locks the
  email from `useAuth().user.email`; the lookup key is `authorEmail == user.email` throughout.
- **Reviewers + center required.** `validateStudioProfile` (Task 2) requires ≥1 reviewer (each valid
  via the shared `isValidEmail`) and a non-empty center (asserted); the onboarding page blocks
  `create` on any error (Task 5 test); `authorEmail` is prefilled + read-only (rendered
  `readonly`/`disabled`, asserted).
- **The Strapi schema is shipped.** `docs/onboarding-studio-profile-setup.md` (Task 6) gives the
  field-by-field table, the `schema.json`, the create-the-type steps, the permissions note, the
  production-builder-disabled caveat, and the fail-open caveat. `reviewers` is **JSON** with the
  rationale stated. The plan writes no Strapi-side code (the user creates the type).
- **Request-review prefill closes the Plan-6 loop.** `RequestReviewForm` gains an additive `onMounted`
  prefill from `studio-profile.reviewers` via the existing `setReviewers` (Task 6); a profile prefills
  the field, no profile leaves it empty (both asserted), and the POST/validation/bearer/`sent` path is
  untouched.
- **No live-validation claim.** The `studio-profile` type does not exist yet; every task is
  **validated-by-analogy** (the CM `list`/`create` family the data layer proved for
  articles/apps/datasets) and **validated-at-runtime** by the user after they create the type
  (Post-plan verification). The plan never claims a live `studio-profile` round-trip.
- **Name/type consistency:** `StudioProfile` (domain) / `StudioProfileWrite` / `StrapiStudioProfile`,
  `studioProfileFromStrapi` / `studioProfileToWrite`, `createStudioProfileRepository` /
  `STUDIO_PROFILE_UID` (`api::studio-profile.studio-profile`), `findByAuthorEmail`, `useStudioProfile`,
  `CENTER_OPTIONS`, `blankStudioProfile` / `validateStudioProfile`, `resolveHasProfile` /
  `ProfileGateDeps`, `hasProfile` (store state + `setHasProfile` action + `useAuth().hasProfile`
  computed), `isAuthor` + `hasProfile` (the `GuardContext` additions), and the reused
  `resolveAuthRedirect` / `Repository<T>` / `ListOptions.filters` / `isValidEmail` / `FieldError` /
  `SelectField` / `RepeatableField` / `RequestReviewForm.setReviewers` are spelled identically across
  Tasks 1→6 and against the existing layers.
- **Backward-compatible data-layer change:** `ListOptions.filters` is optional and forwarded only when
  present; `ofetch` drops `undefined` query keys, so the existing repository/repositories tests stay
  green un-edited (Task 1 step 6 verifies). The existing `guard.test.ts` and `auth-store.test.ts` stay
  green un-edited (the new `GuardContext`/store fields default to non-gating values).
- **Placeholder scan:** the ONLY intentional placeholder is `CENTER_OPTIONS` (clearly marked "user
  supplies the real list," with a test that survives the swap). Every step otherwise ships complete,
  runnable code (no TODOs, no "similar to Task N"); exact paths, run commands, and commit messages
  (no AI co-author trailer). **No new dependency**; Pinia 2.x stack untouched.
- **Process:** TDD red → green → commit per task; full `npx vitest run && npm run typecheck` gate
  before the final commit; pristine output; no AI co-author trailer.

---

**Plan complete.** Six TDD tasks delivering first-login onboarding for authors — a `studio-profile`
type/mapper/repository with a `findByAuthorEmail` lookup + a `useStudioProfile` composable, a
placeholder `CENTER_OPTIONS` + pure `blankStudioProfile`/`validateStudioProfile`, an auth-store
`hasProfile` flag fed by a **fail-open** `resolveHasProfile` check (any lookup error ⇒ never gate), a
pure guard extension that gates **only** authors with a resolved-missing profile (publishers exempt,
`/onboarding` reachable), the `/onboarding` page/form (email read-only, reviewers + center required →
create → flip the flag → dashboard), and an additive Request-review reviewer **prefill** that closes
the Plan-6 loop — plus the shipped Strapi schema doc the user creates the type from. The
`studio-profile` type does not exist on the production sandbox yet, so the work is
**validated-by-analogy** against the proven Content-Manager contract and **validated-at-runtime** by
the user (not claimed live), and is engineered to **fail open** so the app can never be bricked before
the type exists.
