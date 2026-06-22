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
import { AUTHOR_ROLE_CODE } from '~/lib/admin-roles'

export const DEV_ADMIN_IDENTIFIER = 'admin'
export const DEV_ADMIN_PASSWORD = 'admin'

/** Sentinel JWT for the synthetic dev session. Strapi will never issue or accept this. */
export const DEV_ADMIN_TOKEN = 'dev-admin-session-not-a-real-jwt'

/**
 * The two demo identities a manager can step into. Both mint the SAME sentinel token (so demo-session
 * detection, the in-memory repo, and cookie persistence behave identically) and differ ONLY in their
 * Strapi role codes, which is what drives `canPublish`:
 *   - editor → strapi-editor  ⇒ canPublish === true  (publishes to the Hub)
 *   - author → strapi-author  ⇒ canPublish === false (drafts & previews only)
 */
export type DemoRole = 'editor' | 'author'

/** Whether the submitted credentials match the fixed dev admin. Gate calls with `import.meta.dev`. */
export function matchesDevAdmin(identifier: string, password: string): boolean {
  return identifier === DEV_ADMIN_IDENTIFIER && password === DEV_ADMIN_PASSWORD
}

/** Whether a persisted token is the synthetic dev session token. Gate calls with `import.meta.dev`. */
export function isDevAdminToken(token: string | null): boolean {
  return token === DEV_ADMIN_TOKEN
}

/**
 * Build the synthetic demo session for the chosen role. Defaults to 'editor' so existing callers
 * (and tests) keep the publisher session they had. The role codes are the only difference — that is
 * what makes `useAuth().canPublish` reflect the choice for the whole session.
 */
export function makeDevAdminSession(role: DemoRole = 'editor'): { jwt: string; user: AdminUser } {
  const isEditor = role === 'editor'
  const user: AdminUser = {
    id: 0,
    username: DEV_ADMIN_IDENTIFIER,
    email: isEditor ? 'dev-editor@localhost' : 'dev-author@localhost',
    firstname: 'Dev',
    lastname: isEditor ? 'Editor' : 'Author',
    isActive: true,
    blocked: false,
    roles: isEditor
      ? [{ id: 0, name: 'Editor', code: 'strapi-editor' }]
      : [{ id: 0, name: 'Author', code: AUTHOR_ROLE_CODE }],
  }
  return { jwt: DEV_ADMIN_TOKEN, user }
}
