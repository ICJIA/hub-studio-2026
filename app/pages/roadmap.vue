<!-- app/pages/roadmap.vue -->
<!--
  In-app view of ROADMAP.md, linked from the bottom status bar. The repository is PRIVATE
  (for now), so a GitHub blob link would 404 for every manager — this page renders the
  living roadmap itself, always current because the markdown is imported at build time
  (?raw) and every deploy rebuilds from the repo. Same rendering seam as /spec: the
  article pipeline (renderMarkdown: html:false, attr allowlist), so this v-html sink
  carries the pipeline's guarantees and the source is this repo's own doc, fixed at build.
  PUBLIC (readable before sign-in) like /spec — it's the same manager-facing record the
  demo exists to show.
-->
<script setup lang="ts">
import { renderMarkdown } from '~/lib/markdown'
import roadmapSource from '../../ROADMAP.md?raw'

definePageMeta({ public: true })

const html = renderMarkdown(roadmapSource)
const version = useRuntimeConfig().public.version

useHead({ title: 'Roadmap — ICJIA Research Hub Studio' })
</script>

<template>
  <div class="mx-auto w-full max-w-4xl">
    <div class="border-b border-default pb-6">
      <p class="text-xs font-semibold uppercase tracking-widest text-primary" data-test="roadmap-version">
        Studio build v{{ version }}
      </p>
      <h1 class="mt-1 text-3xl font-bold text-highlighted">
        Roadmap
      </h1>
      <p class="mt-2 text-sm text-muted">
        The living roadmap — what shipped recently, what's in flight, what's next, and
        what's deliberately deferred — rendered from the repository, current as of this
        build. The version-by-version record is the
        <NuxtLink to="/changelog" class="underline hover:text-highlighted">changelog</NuxtLink>.
      </p>
    </div>

    <!-- Same pipeline + stylesheet as the article previews. -->
    <article class="prose-preview mt-8" data-test="roadmap-body" v-html="html" />
  </div>
</template>
