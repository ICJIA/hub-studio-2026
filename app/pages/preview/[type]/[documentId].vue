<!-- app/pages/preview/[type]/[documentId].vue -->
<!--
  /preview/:type/:documentId — render a DRAFT as it would publish: title, splash (from its Media
  URL), and the markdown body via MarkdownPreview (the SAME renderMarkdown the public site uses, so
  preview == published) inside the ONE swappable prose stylesheet (prose-preview.css; official CSS
  drops in later for pixel-exact parity). Shareable by link (private behind the global guard).
-->
<script setup lang="ts">
import { ref, computed, onMounted } from '#imports'
import type { Article, App, Dataset } from '~/types/content'

const route = useRoute()
const type = route.params.type as 'article' | 'app' | 'dataset'
const documentId = route.params.documentId as string

const repo = type === 'article' ? useArticles() : type === 'app' ? useApps() : useDatasets()
const entry = ref<Article | App | Dataset | null>(null)
const loading = ref(true)

onMounted(async () => {
  try {
    entry.value = await repo.findOne(documentId, { status: 'draft' })
  } finally {
    loading.value = false
  }
})

const asArticle = computed(() => (type === 'article' ? (entry.value as Article | null) : null))
const asApp = computed(() => (type === 'app' ? (entry.value as App | null) : null))
const asDataset = computed(() => (type === 'dataset' ? (entry.value as Dataset | null) : null))
</script>

<template>
  <div class="max-w-3xl mx-auto">
    <p v-if="loading" class="text-muted">Loading…</p>
    <article v-else-if="entry" class="prose-preview">
      <p class="text-xs text-muted mb-2">Draft preview</p>
      <h1 class="text-3xl font-semibold mb-4">{{ entry.title }}</h1>

      <img
        v-if="asArticle?.splash"
        :src="asArticle.splash.url"
        :alt="asArticle.splash.alternativeText ?? ''"
        class="mb-6 rounded"
      >
      <img v-else-if="asApp?.image" :src="asApp.image.url" :alt="asApp.image.alternativeText ?? ''" class="mb-6 rounded">

      <MarkdownPreview v-if="asArticle" :source="asArticle.markdown" />

      <template v-if="asApp">
        <p v-if="asApp.description" class="mb-3">{{ asApp.description }}</p>
        <p v-if="asApp.url"><a :href="asApp.url" class="text-primary underline">Open app</a></p>
      </template>

      <template v-if="asDataset">
        <p v-if="asDataset.description" class="mb-3">{{ asDataset.description }}</p>
        <h2 v-if="asDataset.variables?.length" class="text-xl font-semibold mt-4 mb-2">Variables</h2>
        <ul v-if="asDataset.variables?.length" class="list-disc pl-5 text-sm">
          <li v-for="(v, i) in asDataset.variables" :key="i"><strong>{{ v.name }}</strong> ({{ v.type }}): {{ v.definition }}</li>
        </ul>
      </template>
    </article>
    <p v-else class="text-muted">Not found.</p>
  </div>
</template>
