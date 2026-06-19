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
