<!-- app/pages/preview/[type]/[documentId].vue -->
<!--
  /preview/:type/:documentId — render a saved DRAFT exactly as it would publish, via the same
  Published*Preview components + renderMarkdown the editor modal uses (so preview == published),
  inside the swappable hub stylesheet (prose-preview.css). This is the shareable draft link: it
  stays private behind the global auth guard, so anyone signed in to the Studio (the reviewers)
  can open it — the "Copy share link" button grabs the stable URL.

  REVIEWER ANNOTATIONS (spec: docs/superpowers/specs/2026-07-04-reviewer-annotations-design.md):
  the whole overlay — sticky reviewer bar, quote-anchored highlights, comments rail, composer —
  lives in <AnnotatedPreview> (shared with the editor's Live-preview modal, spec Addendum A).
  This page just fetches the draft and slots the Published*Preview into it.
-->
<script setup lang="ts">
import { ref, computed, onMounted } from '#imports'
import type { Article, App, Dataset } from '~/types/content'
import type { AnnotationContentType } from '~/types/annotations'

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
  <!-- the page has the sticky Studio header (~4rem), so the TOC sticks below it -->
  <div class="max-w-6xl mx-auto" style="--published-toc-top: 5rem">
    <p v-if="loading" class="text-muted">Loading…</p>
    <AnnotatedPreview
      v-else-if="entry"
      :content-type="type as AnnotationContentType"
      :document-id="documentId"
      preview-class="-mx-4 sm:-mx-6"
    >
      <template #bar-leading>
        <!-- The shareable page must never be a dead end (user report 2026-07-05): saving a
             draft lands here, and the modal's Live-preview-view link opens it in a new tab —
             give both audiences a way back to the editor and the content list. -->
        <div class="flex items-center gap-2 flex-wrap">
          <UButton
            data-test="preview-back-to-editor"
            size="xs" variant="outline" color="neutral" icon="i-lucide-arrow-left"
            label="Back to editor" :to="`/edit/${type}/${documentId}`"
          />
          <UButton
            data-test="preview-back-to-dashboard"
            size="xs" variant="ghost" color="neutral" icon="i-lucide-layout-dashboard"
            label="Dashboard" to="/"
          />
          <p class="text-xs text-muted uppercase tracking-wide">Draft preview</p>
        </div>
      </template>
      <template #bar-actions>
        <UButton size="xs" variant="outline" color="neutral" icon="i-lucide-link" label="Copy share link" @click="copyShareLink" />
      </template>

      <!-- -mx-4 sm:-mx-6 (via preview-class) cancels the layout <main>'s horizontal padding so
           the article (and its full-bleed splash) reaches the container's edges. The body inset
           is carried by .published-layout / .published-content in prose-preview.css. -->
      <PublishedArticlePreview v-if="asArticle" :article="asArticle" />
      <PublishedAppPreview v-else-if="asApp" :app="asApp" />
      <PublishedDatasetPreview v-else-if="asDataset" :dataset="asDataset" />
    </AnnotatedPreview>
    <p v-else class="text-muted">Not found.</p>
  </div>
</template>
