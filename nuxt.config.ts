// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,
  modules: ['@nuxt/ui', '@pinia/nuxt', 'pinia-plugin-persistedstate/nuxt', '@nuxt/fonts'],
  // Flat component names (no directory prefix) so the content forms can reference the shared
  // field components in app/components/fields/ as <TextField>/<DateField>/… rather than
  // <FieldsTextField>/…. Without this, those nested components fail to resolve and render nothing.
  components: [{ path: '~/components', pathPrefix: false }],
  css: ['~/assets/css/main.css', '~/assets/css/prose-preview.css'],
  fonts: {
    families: [
      // The UI typeface — modern, highly legible. Used as --font-sans in main.css.
      { name: 'Inter', provider: 'google', weights: [400, 500, 600, 700], styles: ['normal'] },
      // The editor's intended monospace; the vendored CM themes request 'JetBrains Mono'.
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
  // Force a single light theme. The Studio is a government content tool; the dark/system
  // default produced an illegible light-text-on-white-card mismatch. A fresh storageKey
  // drops any stale 'system'/'dark' preference a browser cached before this was set.
  colorMode: { preference: 'light', fallback: 'light', storageKey: 'icjia-studio-color-mode' },
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'ICJIA Research Hub Studio',
    },
  },
  devtools: { enabled: false },
  compatibilityDate: '2026-06-19',
})
