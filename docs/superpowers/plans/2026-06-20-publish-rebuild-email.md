# Publish, Rebuild & Review Email — Implementation Plan

> **Plan 6 of the ICJIA Studio build.** Follows the auth plan (Plan 1/2), the data-layer plan (retargeted to the Content-Manager API), the media plan (zero-base64), the editor integration (Plan 4), and the screens/forms/preview plan (Plan 5). Plan 5 shipped the **draft-authoring** app: create/edit forms, a role-aware dashboard, and a shareable `/preview/:type/:documentId` route — with `/manage` left as a **read-only draft queue** carrying a "Coming in Plan 6" publish placeholder. This plan turns that placeholder into a working **Publish** action, documents the **Netlify rebuild** wiring, and adds a **review-by-email** flow. It **wires** the already-built repository, auth/roles, and preview route — it does not recreate them.

> **Draft 1 — first iteration.** Part of an exploratory first pass; expect the approach to evolve as the build surfaces requirements (the data layer itself was revised mid-build from REST → Content-Manager API). The publish action is built from the **validated** Content-Manager contract the data layer established; it is **validated-at-runtime** (the user confirms the publish action against the dev Strapi with a real Editor login as a post-plan check) — this plan does **not** claim a live publish was run.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

---

## 📋 For managers — what is this, and is it legit?

**What this document is.** The construction recipe for the **last mile** of publishing: the **Publish** button that makes a reviewed draft go live, the **automatic website rebuild** that follows, and a **"send this to a reviewer" email** that links straight to the private preview page. Up to now the Studio could only *write drafts*; this is the plan that lets a manager actually *publish* — and lets anyone hand a draft to a colleague for sign-off first.

**Why this matters.** Three real-world needs, each handled deliberately:
1. **Publishing is a privilege.** Only **managers/editors** can publish; an ordinary author never even sees the button. And the privilege is enforced **twice** — the Studio hides the button from authors, *and* the content system itself refuses an author's publish request. Belt and suspenders.
2. **The public website must refresh when something is published.** Rather than bolt that into the Studio (and risk leaking a secret build key into the browser), we use the content system's own built-in **webhook**: on publish, it pings the website's "rebuild now" address. This plan ships **exact setup instructions** for that — it is a five-minute configuration in two dashboards, not code we maintain.
3. **Review before publish.** A small form lets anyone email a draft's **private preview link** to one or more reviewers. The email is sent by a tiny server function using a mail service (Mailgun); the mail-service password lives **only on the server**, never in the browser, never in the code repository.

**Is it real, or jargon?** Real, and routine:
- Every small step **writes a test first, then the code** (Test-Driven Development).
- Every step ends in a **save point** (a commit) — traceable and reversible.
- The tricky logic (what address does the publish call hit? what exactly does the email contain? is the sender even logged in?) lives in **plain, separately-tested functions**, so the button and the form stay simple and the rules are provable.
- **No secrets are committed.** The mail password and the website's rebuild address live in configuration, not in the codebase — and the rebuild address lives in the *content system*, not here at all.

**What you get when this plan is done.** A manager can open the publish queue (or an edit page), click **Publish**, and the draft goes live and the public site rebuilds. Anyone can click **Request review**, type a reviewer's email, and send them the private preview link. **Not** in this plan (on purpose, and noted below): pre-filling reviewer addresses from a profile (needs a backend change first), un-publishing/scheduling, and the sample-article demo.

**Bottom line.** Legitimate, careful assembly of the publish/review last mile — written in detail so the "only managers publish" rule is enforced on both sides, the website-rebuild is a documented configuration rather than fragile code, and the email path can never become an open spam relay.

---

**Goal:** Complete the Studio's publish/review loop on top of the existing data + auth + preview layers: (1) add a **`publish(documentId)`** method to the Content-Manager repository (`POST /content-manager/collection-types/{uid}/{documentId}/actions/publish`) and expose it through the three composables; (2) a **`canPublish`-gated Publish button** on `/manage` (replacing the "Coming in Plan 6" placeholder) and the edit page — confirm → `repo.publish` → feedback + refresh; (3) a **pure, DI email builder + Mailgun sender** (`app/lib/review-email.ts`: `buildReviewEmail(...)` → `{ to, from, subject, text, html }` carrying the exact `/preview/:type/:documentId` link, and `sendViaMailgun(fetch, creds, msg)` doing the direct Mailgun HTTP call); (4) a **thin Nitro server route** `server/api/request-review.post.ts` — auth-check (the caller's admin JWT must be valid) + body validation + `buildReviewEmail` + `sendViaMailgun`, with all secrets in **server-side `runtimeConfig`**; (5) a **Request-review UI** (reviewer email[s] + optional message) that POSTs the route and shows success/error; (6) **rebuild setup documentation** (the exact Strapi-webhook → Netlify-build-hook steps) + the required env vars. The Netlify build-hook creation and the Strapi webhook config are **USER setup steps** (documented here), not Studio code.

**Architecture:** Mirror the data/auth layers' **DI-pure-function + thin-wrapper** rule. The publish call is a one-line addition to the generic repository (DI `$Fetch`), unit-tested against a fake `$Fetch`. The email builder/sender are **pure functions** (DI `fetch`) in `app/lib/review-email.ts`, unit-tested with a fake `fetch` (no real network). The Nitro route handler is **thin** — it reads `runtimeConfig`, verifies auth, validates the body, then delegates to the two pure functions. The Vue surfaces (Publish button, Request-review form) are **thin** over the repo / over `$fetch('/api/request-review')`. Component tests use `mountSuspended` + `mockNuxtImport` (mirroring `tests/nuxt/dashboard.test.ts` / `media-picker.test.ts`); pure logic is unit-tested in the fast node env. **No network in any test.**

**Tech Stack:** Nuxt 4 (SPA, `ssr: false`) **with Nitro server routes** (they build under `ssr: false` and deploy as Netlify Functions), Vue 3.5, Nuxt UI 4, Pinia 2.x, TypeScript, `ofetch` (`$api` for Strapi; `$fetch` for the same-origin Nitro route), Vitest + `@nuxt/test-utils` (node + the `nuxt` runtime env). **No new dependencies** — the Mailgun call uses the already-present `ofetch`/`$fetch`; **no Mailgun SDK**.

## Global Constraints

*Every task's requirements implicitly include this section. Values are copied from the design spec (`docs/superpowers/specs/...` and the root `ICJIA-Studio-20-rewrite-copperhead.md`, §publish/review) and the public shapes of the already-built data/auth/preview layers, plus the LOCKED architecture decisions the user confirmed for this plan.*

- **Stack:** Nuxt 4 **SPA** (`ssr: false`), **Nuxt UI 4**, Pinia 2.x, **TypeScript**. **Nitro server routes ARE available under `ssr: false`** — Nuxt always builds the Nitro server; `ssr: false` only disables server-side *rendering of pages*, not API routes. Confirm `nuxt.config.ts` does **not** set `nitro: false` or `ssr` in a way that strips the server (it currently sets only `ssr: false`), and that `server/api/request-review.post.ts` deploys as a Netlify Function (Nuxt's Netlify preset maps `server/api/**` to functions automatically; no extra config needed). **This plan adds NO new auth/guard middleware for pages** — `/manage` is already `adminOnly` via the existing global guard.
- **Wire, do NOT recreate** (read their public shapes; never redefine):
  - **Data layer / repository:** `createRepository({ api, uid, relationFields, fromStrapi, toWrite })` in `app/lib/repository.ts` returns `{ list, findOne, create, update, remove }` over the Strapi **admin Content-Manager API** (`base = /content-manager/collection-types/{uid}`), with the admin JWT attached by the configured `$api`. **This plan ADDS `publish(documentId)` to that same factory** (and to the `Repository<T>` interface). Per-type repos `app/repositories/{articles,apps,datasets}.ts` call `createRepository`; composables `app/composables/use{Articles,Apps,Datasets}.ts` bind `$api`. Domain types `app/types/content.ts` (`ContentStatus`, `Article`/`App`/`Dataset`, `publishedAt: string | null` = the Draft & Publish source of truth).
  - **Auth/roles:** `useAuth()` (`canPublish`, `isLoggedIn`, `user`) / `useAuthStore()` (`canPublish`, `jwt`, `displayName`); `app/lib/admin-roles.ts` (`PUBLISHER_ROLE_CODES = ['strapi-super-admin','strapi-editor']`, `AUTHOR_ROLE_CODE = 'strapi-author'`, `canPublish(roleCodes)`). The admin JWT lives at `useAuthStore().jwt`. The login flow validates roles via `fetchMe($api)` → `GET /admin/users/me` (`app/lib/auth.ts`).
  - **Preview:** the shareable route `/preview/:type/:documentId` (`app/pages/preview/[type]/[documentId].vue`) — the **review email links here** (absolute URL).
  - **Pages:** `app/pages/manage.vue` (the publish queue) and `app/pages/edit/[type]/[documentId].vue` (the edit screen) — where the **Publish** + **Request-review** affordances live.
  - **HTTP client style:** `app/lib/api.ts` `createApiClient({ baseURL, getToken, onUnauthorized })` builds the `$api` `$Fetch` (Strapi base URL + Bearer token + 401 interceptor). `buildAuthHeaders(headers, token)` is the existing Bearer-header helper.
- **Publish = the Content-Manager publish action (LOCKED decision 1).** `repo.publish(documentId)` does `POST /content-manager/collection-types/{uid}/{documentId}/actions/publish` with the admin JWT (same admin API family the data layer validated for read/write). This sets `publishedAt`. The Studio's Publish button is **visible/enabled ONLY when `canPublish`** (default-deny: an author never sees/reaches it) — and **Strapi ALSO enforces the role server-side** (an author's JWT → 403), so the UI gate is **defense-in-depth, not the only gate**. **Validated-at-runtime:** the endpoint is built from the validated CM contract; the user confirms it against dev Strapi with a real Editor login (post-plan check). Do **not** claim a live publish was performed by this plan.
- **Rebuild = a Strapi webhook the USER configures — NOT Studio code (LOCKED decision 2).** On publish, **Strapi** fires a webhook to the **Netlify build hook**, rebuilding the public Hub. This plan ships **setup documentation** only (Strapi Settings → Webhooks → new webhook, trigger on `entry.publish` [and `entry.unpublish` if desired], URL = the Netlify build hook the user creates in Netlify → Site settings → Build & deploy → Build hooks). **No Studio code triggers the rebuild; the build-hook secret lives only in Strapi.** This is stated explicitly and is the "rebuild" deliverable (Task 6).
- **Review email = a Nitro SERVER ROUTE that sends via Mailgun (LOCKED decision 3).** `server/api/request-review.post.ts` (Nitro builds it under `ssr: false`; it deploys as a Netlify Function). It **(a)** requires the caller to be an authenticated Studio user — it verifies a Bearer admin JWT is present and valid by forwarding it to `GET {strapiBaseUrl}/admin/users/me` (a 2xx → authenticated; anything else → 401) so the endpoint **cannot be used as an open spam relay**; **(b)** validates the body (`{ type: 'article'|'app'|'dataset'; documentId: string; reviewers: string[] (each a valid email); message?: string }`); **(c)** builds the absolute preview URL `${publicBaseUrl}/preview/${type}/${documentId}`; **(d)** sends via Mailgun with a **DIRECT HTTP call** using `$fetch`/`ofetch` (`POST https://api.mailgun.net/v3/{domain}/messages`, HTTP **Basic** auth `api:{MAILGUN_API_KEY}`, **form** body `from`/`to`/`subject`/`text`/`html`) — **NO Mailgun SDK dependency.** The Mailgun-call + URL/validation logic lives in a **PURE, testable** module (`app/lib/review-email.ts`, injectable `fetch`) so the route handler is thin and the test mocks the HTTP call.
- **No secrets committed (Global Constraint).** Mailgun key/domain/from + the public base URL live in env/`runtimeConfig`. **Server-only** `runtimeConfig` keys (NOT under `.public`): `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_FROM`. The **public** base URL the email links to is `runtimeConfig.public.publicBaseUrl` (the deployed Studio origin; reused to build the absolute `/preview/...` URL — exposing the public origin is fine, it is not a secret). The existing `runtimeConfig.public.strapiBaseUrl` is reused server-side for the `/admin/users/me` auth check. The **server route reads them server-side; the client never sees the Mailgun key.** The Netlify build-hook URL lives in **STRAPI**, not here. Required env vars are documented (Task 6).
- **Reviewer addresses = manual entry now (LOCKED decision 4).** A "Request review" affordance opens a small form: reviewer email(s) (one or more, validated) + an optional message → POSTs `/api/request-review` → success/error feedback. Onboarding will prefill this later (deferred — `studio-profile` does not exist yet).
- **The review email contains the EXACT `/preview/:type/:documentId` link** (the shareable preview built in Plan 5), as an absolute URL.
- **Anti-abuse:** the request-review route requires a **valid caller auth token** (forwarded to `GET /admin/users/me`) — it is **not** an open endpoint. Missing/invalid token → **401**; bad reviewer email or malformed body → **400**.
- **Pure, node-testable logic; thin route + thin Vue.** The publish call (DI `$Fetch`) and the email builder/sender (DI `fetch`) are pure and unit-tested; the route handler and the Vue surfaces are thin and component/handler-tested; **mock all network**. TDD (red → green → refactor), frequent commits, pristine test output. Commit messages carry **NO AI co-author trailer** (per project CLAUDE.md). **Do not bump the pinned Pinia 2.x stack**; **no new dependency** (use `ofetch`/`$fetch` already present; avoid a Mailgun SDK). Run `npx vitest run && npm run typecheck` green before the final commit.

## Explicitly deferred (noted here; NOT built in this plan)

- **Onboarding / `studio-profile`** (reviewer-address prefill, manager emails, center, author email) — separate; needs the approved `studio-profile` Strapi collection type created in the dev env first. **Manual reviewer entry now.**
- **Unpublish / scheduling** — the repository could later add `unpublish(documentId)` (`.../actions/unpublish`); not built here (though the docs note `entry.unpublish` as an optional webhook trigger). **No scheduled publish.**
- **Publish of relations** (cascade-publishing linked apps↔datasets↔articles) — relation-write is deferred by the data layer; publish acts on the single entry only.
- **"Add Sample Article" demo** — Plan 7.
- **Full accessibility pass** — Plan 7. (New surfaces use Nuxt UI labelled primitives + `role="alert"` for errors, but the comprehensive a11y audit is Plan 7.)
- **The actual Netlify build-hook creation + the Strapi webhook config** — **USER setup steps** (documented in Task 6), not code. No Studio code triggers the rebuild.

## File structure

```
app/
├── lib/
│   └── review-email.ts          # PURE + DI: buildReviewEmail(opts) → MailMessage;
│                                 #   sendViaMailgun(fetch, creds, msg); isValidEmail(s)
├── composables/
│   ├── useArticles.ts           # (existing) binds $api → repo (now incl. publish)
│   ├── useApps.ts               # (existing)
│   └── useDatasets.ts           # (existing)
├── components/
│   ├── PublishButton.vue        # canPublish-gated: confirm → repo.publish → emit published
│   └── RequestReviewForm.vue    # reviewer email(s) + message → POST /api/request-review
└── pages/
    ├── manage.vue               # (edit) Publish + Request-review per draft row
    └── edit/[type]/[documentId].vue  # (edit) Publish + Request-review affordances

app/lib/repository.ts            # (edit) add publish(documentId) to Repository<T> + factory
app/repositories/{articles,apps,datasets}.ts  # unchanged (publish flows through the generic factory)

server/
└── api/
    └── request-review.post.ts   # THIN Nitro route: auth-check + validate + build + send

docs/
└── deploy-rebuild-and-email.md  # the EXACT Strapi-webhook→Netlify-build-hook steps + env vars

tests/
├── unit/
│   ├── repository-publish.test.ts   # fake $Fetch: POSTs the publish action endpoint; returns entity
│   ├── review-email.test.ts         # buildReviewEmail carries the preview link; sendViaMailgun
│   │                                #   (endpoint/Basic-auth/form recipients); isValidEmail; bad email
│   └── request-review-handler.test.ts # the route's pure handler: 401 no/!auth; 400 bad email; happy → Mailgun
└── nuxt/
    ├── publish-button.test.ts       # absent for non-publisher; present + calls repo.publish for publisher
    └── request-review-form.test.ts  # validates emails; POSTs /api/request-review; shows success/error
```

*(Pure logic + the route-handler logic run in the default node env. The two component specs declare `// @vitest-environment nuxt` and live under `tests/nuxt/` alongside `dashboard.test.ts` / `media-picker.test.ts`.)*

---

### Task 1: `publish(documentId)` in the repository + the three composables

**Files:**
- Edit: `app/lib/repository.ts`
- Test: `tests/unit/repository-publish.test.ts`

**Interfaces:**
- Consumes: `$Fetch` (DI as `cfg.api`), the existing `StrapiSingleResponse<TRaw>` + `unwrapOne` from `~/lib/strapi-rest`, `cfg.fromStrapi`.
- Produces (added to the existing `Repository<TDomain>` interface + `createRepository` return object):
  - `publish(documentId: string): Promise<TDomain>` — `POST ${base}/${documentId}/actions/publish` (where `base = /content-manager/collection-types/{uid}`); maps the returned entity via `unwrapOne` → `fromStrapi`, returning the now-published domain entity (its `publishedAt` is non-null).
- The three per-type repos (`app/repositories/{articles,apps,datasets}.ts`) and the three composables (`app/composables/use{Articles,Apps,Datasets}.ts`) gain `publish` **for free** — they delegate to `createRepository`, so **no edit is needed** there beyond the factory.

> **The publish endpoint (LOCKED decision 1).** Strapi's Content-Manager publish action for a collection-type entry is `POST /content-manager/collection-types/{uid}/{documentId}/actions/publish` — the SAME admin-API family (`/content-manager/...`, admin JWT via `$api`) the data layer validated for read/write. It sets `publishedAt` and returns the entry (`{ data }` envelope, like `create`/`update`). **Strapi enforces the publisher role server-side** (an author's JWT → 403); the Studio's `canPublish` UI gate (Task 2) is defense-in-depth. **Validated-at-runtime:** this is built from the validated CM contract and confirmed against dev Strapi by the user (post-plan check) — not claimed live here. The response is unwrapped exactly like `update` (`unwrapOne` → `fromStrapi`).

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/repository-publish.test.ts
import { describe, it, expect, vi } from 'vitest'
import { createRepository, type Relations } from '~/lib/repository'
import type { $Fetch } from 'ofetch'

interface Raw { documentId: string; title: string; publishedAt: string | null }
interface Dom { documentId: string; title: string; publishedAt: string | null; rels: Relations }
const fromStrapi = (r: Raw, relations: Relations = {}): Dom => ({ ...r, rels: relations })
const toWrite = (d: Dom) => ({ title: d.title })

const UID = 'api::article.article'
const BASE = `/content-manager/collection-types/${UID}`
const makeRepo = (api: $Fetch) =>
  createRepository<Raw, Dom, { title: string }>({ api, uid: UID, relationFields: [], fromStrapi, toWrite })

describe('createRepository.publish (Content-Manager publish action)', () => {
  it('POSTs the publish action for the documentId and returns the published entity', async () => {
    // The publish action returns the entry in a {data} envelope (like create/update), now with publishedAt set.
    const api = vi.fn().mockResolvedValue({
      data: { documentId: 'a1', title: 'Crime In Illinois', publishedAt: '2026-06-20T12:00:00.000Z' },
    }) as unknown as $Fetch

    const out = await makeRepo(api).publish('a1')

    // Endpoint + method: POST /content-manager/collection-types/{uid}/{documentId}/actions/publish
    expect(api).toHaveBeenCalledWith(
      `${BASE}/a1/actions/publish`,
      expect.objectContaining({ method: 'POST' }),
    )
    // Returns the mapped, now-published domain entity.
    expect(out.documentId).toBe('a1')
    expect(out.publishedAt).toBe('2026-06-20T12:00:00.000Z')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/repository-publish.test.ts`
Expected: FAIL — `makeRepo(api).publish is not a function` (the method does not exist yet).

- [ ] **Step 3: Write minimal implementation**

Add `publish` to the `Repository<TDomain>` interface (after `remove`):

```ts
// app/lib/repository.ts  — inside `export interface Repository<TDomain>`
  remove(documentId: string): Promise<void>
  /** Publish a draft via the Content-Manager publish action; returns the now-published entity. */
  publish(documentId: string): Promise<TDomain>
```

Add the method to the returned object (after `remove`), mirroring `update`'s unwrap:

```ts
// app/lib/repository.ts  — inside the object returned by createRepository, after remove()
    async publish(documentId) {
      // Content-Manager publish action (LOCKED Plan-6 decision): POST .../actions/publish.
      // Same admin-API family the data layer validated; sets publishedAt and returns the entry
      // ({data} envelope, like update). Strapi ALSO enforces the publisher role server-side
      // (an author's JWT → 403) — the Studio's canPublish UI gate is defense-in-depth.
      const res = await cfg.api<StrapiSingleResponse<TRaw>>(`${base}/${documentId}/actions/publish`, {
        method: 'POST',
      })
      return cfg.fromStrapi(unwrapOne(res))
    },
```

Also update the file header note (currently says publish is deferred):

```ts
// Deferred (later plans): relation-WRITE (connect/disconnect). The publish action is added in Plan 6.
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/repository-publish.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Confirm the composables/repos expose it (no edit expected) + typecheck**

The three per-type repos (`createArticlesRepository` etc.) and the three composables (`useArticles` etc.) return `Repository<T>` from `createRepository`, so `publish` is now part of their public type with no change. Verify:

Run: `npm run typecheck`
Expected: exit 0. (If any test stub of `useArticles`/`useApps`/`useDatasets` is typed against the full `Repository<T>` and now lacks `publish`, those stubs are in **this plan's** tests only — add `publish: vi.fn()` there; do not weaken the interface.)

- [ ] **Step 6: Commit**

```bash
git add app/lib/repository.ts tests/unit/repository-publish.test.ts
git commit -m "feat(studio): add repository publish() (Content-Manager publish action)"
```

---

### Task 2: `PublishButton` — the `canPublish`-gated Publish affordance (replaces the Plan-5 placeholder)

**Files:**
- Create: `app/components/PublishButton.vue`
- Test: `tests/nuxt/publish-button.test.ts`

**Interfaces:**
- Consumes: `useAuth()` (`canPublish`) + the matching repo via `use{Articles,Apps,Datasets}()` (selected by the `type` prop); Nuxt UI primitives.
- Props: `{ type: 'article' | 'app' | 'dataset'; documentId: string; published?: boolean }`.
- Emits: `published` with the returned (now-published) entity, so parents can refresh their lists/state.
- Behaviour:
  - **Default-deny:** when `!canPublish`, the component renders **nothing** (an author never sees or reaches Publish).
  - When `canPublish`: a **Publish** button (disabled while busy, and labelled "Published" / disabled when `published` is already true). Clicking opens a **confirm** step (Nuxt UI modal or an inline confirm); on confirm, calls `repo.publish(documentId)`, emits `published`, and surfaces success (a toast) or an error message.
  - This is **defense-in-depth only** — Strapi still enforces the publisher role server-side (an author's JWT → 403), so a failed/forbidden publish surfaces as an error.

> **Component-test ergonomics (mirrors `tests/nuxt/dashboard.test.ts`):** run under the Nuxt env with `mountSuspended`, toggling `canPublish` via a `ref` returned from a `mockNuxtImport('useAuth', …)`, and mocking the repo composable so `publish` is a spy (no network). Assertions stay focused on the **gate** (absent for a non-publisher) and the **wiring** (present for a publisher; confirm → `repo.publish(documentId)` called once → `published` emitted). The confirm step is driven via the exposed `confirmPublish()` to keep the test independent of the exact modal markup.

- [ ] **Step 1: Write the failing test**

```ts
// tests/nuxt/publish-button.test.ts
// @vitest-environment nuxt
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { Article } from '~/types/content'

const canPublish = ref(false)
mockNuxtImport('useAuth', () => () => ({
  user: computed(() => ({ email: 'manager@example.com' })),
  canPublish, isLoggedIn: computed(() => true), logout: vi.fn(),
}))

const publishMock = vi.fn(async (id: string): Promise<Article> => ({
  documentId: id, title: 'Crime In Illinois', publishedAt: '2026-06-20T12:00:00.000Z',
} as Article))
mockNuxtImport('useArticles', () => () => ({
  list: vi.fn(), findOne: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), publish: publishMock,
}))

import PublishButton from '~/components/PublishButton.vue'

describe('PublishButton (canPublish-gated, default-deny)', () => {
  beforeEach(() => { publishMock.mockClear() })

  it('renders NOTHING for a non-publisher (an author never reaches Publish)', async () => {
    canPublish.value = false
    const wrapper = await mountSuspended(PublishButton, { props: { type: 'article', documentId: 'a1' } })
    expect(wrapper.text()).not.toMatch(/Publish/i)
  })

  it('for a publisher, confirming calls repo.publish(documentId) and emits the published entity', async () => {
    canPublish.value = true
    const wrapper = await mountSuspended(PublishButton, { props: { type: 'article', documentId: 'a1' } })
    expect(wrapper.text()).toMatch(/Publish/i)

    await wrapper.vm.$.exposed!.confirmPublish()
    await new Promise((r) => setTimeout(r, 0))

    expect(publishMock).toHaveBeenCalledWith('a1')
    const emitted = wrapper.emitted('published')
    expect(emitted).toBeTruthy()
    expect((emitted![0][0] as Article).publishedAt).toBe('2026-06-20T12:00:00.000Z')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/nuxt/publish-button.test.ts`
Expected: FAIL — `Cannot find module '~/components/PublishButton.vue'`.

- [ ] **Step 3: Write minimal implementation**

```vue
<!-- app/components/PublishButton.vue -->
<!--
  PublishButton: the canPublish-GATED publish affordance (Plan 6). DEFAULT-DENY — renders nothing
  for a non-publisher, so an author never sees or reaches Publish. For a publisher: confirm →
  repo.publish(documentId) (Content-Manager publish action) → emit `published` + toast. This UI gate
  is DEFENSE-IN-DEPTH: Strapi ALSO enforces the publisher role server-side (an author's JWT → 403),
  surfaced here as an error. Replaces the Plan-5 "Coming in Plan 6" placeholder.
-->
<script setup lang="ts">
import { ref, computed } from '#imports'
import type { Article, App, Dataset } from '~/types/content'

type Entity = Article | App | Dataset

const props = defineProps<{ type: 'article' | 'app' | 'dataset'; documentId: string; published?: boolean }>()
const emit = defineEmits<{ published: [entity: Entity] }>()

const { canPublish } = useAuth()
const repo = props.type === 'article' ? useArticles() : props.type === 'app' ? useApps() : useDatasets()
const toast = useToast()

const open = ref(false)        // confirm dialog
const busy = ref(false)
const error = ref<string | null>(null)

const label = computed(() => (props.published ? 'Published' : 'Publish'))

/** Run the publish: call the repo's CM publish action, emit the result, surface success/error. */
async function confirmPublish() {
  busy.value = true
  error.value = null
  try {
    const entity = (await repo.publish(props.documentId)) as Entity
    emit('published', entity)
    open.value = false
    toast.add({ title: 'Published', description: 'The entry is now live.', color: 'success' })
  } catch (e) {
    // Strapi rejects a non-publisher JWT with 403 (defense-in-depth); surface it.
    error.value = e instanceof Error ? e.message : 'Publish failed.'
    toast.add({ title: 'Publish failed', description: error.value, color: 'error' })
  } finally {
    busy.value = false
  }
}

defineExpose({ confirmPublish, open })
</script>

<template>
  <!-- Default-deny: only publishers see anything at all. -->
  <div v-if="canPublish" class="inline-flex flex-col gap-1">
    <UButton
      :label="label"
      :disabled="busy || published"
      :loading="busy"
      color="primary"
      icon="i-lucide-globe"
      @click="open = true"
    />

    <UModal v-model:open="open" title="Publish this entry?">
      <template #body>
        <p class="text-sm">
          Publishing makes the entry live and triggers a public-site rebuild. This cannot be undone here.
        </p>
        <p v-if="error" role="alert" class="text-sm text-error mt-2">{{ error }}</p>
      </template>
      <template #footer>
        <UButton color="neutral" variant="ghost" label="Cancel" :disabled="busy" @click="open = false" />
        <UButton color="primary" label="Publish" :loading="busy" @click="confirmPublish" />
      </template>
    </UModal>
  </div>
</template>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/nuxt/publish-button.test.ts`
Expected: PASS (2 tests).

*Note: `UModal`/`UButton`/`useToast` are Nuxt UI auto-imports (no explicit import). The test drives `confirmPublish()` directly via `defineExpose`, so it does not depend on the modal's internal markup. If `UModal`'s `v-model:open` prop name differs in the pinned Nuxt UI 4, adjust the binding — the gate + `confirmPublish` wiring (what the test asserts) is unaffected.*

- [ ] **Step 5: Commit**

```bash
git add app/components/PublishButton.vue tests/nuxt/publish-button.test.ts
git commit -m "feat(studio): add canPublish-gated PublishButton (publish action + confirm)"
```

---

### Task 3: The pure review-email builder + Mailgun sender (`app/lib/review-email.ts`)

**Files:**
- Create: `app/lib/review-email.ts`
- Test: `tests/unit/review-email.test.ts`

**Interfaces (all PURE; `fetch` injected — no Nuxt, no real network):**
- `isValidEmail(s: string): boolean` — a pragmatic single-address check (`local@domain.tld`, no spaces, one `@`, a dotted domain). Used by both the builder and the route's body validation.
- `interface MailMessage { to: string[]; from: string; subject: string; text: string; html: string }`
- `interface ReviewEmailOptions { type: 'article' | 'app' | 'dataset'; documentId: string; reviewers: string[]; message?: string; baseUrl: string; from: string }`
- `buildReviewEmail(opts: ReviewEmailOptions): MailMessage` — validates each reviewer with `isValidEmail` (**throws** on an invalid address so the route returns 400), builds the **absolute preview URL** `${baseUrl.replace(/\/$/, '')}/preview/${type}/${documentId}`, and returns `{ to, from, subject, text, html }`. The `subject` names the type + documentId; the `text` **and** `html` bodies **contain the exact preview link**; the optional `message` is included when present.
- `interface MailgunCreds { domain: string; apiKey: string }`
- `sendViaMailgun(fetchImpl: typeof globalThis.fetch, creds: MailgunCreds, msg: MailMessage): Promise<void>` — does the **direct** Mailgun HTTP call: `POST https://api.mailgun.net/v3/${domain}/messages`, header `Authorization: Basic ${base64('api:'+apiKey)}`, body a `URLSearchParams`/form with `from`, `to` (joined by `,`), `subject`, `text`, `html`. Throws on a non-2xx response (so the route surfaces a 502/failure). **No Mailgun SDK.**

> **Why pure + DI (Global Constraint):** keeping the URL-building, validation, and the exact Mailgun HTTP shape in plain functions makes them node-testable with a **fake `fetch`** — the test asserts the **endpoint**, the **Basic-auth header**, the **recipients**, and that the **preview link** is present, and that a **bad email is rejected** — all with **no real network**. The route handler (Task 4) becomes a thin reader of `runtimeConfig` that delegates here. `sendViaMailgun` takes `fetch` (not `$fetch`) so it is trivially testable with a `vi.fn()` and works identically inside Nitro (Nitro provides a global `fetch`).

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/review-email.test.ts
import { describe, it, expect, vi } from 'vitest'
import { buildReviewEmail, sendViaMailgun, isValidEmail } from '~/lib/review-email'

describe('isValidEmail', () => {
  it('accepts a normal address and rejects malformed ones', () => {
    expect(isValidEmail('reviewer@icjia.illinois.gov')).toBe(true)
    expect(isValidEmail('no-at-sign')).toBe(false)
    expect(isValidEmail('two@@signs.com')).toBe(false)
    expect(isValidEmail('spaces in@domain.com')).toBe(false)
    expect(isValidEmail('missing@tld')).toBe(false)
  })
})

describe('buildReviewEmail', () => {
  const base = {
    type: 'article' as const,
    documentId: 'a1',
    reviewers: ['reviewer@icjia.illinois.gov'],
    baseUrl: 'https://studio.example.gov',
    from: 'Studio <noreply@studio.example.gov>',
  }

  it('builds a message whose text AND html contain the exact /preview/:type/:documentId link', () => {
    const msg = buildReviewEmail({ ...base, message: 'Please review by Friday.' })
    const link = 'https://studio.example.gov/preview/article/a1'
    expect(msg.to).toEqual(['reviewer@icjia.illinois.gov'])
    expect(msg.from).toBe(base.from)
    expect(msg.text).toContain(link)
    expect(msg.html).toContain(link)
    expect(msg.text).toContain('Please review by Friday.')
  })

  it('strips a trailing slash on baseUrl so the preview URL is well-formed', () => {
    const msg = buildReviewEmail({ ...base, baseUrl: 'https://studio.example.gov/' })
    expect(msg.text).toContain('https://studio.example.gov/preview/article/a1')
    expect(msg.text).not.toContain('//preview')
  })

  it('throws when any reviewer address is invalid (→ the route returns 400)', () => {
    expect(() => buildReviewEmail({ ...base, reviewers: ['ok@x.com', 'bad-address'] })).toThrow(/email/i)
  })
})

describe('sendViaMailgun (direct HTTP, no SDK)', () => {
  const msg = {
    to: ['reviewer@icjia.illinois.gov'],
    from: 'Studio <noreply@studio.example.gov>',
    subject: 'Review request',
    text: 'link',
    html: '<p>link</p>',
  }

  it('POSTs the Mailgun messages endpoint with Basic auth and a form body of recipients', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 200 }) as unknown as typeof fetch
    await sendViaMailgun(fetchImpl, { domain: 'mg.example.gov', apiKey: 'key-XYZ' }, msg)

    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe('https://api.mailgun.net/v3/mg.example.gov/messages')
    expect(init.method).toBe('POST')

    // HTTP Basic auth: api:{apiKey}
    const expectedAuth = `Basic ${Buffer.from('api:key-XYZ').toString('base64')}`
    const headers = new Headers(init.headers)
    expect(headers.get('authorization')).toBe(expectedAuth)

    // Form body carries from/to/subject/text/html.
    const body = init.body as URLSearchParams
    expect(body.get('from')).toBe(msg.from)
    expect(body.get('to')).toBe('reviewer@icjia.illinois.gov')
    expect(body.get('subject')).toBe('Review request')
    expect(body.get('text')).toBe('link')
    expect(body.get('html')).toBe('<p>link</p>')
  })

  it('throws on a non-2xx Mailgun response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => 'Unauthorized' }) as unknown as typeof fetch
    await expect(sendViaMailgun(fetchImpl, { domain: 'mg.example.gov', apiKey: 'bad' }, msg)).rejects.toThrow(/mailgun/i)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/review-email.test.ts`
Expected: FAIL — `Cannot find module '~/lib/review-email'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// app/lib/review-email.ts
// PURE, dependency-injected review-email logic (Plan 6, LOCKED decision 3). Two responsibilities,
// both testable without Nuxt or a real network:
//   - buildReviewEmail: validate reviewer addresses, build the ABSOLUTE /preview/:type/:documentId
//     link (the Plan-5 shareable preview), and return the { to, from, subject, text, html } message.
//   - sendViaMailgun: a DIRECT Mailgun HTTP call (no SDK) — POST /v3/{domain}/messages, HTTP Basic
//     auth api:{apiKey}, form body. `fetch` is injected so the route handler stays thin and the
//     test mocks the HTTP call. Secrets (apiKey/domain/from) are supplied by the route from
//     server-side runtimeConfig — NEVER hardcoded, NEVER in the public config.

export interface MailMessage {
  to: string[]
  from: string
  subject: string
  text: string
  html: string
}

export interface ReviewEmailOptions {
  type: 'article' | 'app' | 'dataset'
  documentId: string
  reviewers: string[]
  message?: string
  /** The deployed Studio origin, e.g. https://studio.example.gov (trailing slash tolerated). */
  baseUrl: string
  /** The Mailgun "From" header, e.g. 'ICJIA Studio <noreply@studio.example.gov>'. */
  from: string
}

export interface MailgunCreds {
  domain: string
  apiKey: string
}

/** Pragmatic single-address check: one @, no spaces, a dotted domain. */
export function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())
}

/**
 * Build the review email. Throws if any reviewer address is invalid (the route maps that to 400).
 * The text AND html bodies contain the EXACT absolute /preview/:type/:documentId link.
 */
export function buildReviewEmail(opts: ReviewEmailOptions): MailMessage {
  const reviewers = opts.reviewers.map((r) => r.trim()).filter(Boolean)
  if (reviewers.length === 0) throw new Error('At least one reviewer email is required.')
  for (const r of reviewers) {
    if (!isValidEmail(r)) throw new Error(`Invalid reviewer email: ${r}`)
  }

  const origin = opts.baseUrl.replace(/\/+$/, '')
  const previewUrl = `${origin}/preview/${opts.type}/${opts.documentId}`
  const note = opts.message?.trim()

  const subject = `Review request: ${opts.type} (${opts.documentId})`
  const text = [
    `You have been asked to review a ${opts.type} in the ICJIA Studio.`,
    '',
    `Preview link: ${previewUrl}`,
    ...(note ? ['', `Message from the requester:`, note] : []),
    '',
    `(This link opens the private preview; you must be signed in to the Studio to view it.)`,
  ].join('\n')

  const safeNote = note ? `<p><strong>Message:</strong> ${escapeHtml(note)}</p>` : ''
  const html = [
    `<p>You have been asked to review a <strong>${opts.type}</strong> in the ICJIA Studio.</p>`,
    `<p><a href="${previewUrl}">Open the preview</a><br><code>${previewUrl}</code></p>`,
    safeNote,
    `<p style="color:#6b7280;font-size:0.875rem">This link opens the private preview; you must be signed in to the Studio to view it.</p>`,
  ].join('\n')

  return { to: reviewers, from: opts.from, subject, text, html }
}

/** Minimal HTML-escaping for the user-supplied message in the html body. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Send a message via Mailgun with a DIRECT HTTP call (no SDK). `fetchImpl` is injected (Nitro
 * provides a global fetch; tests pass a fake). HTTP Basic auth uses api:{apiKey}. Throws on non-2xx.
 */
export async function sendViaMailgun(
  fetchImpl: typeof globalThis.fetch,
  creds: MailgunCreds,
  msg: MailMessage,
): Promise<void> {
  const url = `https://api.mailgun.net/v3/${creds.domain}/messages`
  const auth = `Basic ${toBase64(`api:${creds.apiKey}`)}`

  const body = new URLSearchParams()
  body.set('from', msg.from)
  body.set('to', msg.to.join(','))
  body.set('subject', msg.subject)
  body.set('text', msg.text)
  body.set('html', msg.html)

  const res = await fetchImpl(url, {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) {
    const detail = typeof res.text === 'function' ? await res.text().catch(() => '') : ''
    throw new Error(`Mailgun send failed (${res.status}). ${detail}`.trim())
  }
}

/** base64 that works in both Node (Buffer) and the browser (btoa) runtimes. */
function toBase64(s: string): string {
  if (typeof Buffer !== 'undefined') return Buffer.from(s).toString('base64')
  return btoa(s)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/review-email.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add app/lib/review-email.ts tests/unit/review-email.test.ts
git commit -m "feat(studio): add pure review-email builder + direct Mailgun sender (no SDK)"
```

---

### Task 4: The Nitro server route `server/api/request-review.post.ts` (thin: auth-check + validate + send)

**Files:**
- Create: `server/api/request-review.post.ts`
- Create: `app/lib/request-review-handler.ts` (the **pure** handler logic, DI'd — so it is node-testable without Nitro)
- Edit: `nuxt.config.ts` (add the server-only Mailgun `runtimeConfig` keys + `public.publicBaseUrl`)
- Test: `tests/unit/request-review-handler.test.ts`

**Interfaces:**
- `app/lib/request-review-handler.ts` (pure, DI):
  - `interface RequestReviewDeps { verifyCaller: (token: string) => Promise<boolean>; sendEmail: (msg: MailMessage) => Promise<void>; config: { mailgunFrom: string; publicBaseUrl: string } }`
  - `interface RequestReviewInput { authorization: string | undefined; body: unknown }`
  - `interface HandlerResult { status: number; body: { ok: true } | { error: string } }`
  - `async function handleRequestReview(input: RequestReviewInput, deps: RequestReviewDeps): Promise<HandlerResult>` — (1) extract the Bearer token from `authorization`; if absent → `401`. (2) `await deps.verifyCaller(token)`; if false → `401`. (3) validate `body` against `{ type, documentId, reviewers, message? }` (type in the three; documentId non-empty string; reviewers a non-empty array of valid emails via `isValidEmail`) → `400` on any failure. (4) `buildReviewEmail({...body, baseUrl: config.publicBaseUrl, from: config.mailgunFrom })` (its own throw → `400`). (5) `await deps.sendEmail(msg)`; on throw → `502`. (6) success → `{ status: 200, body: { ok: true } }`.
- `server/api/request-review.post.ts` (thin Nitro wrapper):
  - `defineEventHandler` reads `getHeader(event, 'authorization')` and `readBody(event)`; builds `deps` from `useRuntimeConfig(event)` — `verifyCaller` = forward the token to `GET ${config.public.strapiBaseUrl}/admin/users/me` (2xx → true); `sendEmail` = `(msg) => sendViaMailgun(globalThis.$fetch ?? fetch, { domain: config.mailgunDomain, apiKey: config.mailgunApiKey }, msg)`; `config = { mailgunFrom: config.mailgunFrom, publicBaseUrl: config.public.publicBaseUrl }`. Calls `handleRequestReview`, then `setResponseStatus(event, result.status)` and returns `result.body`.
- `nuxt.config.ts` `runtimeConfig`:
  - server-only: `mailgunApiKey: process.env.MAILGUN_API_KEY` , `mailgunDomain: process.env.MAILGUN_DOMAIN`, `mailgunFrom: process.env.MAILGUN_FROM` (Nuxt auto-maps `MAILGUN_API_KEY` → `runtimeConfig.mailgunApiKey` etc., but listing them makes the contract explicit and gives empty-string defaults).
  - public: add `publicBaseUrl: process.env.PUBLIC_BASE_URL ?? ''` next to the existing `strapiBaseUrl`.

> **Anti-abuse + secrets (LOCKED decision 3 / Global Constraints).** The handler's **first** gate is auth: no Bearer token (or one the Strapi `/admin/users/me` check rejects) → **401**, so the endpoint can never be an open spam relay. Body validation → **400**; a Mailgun failure → **502**. **All secrets are read server-side from `runtimeConfig`** (`mailgunApiKey`/`mailgunDomain`/`mailgunFrom`) — the client never sees the key. The `/admin/users/me` forward **reuses the public `strapiBaseUrl`** (not a secret) with the **caller's own** token (the server holds no admin token of its own). **The pure `handleRequestReview` is tested with mock `verifyCaller`/`sendEmail`/`config`** — asserting the 401/400/502/200 branches and that, on the happy path, the message handed to `sendEmail` carries the preview link — **with no real network**. The thin Nitro file is exercised end-to-end only in the user-gated post-plan check (it needs a running server + real Mailgun creds).

- [ ] **Step 1: Write the failing test (the pure handler)**

```ts
// tests/unit/request-review-handler.test.ts
import { describe, it, expect, vi } from 'vitest'
import { handleRequestReview } from '~/lib/request-review-handler'
import type { MailMessage } from '~/lib/review-email'

const config = { mailgunFrom: 'Studio <noreply@studio.example.gov>', publicBaseUrl: 'https://studio.example.gov' }
const okBody = { type: 'article', documentId: 'a1', reviewers: ['reviewer@icjia.illinois.gov'], message: 'Please review.' }

function deps(over: Partial<{ verify: boolean; send: (m: MailMessage) => Promise<void> }> = {}) {
  return {
    verifyCaller: vi.fn().mockResolvedValue(over.verify ?? true),
    sendEmail: vi.fn(over.send ?? (async () => {})),
    config,
  }
}

describe('handleRequestReview (anti-abuse + validation + send)', () => {
  it('401 when no Authorization header is present (not an open relay)', async () => {
    const d = deps()
    const res = await handleRequestReview({ authorization: undefined, body: okBody }, d)
    expect(res.status).toBe(401)
    expect(d.sendEmail).not.toHaveBeenCalled()
  })

  it('401 when the caller token fails the Strapi /admin/users/me check', async () => {
    const d = deps({ verify: false })
    const res = await handleRequestReview({ authorization: 'Bearer bad', body: okBody }, d)
    expect(res.status).toBe(401)
    expect(d.sendEmail).not.toHaveBeenCalled()
  })

  it('400 when a reviewer email is invalid (no send)', async () => {
    const d = deps()
    const res = await handleRequestReview(
      { authorization: 'Bearer good', body: { ...okBody, reviewers: ['bad-address'] } },
      d,
    )
    expect(res.status).toBe(400)
    expect(d.sendEmail).not.toHaveBeenCalled()
  })

  it('400 when the body shape is wrong (bad type / empty reviewers / missing documentId)', async () => {
    const d = deps()
    expect((await handleRequestReview({ authorization: 'Bearer good', body: { ...okBody, type: 'nope' } }, d)).status).toBe(400)
    expect((await handleRequestReview({ authorization: 'Bearer good', body: { ...okBody, reviewers: [] } }, d)).status).toBe(400)
    expect((await handleRequestReview({ authorization: 'Bearer good', body: { ...okBody, documentId: '' } }, d)).status).toBe(400)
    expect(d.sendEmail).not.toHaveBeenCalled()
  })

  it('happy path: 200 and sendEmail receives a message carrying the exact preview link', async () => {
    const d = deps()
    const res = await handleRequestReview({ authorization: 'Bearer good', body: okBody }, d)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
    expect(d.sendEmail).toHaveBeenCalledOnce()
    const msg = (d.sendEmail as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as MailMessage
    expect(msg.text).toContain('https://studio.example.gov/preview/article/a1')
    expect(msg.to).toEqual(['reviewer@icjia.illinois.gov'])
  })

  it('502 when Mailgun send throws', async () => {
    const d = deps({ send: async () => { throw new Error('Mailgun send failed (401).') } })
    const res = await handleRequestReview({ authorization: 'Bearer good', body: okBody }, d)
    expect(res.status).toBe(502)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/request-review-handler.test.ts`
Expected: FAIL — `Cannot find module '~/lib/request-review-handler'`.

- [ ] **Step 3: Write the pure handler**

```ts
// app/lib/request-review-handler.ts
// PURE handler logic for POST /api/request-review (Plan 6, LOCKED decision 3), DI'd so it is
// node-testable WITHOUT Nitro. The thin server route (server/api/request-review.post.ts) supplies
// `deps` from runtimeConfig: verifyCaller (forward the caller's JWT to Strapi /admin/users/me),
// sendEmail (sendViaMailgun with the server-only Mailgun creds), and the from/baseUrl config.
// Gate order — auth FIRST (no open spam relay): missing/invalid token → 401; bad body/email → 400;
// Mailgun failure → 502; success → 200 { ok: true }.
import { buildReviewEmail, type MailMessage } from '~/lib/review-email'

export interface RequestReviewDeps {
  /** True iff the caller's Bearer token is a valid Studio (admin) session. */
  verifyCaller: (token: string) => Promise<boolean>
  /** Send the built message (Mailgun). Throws on failure. */
  sendEmail: (msg: MailMessage) => Promise<void>
  config: { mailgunFrom: string; publicBaseUrl: string }
}

export interface RequestReviewInput {
  authorization: string | undefined
  body: unknown
}

export interface HandlerResult {
  status: number
  body: { ok: true } | { error: string }
}

const TYPES = ['article', 'app', 'dataset'] as const

function bearerToken(authorization: string | undefined): string | null {
  if (!authorization) return null
  const m = /^Bearer\s+(.+)$/i.exec(authorization.trim())
  return m ? m[1] : null
}

interface ReviewBody { type: typeof TYPES[number]; documentId: string; reviewers: string[]; message?: string }

function parseBody(body: unknown): ReviewBody | null {
  if (typeof body !== 'object' || body === null) return null
  const b = body as Record<string, unknown>
  if (!TYPES.includes(b.type as typeof TYPES[number])) return null
  if (typeof b.documentId !== 'string' || b.documentId.trim() === '') return null
  if (!Array.isArray(b.reviewers) || b.reviewers.length === 0) return null
  if (!b.reviewers.every((r) => typeof r === 'string')) return null
  if (b.message !== undefined && typeof b.message !== 'string') return null
  return { type: b.type as typeof TYPES[number], documentId: b.documentId, reviewers: b.reviewers as string[], message: b.message as string | undefined }
}

export async function handleRequestReview(input: RequestReviewInput, deps: RequestReviewDeps): Promise<HandlerResult> {
  // 1) Auth FIRST — never an open relay.
  const token = bearerToken(input.authorization)
  if (!token) return { status: 401, body: { error: 'Authentication required.' } }
  if (!(await deps.verifyCaller(token))) return { status: 401, body: { error: 'Invalid or expired session.' } }

  // 2) Validate the body shape.
  const parsed = parseBody(input.body)
  if (!parsed) return { status: 400, body: { error: 'Invalid request body.' } }

  // 3) Build the message (per-address email validation throws → 400).
  let msg: MailMessage
  try {
    msg = buildReviewEmail({
      type: parsed.type,
      documentId: parsed.documentId,
      reviewers: parsed.reviewers,
      message: parsed.message,
      baseUrl: deps.config.publicBaseUrl,
      from: deps.config.mailgunFrom,
    })
  } catch (e) {
    return { status: 400, body: { error: e instanceof Error ? e.message : 'Invalid email request.' } }
  }

  // 4) Send (Mailgun failure → 502).
  try {
    await deps.sendEmail(msg)
  } catch {
    return { status: 502, body: { error: 'Failed to send the review email.' } }
  }

  return { status: 200, body: { ok: true } }
}
```

- [ ] **Step 4: Run the handler test to verify it passes**

Run: `npx vitest run tests/unit/request-review-handler.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Add the runtimeConfig keys + write the thin Nitro route**

Add the server-only + public config (do NOT put the Mailgun key under `public`):

```ts
// nuxt.config.ts  — runtimeConfig
  runtimeConfig: {
    // Server-only secrets (NEVER exposed to the client). Auto-populated from the matching
    // MAILGUN_* env vars at runtime; empty defaults keep typecheck/build green without them.
    mailgunApiKey: process.env.MAILGUN_API_KEY ?? '',
    mailgunDomain: process.env.MAILGUN_DOMAIN ?? '',
    mailgunFrom: process.env.MAILGUN_FROM ?? '',
    public: {
      strapiBaseUrl: 'https://v2.hub.icjia-api.cloud',
      // The deployed Studio origin the review email links to (absolute /preview/... URL).
      publicBaseUrl: process.env.PUBLIC_BASE_URL ?? '',
    },
  },
```

```ts
// server/api/request-review.post.ts
// THIN Nitro route (Plan 6, LOCKED decision 3). Nitro builds this under ssr:false and it deploys
// as a Netlify Function. It reads server-only secrets from runtimeConfig, wires the pure
// handleRequestReview deps, and translates the result to an HTTP status. ALL logic/branching lives
// in app/lib/request-review-handler.ts (node-tested); ALL secrets stay server-side.
import { handleRequestReview } from '~/lib/request-review-handler'
import { sendViaMailgun } from '~/lib/review-email'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const authorization = getHeader(event, 'authorization')
  const body = await readBody(event)

  const result = await handleRequestReview(
    { authorization, body },
    {
      // Anti-abuse: validate the CALLER's own token against Strapi (no server-held admin token).
      verifyCaller: async (token: string) => {
        try {
          await $fetch('/admin/users/me', {
            baseURL: config.public.strapiBaseUrl,
            headers: { Authorization: `Bearer ${token}` },
          })
          return true
        } catch {
          return false
        }
      },
      // Direct Mailgun call with the server-only creds; $fetch satisfies the injected fetch shape.
      sendEmail: (msg) =>
        sendViaMailgun(
          globalThis.fetch,
          { domain: config.mailgunDomain, apiKey: config.mailgunApiKey },
          msg,
        ),
      config: { mailgunFrom: config.mailgunFrom, publicBaseUrl: config.public.publicBaseUrl },
    },
  )

  setResponseStatus(event, result.status)
  return result.body
})
```

*Note: `defineEventHandler`, `getHeader`, `readBody`, `useRuntimeConfig`, `setResponseStatus`, and `$fetch` are Nitro auto-imports (no explicit import). `sendViaMailgun` is passed `globalThis.fetch` (Nitro provides a global `fetch`); the route stays free of branching — every decision is in the tested pure handler.*

- [ ] **Step 6: Run the suite + typecheck (confirm the server route compiles under ssr:false)**

Run: `npx vitest run tests/unit/request-review-handler.test.ts && npm run typecheck`
Expected: handler tests PASS; typecheck exit 0 (Nitro types resolve the auto-imports). If `~/lib/...` is not resolvable from `server/` in this Nuxt 4 layout, import via the relative path (`../../app/lib/request-review-handler`) — the logic is unchanged; only the import specifier differs.

- [ ] **Step 7: Commit**

```bash
git add server/api/request-review.post.ts app/lib/request-review-handler.ts nuxt.config.ts tests/unit/request-review-handler.test.ts
git commit -m "feat(studio): add request-review Nitro route (auth-gated) + Mailgun runtimeConfig"
```

---

### Task 5: `RequestReviewForm` — the client affordance (reviewer emails + message → POST the route)

**Files:**
- Create: `app/components/RequestReviewForm.vue`
- Test: `tests/nuxt/request-review-form.test.ts`

**Interfaces:**
- Consumes: `useAuthStore()` (`jwt`, to attach `Authorization: Bearer` to the POST); `$fetch` (same-origin Nitro route); `isValidEmail` from `~/lib/review-email` (reuse — client-side pre-validation); Nuxt UI primitives.
- Props: `{ type: 'article' | 'app' | 'dataset'; documentId: string }`.
- Emits: `sent` (on success).
- Behaviour:
  - A small form: a reviewer-emails input (one or more — comma/space/newline-separated, parsed to a `string[]`) + an optional message textarea + a **Send** button.
  - **Client-side pre-validation:** if any parsed address fails `isValidEmail`, show an inline error and **do not POST** (the server re-validates anyway; this is UX).
  - On Send: `POST /api/request-review` with body `{ type, documentId, reviewers, message }` and header `Authorization: Bearer ${jwt}`. On 2xx → emit `sent` + success toast + reset. On error → show the error message (and a toast). **The Mailgun key never reaches the client** — the client only sends the reviewer list + the bearer token to the same-origin route.

> **Why the bearer token + same-origin `$fetch` (Global Constraints):** the request-review route is **same-origin** (a Nitro/Netlify Function), so the client must use `$fetch('/api/request-review', …)` — **not** the Strapi-targeted `$api`. It attaches the caller's admin JWT (`useAuthStore().jwt`) so the route's anti-abuse check (`/admin/users/me`) passes. The component test mocks `$fetch` (success and failure) and asserts: invalid emails block the POST; a valid submission POSTs the right body + bearer header; success emits `sent`; a failure surfaces the error. **No network.** The affordance is rendered for **any** signed-in user (review is not publish-gated — an author may request review of their own draft); it is placed alongside `PublishButton` on `/manage` and the edit page (Task 6 wiring is minimal and covered by the existing routing smoke).

- [ ] **Step 1: Write the failing test**

```ts
// tests/nuxt/request-review-form.test.ts
// @vitest-environment nuxt
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'

// Auth store: provide a jwt so the POST attaches a bearer token.
mockNuxtImport('useAuthStore', () => () => ({ jwt: 'caller-jwt', isLoggedIn: true }))

// Mock the same-origin $fetch the form uses to POST the Nitro route.
const fetchMock = vi.fn().mockResolvedValue({ ok: true })
mockNuxtImport('useRequestFetch', () => () => fetchMock) // see note in Step 3
;(globalThis as Record<string, unknown>).$fetch = fetchMock

import RequestReviewForm from '~/components/RequestReviewForm.vue'

describe('RequestReviewForm', () => {
  beforeEach(() => { fetchMock.mockClear(); fetchMock.mockResolvedValue({ ok: true }) })

  it('blocks the POST and shows an error when an email is invalid', async () => {
    const wrapper = await mountSuspended(RequestReviewForm, { props: { type: 'article', documentId: 'a1' } })
    wrapper.vm.$.exposed!.setReviewers('not-an-email')
    await wrapper.vm.$.exposed!.send()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(wrapper.vm.$.exposed!.error.value).toMatch(/email/i)
  })

  it('POSTs /api/request-review with the parsed reviewers, the body, and a bearer token; emits sent', async () => {
    const wrapper = await mountSuspended(RequestReviewForm, { props: { type: 'article', documentId: 'a1' } })
    wrapper.vm.$.exposed!.setReviewers('a@icjia.illinois.gov, b@icjia.illinois.gov')
    wrapper.vm.$.exposed!.setMessage('Please review by Friday.')
    await wrapper.vm.$.exposed!.send()
    await new Promise((r) => setTimeout(r, 0))

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/request-review')
    expect(opts.method).toBe('POST')
    expect(opts.body).toEqual({
      type: 'article', documentId: 'a1',
      reviewers: ['a@icjia.illinois.gov', 'b@icjia.illinois.gov'],
      message: 'Please review by Friday.',
    })
    expect(new Headers(opts.headers).get('authorization')).toBe('Bearer caller-jwt')
    expect(wrapper.emitted('sent')).toBeTruthy()
  })

  it('surfaces an error when the POST fails', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Failed to send the review email.'))
    const wrapper = await mountSuspended(RequestReviewForm, { props: { type: 'article', documentId: 'a1' } })
    wrapper.vm.$.exposed!.setReviewers('a@icjia.illinois.gov')
    await wrapper.vm.$.exposed!.send()
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.vm.$.exposed!.error.value).toMatch(/send/i)
    expect(wrapper.emitted('sent')).toBeFalsy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/nuxt/request-review-form.test.ts`
Expected: FAIL — `Cannot find module '~/components/RequestReviewForm.vue'`.

- [ ] **Step 3: Write minimal implementation**

```vue
<!-- app/components/RequestReviewForm.vue -->
<!--
  RequestReviewForm: the "Request review" affordance (Plan 6, LOCKED decision 4). Reviewer email(s)
  (manual entry now; onboarding prefill is deferred) + an optional message → POST the same-origin
  Nitro route /api/request-review with the caller's admin JWT as a Bearer token (so the route's
  anti-abuse /admin/users/me check passes). The route builds + sends the email containing the
  EXACT /preview/:type/:documentId link. The Mailgun key NEVER reaches the client — this only sends
  the reviewer list + message + bearer token to our own server. Available to any signed-in user
  (review is not publish-gated).
-->
<script setup lang="ts">
import { ref, computed } from '#imports'
import { isValidEmail } from '~/lib/review-email'

const props = defineProps<{ type: 'article' | 'app' | 'dataset'; documentId: string }>()
const emit = defineEmits<{ sent: [] }>()

const auth = useAuthStore()
const toast = useToast()

const reviewersRaw = ref('')
const message = ref('')
const busy = ref(false)
const error = ref<string | null>(null)

/** Parse the free-text input into a clean address list (comma / whitespace / newline separated). */
const reviewers = computed(() =>
  reviewersRaw.value.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean),
)

function setReviewers(v: string) { reviewersRaw.value = v; error.value = null }
function setMessage(v: string) { message.value = v }

async function send() {
  error.value = null
  const list = reviewers.value
  if (list.length === 0) { error.value = 'Enter at least one reviewer email.'; return }
  const bad = list.find((r) => !isValidEmail(r))
  if (bad) { error.value = `Invalid email: ${bad}`; return } // client-side gate; server re-validates

  busy.value = true
  try {
    await $fetch('/api/request-review', {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth.jwt ?? ''}` },
      body: {
        type: props.type,
        documentId: props.documentId,
        reviewers: list,
        message: message.value.trim() || undefined,
      },
    })
    emit('sent')
    reviewersRaw.value = ''
    message.value = ''
    toast.add({ title: 'Review requested', description: 'The preview link was emailed to the reviewer(s).', color: 'success' })
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to send the review email.'
    toast.add({ title: 'Could not send', description: error.value, color: 'error' })
  } finally {
    busy.value = false
  }
}

defineExpose({ setReviewers, setMessage, send, error, busy })
</script>

<template>
  <form class="space-y-2" @submit.prevent="send">
    <UFormField label="Reviewer email(s)" help="One or more, separated by commas or spaces.">
      <UInput
        :model-value="reviewersRaw"
        placeholder="reviewer@icjia.illinois.gov"
        class="w-full"
        @update:model-value="setReviewers(String($event))"
      />
    </UFormField>
    <UFormField label="Message (optional)">
      <UTextarea
        :model-value="message"
        :rows="3"
        class="w-full"
        @update:model-value="setMessage(String($event))"
      />
    </UFormField>
    <p v-if="error" role="alert" class="text-sm text-error">{{ error }}</p>
    <UButton type="submit" label="Send review request" icon="i-lucide-mail" :loading="busy" />
  </form>
</template>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/nuxt/request-review-form.test.ts`
Expected: PASS (3 tests).

*Note on mocking `$fetch`: the test sets `globalThis.$fetch` to the spy (Nuxt's `$fetch` is the global `ofetch`). If the pinned `@nuxt/test-utils` resolves `$fetch` differently and the spy is not hit, fall back to `vi.stubGlobal('$fetch', fetchMock)` in a `beforeEach` (and `vi.unstubAllGlobals()` after) — the component code is unchanged; only the test's interception of the same-origin call differs. The `useRequestFetch` mock line is harmless if unused.*

- [ ] **Step 5: Commit**

```bash
git add app/components/RequestReviewForm.vue tests/nuxt/request-review-form.test.ts
git commit -m "feat(studio): add RequestReviewForm (emails preview link via the Nitro route)"
```

---

### Task 6: Wire the affordances into `/manage` + the edit page, and ship the rebuild + env docs

**Files:**
- Edit: `app/pages/manage.vue` (replace the "Coming in Plan 6" framing; add `PublishButton` + `RequestReviewForm` per draft row, or a per-row actions cell)
- Edit: `app/pages/edit/[type]/[documentId].vue` (add `PublishButton` + a `RequestReviewForm` disclosure for the loaded entry)
- Create: `docs/deploy-rebuild-and-email.md` (the EXACT Strapi-webhook → Netlify-build-hook steps + the required env vars)
- Test: (covered) — the existing `tests/nuxt/routing-smoke.test.ts` asserts `/manage` renders; extend its `/manage` assertion to expect the queue (not the placeholder). No new test file is required for the doc; the wiring is exercised by the smoke + the Task 2/5 component tests.

> **The "rebuild" deliverable is documentation, not code (LOCKED decision 2).** Publishing fires a **Strapi webhook** → the **Netlify build hook** → the public Hub rebuilds. **No Studio code triggers this**; the build-hook secret lives only in Strapi. This task ships the exact, copy-pasteable setup steps + the env-var list. The page edits are thin glue: drop `PublishButton` (self-gates via `canPublish`) and `RequestReviewForm` next to each draft (queue) and on the edit screen; on `published`, refresh the queue list.

- [ ] **Step 1: Update the `/manage` smoke expectation (red), then wire the queue actions**

Edit the `/manage` case in `tests/nuxt/routing-smoke.test.ts` to expect the live queue rather than the placeholder, and to confirm a per-row actions affordance renders. Since the queue lists via `ContentList` (already mocked through `useArticles().list`), assert the queue heading + that a publisher sees a Publish control. Add a publisher `useAuth` mock to that file's `/manage` test (mirror `dashboard.test.ts`):

```ts
// tests/nuxt/routing-smoke.test.ts  — add near the other mockNuxtImport calls
const managerCanPublish = ref(true)
mockNuxtImport('useAuth', () => () => ({
  user: computed(() => ({ email: 'manager@example.com' })),
  canPublish: managerCanPublish, isLoggedIn: computed(() => true), logout: vi.fn(),
}))
```

```ts
// tests/nuxt/routing-smoke.test.ts  — replace the existing /manage assertion body
  it('/manage renders the publish queue (no longer a Plan-6 placeholder)', async () => {
    const wrapper = await mountSuspended(ManagePage)
    expect(wrapper.text()).toMatch(/Publish queue|Drafts/i)
    expect(wrapper.text()).not.toMatch(/Coming in Plan 6/i)
  })
```

Run: `npx vitest run tests/nuxt/routing-smoke.test.ts`
Expected: FAIL on the `/manage` case (the page still says "Plan 6" / has no per-row publish). (The `useAuth` mock may also need `useApps`/`useDatasets` stubs if `ContentList` switches types — keep the existing `useArticles` stub; add `useApps`/`useDatasets` list stubs if the smoke exercises them.)

- [ ] **Step 2: Wire `/manage` (green)**

`ContentList` renders rows from `repo.list({ status: 'draft' })`. The minimal, test-satisfying change is to (a) drop the "Coming in Plan 6" copy, and (b) render the publish/review affordances. If `ContentList` exposes a per-row slot, use it; otherwise render a compact actions panel keyed to the selected list. The simplest robust approach that keeps the smoke green is a per-type list with a row-actions slot:

```vue
<!-- app/pages/manage.vue -->
<!--
  /manage — Manager publish queue (spec §9). adminOnly: the global guard redirects non-publishers.
  Lists draft content per type and now offers, per draft, a canPublish-gated Publish button and a
  Request-review form (Plan 6). Publishing fires a Strapi webhook → Netlify build hook → public-site
  rebuild (configured by the user; see docs/deploy-rebuild-and-email.md). No Studio code triggers
  the rebuild.
-->
<script setup lang="ts">
import { ref } from '#imports'

definePageMeta({ adminOnly: true })

const listType = ref<'article' | 'app' | 'dataset'>('article')
const refreshKey = ref(0) // bump to refetch the list after a publish
function onPublished() { refreshKey.value++ }
</script>
<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-semibold">Publish queue</h1>
    <p class="text-sm text-muted">Review drafts, request review by email, and publish.</p>
    <UCard>
      <template #header>
        <USelect
          v-model="listType"
          :items="[
            { label: 'Articles', value: 'article' },
            { label: 'Apps', value: 'app' },
            { label: 'Datasets', value: 'dataset' },
          ]"
          size="sm"
        />
      </template>

      <ContentList :key="`${listType}-${refreshKey}`" :type="listType" status="draft">
        <template #row-actions="{ documentId, published }">
          <div class="flex flex-wrap items-center gap-2">
            <PublishButton :type="listType" :document-id="documentId" :published="published" @published="onPublished" />
            <UPopover>
              <UButton size="xs" variant="subtle" icon="i-lucide-mail" label="Request review" />
              <template #content>
                <div class="p-3 w-80">
                  <RequestReviewForm :type="listType" :document-id="documentId" />
                </div>
              </template>
            </UPopover>
          </div>
        </template>
      </ContentList>
    </UCard>
  </div>
</template>
```

*If `ContentList` does NOT support a `#row-actions` slot, add the slot to `ContentList.vue` (pass `documentId` + `published` per row) as a small, separately-committed change — OR, to avoid touching `ContentList`, render the affordances in a sibling panel for the selected draft. Keep whichever path leaves the smoke green and `PublishButton` self-gated. Confirm `published` is derived from each row's `publishedAt != null`.*

Run: `npx vitest run tests/nuxt/routing-smoke.test.ts`
Expected: PASS.

- [ ] **Step 3: Wire the edit page**

Add the affordances under the form on `app/pages/edit/[type]/[documentId].vue` (only when an entry is loaded). The edit page already resolves `repo`, `entry`, `type`, `documentId`:

```vue
<!-- app/pages/edit/[type]/[documentId].vue  — add inside the `v-else-if="entry"` template block, after the form -->
      <div class="mt-6 border-t border-default pt-4 space-y-3">
        <div class="flex items-center gap-3">
          <PublishButton
            :type="(type as 'article' | 'app' | 'dataset')"
            :document-id="documentId"
            :published="entry.publishedAt != null"
            @published="entry.publishedAt = ($event as typeof entry).publishedAt"
          />
          <span v-if="entry.publishedAt" class="text-sm text-muted">Published.</span>
        </div>
        <details>
          <summary class="cursor-pointer text-sm font-medium">Request review by email</summary>
          <div class="mt-2 max-w-md">
            <RequestReviewForm :type="(type as 'article' | 'app' | 'dataset')" :document-id="documentId" />
          </div>
        </details>
      </div>
```

*`PublishButton` and `RequestReviewForm` are auto-imported from `app/components/`. The `@published` handler updates the loaded entry's `publishedAt` so the button flips to "Published" without a refetch. This block renders only when `entry` is truthy and `type` is one of the three (the page already guards unknown types).*

- [ ] **Step 4: Write the rebuild + env documentation**

```markdown
<!-- docs/deploy-rebuild-and-email.md -->
# Publish → Rebuild, and the Review-Email — Setup

This Studio publishes content via the Strapi Content-Manager **publish action**. Two pieces of the
publish/review loop are **operator configuration**, not application code:

1. **Rebuild on publish** — a **Strapi webhook** that calls a **Netlify build hook**. (No Studio
   code triggers the rebuild; the build-hook URL is a secret that lives ONLY in Strapi.)
2. **The review email** — sent by the Studio's own server route via **Mailgun**, configured with
   the environment variables below.

---

## 1. Rebuild on publish (Strapi webhook → Netlify build hook)

### a. Create the Netlify build hook (in Netlify)
1. Netlify → your **public Hub** site → **Site settings** → **Build & deploy** → **Build hooks**.
2. **Add build hook** → name it e.g. `strapi-publish` → choose the production branch → **Save**.
3. Copy the generated URL (looks like `https://api.netlify.com/build_hooks/XXXXXXXX`). **Treat it as a
   secret** — anyone with it can trigger a build.

### b. Create the Strapi webhook (in the Strapi admin panel)
1. Strapi admin → **Settings** → **Webhooks** → **Create new webhook**.
2. **Name:** `Netlify rebuild on publish`.
3. **URL:** paste the Netlify build-hook URL from step (a).
4. **Events:** enable **`entry.publish`** (and optionally **`entry.unpublish`** so an unpublish also
   rebuilds). Leave create/update/delete off unless you also want drafts to rebuild the site.
5. **Save**, then use **Trigger** to fire a test event and confirm a Netlify build starts.

That is the entire "rebuild" wiring. When a manager clicks **Publish** in the Studio, Strapi sets
`publishedAt`, fires `entry.publish`, and Netlify rebuilds the public Hub.

---

## 2. Review-email environment variables

The review-email route (`server/api/request-review.post.ts`) reads these at runtime. Set them in
the **Studio's** Netlify site (Site settings → Environment variables) — and locally in a `.env` that
is **NOT committed**.

| Variable           | Scope        | Example                                         | Purpose                                                        |
| ------------------ | ------------ | ----------------------------------------------- | -------------------------------------------------------------- |
| `MAILGUN_API_KEY`  | **server**   | `key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`           | Mailgun private API key (HTTP Basic `api:<key>`). **Secret.**  |
| `MAILGUN_DOMAIN`   | **server**   | `mg.studio.example.gov`                          | Mailgun sending domain (`POST /v3/{domain}/messages`).         |
| `MAILGUN_FROM`     | **server**   | `ICJIA Studio <noreply@mg.studio.example.gov>`  | The `From` header on review emails.                            |
| `PUBLIC_BASE_URL`  | public       | `https://studio.example.gov`                    | The Studio origin used to build the absolute `/preview/...` link. |

Notes:
- `MAILGUN_API_KEY` is **server-only** — it is read from `runtimeConfig.mailgunApiKey` inside the
  Nitro route and **never** shipped to the browser. Do not move it under `runtimeConfig.public`.
- `PUBLIC_BASE_URL` is **not** a secret (it is just the site's public origin); it is exposed via
  `runtimeConfig.public.publicBaseUrl` so the email's preview link is absolute.
- The route also reuses `runtimeConfig.public.strapiBaseUrl` to verify the caller's session
  (`GET /admin/users/me`) before sending — this prevents the endpoint from being an open spam relay.
- The Netlify **build-hook** URL from section 1 is configured in **Strapi**, NOT here, and is never
  an env var of the Studio.
```

- [ ] **Step 5: Run the full suite + typecheck**

Run: `npx vitest run && npm run typecheck`
Expected: all tests pass (the prior plans' baseline + this plan's additions); typecheck exit 0. Fix any type drift (e.g. the `entry.publishedAt` assignment on the union type, or a `ContentList` row-actions slot prop type) before committing — never weaken a test.

- [ ] **Step 6: Commit**

```bash
git add app/pages/manage.vue app/pages/edit tests/nuxt/routing-smoke.test.ts docs/deploy-rebuild-and-email.md
git commit -m "feat(studio): wire Publish + Request-review into manage/edit; doc rebuild + env vars"
```

---

## Post-plan verification (user-gated)

These require a real admin-panel login (the Content-Manager + Mailgun calls reject unauthenticated/unconfigured requests) and a real deployment, so they run as a controlled manual check after the plan lands — they do **not** block merge. **Target the dev Strapi 5 and a Studio preview deploy only.**

1. **Publish (validated-at-runtime — this is the live confirmation the plan deliberately did NOT claim):** sign in to dev Strapi as a **real Editor**, open `/manage` (or an edit page), click **Publish** → confirm a `POST /content-manager/collection-types/{uid}/{documentId}/actions/publish` returns 200, the entry's `publishedAt` is now set, and the queue/edit UI reflects "Published".
2. **Default-deny + server enforcement:** sign in as a **non-publisher (author)** → confirm the Publish button is **absent**; then (e.g. via devtools) attempt the publish endpoint with the author's JWT → confirm Strapi returns **403** (server-side enforcement, independent of the UI gate).
3. **Rebuild webhook:** with the Strapi webhook + Netlify build hook configured (per `docs/deploy-rebuild-and-email.md`), publish an entry → confirm a Netlify build for the **public Hub** starts (and the published change appears after the build).
4. **Review email happy path:** with `MAILGUN_*` + `PUBLIC_BASE_URL` set on the Studio deploy, open **Request review**, enter a real reviewer address + a message, Send → confirm a 200 from `/api/request-review`, an email arrives, and its body contains the **exact** `${PUBLIC_BASE_URL}/preview/{type}/{documentId}` link that opens the private preview when signed in.
5. **Anti-abuse:** call `POST /api/request-review` **without** a Bearer token (or with a bogus one) → confirm **401** and that **no** email is sent; submit an **invalid** reviewer address through the form → confirm a **400** and no send. Confirm the Mailgun key is **not** present anywhere in the client bundle.

## Open items carried into later plans

- **Onboarding / `studio-profile`** — reviewer-address prefill (and manager/center/author emails); needs the Strapi collection type created in the dev env first. Manual reviewer entry until then.
- **Unpublish / scheduling** — add `unpublish(documentId)` (`.../actions/unpublish`) to the repository + an UI control; optionally schedule. The docs already note `entry.unpublish` as a webhook trigger.
- **Cascade/relation publish** — publishing linked apps↔datasets↔articles together; blocked by the deferred relation-write path.
- **Per-author draft ownership** ("only my drafts" in the queue) — a backend change; the queue shows the shared draft pool until then.
- **Full accessibility pass** — Plan 7 (the new surfaces use labelled Nuxt UI primitives + `role="alert"`, but the comprehensive audit is Plan 7).
- **Richer review workflow** — review status tracking, reminders, reviewer comments back into the Studio (beyond the one-shot email). Future.
- **"Add Sample Article" demo** — Plan 7.

## Self-review (performed against the LOCKED decisions + Global Constraints)

- **Publish is gated AND Strapi-enforced.** `repo.publish` posts the Content-Manager publish action with the admin JWT (Task 1); the `PublishButton` is **default-deny** — renders nothing unless `canPublish` (Task 2, asserted by the non-publisher test). The plan states repeatedly that **Strapi enforces the publisher role server-side (author → 403)**, so the UI gate is **defense-in-depth**, and verification step 2 exercises both sides. Marked **validated-at-runtime** (built from the validated CM contract; confirmed by the user with a real Editor login in step 1) — the plan does **not** claim a live publish was run.
- **Secrets only in server env.** `MAILGUN_API_KEY`/`MAILGUN_DOMAIN`/`MAILGUN_FROM` are **server-only** `runtimeConfig` keys (Task 4), read inside the Nitro route; `PUBLIC_BASE_URL` (a non-secret origin) is the only public addition. The Mailgun key never reaches the client (the form posts only the reviewer list + bearer token to the same-origin route; Task 5). The docs (Task 6) list the env vars and explicitly say the key stays server-side and the Netlify build-hook URL lives in **Strapi**.
- **The email carries the preview link.** `buildReviewEmail` builds the absolute `${baseUrl}/preview/${type}/${documentId}` and puts it in **both** `text` and `html` (Task 3, asserted); the handler test asserts the message handed to `sendEmail` contains it (Task 4); verification step 4 confirms it end-to-end.
- **The route is not an open relay.** `handleRequestReview`'s **first** gate is auth — missing/invalid Bearer → **401** with no send (Task 4, two 401 tests); the Nitro route implements `verifyCaller` by forwarding the caller's token to `GET /admin/users/me`. Bad body/email → **400**; Mailgun failure → **502**.
- **Server routes work under `ssr: false`.** Stated in Global Constraints + Tech Stack: Nitro always builds; `ssr: false` only disables page SSR, not API routes; `server/api/**` deploys as Netlify Functions automatically. The route file is created under `server/api/` and its logic is node-tested via the extracted pure handler (Task 4); the only `ssr:false`-specific uncertainty (import resolution from `server/` and `$fetch` interception in the component test) is called out with fallbacks.
- **Manual reviewer entry now.** The form takes free-text email(s) (parsed + validated), message optional; onboarding prefill is explicitly **deferred** (Task 5 + Deferred section + Open items).
- **Rebuild = documented Strapi webhook, not code.** No Studio code triggers the rebuild; Task 6 ships `docs/deploy-rebuild-and-email.md` with the exact Strapi `entry.publish` webhook → Netlify build-hook steps; the build-hook secret lives only in Strapi. Stated explicitly in Global Constraints, Task 6, and the Deferred section.
- **Name/type consistency:** `publish` (repo method + the `.../actions/publish` endpoint), `canPublish` (gate, from `useAuth`/`admin-roles`), `buildReviewEmail` / `sendViaMailgun` / `isValidEmail` (`app/lib/review-email.ts`), `handleRequestReview` (the pure route handler), `PublishButton` (emits `published`), `RequestReviewForm` (emits `sent`), and the runtimeConfig keys (`mailgunApiKey`/`mailgunDomain`/`mailgunFrom`, `public.publicBaseUrl`, reused `public.strapiBaseUrl`) are spelled identically across Tasks 1→6 and against the existing layers (`Repository<T>`, `useAuthStore().jwt`, `PUBLISHER_ROLE_CODES`, the `/preview/:type/:documentId` route). The `$Fetch` fake-test idiom and the `mountSuspended`/`mockNuxtImport` component idiom mirror `tests/unit/repository.test.ts` and `tests/nuxt/dashboard.test.ts`.
- **Placeholder scan:** none — every step ships complete, runnable code (no TODOs, no "similar to Task N"); exact paths, run commands, and commit messages (no AI co-author trailer). **No new dependency** (Mailgun via `ofetch`/`$fetch`, no SDK); Pinia 2.x stack untouched.
- **Process:** TDD red → green → commit per task; full `npx vitest run && npm run typecheck` gate before the final commit; pristine output; no AI co-author trailer.

---

**Plan complete.** Six TDD tasks closing the Studio's publish/review loop — a `publish(documentId)` Content-Manager action on the repository, a `canPublish`-gated (default-deny, Strapi-enforced) `PublishButton`, a pure DI review-email builder + direct-HTTP Mailgun sender, an auth-gated thin Nitro route that can never be an open relay, a `RequestReviewForm` that emails the exact private `/preview` link, and **documentation** for the Strapi-webhook → Netlify-build-hook rebuild plus the required env vars — all wiring the already-built data, auth, and preview layers, with onboarding prefill, unpublish/scheduling, relation/cascade publish, and the full a11y pass explicitly deferred. The publish action is **validated-at-runtime** (confirmed by the user against dev Strapi), not claimed live; the rebuild is a documented Strapi webhook, not Studio code; and all Mailgun secrets stay server-side.
