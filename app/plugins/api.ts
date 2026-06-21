import { createApiClient } from '~/lib/api'
// DEV-ONLY in normal builds; ALSO honored in the public demo build (see isDemoMode).
import { isDevAdminToken } from '~/lib/dev-auth'
import { isDemoMode } from '~/lib/demo'

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()
  const auth = useAuthStore()

  const api = createApiClient({
    baseURL: config.public.strapiBaseUrl,
    getToken: () => auth.jwt,
    onUnauthorized: () => {
      // The synthetic demo-admin session carries a fake token Strapi rejects, so its data calls
      // 401 by design. Don't tear that session down on those expected 401s — keep it so the UI
      // stays navigable. Honored in local dev AND the public demo build; false in a normal build.
      if ((import.meta.dev || isDemoMode()) && isDevAdminToken(auth.jwt)) return
      auth.clearSession()
      nuxtApp.runWithContext(() => navigateTo('/login'))
    },
  })

  return { provide: { api } }
})
