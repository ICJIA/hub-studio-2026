// https://nuxt.com/docs/api/configuration/nuxt-config
// Single source of truth for non-secret app config (app name, Strapi base URL, demo flag).
// Secrets (Mailgun, webhook) stay below in PRIVATE runtimeConfig, env-driven — never here.
import studioConfig from './studio.config'

export default defineNuxtConfig({
  ssr: false,
  modules: ['@nuxt/ui', '@pinia/nuxt', 'pinia-plugin-persistedstate/nuxt', '@nuxt/fonts'],
  // Flat component names (no directory prefix) so the content forms can reference the shared
  // field components in app/components/fields/ as <TextField>/<DateField>/… rather than
  // <FieldsTextField>/…. Without this, those nested components fail to resolve and render nothing.
  components: [{ path: '~/components', pathPrefix: false }],
  css: [
    '~/assets/css/main.css',
    '~/assets/css/prose-preview.css',
    // Guided onboarding tour — base highlight-ring styles (ported from nuxt-guided-tour).
    '~/assets/css/guided-tour.css',
    // Reviewer annotations — mark tints + print rules (components style themselves with UI utilities).
    '~/assets/css/annotations.css',
  ],
  fonts: {
    families: [
      // The UI typeface — modern, highly legible. Used as --font-sans in main.css.
      { name: 'Inter', provider: 'google', weights: [400, 500, 600, 700], styles: ['normal'] },
      // Oswald — the public Research Hub's heading typeface; used by the published-style
      // preview (prose-preview.css) so the in-Studio preview matches the live article.
      { name: 'Oswald', provider: 'google', weights: [400, 500, 600, 700], styles: ['normal'] },
      // The editor's intended monospace; the vendored CM themes request 'JetBrains Mono'.
      { name: 'JetBrains Mono', provider: 'google', weights: [400, 500, 700], styles: ['normal'] },
    ],
  },
  // Bundle the lucide icons INTO the client build so the static SPA never fetches them from
  // api.iconify.design at runtime. Keeps the app self-contained (works offline / behind a tight
  // CSP connect-src 'self') and avoids missing icons. `scan` picks up the i-lucide-* used in app
  // templates; the explicit `icons` list covers Nuxt UI's internal indicators (chevrons, check,
  // loader, …) that a source scan cannot see because they live in node_modules.
  icon: {
    // Never fetch icons from api.iconify.design at runtime — bundle-or-nothing (audit D-3): drops the
    // Iconify/SimpleSVG/UniSVG API providers from the bundle, so a missing icon is a build-time signal
    // rather than a blocked runtime request.
    fallbackToApi: false,
    clientBundle: {
      scan: true,
      icons: [
        'lucide:check', 'lucide:chevron-down', 'lucide:chevron-up', 'lucide:chevron-left',
        'lucide:chevron-right', 'lucide:chevrons-left', 'lucide:chevrons-right',
        'lucide:x', 'lucide:search', 'lucide:loader-circle', 'lucide:minus', 'lucide:plus',
        'lucide:arrow-left', 'lucide:arrow-right', 'lucide:moon', 'lucide:sun',
        'lucide:circle-check', 'lucide:info', 'lucide:triangle-alert', 'lucide:circle-alert',
        'lucide:ellipsis', 'lucide:external-link', 'lucide:file-text', 'lucide:download',
        // Guided onboarding tour icons (welcome/intro/overlay + step icons). Listed explicitly
        // because the tour's step/slide icons are string literals in a .ts config the source scan
        // may miss — and fallbackToApi:false means an un-bundled icon would silently not render.
        'lucide:compass', 'lucide:pen-line', 'lucide:eye', 'lucide:users', 'lucide:lightbulb',
        'lucide:play', 'lucide:circle-help', 'lucide:files', 'lucide:id-card', 'lucide:send',
        // Reviewer-annotation UI (bar/rail/composer). Explicit for the same reason as
        // the tour icons: string usages the source scan may miss.
        'lucide:highlighter', 'lucide:reply',
        'lucide:trash-2', 'lucide:rotate-ccw', 'lucide:panel-right', 'lucide:map-pin-off',
      ],
      sizeLimitKb: 512,
    },
  },
  runtimeConfig: {
    // Server-only secrets (NEVER exposed to the client). Auto-populated from the matching
    // MAILGUN_* env vars at runtime; empty defaults keep typecheck/build green without them.
    mailgunApiKey: process.env.MAILGUN_API_KEY ?? '',
    mailgunDomain: process.env.MAILGUN_DOMAIN ?? '',
    mailgunFrom: process.env.MAILGUN_FROM ?? '',
    public: {
      // Sourced from studio.config.ts (single source of truth for non-secret app config).
      appName: studioConfig.appName,
      strapiBaseUrl: studioConfig.strapiBaseUrl,
      // Demo mode: a fully self-contained public demo (demo login only, in-memory, no writes,
      // no secrets). false ⇒ normal behavior is 100% unchanged. Baked at build for the SPA.
      demoMode: studioConfig.demoMode,
      // Max number of "Main Files" (PDF attachments) per article. Single source of truth lives
      // in studio.config.ts; surfaced here so MainFilesField reads it from runtimeConfig.public.
      maxMainFiles: studioConfig.maxMainFiles,
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
