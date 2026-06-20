# Auth → Admin Content-Manager Retarget — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Draft 1 — first iteration.** Consequence of a mid-build discovery: the Studio's users are Strapi **admin-panel** accounts, and the data layer talks to the admin **Content-Manager API** — so login must use the admin API, not the Users & Permissions API that Plan 1 (Foundation & Auth) shipped.

**Goal:** Retarget the existing Plan 1 authentication from the Strapi Users & Permissions API (`/api/auth/local`) to the **admin API** (`/admin/login` + `/admin/users/me`), so staff sign in with their Strapi admin accounts and the admin **role codes** drive publish-gating — unblocking live Content-Manager reads/writes for the data layer.

**Architecture:** Keep Plan 1's exact structure — pure, dependency-injected functions (`loginRequest`, `fetchMe`, role helpers) unit-tested; thin store/composable/guard wiring. Only the endpoints, the user/role shape, and the capability getter change. Login stays a two-step flow (login → fetch-me) because `/admin/login` returns the user with an **empty** `roles` array; the roles come from `/admin/users/me`. The `admin/admin` dev bypass is preserved (now minting an admin-shaped synthetic session).

**Tech Stack:** Nuxt 4 SPA, Pinia (persisted cookie), TypeScript, `ofetch` (`$api`), Vitest + `@nuxt/test-utils`.

## 📋 For managers — what is this, and is it legit?

A small, surgical fix, not a redo. When we built the content engine, we confirmed your staff are **Strapi admin users** (Super Admin / Editor / Author) and that Strapi already enforces exactly your rule — *authors draft, editors and super-admins publish* — at the admin level. The login we built first used a *different* Strapi door. This plan moves the login to the **right door** so those accounts and roles work, and so "who can publish" is decided by your real Strapi roles. Everything is test-first and reversible. Nothing about the content, the zero-base64 rule, or the design changes.

## Global Constraints

*Confirmed against the live dev instance (`https://v2.hub.icjia-api.cloud`) on 2026-06-20. Every task implicitly includes this section.*

- **Admin login:** `POST /admin/login` with `{ email, password }` → `200 { data: { token, user } }`. The `user` here has **`roles: []`** (empty) — do NOT read roles from the login response.
- **Roles + boot re-verify:** `GET /admin/users/me` (with `Authorization: Bearer <admin-token>`) → `{ data: AdminUser }` where `AdminUser.roles` is `[{ id, name, code }]` (e.g. `{ code: 'strapi-super-admin', name: 'Super Admin' }`).
- **Role codes (stable identifiers — gate on `code`, not display `name`):** `strapi-super-admin`, `strapi-editor`, `strapi-author`. **Publishers = `strapi-super-admin` + `strapi-editor`**; `strapi-author` = drafts only.
- **Admin user shape (verified):** `{ id, documentId?, firstname?, lastname?, username?, email, isActive?, blocked?, roles: AdminRole[] }`.
- The admin JWT (from `/admin/login`) is the Bearer for ALL authenticated calls — both `/admin/*` and the data layer's `/content-manager/*`. The `$api` plugin already attaches `auth.jwt`; only the token's *source* changes.
- **Security (carry over from Plan 1):** JWT persisted in a **Secure, `SameSite=Strict` cookie** (not localStorage); **re-verified on every app boot** via `/admin/users/me`; a 401 clears the session and redirects to `/login`. Server-side admin RBAC remains the real authorization boundary; the client `canPublish` only decides which controls render. (HttpOnly-cookie hardening remains a separately-scheduled backend task.)
- **Dev bypass preserved:** the `admin/admin` dev-only login (gated by `import.meta.dev`, `app/lib/dev-auth.ts`) must still work and must grant `canPublish` — it mints a synthetic admin session with a `strapi-super-admin` role. Still REMOVE BEFORE DEPLOY.
- TDD (red → green), frequent commits, pristine test output, **no AI co-author trailer** in commits. Pinned Pinia 2.x stack not bumped.

## File structure

```
app/
├── types/
│   └── admin.ts              # NEW: AdminRole, AdminUser, AdminLoginResponse, AdminMeResponse
├── lib/
│   ├── admin-roles.ts        # NEW: role-code constants + roleCodesOf() + canPublish() (pure)
│   ├── auth.ts               # MODIFY: loginRequest → /admin/login; fetchMe → /admin/users/me
│   └── dev-auth.ts           # MODIFY: makeDevAdminSession → admin-shaped session (super-admin role)
├── stores/
│   └── auth.ts               # MODIFY: user: AdminUser; getters roleCodes/canPublish/displayName (drop isAdmin/role)
├── composables/
│   └── useAuth.ts            # MODIFY: admin login/init flow; expose canPublish (not isAdmin)
├── lib/
│   └── guard.ts              # MODIFY: adminOnly route → require canPublish
├── pages/
│   ├── login.vue             # MODIFY: email-based admin login (copy/labels); dev shortcut unchanged
│   └── index.vue             # MODIFY: Publish-queue card v-if=canPublish; show displayName/roles
└── layouts/
    └── default.vue           # MODIFY: header shows displayName + role; logout unchanged

tests/unit/{admin-roles,auth-lib,auth-store,dev-auth,guard}.test.ts   # add/modify
tests/nuxt/{smoke,login}.test.ts                                       # adjust if they assert old shape
```

> **Cleanup note:** after this retarget, the U&P types in `app/types/strapi.ts` (`StrapiUser`, `StrapiRole`, `LoginResponse`) are unused by auth. Delete them in Task 1 if nothing else imports them (grep first); the data layer's `app/types/content.ts` is separate and unaffected.

---

### Task 1: Admin types + role helpers

**Files:**
- Create: `app/types/admin.ts`
- Create: `app/lib/admin-roles.ts`
- Test: `tests/unit/admin-roles.test.ts`

**Interfaces:**
- Produces (types): `AdminRole { id; name; code }`, `AdminUser { id; documentId?; firstname?; lastname?; username?; email; isActive?; blocked?; roles: AdminRole[] }`, `AdminLoginResponse { data: { token; user: AdminUser } }`, `AdminMeResponse { data: AdminUser }`.
- Produces (helpers): `PUBLISHER_ROLE_CODES`, `AUTHOR_ROLE_CODE`, `roleCodesOf(user): string[]`, `canPublish(roleCodes: string[]): boolean`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/admin-roles.test.ts
import { describe, it, expect } from 'vitest'
import { PUBLISHER_ROLE_CODES, roleCodesOf, canPublish } from '~/lib/admin-roles'
import type { AdminUser } from '~/types/admin'

const user = (codes: string[]): AdminUser => ({
  id: 1, email: 'x@e.gov', roles: codes.map((code, i) => ({ id: i, name: code, code })),
})

describe('admin-roles', () => {
  it('lists the publisher role codes', () => {
    expect(PUBLISHER_ROLE_CODES).toEqual(['strapi-super-admin', 'strapi-editor'])
  })
  it('extracts role codes from a user (empty when none/null)', () => {
    expect(roleCodesOf(user(['strapi-author']))).toEqual(['strapi-author'])
    expect(roleCodesOf(null)).toEqual([])
  })
  it('canPublish: true for super-admin or editor, false for author', () => {
    expect(canPublish(['strapi-super-admin'])).toBe(true)
    expect(canPublish(['strapi-editor'])).toBe(true)
    expect(canPublish(['strapi-author'])).toBe(false)
    expect(canPublish([])).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/admin-roles.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// app/types/admin.ts
// Strapi 5 ADMIN-panel user/role shapes (verified against the live instance 2026-06-20).
// These are the admin API's types — distinct from the Users & Permissions plugin.
export interface AdminRole {
  id: number
  name: string
  /** Stable identifier — gate capability on this, not `name`. e.g. 'strapi-super-admin'. */
  code: string
}

export interface AdminUser {
  id: number
  documentId?: string
  firstname?: string
  lastname?: string
  username?: string
  email: string
  isActive?: boolean
  blocked?: boolean
  roles: AdminRole[]
}

/** `POST /admin/login` → user.roles is EMPTY here; fetch /admin/users/me for roles. */
export interface AdminLoginResponse { data: { token: string; user: AdminUser } }
/** `GET /admin/users/me` → user WITH roles populated. */
export interface AdminMeResponse { data: AdminUser }
```

```ts
// app/lib/admin-roles.ts
import type { AdminUser } from '~/types/admin'

/** Admin role codes allowed to PUBLISH (make content live). Authors (strapi-author) cannot. */
export const PUBLISHER_ROLE_CODES = ['strapi-super-admin', 'strapi-editor'] as const
export const AUTHOR_ROLE_CODE = 'strapi-author'

export function roleCodesOf(user: AdminUser | null | undefined): string[] {
  return (user?.roles ?? []).map((r) => r.code)
}

export function canPublish(roleCodes: string[]): boolean {
  return roleCodes.some((c) => (PUBLISHER_ROLE_CODES as readonly string[]).includes(c))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/admin-roles.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add app/types/admin.ts app/lib/admin-roles.ts tests/unit/admin-roles.test.ts
git commit -m "feat(auth): add admin user/role types + publish-role helpers"
```

---

### Task 2: Admin auth lib (`loginRequest` + `fetchMe`)

**Files:**
- Modify: `app/lib/auth.ts` (full replace)
- Test: `tests/unit/auth-lib.test.ts` (full replace)

**Interfaces:**
- Consumes: `AdminUser`, `AdminLoginResponse`, `AdminMeResponse` (Task 1).
- Produces: `loginRequest(api, email, password): Promise<{ jwt: string; user: AdminUser }>`; `fetchMe(api): Promise<AdminUser>`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/auth-lib.test.ts
import { describe, it, expect, vi } from 'vitest'
import { loginRequest, fetchMe } from '~/lib/auth'
import type { $Fetch } from 'ofetch'

describe('loginRequest', () => {
  it('POSTs email/password to /admin/login and returns token + user', async () => {
    const fake = { data: { token: 'jwt-x', user: { id: 1, email: 'a@b.gov', roles: [] } } }
    const api = vi.fn().mockResolvedValue(fake) as unknown as $Fetch
    const result = await loginRequest(api, 'a@b.gov', 'secret')
    expect(api).toHaveBeenCalledWith('/admin/login', { method: 'POST', body: { email: 'a@b.gov', password: 'secret' } })
    expect(result).toEqual({ jwt: 'jwt-x', user: { id: 1, email: 'a@b.gov', roles: [] } })
  })
})

describe('fetchMe', () => {
  it('GETs /admin/users/me and unwraps data (user with roles)', async () => {
    const me = { data: { id: 1, email: 'a@b.gov', roles: [{ id: 1, name: 'Super Admin', code: 'strapi-super-admin' }] } }
    const api = vi.fn().mockResolvedValue(me) as unknown as $Fetch
    const result = await fetchMe(api)
    expect(api).toHaveBeenCalledWith('/admin/users/me')
    expect(result.roles[0].code).toBe('strapi-super-admin')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/auth-lib.test.ts`
Expected: FAIL — old `loginRequest` posts to `/api/auth/local`; the new assertions don't match.

- [ ] **Step 3: Write minimal implementation**

```ts
// app/lib/auth.ts
import type { $Fetch } from 'ofetch'
import type { AdminUser, AdminLoginResponse, AdminMeResponse } from '~/types/admin'

/** Admin-panel login. NOTE: the returned user has an EMPTY roles array — call fetchMe for roles. */
export async function loginRequest(api: $Fetch, email: string, password: string): Promise<{ jwt: string; user: AdminUser }> {
  const res = await api<AdminLoginResponse>('/admin/login', { method: 'POST', body: { email, password } })
  return { jwt: res.data.token, user: res.data.user }
}

/** Current admin user WITH roles populated (used at login completion and on boot re-verify). */
export async function fetchMe(api: $Fetch): Promise<AdminUser> {
  const res = await api<AdminMeResponse>('/admin/users/me')
  return res.data
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/auth-lib.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add app/lib/auth.ts tests/unit/auth-lib.test.ts
git commit -m "feat(auth): retarget loginRequest/fetchMe to the admin API"
```

---

### Task 3: Auth store retarget

**Files:**
- Modify: `app/stores/auth.ts` (full replace)
- Test: `tests/unit/auth-store.test.ts` (full replace)

**Interfaces:**
- Consumes: `AdminUser` (Task 1); `roleCodesOf`, `canPublish` (Task 1).
- Produces: store getters `isLoggedIn`, `roleCodes: string[]`, `canPublish: boolean`, `displayName: string | null`; actions `setSession({ jwt, user })`, `setUser(user)`, `clearSession()`. (Removes the old `role`/`isAdmin`.)

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/auth-store.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '~/stores/auth'
import type { AdminUser } from '~/types/admin'

const mk = (codes: string[], over: Partial<AdminUser> = {}): AdminUser => ({
  id: 1, email: 'chris@e.gov', firstname: 'Chris', lastname: 'Schweda',
  roles: codes.map((c, i) => ({ id: i, name: c, code: c })), ...over,
})

describe('auth store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('starts logged out', () => {
    const s = useAuthStore()
    expect(s.isLoggedIn).toBe(false)
    expect(s.roleCodes).toEqual([])
    expect(s.canPublish).toBe(false)
  })
  it('setSession stores jwt + user and exposes role codes', () => {
    const s = useAuthStore()
    s.setSession({ jwt: 'jwt-1', user: mk(['strapi-author']) })
    expect(s.isLoggedIn).toBe(true)
    expect(s.roleCodes).toEqual(['strapi-author'])
    expect(s.canPublish).toBe(false)
    expect(s.displayName).toBe('Chris Schweda')
  })
  it('canPublish is true for editor/super-admin', () => {
    const s = useAuthStore()
    s.setSession({ jwt: 'j', user: mk(['strapi-editor']) })
    expect(s.canPublish).toBe(true)
  })
  it('displayName falls back to username then email', () => {
    const s = useAuthStore()
    s.setSession({ jwt: 'j', user: mk([], { firstname: undefined, lastname: undefined, username: 'cschweda' }) })
    expect(s.displayName).toBe('cschweda')
  })
  it('clearSession resets everything', () => {
    const s = useAuthStore()
    s.setSession({ jwt: 'j', user: mk(['strapi-super-admin']) })
    s.clearSession()
    expect(s.isLoggedIn).toBe(false)
    expect(s.jwt).toBeNull()
    expect(s.user).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/auth-store.test.ts`
Expected: FAIL — store still has `role`/`isAdmin`, imports `StrapiUser`.

- [ ] **Step 3: Write minimal implementation**

```ts
// app/stores/auth.ts
import { defineStore } from 'pinia'
import type { AdminUser } from '~/types/admin'
import { roleCodesOf, canPublish as canPublishFromCodes } from '~/lib/admin-roles'

interface AuthState {
  jwt: string | null
  user: AdminUser | null
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({ jwt: null, user: null }),
  getters: {
    isLoggedIn: (state): boolean => Boolean(state.jwt && state.user),
    roleCodes: (state): string[] => roleCodesOf(state.user),
    canPublish(): boolean { return canPublishFromCodes(this.roleCodes) },
    displayName: (state): string | null => {
      const u = state.user
      if (!u) return null
      const full = `${u.firstname ?? ''} ${u.lastname ?? ''}`.trim()
      return full || u.username || u.email
    },
  },
  actions: {
    setSession(payload: { jwt: string; user: AdminUser }) {
      this.jwt = payload.jwt
      this.user = payload.user
    },
    setUser(user: AdminUser) {
      this.user = user
    },
    clearSession() {
      this.jwt = null
      this.user = null
    },
  },
  persist: {
    storage: piniaPluginPersistedstate.cookies({
      sameSite: 'strict',
      secure: !import.meta.dev,
      maxAge: 60 * 60 * 24 * 30,
    }),
  },
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/auth-store.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add app/stores/auth.ts tests/unit/auth-store.test.ts
git commit -m "feat(auth): retarget auth store to admin user + canPublish"
```

---

### Task 4: Dev-admin bypass retarget

**Files:**
- Modify: `app/lib/dev-auth.ts` (`makeDevAdminSession` only — keep the rest)
- Test: `tests/unit/dev-auth.test.ts` (update the session-shape assertions)

**Interfaces:**
- Consumes: `AdminUser` (Task 1); auth store (Task 3).
- Produces: `makeDevAdminSession(): { jwt: string; user: AdminUser }` (synthetic admin session with a `strapi-super-admin` role). `DEV_ADMIN_IDENTIFIER`, `DEV_ADMIN_PASSWORD`, `DEV_ADMIN_TOKEN`, `matchesDevAdmin`, `isDevAdminToken` unchanged.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/dev-auth.test.ts  (replace the makeDevAdminSession describe block; keep matchesDevAdmin/isDevAdminToken blocks as-is)
import { describe, it, expect } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { DEV_ADMIN_TOKEN, makeDevAdminSession } from '~/lib/dev-auth'
import { useAuthStore } from '~/stores/auth'

describe('makeDevAdminSession', () => {
  it('carries the sentinel token and a super-admin role code', () => {
    const session = makeDevAdminSession()
    expect(session.jwt).toBe(DEV_ADMIN_TOKEN)
    expect(session.user.roles.map((r) => r.code)).toContain('strapi-super-admin')
  })
  it('grants a logged-in publisher session through the real auth store', () => {
    setActivePinia(createPinia())
    const store = useAuthStore()
    store.setSession(makeDevAdminSession())
    expect(store.isLoggedIn).toBe(true)
    expect(store.canPublish).toBe(true)
  })
})
```

(Keep the existing `matchesDevAdmin` and `isDevAdminToken` describe blocks unchanged.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/dev-auth.test.ts`
Expected: FAIL — `makeDevAdminSession().user` still has `role` (U&P shape), no `roles`; `store.canPublish` doesn't exist yet on the old store (this task runs after Task 3).

- [ ] **Step 3: Write minimal implementation**

Replace ONLY `makeDevAdminSession` (and its `import type`) in `app/lib/dev-auth.ts`:

```ts
// at top of app/lib/dev-auth.ts — replace the StrapiUser/LoginResponse import:
import type { AdminUser } from '~/types/admin'

// ...keep DEV_ADMIN_IDENTIFIER / DEV_ADMIN_PASSWORD / DEV_ADMIN_TOKEN / matchesDevAdmin / isDevAdminToken unchanged...

/** Build the synthetic ADMIN session minted by the dev bypass (super-admin = can publish). */
export function makeDevAdminSession(): { jwt: string; user: AdminUser } {
  const user: AdminUser = {
    id: 0,
    username: DEV_ADMIN_IDENTIFIER,
    email: 'dev-admin@localhost',
    firstname: 'Dev',
    lastname: 'Admin',
    isActive: true,
    blocked: false,
    roles: [{ id: 0, name: 'Super Admin', code: 'strapi-super-admin' }],
  }
  return { jwt: DEV_ADMIN_TOKEN, user }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/dev-auth.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/lib/dev-auth.ts tests/unit/dev-auth.test.ts
git commit -m "feat(auth): dev bypass mints an admin-shaped super-admin session"
```

---

### Task 5: `useAuth` + route guard retarget

**Files:**
- Modify: `app/composables/useAuth.ts`
- Modify: `app/lib/guard.ts`
- Test: `tests/unit/guard.test.ts` (update `isAdmin` → `canPublish`)

**Interfaces:**
- Consumes: `loginRequest`/`fetchMe` (Task 2), store `canPublish`/`isLoggedIn` (Task 3), dev-auth (Task 4).
- Produces: `useAuth()` returning `{ login, logout, init, isLoggedIn, user, canPublish }`. `resolveAuthRedirect(route, auth)` where `auth` has `{ isPublic, isAdminOnly, isLoggedIn, canPublish }`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/guard.test.ts  (full replace)
import { describe, it, expect } from 'vitest'
import { resolveAuthRedirect } from '~/lib/guard'

const ctx = (over = {}) => ({ path: '/x', isPublic: false, isAdminOnly: false, isLoggedIn: true, canPublish: false, ...over })

describe('resolveAuthRedirect', () => {
  it('sends an unauthenticated user on a private route to /login', () => {
    expect(resolveAuthRedirect(ctx({ isLoggedIn: false }))).toBe('/login')
  })
  it('lets a logged-in user reach a normal private route', () => {
    expect(resolveAuthRedirect(ctx())).toBeNull()
  })
  it('bounces a logged-in non-publisher off an admin-only route', () => {
    expect(resolveAuthRedirect(ctx({ isAdminOnly: true, canPublish: false }))).toBe('/')
  })
  it('lets a publisher reach an admin-only route', () => {
    expect(resolveAuthRedirect(ctx({ isAdminOnly: true, canPublish: true }))).toBeNull()
  })
  it('redirects a logged-in user away from /login (public)', () => {
    expect(resolveAuthRedirect(ctx({ path: '/login', isPublic: true }))).toBe('/')
  })
  it('lets an anonymous visitor see a public route', () => {
    expect(resolveAuthRedirect(ctx({ path: '/login', isPublic: true, isLoggedIn: false }))).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/guard.test.ts`
Expected: FAIL — current guard reads `isAdmin`, not `canPublish`; signature differs.

- [ ] **Step 3: Write minimal implementation**

```ts
// app/lib/guard.ts
export interface GuardContext {
  path: string
  isPublic: boolean
  isAdminOnly: boolean
  isLoggedIn: boolean
  canPublish: boolean
}

/** Returns a redirect path, or null to allow. Default-deny: only `isPublic` routes are open. */
export function resolveAuthRedirect(ctx: GuardContext): string | null {
  if (ctx.isPublic) {
    return ctx.isLoggedIn && ctx.path === '/login' ? '/' : null
  }
  if (!ctx.isLoggedIn) return '/login'
  if (ctx.isAdminOnly && !ctx.canPublish) return '/'
  return null
}
```

```ts
// app/composables/useAuth.ts
import { loginRequest, fetchMe } from '~/lib/auth'
// DEV-ONLY — remove before production (see app/lib/dev-auth.ts header).
import { matchesDevAdmin, isDevAdminToken, makeDevAdminSession } from '~/lib/dev-auth'

export function useAuth() {
  const store = useAuthStore()
  const { $api } = useNuxtApp()

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
  }
}
```

Also update `app/middleware/auth.global.ts` to pass the new `GuardContext` (it currently builds the arg for `resolveAuthRedirect`):

```ts
// app/middleware/auth.global.ts
import { resolveAuthRedirect } from '~/lib/guard' // NOT auto-imported (lib/ isn't an auto-import dir)

export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore()
  const redirect = resolveAuthRedirect({
    path: to.path,
    isPublic: to.meta.public === true,
    isAdminOnly: to.meta.adminOnly === true,
    isLoggedIn: auth.isLoggedIn,
    canPublish: auth.canPublish,
  })
  if (redirect && redirect !== to.path) return navigateTo(redirect)
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/guard.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add app/composables/useAuth.ts app/lib/guard.ts app/middleware/auth.global.ts tests/unit/guard.test.ts
git commit -m "feat(auth): admin login/init flow + canPublish route gating"
```

---

### Task 6: UI consumers (login page, dashboard, layout)

**Files:**
- Modify: `app/pages/login.vue` (copy/labels; submit calls `login(email, password)`)
- Modify: `app/pages/index.vue` (`v-if="isAdmin"` → `v-if="canPublish"`; show `displayName`/roles)
- Modify: `app/layouts/default.vue` (header shows `displayName` + a role badge)
- Test: adjust `tests/nuxt/login.test.ts` / `tests/nuxt/smoke.test.ts` only if they assert removed getters (`isAdmin`/`role`).

**Interfaces:**
- Consumes: `useAuth()` (`login`, `canPublish`, `user`) from Task 5; store `displayName`/`roleCodes`/`canPublish`.

- [ ] **Step 1: Write/adjust the failing test**

Grep first: `grep -rn "isAdmin\|\.role\b" app tests`. For each hit in `app/`, switch to `canPublish` / `roleCodes` / `displayName`. In `tests/nuxt/*`, update any assertion referencing the removed `isAdmin`/`role` getters to the new ones. If `tests/nuxt/login.test.ts` asserts `login` is called with credentials, keep that — just ensure the field it reads is the email input.

Run: `npx vitest run tests/nuxt/login.test.ts tests/nuxt/smoke.test.ts`
Expected: FAIL on any assertion still referencing `isAdmin`/`role`.

- [ ] **Step 2: Update the components**

```vue
<!-- app/pages/index.vue — replace the publish-queue guard and the identity line -->
<!-- BEFORE: <UCard v-if="isAdmin"> ... ; const { isAdmin, user } = useAuth() -->
<!-- AFTER: -->
<script setup lang="ts">
const { user, canPublish } = useAuth()
</script>
<!-- in template: -->
<!--   <p>Welcome, {{ user?.firstname || user?.username || user?.email }}</p> -->
<!--   <UCard v-if="canPublish"> ...Publish queue... </UCard> -->
```

```vue
<!-- app/layouts/default.vue — header identity + role badge -->
<!-- show store.displayName and a small badge: canPublish ? 'Publisher' : 'Author' -->
<script setup lang="ts">
const auth = useAuthStore()
const { logout } = useAuth()
</script>
<!-- template: {{ auth.displayName }} · <UBadge :label="auth.canPublish ? 'Publisher' : 'Author'" /> · <UButton @click="logout" label="Log out" /> -->
```

```vue
<!-- app/pages/login.vue — the form field is the admin email; submit calls login(email, password) -->
<!-- Keep the existing structure; ensure: -->
<!--   - the identifier field is labeled "Email" with type="email" autocomplete="username" -->
<!--   - onSubmit calls login(state.identifier, state.password) (identifier holds the email) -->
<!--   - the dev "Sign in as dev admin" shortcut (import.meta.dev) is unchanged -->
```

(The login page already uses an email field and `login(identifier, password)`; only confirm copy reads "Sign in with your ICJIA Strapi admin account" or similar. No structural change required.)

- [ ] **Step 3: Run the full suite + typecheck**

Run: `npx vitest run && npm run typecheck`
Expected: all tests pass; typecheck exit 0 (no `error TS`). Fix any remaining `isAdmin`/`role`/`StrapiUser` references surfaced by typecheck.

- [ ] **Step 4: Commit**

```bash
git add app/pages/login.vue app/pages/index.vue app/layouts/default.vue tests/nuxt
git commit -m "feat(auth): UI uses canPublish + admin display name"
```

---

## Post-plan verification (live — uses the validated dev admin login)

These run after the plan lands, against the dev instance:
1. **Live admin login:** `npm run dev`, sign in with the real Super Admin (`cschweda@gmail.com`) → confirm the dashboard renders, the role badge shows "Publisher", and the Publish-queue card is visible. Sign in as an **author** account (if available) → confirm no Publish card. (Author test account is user-provided.)
2. **Boot re-verify:** reload the app while logged in → session persists (no bounce to `/login`); confirm a `GET /admin/users/me` fires.
3. **Live data read (proves the whole foundation):** logged in as admin, call `await useArticles().findOne('<real documentId>')` in the console → a mapped `Article` comes back from the Content-Manager API using the admin JWT. (This is the moment the data layer runs live.)
4. **Dev bypass:** `admin`/`admin` still signs in and shows "Publisher".

## Open items / follow-ups

- **HttpOnly cookie hardening** (admin token currently JS-readable) — still a scheduled, approval-gated backend task; server-side admin RBAC remains the real boundary.
- **Validators into the write path** (zero-base64 gate) — wire `validate*`/`assertNoBase64` into the submit path when forms land (Plan 5). Carried from the data-layer final review.
- **Author test account** — needed to verify the no-publish path live (user-provided; do not create users).
- **CSRF / admin-session nuances** — the admin API is Strapi-internal; monitor for any cross-site protections when wiring real writes; revisit if a write is rejected.

## Self-review (against the validated contract)

- **Endpoint correctness:** login → `/admin/login` (Task 2); roles via `/admin/users/me` (Task 2, because login returns empty roles — Global Constraints); ✓.
- **Capability gating:** publishers = `strapi-super-admin` + `strapi-editor`; author = no publish — `admin-roles.ts` (Task 1), store `canPublish` (Task 3), guard (Task 5), UI (Task 6); ✓.
- **Dev bypass preserved + grants publish:** Task 4; ✓. Security posture (cookie + boot re-verify + 401 logout) carried unchanged: Task 3 persist + Task 5 init; ✓.
- **Placeholder scan:** none — every step ships real code/commands. Type consistency: `AdminUser`/`AdminRole`/`canPublish`/`roleCodes`/`displayName` used identically across Tasks 1→6.

---

**Plan complete.** Six TDD tasks retargeting auth from the Users & Permissions API to the admin API, gating publish on real admin role codes, preserving the dev bypass and the Plan 1 security posture — the unlock for live Content-Manager reads/writes.
