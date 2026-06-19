import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    // Default to fast node env; opt into the Nuxt env per-file with
    // `// @vitest-environment nuxt`.
    environment: 'node',
  },
})
