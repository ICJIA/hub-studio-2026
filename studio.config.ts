// Central, non-secret app configuration. Secrets stay in env / Netlify env vars — never here.
const demoMode = process.env.NUXT_PUBLIC_DEMO_MODE === 'true'

export default {
  appName: 'ICJIA Research Hub Studio',
  // Strapi backend URL. BLANK in the public demo (audit D-1): the demo is fully in-memory and never
  // contacts Strapi, so there is no reason to disclose the (dev) API host on a public site. Real
  // builds ship the real URL so the client can reach the API.
  strapiBaseUrl: demoMode ? '' : 'https://v2.hub.icjia-api.cloud',
  // DEMO MODE: a fully self-contained public demo — demo login only, in-memory content,
  // no real auth, no Strapi writes, no secrets. Set NUXT_PUBLIC_DEMO_MODE=true on the deploy.
  demoMode,
}
