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

  /**
   * Re-verify the persisted session against Strapi on app boot.
   * Clears the session if the token is invalid or the request fails.
   */
  async function init() {
    if (!store.jwt) return
    try {
      const me = await fetchMe($api)
      store.setUser(me)
    } catch {
      store.clearSession()
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
