<!-- app/components/AppStatusBar.vue -->
<!--
  Bottom status bar for managers/reviewers: the deployed version plus links to the living
  project docs. Spec & status, Changelog, and Roadmap are IN-APP pages rendering the
  repo's own markdown (build-time ?raw imports, article pipeline) — the repository is
  private for now, so GitHub blob links would 404 for every manager; only the Repository
  link itself stays external (developers with access). Ported from copperhead-20's
  AppStatusBar (hub v0.24.0). Pure links — no fetches — so the demo CSP (connect-src
  'self') is unaffected.
-->
<script setup lang="ts">
const version = useRuntimeConfig().public.version
const repoUrl = 'https://github.com/ICJIA/copperhead-studio-20'
</script>

<template>
  <div class="border-t border-default bg-elevated/40" data-test="app-status-bar">
    <div class="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-2 text-xs sm:px-6">
      <span
        class="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-highlighted"
        data-test="version-pill"
      >
        <span class="size-1.5 rounded-full bg-primary" aria-hidden="true" />
        Studio build v{{ version }}
      </span>
      <nav class="flex flex-wrap items-center gap-x-5 gap-y-1 text-muted" aria-label="Project status and documentation">
        <NuxtLink to="/spec" class="hover:text-highlighted hover:underline" data-test="link-spec">
          Spec &amp; status
        </NuxtLink>
        <NuxtLink to="/changelog" class="hover:text-highlighted hover:underline" data-test="link-changelog">
          Changelog
        </NuxtLink>
        <NuxtLink to="/roadmap" class="hover:text-highlighted hover:underline" data-test="link-roadmap">
          Roadmap
        </NuxtLink>
        <a
          :href="repoUrl"
          target="_blank"
          rel="noopener"
          class="inline-flex items-center gap-1 hover:text-highlighted hover:underline"
          data-test="link-repo"
        >
          <UIcon name="i-lucide-github" class="size-3.5" aria-hidden="true" />
          Repository
        </a>
      </nav>
    </div>
  </div>
</template>
