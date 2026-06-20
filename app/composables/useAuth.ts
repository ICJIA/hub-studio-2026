import { loginRequest, fetchMe } from '~/lib/auth'
// DEV-ONLY — remove before production (see app/lib/dev-auth.ts header).
import { matchesDevAdmin, isDevAdminToken, makeDevAdminSession } from '~/lib/dev-auth'

export function useAuth() {
  const store = useAuthStore()
  const { $api } = useNuxtApp()

  /** Authenticate, then load the user with role populated. */
  async function login(identifier: string, password: string) {
    // DEV-ONLY fixed admin bypass. `import.meta.dev` is false in production builds,
    // so this whole branch is tree-shaken away. See app/lib/dev-auth.ts.
    if (import.meta.dev && matchesDevAdmin(identifier, password)) {
      const session = makeDevAdminSession()
      store.setSession(session)
      console.warn('[dev-auth] Signed in with the fixed dev admin bypass — NOT a real Strapi session.')
      return session.user
    }

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

  /**
   * Re-verify the persisted session against Strapi on app boot.
   * Clears the session if the token is invalid or the request fails.
   */
  async function init() {
    if (!store.jwt) return
    // DEV-ONLY: the synthetic dev session has no real token to re-verify, so keep it
    // across reloads instead of letting fetchMe 401 and clear it. See app/lib/dev-auth.ts.
    if (import.meta.dev && isDevAdminToken(store.jwt)) return
    try {
      const me = await fetchMe($api)
      store.setUser(me)
    } catch {
      // Deliberate no-op. A 401 (invalid/expired token) is already handled globally by
      // the $api interceptor (it clears the session and redirects to /login). For transient
      // failures (network down, Strapi restarting, 5xx) keep the existing session rather
      // than logging the user out — the token may still be valid on recovery, and the
      // server enforces authorization on every real request regardless.
    }
  }

  return {
    login,
    logout,
    init,
    isLoggedIn: computed(() => store.isLoggedIn),
    user: computed(() => store.user),
    role: computed(() => store.role),
    isAdmin: computed(() => store.isAdmin),
  }
}
