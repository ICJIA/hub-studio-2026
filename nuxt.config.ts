// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,
  modules: ['@nuxt/ui', '@pinia/nuxt', 'pinia-plugin-persistedstate/nuxt'],
  css: ['~/assets/css/main.css', '~/assets/css/prose-preview.css'],
  runtimeConfig: {
    public: {
      strapiBaseUrl: 'https://v2.hub.icjia-api.cloud',
    },
  },
  devtools: { enabled: true },
  compatibilityDate: '2026-06-19',
})
