# Studio Foundation & Auth — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Nuxt 4 SPA with Nuxt UI 4, Pinia, and TypeScript, and implement working authentication against the live Strapi 5 Users & Permissions API — login, persisted JWT session, role retrieval, route guards, and logout.

**Architecture:** A client-only Nuxt 4 app (`ssr: false`). A single configured `ofetch` instance (provided as `$api`) attaches the JWT and handles 401s. Auth state lives in a persisted Pinia store. Pure, dependency-injected functions (`buildAuthHeaders`, `loginRequest`, `fetchMe`, `resolveAuthRedirect`) hold the logic so everything is unit-testable; composables/plugins/pages are thin wiring.

**Tech Stack:** Nuxt 4, Vue 3.5, Nuxt UI 4 (Tailwind v4), Pinia (`@pinia/nuxt` + `@pinia-plugin-persistedstate/nuxt`), TypeScript, Vitest + `@nuxt/test-utils`, `ofetch`.

## Global Constraints

- **Rendering:** SPA only — `ssr: false`. No server-side rendering of pages.
- **Node:** `>= 20`.
- **Backend:** Strapi 5 REST at `https://v2.hub.icjia-api.cloud`. Records are addressed by `documentId`. **Do not modify the Strapi backend or schema** without explicit approval.
- **Auth:** `POST /api/auth/local` for login; `GET /api/users/me?populate=role` for the role (the login response does not reliably include the role in Strapi 5).
- **Roles (assumed, confirm later):** `author` (edit/update, no publish) and `admin` (publish/unpublish). `isAdmin` gates publish-only UI; the server is the real boundary.
- **Zero base64 (project-wide, enforced in later plans):** images are Media Library references only — never `data:`/base64. Not exercised in this plan but holds throughout.
- **Commits:** conventional-style messages, **no AI co-author trailer**.
- **Package manager:** `npm` (swap consistently if the team prefers another).

---

## Plan sequence (roadmap)

This is **Plan 1 of 7**. Each plan yields working, testable software:

1. **Foundation & Auth** ← this plan
2. Data layer (typed models, `documentId` repositories, mappers, validators for articles/apps/datasets)
3. Media & zero-base64 (eager upload composable, `MediaPicker`, Media Library browse, lint guard)
4. Editor Nuxt layer (extract ICJIA Markdown Editor, add Strapi `uploadHandler` + insert-image)
5. Forms & views (dashboard, per-type create/edit, preview)
6. Publish workflow & build-hook (admin publish/unpublish, Netlify build-hook proxy)
7. Polish (a11y, error states, e2e happy path, deploy config)

---

## File Structure (Plan 1)

| File | Responsibility |
|---|---|
| `package.json` | deps + scripts |
| `nuxt.config.ts` | modules, css, `ssr:false`, runtimeConfig |
| `tsconfig.json` | extends Nuxt's generated config |
| `vitest.config.ts` | Vitest via `@nuxt/test-utils`, default node env |
| `.env.example` | `NUXT_PUBLIC_STRAPI_BASE_URL` |
| `app/app.vue` | `<UApp>` + `<NuxtPage>` |
| `app/app.config.ts` | Nuxt UI theme colors |
| `app/assets/css/main.css` | Tailwind + Nuxt UI imports |
| `app/lib/constants.ts` | `APP_NAME` |
| `app/lib/api.ts` | `buildAuthHeaders`, `createApiClient`, `$api` type |
| `app/lib/auth.ts` | `loginRequest`, `fetchMe` (pure, api-injected) |
| `app/lib/guard.ts` | `resolveAuthRedirect` (pure) |
| `app/types/strapi.ts` | `StrapiUser`, `StrapiRole`, `LoginResponse` |
| `app/plugins/api.ts` | builds `$api` from runtimeConfig + store |
| `app/stores/auth.ts` | Pinia auth store (persisted) |
| `app/composables/useAuth.ts` | `login`/`logout` + reactive getters |
| `app/middleware/auth.global.ts` | route guard wiring |
| `app/layouts/default.vue` | top bar: app name, user, role, logout |
| `app/pages/login.vue` | login form (public) |
| `app/pages/index.vue` | protected dashboard |
| `tests/unit/*.test.ts` | unit tests for the pure functions + store |
| `tests/nuxt/smoke.test.ts` | toolchain smoke test (nuxt env) |

---

### Task 1: Scaffold the Nuxt 4 SPA

**Files:**
- Create: `package.json`, `nuxt.config.ts`, `tsconfig.json`, `vitest.config.ts`, `.env.example`
- Create: `app/app.vue`, `app/app.config.ts`, `app/assets/css/main.css`, `app/lib/constants.ts`
- Test: `tests/unit/constants.test.ts`, `tests/nuxt/smoke.test.ts`

**Interfaces:**
- Produces: `APP_NAME: string` from `~/lib/constants`; a booting Nuxt 4 SPA with Nuxt UI, Pinia, and Vitest wired; `runtimeConfig.public.strapiBaseUrl: string`.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "hub-studio-2026",
  "private": true,
  "type": "module",
  "engines": { "node": ">=20.0.0" },
  "scripts": {
    "dev": "nuxt dev",
    "build": "nuxt build",
    "generate": "nuxt generate",
    "preview": "nuxt preview",
    "postinstall": "nuxt prepare",
    "typecheck": "nuxt typecheck",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@nuxt/ui": "^4.0.1",
    "@pinia/nuxt": "^0.6.1",
    "@pinia-plugin-persistedstate/nuxt": "^1.2.1",
    "nuxt": "^4.0.0",
    "pinia": "^2.2.0",
    "vue": "^3.5.0",
    "vue-router": "^4.4.0"
  },
  "devDependencies": {
    "@nuxt/test-utils": "^3.14.0",
    "@vue/test-utils": "^2.4.6",
    "happy-dom": "^15.0.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0",
    "vue-tsc": "^2.1.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`
Expected: dependencies install; `nuxt prepare` runs via `postinstall` and generates `.nuxt/`.

- [ ] **Step 3: Create `nuxt.config.ts`**

```ts
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,
  modules: ['@nuxt/ui', '@pinia/nuxt', '@pinia-plugin-persistedstate/nuxt'],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      strapiBaseUrl: 'https://v2.hub.icjia-api.cloud',
    },
  },
  devtools: { enabled: true },
  compatibilityDate: '2026-06-19',
})
```

- [ ] **Step 4: Create `tsconfig.json`**

```json
{
  "extends": "./.nuxt/tsconfig.json"
}
```

- [ ] **Step 5: Create `.env.example`**

```bash
# Strapi 5 REST base URL (no trailing slash)
NUXT_PUBLIC_STRAPI_BASE_URL=https://v2.hub.icjia-api.cloud
```

- [ ] **Step 6: Create `app/assets/css/main.css`**

```css
@import "tailwindcss";
@import "@nuxt/ui";
```

- [ ] **Step 7: Create `app/app.config.ts`**

```ts
export default defineAppConfig({
  ui: {
    colors: {
      primary: 'blue',
      neutral: 'slate',
    },
  },
})
```

- [ ] **Step 8: Create `app/app.vue`**

```vue
<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
```

- [ ] **Step 9: Create `app/lib/constants.ts`**

```ts
export const APP_NAME = 'ICJIA Research Hub Studio'
```

- [ ] **Step 10: Create `vitest.config.ts`**

```ts
import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    // Default to fast node env; opt into the Nuxt env per-file with
    // `// @vitest-environment nuxt`.
    environment: 'node',
  },
})
```

- [ ] **Step 11: Write the failing unit test for `APP_NAME`**

Create `tests/unit/constants.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { APP_NAME } from '~/lib/constants'

describe('constants', () => {
  it('exposes the app name', () => {
    expect(APP_NAME).toBe('ICJIA Research Hub Studio')
  })
})
```

- [ ] **Step 12: Run the unit test to verify it passes**

Run: `npm run test -- tests/unit/constants.test.ts`
Expected: PASS (confirms Vitest + the `~` alias to `app/` resolve).

> If the `~` alias fails to resolve in node env, add to `vitest.config.ts` `test.alias`: `{ '~': fileURLToPath(new URL('./app', import.meta.url)) }` (import `fileURLToPath` from `node:url`).

- [ ] **Step 13: Write the Nuxt-env smoke test**

Create `tests/nuxt/smoke.test.ts`:

```ts
// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { UButton } from '#components'

describe('toolchain smoke', () => {
  it('renders a Nuxt UI button', async () => {
    const wrapper = await mountSuspended(UButton, { slots: { default: () => 'Go' } })
    expect(wrapper.text()).toContain('Go')
  })
})
```

- [ ] **Step 14: Run the smoke test to verify it passes**

Run: `npm run test -- tests/nuxt/smoke.test.ts`
Expected: PASS (confirms Nuxt env + Nuxt UI + test-utils end-to-end).

- [ ] **Step 15: Verify typecheck and dev boot**

Run: `npm run typecheck`
Expected: no type errors.
Run: `npm run dev` then open the printed URL.
Expected: blank app boots with no console errors; stop the server after confirming.

- [ ] **Step 16: Commit**

```bash
git add package.json package-lock.json nuxt.config.ts tsconfig.json vitest.config.ts .env.example app tests
git commit -m "chore: scaffold Nuxt 4 SPA with Nuxt UI, Pinia, and Vitest"
```

---

### Task 2: Strapi types and the `$api` client

**Files:**
- Create: `app/types/strapi.ts`, `app/lib/api.ts`, `app/plugins/api.ts`
- Test: `tests/unit/api.test.ts`

**Interfaces:**
- Consumes: `runtimeConfig.public.strapiBaseUrl` (Task 1); `useAuthStore()` is referenced by the plugin but is created in Task 3 — implement the plugin's store usage in Task 3's step if executing strictly in order, or stub `getToken`/`onUnauthorized` now and wire the store in Task 3.
- Produces: `StrapiUser`, `StrapiRole`, `LoginResponse` types; `buildAuthHeaders(headers, token)`; `createApiClient(opts)`; the injected `$api: $Fetch`.

- [ ] **Step 1: Create the Strapi types**

Create `app/types/strapi.ts`:

```ts
export interface StrapiRole {
  id: number
  name: string
  type: string
}

export interface StrapiUser {
  id: number
  documentId?: string
  username: string
  email: string
  confirmed?: boolean
  blocked?: boolean
  role?: StrapiRole
}

export interface LoginResponse {
  jwt: string
  user: StrapiUser
}
```

- [ ] **Step 2: Write the failing test for `buildAuthHeaders`**

Create `tests/unit/api.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildAuthHeaders } from '~/lib/api'

describe('buildAuthHeaders', () => {
  it('adds a Bearer token when present', () => {
    const headers = buildAuthHeaders(new Headers(), 'abc123')
    expect(headers.get('Authorization')).toBe('Bearer abc123')
  })

  it('leaves headers untouched when token is null', () => {
    const headers = buildAuthHeaders(new Headers(), null)
    expect(headers.get('Authorization')).toBeNull()
  })

  it('preserves existing headers', () => {
    const headers = buildAuthHeaders(new Headers({ 'X-Test': '1' }), 'tok')
    expect(headers.get('X-Test')).toBe('1')
    expect(headers.get('Authorization')).toBe('Bearer tok')
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm run test -- tests/unit/api.test.ts`
Expected: FAIL with "Failed to resolve import '~/lib/api'" / `buildAuthHeaders is not a function`.

- [ ] **Step 4: Implement `app/lib/api.ts`**

```ts
import { ofetch, type $Fetch } from 'ofetch'

/** Returns a Headers object with the Bearer token applied when present. */
export function buildAuthHeaders(headers: HeadersInit | undefined, token: string | null): Headers {
  const result = new Headers(headers)
  if (token) result.set('Authorization', `Bearer ${token}`)
  return result
}

export interface CreateApiClientOptions {
  baseURL: string
  getToken: () => string | null
  onUnauthorized?: () => void
}

/** Builds a configured ofetch instance for the Strapi REST API. */
export function createApiClient(opts: CreateApiClientOptions): $Fetch {
  return ofetch.create({
    baseURL: opts.baseURL,
    onRequest({ options }) {
      options.headers = buildAuthHeaders(options.headers, opts.getToken())
    },
    onResponseError({ response }) {
      if (response.status === 401) opts.onUnauthorized?.()
    },
  })
}

declare module '#app' {
  interface NuxtApp {
    $api: $Fetch
  }
}
declare module 'vue' {
  interface ComponentCustomProperties {
    $api: $Fetch
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm run test -- tests/unit/api.test.ts`
Expected: PASS.

- [ ] **Step 6: Create the API plugin**

Create `app/plugins/api.ts`:

```ts
import { createApiClient } from '~/lib/api'

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()
  const auth = useAuthStore()

  const api = createApiClient({
    baseURL: config.public.strapiBaseUrl,
    getToken: () => auth.jwt,
    onUnauthorized: () => {
      auth.clearSession()
      nuxtApp.runWithContext(() => navigateTo('/login'))
    },
  })

  return { provide: { api } }
})
```

> `useAuthStore` is created in Task 3. If executing in strict order, this file will not typecheck until Task 3 is done — that's expected; the commit for this task can be deferred to the end of Task 3, or temporarily stub `getToken: () => null` and remove the store lines, then restore in Task 3. Prefer: implement Task 3 immediately after Step 5.

- [ ] **Step 7: Commit**

```bash
git add app/types/strapi.ts app/lib/api.ts app/plugins/api.ts tests/unit/api.test.ts
git commit -m "feat: add Strapi types and configured \$api client"
```

---

### Task 3: Auth store (Pinia, persisted)

**Files:**
- Create: `app/stores/auth.ts`
- Test: `tests/unit/auth-store.test.ts`

**Interfaces:**
- Consumes: `StrapiUser` (Task 2).
- Produces: `useAuthStore()` with state `{ jwt, user }`, getters `isLoggedIn`, `role`, `isAdmin`, and actions `setSession({jwt,user})`, `setUser(user)`, `clearSession()`.

- [ ] **Step 1: Write the failing store test**

Create `tests/unit/auth-store.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '~/stores/auth'
import type { StrapiUser } from '~/types/strapi'

const adminUser: StrapiUser = {
  id: 1, username: 'boss', email: 'boss@example.com',
  role: { id: 1, name: 'admin', type: 'admin' },
}
const authorUser: StrapiUser = {
  id: 2, username: 'writer', email: 'writer@example.com',
  role: { id: 2, name: 'author', type: 'author' },
}

describe('auth store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('starts logged out', () => {
    const s = useAuthStore()
    expect(s.isLoggedIn).toBe(false)
    expect(s.role).toBeNull()
    expect(s.isAdmin).toBe(false)
  })

  it('setSession stores jwt + user and marks logged in', () => {
    const s = useAuthStore()
    s.setSession({ jwt: 'jwt-1', user: authorUser })
    expect(s.isLoggedIn).toBe(true)
    expect(s.jwt).toBe('jwt-1')
    expect(s.role).toBe('author')
    expect(s.isAdmin).toBe(false)
  })

  it('isAdmin is true only for the admin role', () => {
    const s = useAuthStore()
    s.setSession({ jwt: 'jwt-2', user: adminUser })
    expect(s.isAdmin).toBe(true)
  })

  it('setUser updates the user without touching the jwt', () => {
    const s = useAuthStore()
    s.setSession({ jwt: 'jwt-3', user: authorUser })
    s.setUser(adminUser)
    expect(s.jwt).toBe('jwt-3')
    expect(s.role).toBe('admin')
  })

  it('clearSession resets everything', () => {
    const s = useAuthStore()
    s.setSession({ jwt: 'jwt-4', user: adminUser })
    s.clearSession()
    expect(s.isLoggedIn).toBe(false)
    expect(s.jwt).toBeNull()
    expect(s.user).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- tests/unit/auth-store.test.ts`
Expected: FAIL with "Failed to resolve import '~/stores/auth'".

- [ ] **Step 3: Implement `app/stores/auth.ts`**

```ts
import { defineStore } from 'pinia'
import type { StrapiUser } from '~/types/strapi'

interface AuthState {
  jwt: string | null
  user: StrapiUser | null
}

/** Role names (lowercased) that may publish. Confirm against the live instance. */
const ADMIN_ROLE_NAMES = ['admin']

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({ jwt: null, user: null }),
  getters: {
    isLoggedIn: (state): boolean => Boolean(state.jwt && state.user),
    role: (state): string | null => state.user?.role?.name ?? null,
    isAdmin(): boolean {
      return this.role ? ADMIN_ROLE_NAMES.includes(this.role.toLowerCase()) : false
    },
  },
  actions: {
    setSession(payload: { jwt: string; user: StrapiUser }) {
      this.jwt = payload.jwt
      this.user = payload.user
    },
    setUser(user: StrapiUser) {
      this.user = user
    },
    clearSession() {
      this.jwt = null
      this.user = null
    },
  },
  persist: true,
})
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test -- tests/unit/auth-store.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck (the Task 2 plugin now resolves)**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/stores/auth.ts tests/unit/auth-store.test.ts
git commit -m "feat: add persisted Pinia auth store"
```

---

### Task 4: Auth request functions and `useAuth`

**Files:**
- Create: `app/lib/auth.ts`, `app/composables/useAuth.ts`
- Test: `tests/unit/auth-lib.test.ts`

**Interfaces:**
- Consumes: `$Fetch` (ofetch), `LoginResponse`/`StrapiUser` (Task 2), `useAuthStore` (Task 3).
- Produces: `loginRequest(api, identifier, password): Promise<LoginResponse>`; `fetchMe(api): Promise<StrapiUser>`; `useAuth()` → `{ login, logout, isLoggedIn, user, role, isAdmin }`.

- [ ] **Step 1: Write the failing test for the request functions**

Create `tests/unit/auth-lib.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { loginRequest, fetchMe } from '~/lib/auth'
import type { $Fetch } from 'ofetch'

describe('loginRequest', () => {
  it('POSTs identifier/password to /api/auth/local and returns the body', async () => {
    const fake = { jwt: 'jwt-x', user: { id: 1, username: 'u', email: 'u@e.com' } }
    const api = vi.fn().mockResolvedValue(fake) as unknown as $Fetch
    const result = await loginRequest(api, 'u@e.com', 'secret')
    expect(api).toHaveBeenCalledWith('/api/auth/local', {
      method: 'POST',
      body: { identifier: 'u@e.com', password: 'secret' },
    })
    expect(result).toBe(fake)
  })
})

describe('fetchMe', () => {
  it('GETs /api/users/me with role populated', async () => {
    const me = { id: 1, username: 'u', email: 'u@e.com', role: { id: 2, name: 'author', type: 'author' } }
    const api = vi.fn().mockResolvedValue(me) as unknown as $Fetch
    const result = await fetchMe(api)
    expect(api).toHaveBeenCalledWith('/api/users/me', { query: { populate: 'role' } })
    expect(result).toBe(me)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- tests/unit/auth-lib.test.ts`
Expected: FAIL with "Failed to resolve import '~/lib/auth'".

- [ ] **Step 3: Implement `app/lib/auth.ts`**

```ts
import type { $Fetch } from 'ofetch'
import type { LoginResponse, StrapiUser } from '~/types/strapi'

export function loginRequest(api: $Fetch, identifier: string, password: string): Promise<LoginResponse> {
  return api<LoginResponse>('/api/auth/local', {
    method: 'POST',
    body: { identifier, password },
  })
}

export function fetchMe(api: $Fetch): Promise<StrapiUser> {
  return api<StrapiUser>('/api/users/me', { query: { populate: 'role' } })
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test -- tests/unit/auth-lib.test.ts`
Expected: PASS.

- [ ] **Step 5: Implement `app/composables/useAuth.ts`**

```ts
import { loginRequest, fetchMe } from '~/lib/auth'

export function useAuth() {
  const store = useAuthStore()
  const { $api } = useNuxtApp()

  /** Authenticate, then load the user with role populated. */
  async function login(identifier: string, password: string) {
    const { jwt, user } = await loginRequest($api, identifier, password)
    store.setSession({ jwt, user }) // set token first so $api attaches it
    const me = await fetchMe($api)
    store.setUser(me)
    return me
  }

  async function logout() {
    store.clearSession()
    await navigateTo('/login')
  }

  return {
    login,
    logout,
    isLoggedIn: computed(() => store.isLoggedIn),
    user: computed(() => store.user),
    role: computed(() => store.role),
    isAdmin: computed(() => store.isAdmin),
  }
}
```

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add app/lib/auth.ts app/composables/useAuth.ts tests/unit/auth-lib.test.ts
git commit -m "feat: add login/fetchMe requests and useAuth composable"
```

---

### Task 5: Route guard

**Files:**
- Create: `app/lib/guard.ts`, `app/middleware/auth.global.ts`
- Test: `tests/unit/guard.test.ts`

**Interfaces:**
- Consumes: `useAuthStore` (Task 3).
- Produces: `resolveAuthRedirect(route, auth): string | null`; a global middleware enforcing it. Route meta contract: `public?: boolean`, `adminOnly?: boolean` (absent = protected, non-admin OK).

- [ ] **Step 1: Write the failing guard test**

Create `tests/unit/guard.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { resolveAuthRedirect } from '~/lib/guard'

const loggedOut = { isLoggedIn: false, isAdmin: false }
const author = { isLoggedIn: true, isAdmin: false }
const admin = { isLoggedIn: true, isAdmin: true }

describe('resolveAuthRedirect', () => {
  it('sends logged-out users from a protected route to /login', () => {
    expect(resolveAuthRedirect({ path: '/', }, loggedOut)).toBe('/login')
  })

  it('allows logged-out users on a public route', () => {
    expect(resolveAuthRedirect({ path: '/login', public: true }, loggedOut)).toBeNull()
  })

  it('sends logged-in users away from /login to home', () => {
    expect(resolveAuthRedirect({ path: '/login', public: true }, author)).toBe('/')
  })

  it('allows an author on a normal protected route', () => {
    expect(resolveAuthRedirect({ path: '/' }, author)).toBeNull()
  })

  it('blocks a non-admin from an admin-only route', () => {
    expect(resolveAuthRedirect({ path: '/manage', adminOnly: true }, author)).toBe('/')
  })

  it('allows an admin on an admin-only route', () => {
    expect(resolveAuthRedirect({ path: '/manage', adminOnly: true }, admin)).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- tests/unit/guard.test.ts`
Expected: FAIL with "Failed to resolve import '~/lib/guard'".

- [ ] **Step 3: Implement `app/lib/guard.ts`**

```ts
export interface RouteInfo {
  path: string
  public?: boolean
  adminOnly?: boolean
}

export interface AuthSnapshot {
  isLoggedIn: boolean
  isAdmin: boolean
}

/** Returns a path to redirect to, or null to allow navigation. */
export function resolveAuthRedirect(route: RouteInfo, auth: AuthSnapshot): string | null {
  if (route.public) {
    if (route.path === '/login' && auth.isLoggedIn) return '/'
    return null
  }
  if (!auth.isLoggedIn) return '/login'
  if (route.adminOnly && !auth.isAdmin) return '/'
  return null
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test -- tests/unit/guard.test.ts`
Expected: PASS.

- [ ] **Step 5: Implement `app/middleware/auth.global.ts`**

```ts
import { resolveAuthRedirect } from '~/lib/guard'

export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore()
  const redirect = resolveAuthRedirect(
    {
      path: to.path,
      public: to.meta.public === true,
      adminOnly: to.meta.adminOnly === true,
    },
    { isLoggedIn: auth.isLoggedIn, isAdmin: auth.isAdmin },
  )
  if (redirect && redirect !== to.path) return navigateTo(redirect)
})
```

- [ ] **Step 6: Commit**

```bash
git add app/lib/guard.ts app/middleware/auth.global.ts tests/unit/guard.test.ts
git commit -m "feat: add auth route guard"
```

---

### Task 6: Login page and app layout

**Files:**
- Create: `app/pages/login.vue`, `app/layouts/default.vue`
- Test: `tests/nuxt/login.test.ts`

**Interfaces:**
- Consumes: `useAuth` (Task 4); Nuxt UI `UForm`, `UInput`, `UButton`, `UCard`, `useToast`.
- Produces: a public `/login` page that authenticates and redirects to `/`; a default layout with a logout control.

- [ ] **Step 1: Implement `app/pages/login.vue`**

```vue
<script setup lang="ts">
import { APP_NAME } from '~/lib/constants'

definePageMeta({ public: true, layout: false })

const { login } = useAuth()
const toast = useToast()

const state = reactive({ identifier: '', password: '' })
const loading = ref(false)

async function onSubmit() {
  loading.value = true
  try {
    await login(state.identifier, state.password)
    await navigateTo('/')
  } catch {
    toast.add({ title: 'Login failed', description: 'Check your email and password.', color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <UCard class="w-full max-w-sm">
      <template #header>
        <h1 class="text-lg font-semibold">{{ APP_NAME }}</h1>
        <p class="text-sm text-muted">Sign in to continue</p>
      </template>

      <UForm :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField label="Email" name="identifier">
          <UInput v-model="state.identifier" type="email" autocomplete="username" class="w-full" />
        </UFormField>
        <UFormField label="Password" name="password">
          <UInput v-model="state.password" type="password" autocomplete="current-password" class="w-full" />
        </UFormField>
        <UButton type="submit" block :loading="loading" label="Sign in" />
      </UForm>
    </UCard>
  </div>
</template>
```

- [ ] **Step 2: Implement `app/layouts/default.vue`**

```vue
<script setup lang="ts">
import { APP_NAME } from '~/lib/constants'

const { user, role, logout } = useAuth()
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <header class="border-b border-default">
      <div class="max-w-5xl mx-auto w-full px-4 h-14 flex items-center justify-between">
        <NuxtLink to="/" class="font-semibold">{{ APP_NAME }}</NuxtLink>
        <div v-if="user" class="flex items-center gap-3">
          <UBadge v-if="role" :label="role" variant="subtle" />
          <span class="text-sm text-muted">{{ user.email }}</span>
          <UButton size="sm" variant="ghost" label="Log out" @click="logout" />
        </div>
      </div>
    </header>
    <main class="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
      <slot />
    </main>
  </div>
</template>
```

- [ ] **Step 3: Write the login component test**

Create `tests/nuxt/login.test.ts`:

```ts
// @vitest-environment nuxt
import { describe, it, expect, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'

const loginMock = vi.fn().mockResolvedValue({})
mockNuxtImport('useAuth', () => () => ({
  login: loginMock,
  logout: vi.fn(),
  isLoggedIn: computed(() => false),
  user: computed(() => null),
  role: computed(() => null),
  isAdmin: computed(() => false),
}))
const navigateMock = vi.fn()
mockNuxtImport('navigateTo', () => navigateMock)

import LoginPage from '~/pages/login.vue'

describe('login page', () => {
  it('calls login with the entered credentials and redirects', async () => {
    const wrapper = await mountSuspended(LoginPage)
    await wrapper.find('input[type="email"]').setValue('writer@example.com')
    await wrapper.find('input[type="password"]').setValue('secret')
    await wrapper.find('form').trigger('submit.prevent')
    await new Promise((r) => setTimeout(r, 0))
    expect(loginMock).toHaveBeenCalledWith('writer@example.com', 'secret')
    expect(navigateMock).toHaveBeenCalledWith('/')
  })
})
```

- [ ] **Step 4: Run the login test to verify it passes**

Run: `npm run test -- tests/nuxt/login.test.ts`
Expected: PASS.

> If `mockNuxtImport('navigateTo', ...)` interferes with the global middleware in the nuxt test env, scope the assertion to `loginMock` only and verify redirect manually in Step 6 of Task 7. Keep the test green.

- [ ] **Step 5: Commit**

```bash
git add app/pages/login.vue app/layouts/default.vue tests/nuxt/login.test.ts
git commit -m "feat: add login page and default layout"
```

---

### Task 7: Protected dashboard and end-to-end verification

**Files:**
- Create: `app/pages/index.vue`
- Test: manual verification checklist (below)

**Interfaces:**
- Consumes: `useAuth` (Task 4); the global middleware (Task 5) protects this route by default.
- Produces: the authenticated landing page; role-aware entry points (publish-only actions gated by `isAdmin`).

- [ ] **Step 1: Implement `app/pages/index.vue`**

```vue
<script setup lang="ts">
const { user, role, isAdmin } = useAuth()
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold">Welcome{{ user ? `, ${user.username}` : '' }}</h1>
      <p class="text-muted">
        Signed in as <strong>{{ role ?? 'unknown role' }}</strong>.
      </p>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <UCard>
        <template #header><h2 class="font-medium">Create</h2></template>
        <p class="text-sm text-muted">Start a new article, app, or dataset. (Coming in a later phase.)</p>
      </UCard>

      <UCard>
        <template #header><h2 class="font-medium">My drafts</h2></template>
        <p class="text-sm text-muted">Continue editing your drafts. (Coming in a later phase.)</p>
      </UCard>

      <UCard v-if="isAdmin">
        <template #header><h2 class="font-medium">Publish queue</h2></template>
        <p class="text-sm text-muted">Review and publish submitted drafts. (Coming in a later phase.)</p>
      </UCard>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Run the full unit + nuxt test suite**

Run: `npm run test`
Expected: all tests PASS.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Manual verification — unauthenticated redirect**

Run: `npm run dev`, open the app at `/`.
Expected: redirected to `/login` (global guard).

- [ ] **Step 5: Manual verification — login happy path**

Enter valid Strapi credentials (`author` or `admin` test user) and submit.
Expected: redirected to `/`; header shows the email + a role badge; the **Publish queue** card appears only for an `admin` user.

> Requires a test user in the Strapi 5 instance. Do not create or modify users in the backend without approval; obtain credentials from the backend owner.

- [ ] **Step 6: Manual verification — session persistence and logout**

Refresh the page while logged in.
Expected: still logged in (persisted store rehydrates), no bounce to `/login`.
Click **Log out**.
Expected: redirected to `/login`; refreshing keeps you logged out.

- [ ] **Step 7: Commit**

```bash
git add app/pages/index.vue
git commit -m "feat: add protected dashboard and complete auth flow"
```

---

## Self-Review

**Spec coverage (Plan 1 scope):** stack scaffold (§3) ✓ Task 1; SPA `ssr:false` (§1/§3) ✓ Task 1; `$api` + interceptor + 401 handling (§3/§6) ✓ Tasks 2; auth via `/api/auth/local` + role via `/api/users/me?populate=role` (§6) ✓ Tasks 4; persisted session (§6) ✓ Task 3; route guards incl. admin-only (§6) ✓ Task 5; login + dashboard + layout (§9) ✓ Tasks 6–7; `author`/`admin` roles assumed (§6/§14 #1) ✓ Task 3. Out of scope here and deferred to later plans: data layer, media/zero-base64, editor layer, forms, publish/build-hook.

**Placeholder scan:** no "TBD"/"add error handling"/"similar to" — each step ships complete code or an exact command. The two `>` notes (alias fallback in Task 1; mock interference in Task 6) are explicit contingencies with concrete remedies, not deferrals.

**Type consistency:** `StrapiUser`/`LoginResponse` (Task 2) are consumed unchanged by the store (Task 3), `lib/auth` (Task 4), and tests. `useAuthStore` getters (`isLoggedIn`, `isAdmin`, `jwt`) match the plugin (Task 2), `useAuth` (Task 4), and middleware (Task 5). `resolveAuthRedirect(route, auth)` signature matches its caller in `auth.global.ts`. `$api` is declared in Task 2 and consumed in Task 4. Route meta keys `public`/`adminOnly` are defined in `login.vue` and read by the middleware consistently.
