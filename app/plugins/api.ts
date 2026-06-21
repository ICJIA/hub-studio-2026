import { createApiClient } from '~/lib/api'
// DEV-ONLY import — remove before production (see app/lib/dev-auth.ts header).
import { isDevAdminToken } from '~/lib/dev-auth'

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()
  const auth = useAuthStore()

  const api = createApiClient({
    baseURL: config.public.strapiBaseUrl,
    getToken: () => auth.jwt,
    onUnauthorized: () => {
      // The synthetic dev-admin session carries a fake token Strapi rejects, so its data calls
      // 401 by design. Don't tear that local session down on those expected 401s — keep it so the
      // UI stays navigable for demo/experimentation. (DEV-ONLY; removed with the dev bypass.)
      if (import.meta.dev && isDevAdminToken(auth.jwt)) return
      auth.clearSession()
      nuxtApp.runWithContext(() => navigateTo('/login'))
    },
  })

  return { provide: { api } }
})
