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
    // Server-only secrets (NEVER exposed to the client). Auto-populated from the matching
    // MAILGUN_* env vars at runtime; empty defaults keep typecheck/build green without them.
    mailgunApiKey: process.env.MAILGUN_API_KEY ?? '',
    mailgunDomain: process.env.MAILGUN_DOMAIN ?? '',
    mailgunFrom: process.env.MAILGUN_FROM ?? '',
    public: {
      strapiBaseUrl: 'https://v2.hub.icjia-api.cloud',
      // The deployed Studio origin the review email links to (absolute /preview/... URL).
      publicBaseUrl: process.env.PUBLIC_BASE_URL ?? '',
    },
  },
  devtools: { enabled: true },
  compatibilityDate: '2026-06-19',
})
