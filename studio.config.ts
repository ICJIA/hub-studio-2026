// Central, non-secret app configuration. Secrets stay in env / Netlify env vars — never here.
const demoMode = process.env.NUXT_PUBLIC_DEMO_MODE === 'true'

export default {
  appName: 'ICJIA Research Hub Studio',
  // Strapi backend URL. BLANK in the public demo (audit D-1): the demo is fully in-memory and never
  // contacts Strapi, so there is no reason to disclose the (dev) API host on a public site. Real
  // builds ship the real URL so the client can reach the API.
  //
  // STAGING OVERRIDE (roadmap §5.4-8, verified 2026-07-17): this value flows into
  // runtimeConfig.public.strapiBaseUrl (nuxt.config.ts), so Nuxt's env mechanism lets a
  // deploy override it WITHOUT editing code via NUXT_PUBLIC_STRAPI_BASE_URL. WHERE the
  // override applies depends on the build preset (both verified empirically):
  //   - `npm run generate` (static / the demo): baked at GENERATE time into the output.
  //   - `npm run build` (production, node-server): resolved at SERVER RUNTIME — the env
  //     must be present where the server RUNS. On Netlify: set via the UI/CLI (Functions
  //     scope by default); `netlify.toml` [build.environment] NEVER reaches Functions,
  //     so it cannot carry this override.
  // CI's "Staging-host override guard" starts the built server with a sentinel and
  // asserts the served page carries it. A staging deploy must ALSO allow its host in the
  // CSP's connect-src (public/_headers) — runbook §2. The value below stays the default.
  strapiBaseUrl: demoMode ? '' : 'https://v2.hub.icjia-api.cloud',
  // DEMO MODE: a fully self-contained public demo — demo login only, in-memory content,
  // no real auth, no Strapi writes, no secrets. Set NUXT_PUBLIC_DEMO_MODE=true on the deploy.
  demoMode,
  // Max number of "Main Files" (PDF attachments) an article may carry. The SINGLE editable
  // source of truth — surfaced via runtimeConfig.public so MainFilesField (and any future
  // consumer) reads one value. Bump here to change the cap everywhere.
  maxMainFiles: 3,
}
