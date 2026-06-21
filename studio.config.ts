// Central, non-secret app configuration. Secrets stay in env / Netlify env vars — never here.
export default {
  appName: 'ICJIA Research Hub Studio',
  strapiBaseUrl: 'https://v2.hub.icjia-api.cloud',
  // DEMO MODE: a fully self-contained public demo — demo login only, in-memory content,
  // no real auth, no Strapi writes, no secrets. Set NUXT_PUBLIC_DEMO_MODE=true on the deploy.
  demoMode: process.env.NUXT_PUBLIC_DEMO_MODE === 'true',
}
