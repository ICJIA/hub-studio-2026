import { defineVitestConfig } from '@nuxt/test-utils/config'
import { defaultExclude } from 'vitest/config'

export default defineVitestConfig({
  test: {
    // Default to fast node env; opt into the Nuxt env per-file with
    // `// @vitest-environment nuxt`.
    environment: 'node',
    // Never scan editor/agent worktrees under .claude/ — each carries its own copy of
    // tests/ but no node_modules, so the first worktree ever created surfaced 97 phantom
    // file-level failures in the parent checkout's run.
    exclude: [...defaultExclude, '.claude/**'],
  },
})
