/**
 * ⚠️  DEV-ONLY fixed admin login bypass — REMOVE BEFORE PRODUCTION DEPLOYMENT.  ⚠️
 *
 * Lets a developer sign in with `admin` / `admin` without a Strapi account so the
 * login → dashboard flow can be exercised quickly while building the Studio. It is
 * inert in production for two independent reasons:
 *
 *   1. Every call site is guarded by `import.meta.dev`, which Vite replaces with
 *      `false` in `npm run build` output — the synthetic session can never be minted
 *      and the whole branch is tree-shaken away.
 *   2. The synthetic JWT is a sentinel string Strapi will never accept, so any real
 *      API call made with it fails closed (401 → the interceptor clears the session).
 *
 * To remove entirely: delete this file plus the two `import.meta.dev` guards in
 * app/composables/useAuth.ts (login + init) and the dev hint in app/pages/login.vue.
 * The build will fail loudly on the dangling import until every call site is gone.
 */
import type { AdminUser } from '~/types/admin'

export const DEV_ADMIN_IDENTIFIER = 'admin'
export const DEV_ADMIN_PASSWORD = 'admin'

/** Sentinel JWT for the synthetic dev session. Strapi will never issue or accept this. */
export const DEV_ADMIN_TOKEN = 'dev-admin-session-not-a-real-jwt'

/** Whether the submitted credentials match the fixed dev admin. Gate calls with `import.meta.dev`. */
export function matchesDevAdmin(identifier: string, password: string): boolean {
  return identifier === DEV_ADMIN_IDENTIFIER && password === DEV_ADMIN_PASSWORD
}

/** Whether a persisted token is the synthetic dev session token. Gate calls with `import.meta.dev`. */
export function isDevAdminToken(token: string | null): boolean {
  return token === DEV_ADMIN_TOKEN
}

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
