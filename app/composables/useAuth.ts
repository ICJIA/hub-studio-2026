import { loginRequest, fetchMe } from '~/lib/auth'
import { resolveHasProfile } from '~/lib/profile-gate'
// DEV-ONLY in normal builds; ALSO the only login path in the public demo build (see isDemoMode).
import { matchesDevAdmin, isDevAdminToken, makeDevAdminSession, type DemoRole } from '~/lib/dev-auth'
import { isDemoMode } from '~/lib/demo'

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
    // Demo-login bypass: available in local dev AND in the public demo build.
    if ((import.meta.dev || isDemoMode()) && matchesDevAdmin(email, password)) {
      const session = makeDevAdminSession()
      store.setSession(session)
      console.warn('[demo-auth] Signed in with the fixed demo admin bypass — NOT a real Strapi session.')
      return session.user
    }
    // Defense in depth: in the public demo build, real Strapi login is IMPOSSIBLE. Only the
    // demo-admin credentials above are accepted; anything else is rejected before any $api call
    // (the real form is hidden anyway). false ⇒ unchanged behavior.
    if (isDemoMode()) {
      throw new Error('Demo mode: only the demo sign-in is available.')
    }
    const { jwt, user } = await loginRequest($api, email, password)
    store.setSession({ jwt, user }) // set token first so $api attaches it
    const me = await fetchMe($api)  // /admin/users/me returns the user WITH roles
    store.setUser(me)
    await refreshProfileGate()      // FAIL-OPEN: errors ⇒ hasProfile null ⇒ never gate
    return me
  }

  /**
   * Demo-only: step into a synthetic session AS the chosen role so managers can compare what an
   * Author (canPublish false — drafts & previews) vs an Editor (canPublish true — also publishes)
   * sees. Same synthetic-token path as the demo form login; only the role codes differ. Available in
   * local dev AND the public demo build; a no-op (throws) anywhere else so a normal prod build is
   * unchanged.
   */
  function loginAsDemo(role: DemoRole) {
    if (!import.meta.dev && !isDemoMode()) {
      throw new Error('Demo sign-in is unavailable in this build.')
    }
    const session = makeDevAdminSession(role)
    store.setSession(session)
    console.warn(`[demo-auth] Signed in as demo ${role} — NOT a real Strapi session.`)
    return session.user
  }

  async function logout() {
    store.clearSession()
    await navigateTo('/login')
  }

  /** Re-verify the persisted session against the admin API on app boot. */
  async function init() {
    if (!store.jwt) return
    // Synthetic demo session — keep across reloads (never re-verified against Strapi). Honored in
    // local dev AND the public demo build; in a normal prod build this is false so behavior is unchanged.
    if ((import.meta.dev || isDemoMode()) && isDevAdminToken(store.jwt)) return
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
    loginAsDemo,
    logout,
    init,
    isLoggedIn: computed(() => store.isLoggedIn),
    user: computed(() => store.user),
    canPublish: computed(() => store.canPublish),
    hasProfile: computed(() => store.hasProfile),
  }
}
