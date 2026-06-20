// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,
  modules: ['@nuxt/ui', '@pinia/nuxt', 'pinia-plugin-persistedstate/nuxt', '@nuxt/fonts'],
  css: ['~/assets/css/main.css', '~/assets/css/prose-preview.css'],
  fonts: {
    families: [
      // Serve the editor's intended typeface; the vendored CM themes request 'JetBrains Mono'.
      { name: 'JetBrains Mono', provider: 'google', weights: [400, 500, 700], styles: ['normal'] },
    ],
  },
  runtimeConfig: {
    public: {
      strapiBaseUrl: 'https://v2.hub.icjia-api.cloud',
    },
  },
  devtools: { enabled: true },
  compatibilityDate: '2026-06-19',
})
