import { loginRequest, fetchMe } from '~/lib/auth'
import { resolveHasProfile } from '~/lib/profile-gate'
// DEV-ONLY — remove before production (see app/lib/dev-auth.ts header).
import { matchesDevAdmin, isDevAdminToken, makeDevAdminSession } from '~/lib/dev-auth'

/** Best-effort HTTP status from a thrown fetch error (ofetch FetchError carries both shapes). */
export function statusOf(e: unknown): number | undefined {
  if (e && typeof e === 'object') {
    const err = e as { statusCode?: number; status?: number; response?: { status?: number } }
    return err.statusCode ?? err.response?.status ?? err.status
  }
  return undefined
}

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
    } catch (e) {
      // Audit M-1: on a DEFINITIVE 403 from /admin/users/me (deactivated/forbidden user), clear
      // the session — same teardown the 401 path uses — so we never show a logged-in shell to a
      // user the server has rejected. A 401 is already handled by the $api interceptor.
      if (statusOf(e) === 403) {
        store.clearSession()
        return
      }
      // Deliberate no-op for everything else: for transient failures (network/5xx) KEEP the
      // session — the token may still be valid on recovery, and the server enforces authz on
      // every request.
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
