<!-- app/pages/spec.vue -->
<!--
  In-app view of the manager-facing Design & Implementation Spec. The markdown is imported
  at build time (?raw) and rendered through the SAME pipeline as article bodies
  (renderMarkdown: html:false, attr allowlist), so this v-html sink carries the pipeline's
  guarantees and renders no third-party content — the source is this repo's own doc, fixed
  at build. The current .md and .docx are copied to /spec/ by scripts/copy-spec.mjs and
  offered as downloads. Linked from the bottom status bar; PUBLIC (readable before sign-in)
  because the sources already live in a public repo and demo. Ported from copperhead-20's
  /spec (hub v0.24.0). Kept current by keeping the source doc current — the docs-nav guard
  test enforces the version stamps.
-->
<script setup lang="ts">
import { renderMarkdown } from '~/lib/markdown'
import specSource from '../../docs/ICJIA-Studio-20-rewrite-copperhead.md?raw'

definePageMeta({ public: true })

const html = renderMarkdown(specSource)
const version = useRuntimeConfig().public.version
const mdHref = '/spec/ICJIA-Studio-20-rewrite-copperhead.md'
const docxHref = '/spec/ICJIA-Studio-20-rewrite-copperhead.docx'

useHead({ title: 'Spec & status — ICJIA Research Hub Studio' })
</script>

<template>
  <div class="mx-auto w-full max-w-4xl">
    <div class="flex flex-wrap items-start justify-between gap-4 border-b border-default pb-6">
      <div>
        <p class="text-xs font-semibold uppercase tracking-widest text-primary" data-test="spec-version">
          Studio build v{{ version }}
        </p>
        <h1 class="mt-1 text-3xl font-bold text-highlighted">
          Specification &amp; status
        </h1>
        <p class="mt-2 text-sm text-muted">
          The living design spec for Hub Studio 2.0, rendered from the repository — kept
          current with every change. See "What's changed recently" near the end for the
          latest, and the roadmap for what's next.
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <UButton
          :to="mdHref"
          target="_blank"
          rel="noopener"
          color="neutral"
          variant="outline"
          size="sm"
          icon="i-lucide-file-text"
          label="Download .md"
          data-test="download-md"
        />
        <UButton
          :to="docxHref"
          target="_blank"
          rel="noopener"
          color="neutral"
          variant="outline"
          size="sm"
          icon="i-lucide-download"
          label="Download .docx"
          data-test="download-docx"
        />
      </div>
    </div>

    <!-- Same pipeline + stylesheet as the article previews. -->
    <article class="prose-preview mt-8" data-test="spec-body" v-html="html" />
  </div>
</template>
