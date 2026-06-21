<!-- app/components/ContentList.vue -->
<!--
  ContentList: reverse-chronological listing for one content type, sourced from the matching
  data-layer repo (useArticles/useApps/useDatasets) via repo.list({status, sort}). Each row links
  to /edit/:type/:documentId and /preview/:type/:documentId. Per-author "only my drafts" ownership
  scoping is deferred (spec §14 #12, a backend change) — this lists the shared draft pool.
-->
<script setup lang="ts">
import { ref, onMounted } from '#imports'
import type { ContentStatus } from '~/types/content'

const props = withDefaults(defineProps<{ type: 'article' | 'app' | 'dataset'; status?: ContentStatus }>(), { status: 'draft' })

const repo = props.type === 'article' ? useArticles() : props.type === 'app' ? useApps() : useDatasets()
const items = ref<{ documentId: string; title: string; publishedAt?: string | null }[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    items.value = await repo.list({ status: props.status, sort: 'updatedAt:desc' })
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <p v-if="loading" class="text-sm text-muted">Loading…</p>
    <p v-else-if="!items.length" class="text-sm text-muted">No {{ status }} {{ type }}s yet.</p>
    <ul v-else class="divide-y divide-default">
      <li v-for="item in items" :key="item.documentId" class="py-2 flex items-center justify-between gap-3">
        <span class="truncate">{{ item.title || '(untitled)' }}</span>
        <span class="flex gap-3 text-sm shrink-0 items-center">
          <NuxtLink :to="`/edit/${type}/${item.documentId}`" class="text-primary underline">Edit</NuxtLink>
          <NuxtLink :to="`/preview/${type}/${item.documentId}`" class="text-primary underline">Preview</NuxtLink>
          <slot name="row-actions" :document-id="item.documentId" :published="item.publishedAt != null" />
        </span>
      </li>
    </ul>
  </div>
</template>
