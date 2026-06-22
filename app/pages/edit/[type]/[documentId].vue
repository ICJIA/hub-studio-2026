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
      <!-- Article: Publish/Unpublish lives in ArticleForm's sticky toolbar; keep entry.publishedAt
           in sync via its @published so the indicator below stays correct. -->
      <ArticleForm
        v-if="type === 'article'"
        mode="edit"
        :initial="entry as Article"
        @published="entry.publishedAt = ($event as Article).publishedAt"
      />
      <AppForm v-else-if="type === 'app'" mode="edit" :initial="entry as App" />
      <DatasetForm v-else-if="type === 'dataset'" mode="edit" :initial="entry as Dataset" />
      <div class="mt-6 border-t border-default pt-4 space-y-3">
        <div class="flex items-center gap-3">
          <!-- App/Dataset still expose Publish here (only ArticleForm has the toolbar). -->
          <PublishButton
            v-if="type !== 'article'"
            :type="(type as 'app' | 'dataset')"
            :document-id="documentId"
            :published="entry.publishedAt != null"
            @published="entry.publishedAt = ($event as App | Dataset).publishedAt"
          />
          <span v-if="entry.publishedAt" class="text-sm text-muted">Published.</span>
        </div>
        <details>
          <summary class="cursor-pointer text-sm font-medium">Request review by email</summary>
          <div class="mt-2 max-w-md">
            <RequestReviewForm :type="(type as 'article' | 'app' | 'dataset')" :document-id="documentId" />
          </div>
        </details>
      </div>
    </template>
    <p v-else class="text-muted">Not found.</p>
  </div>
</template>
