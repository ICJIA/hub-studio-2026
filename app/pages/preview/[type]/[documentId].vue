<!-- app/pages/preview/[type]/[documentId].vue -->
<!--
  /preview/:type/:documentId — render a saved DRAFT exactly as it would publish, via the same
  Published*Preview components + renderMarkdown the editor modal uses (so preview == published),
  inside the swappable hub stylesheet (prose-preview.css). This is the shareable draft link: it
  stays private behind the global auth guard, so anyone signed in to the Studio (the reviewers)
  can open it — the "Copy share link" button grabs the stable URL.
-->
<script setup lang="ts">
import { ref, computed, onMounted } from '#imports'
import type { Article, App, Dataset } from '~/types/content'

const route = useRoute()
const type = route.params.type as 'article' | 'app' | 'dataset'
const documentId = route.params.documentId as string
const toast = useToast()

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

/** Copy this draft's stable preview URL — opens for anyone signed in to the Studio. */
async function copyShareLink() {
  try {
    await navigator.clipboard.writeText(window.location.href)
    toast.add({ title: 'Share link copied', description: 'Anyone signed in to the Studio can open it.', color: 'success' })
  } catch {
    toast.add({ title: 'Could not copy link', description: window.location.href, color: 'error' })
  }
}
</script>

<template>
  <div class="max-w-6xl mx-auto">
    <p v-if="loading" class="text-muted">Loading…</p>
    <template v-else-if="entry">
      <div class="flex items-center justify-between gap-4 mb-5">
        <p class="text-xs text-muted uppercase tracking-wide">Draft preview</p>
        <UButton size="xs" variant="outline" color="neutral" icon="i-lucide-link" label="Copy share link" @click="copyShareLink" />
      </div>

      <PublishedArticlePreview v-if="asArticle" :article="asArticle" />
      <PublishedAppPreview v-else-if="asApp" :app="asApp" />
      <PublishedDatasetPreview v-else-if="asDataset" :dataset="asDataset" />
    </template>
    <p v-else class="text-muted">Not found.</p>
  </div>
</template>
