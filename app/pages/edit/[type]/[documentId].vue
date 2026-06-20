<!-- app/pages/edit/[type]/[documentId].vue -->
<script setup lang="ts">
import { ref, onMounted } from '#imports'
import type { Article, App, Dataset } from '~/types/content'
import ArticleForm from '~/components/forms/ArticleForm.vue'
import AppForm from '~/components/forms/AppForm.vue'
import DatasetForm from '~/components/forms/DatasetForm.vue'

const route = useRoute()
const type = route.params.type as string
const documentId = route.params.documentId as string

const knownTypes = ['article', 'app', 'dataset']
const isKnownType = knownTypes.includes(type)

const repo = type === 'article' ? useArticles() : type === 'app' ? useApps() : type === 'dataset' ? useDatasets() : null
const entry = ref<Article | App | Dataset | null>(null)
const loading = ref(isKnownType)

onMounted(async () => {
  if (!isKnownType || !repo) { loading.value = false; return }
  try { entry.value = await repo.findOne(documentId, { status: 'draft' }) }
  finally { loading.value = false }
})
</script>
<template>
  <div>
    <h1 class="text-2xl font-semibold mb-4">Edit {{ type }}</h1>
    <p v-if="!isKnownType" class="text-muted">Unknown content type.</p>
    <p v-else-if="loading" class="text-muted">Loading…</p>
    <template v-else-if="entry">
      <ArticleForm v-if="type === 'article'" mode="edit" :initial="entry as Article" />
      <AppForm v-else-if="type === 'app'" mode="edit" :initial="entry as App" />
      <DatasetForm v-else-if="type === 'dataset'" mode="edit" :initial="entry as Dataset" />
    </template>
    <p v-else class="text-muted">Not found.</p>
  </div>
</template>
