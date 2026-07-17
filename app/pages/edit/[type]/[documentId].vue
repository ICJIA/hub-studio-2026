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

// App/Dataset only: PublishButton lives HERE on the page, not inside those forms (contrast
// ArticleForm, which hosts its own PublishButton and handles this internally via its
// onPublished). Only one of these two is ever mounted (v-else-if below), so binding the SAME
// ref name to both is safe — whichever form is active sets it, the other stays null.
const appFormRef = ref<InstanceType<typeof AppForm> | null>(null)
const datasetFormRef = ref<InstanceType<typeof DatasetForm> | null>(null)

/** Publish/Unpublish succeeded for App/Dataset: keep the page's own entry.publishedAt in sync
 *  (drives the "Published." indicator below) AND relay the fresh entity into the mounted form
 *  via its exposed onPublished (final-review Fix round 1, Finding 2). Without that second hop,
 *  the form's loadedUpdatedAt never learns about the updatedAt bump publish/unpublish makes
 *  server-side, so the form's VERY NEXT save falsely reports "changed by someone else" against
 *  the author's own publish — exactly the false-conflict ArticleForm avoids by handling
 *  publish in its own onPublished (see that component). */
function onNonArticlePublished(entity: App | Dataset) {
  if (entry.value) entry.value.publishedAt = entity.publishedAt
  appFormRef.value?.onPublished(entity as App)
  datasetFormRef.value?.onPublished(entity as Dataset)
}
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
      <AppForm v-else-if="type === 'app'" ref="appFormRef" mode="edit" :initial="entry as App" />
      <DatasetForm v-else-if="type === 'dataset'" ref="datasetFormRef" mode="edit" :initial="entry as Dataset" />
      <div class="mt-6 border-t border-default pt-4 space-y-3">
        <div class="flex items-center gap-3">
          <!-- App/Dataset still expose Publish here (only ArticleForm has the toolbar). -->
          <PublishButton
            v-if="type !== 'article'"
            :type="(type as 'app' | 'dataset')"
            :document-id="documentId"
            :published="entry.publishedAt != null"
            @published="onNonArticlePublished($event as App | Dataset)"
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
