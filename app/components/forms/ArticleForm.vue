<!-- app/components/forms/ArticleForm.vue -->
<!--
  ArticleForm: thin over the shared fields + the pure submitForm save-gate + useArticles(). On
  submit it runs validateArticle BEFORE any write (the zero-base64 hand-off from the data layer)
  and, on create, slugifies the title (prepareForCreate). Relations (apps/datasets) render
  READ-ONLY (relation WRITE is deferred). The Markdown body uses MarkdownField — the Plan-4 editor
  seam. Layout: a wide writing column (abstract, authors, body) + a "Details" metadata sidebar,
  so the page reads horizontally instead of as one long vertical stack. Pure logic lives in
  lib/forms/*; this component is intentionally thin.
-->
<script setup lang="ts">
import { reactive, ref } from '#imports'
import type { Article } from '~/types/content'
import { blankArticle } from '~/lib/forms/blank-models'
import { submitForm, prepareForCreate, type SubmitResult } from '~/lib/forms/submit'
import { validateArticle, type FieldError } from '~/lib/validators/article'
import { CATEGORY_OPTIONS, ARTICLE_TYPE_OPTIONS, MAINFILETYPE_OPTIONS } from '~/lib/field-options'

const props = defineProps<{ mode: 'create' | 'edit'; initial?: Article }>()
// Emitted when the toolbar's Publish/Unpublish toggles the article — lets the parent edit page
// keep its own published state (entry.publishedAt) in sync with the form.
const emit = defineEmits<{ published: [entity: Article] }>()
const repo = useArticles()
const toast = useToast()
// The toolbar's Publish/Unpublish control (PublishButton) is self-gating (default-deny): it renders
// the live toggle for an editor and NOTHING for an author. The "Save the draft first to publish"
// hint is therefore editor-only too — an author can't publish at all, so the hint would be
// misleading for them. Authors see no publish affordance and no publish hint in the toolbar.
const { canPublish } = useAuth()

const model = reactive<Article>(props.initial ? { ...props.initial } : blankArticle())
const errors = ref<FieldError[]>([])
const saving = ref(false)
const previewOpen = ref(false)

// Ref to the body MarkdownField so the sidebar BodyImagesField can insert figures at the cursor.
const bodyField = ref<{ insertMarkdown: (text: string) => void } | null>(null)

const authorColumns = [
  { key: 'title', label: 'Name' },
  { key: 'description', label: 'Description' },
]

// Test/parent hook to set a field without going through the DOM.
function setField<K extends keyof Article>(key: K, value: Article[K]) { model[key] = value }

async function submit() {
  saving.value = true
  errors.value = []
  try {
    const toSave: Article = props.mode === 'create' ? (prepareForCreate(model) as Article) : { ...model }
    const persist = props.mode === 'create'
      ? (m: Article) => repo.create(m)
      : (m: Article) => repo.update(m.documentId, m)
    const res: SubmitResult<Article> = await submitForm(toSave, validateArticle, persist)
    if (!res.ok) { errors.value = res.errors; return }
    toast.add({ title: 'Draft saved', color: 'success' })
    await navigateTo(`/preview/article/${res.saved!.documentId}`)
  } catch {
    toast.add({ title: 'Save failed', description: 'Please try again.', color: 'error' })
  } finally {
    saving.value = false
  }
}

/** Toolbar Publish/Unpublish succeeded: reflect the new published state locally (so the toolbar
 *  toggles live) and forward to the parent edit page. */
function onPublished(entity: Article) {
  model.publishedAt = entity.publishedAt
  emit('published', entity)
}

defineExpose({ submit, setField, onPublished, errors, model })
</script>

<template>
  <UForm :state="model" class="space-y-6" @submit.prevent="submit">
    <!--
      Sticky secondary toolbar — pinned directly under the main app nav (which is `sticky top-0
      h-16`), so this sits at `top-16` and stays visible while the author scrolls a long article.
      The form renders inside the layout `<main class="max-w-6xl mx-auto px-4 sm:px-6">`, so the BAR
      breaks out to full content width (-mx-4 sm:-mx-6) and re-pads its inner row (px-4 sm:px-6).
    -->
    <div class="sticky top-16 z-10 -mx-4 sm:-mx-6 border-b border-default bg-default/85 backdrop-blur-md shadow-sm">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between gap-4">
        <!-- LEFT: live title (updates as the author types the Title field below). -->
        <p
          class="min-w-0 flex-1 truncate text-sm font-medium"
          :class="model.title ? 'text-highlighted' : 'text-muted italic'"
          :title="model.title || 'Untitled article'"
        >
          {{ model.title || 'Untitled article' }}
        </p>
        <!-- RIGHT: Live preview (always) + Publish/Unpublish on a SAVED article. PublishButton is
             default-deny — it renders the live toggle for an editor and NOTHING for an author. The
             "save first" hint is editor-only (an author can't publish, so it never shows for them). -->
        <div class="flex items-center gap-2 sm:gap-3 shrink-0">
          <UButton size="sm" variant="soft" color="primary" icon="i-lucide-eye" label="Live preview" @click="previewOpen = true" />
          <PublishButton
            v-if="mode === 'edit' && model.documentId"
            type="article"
            size="sm"
            :document-id="model.documentId"
            :published="model.publishedAt != null"
            @published="onPublished($event as Article)"
          />
          <span v-else-if="canPublish" class="hidden text-xs text-muted sm:inline">Save the draft first to publish</span>
        </div>
      </div>
    </div>

    <TextField v-model="model.title" label="Title" />

    <div class="grid gap-6 lg:grid-cols-3 items-start">
      <!-- Writing column -->
      <div class="lg:col-span-2 space-y-5">
        <MarkdownField :model-value="model.abstract ?? ''" label="Abstract" compact @update:model-value="model.abstract = $event" />
        <RepeatableField v-model="model.authors" label="Authors" :columns="authorColumns" add-label="Add Author" :max="10" />
        <MarkdownField ref="bodyField" v-model="model.markdown" label="Body (Markdown)" />
      </div>

      <!-- Details sidebar -->
      <UCard class="lg:col-span-1">
        <template #header><h3 class="font-medium text-highlighted">Details</h3></template>
        <div class="space-y-5">
          <DateField v-model="model.date" label="Date" />
          <SelectField v-model="model.type" label="Type" :options="ARTICLE_TYPE_OPTIONS" />
          <ChipsField v-model="model.categories" label="Categories" :options="CATEGORY_OPTIONS" />
          <ChipsField v-model="model.tags" label="Tags" />
          <MediaField v-model="model.splash" label="Splash image" />
          <BodyImagesField @insert="bodyField?.insertMarkdown($event)" />
          <SelectField v-model="model.mainfiletype" label="Main file type" :options="MAINFILETYPE_OPTIONS" />
          <MainFilesField v-model="model.mainfiles" />
          <RelationList label="Linked datasets" :items="model.datasets" />
          <RelationList label="Linked apps" :items="model.apps" />
        </div>
      </UCard>
    </div>

    <ul v-if="errors.length" class="text-sm text-error list-disc pl-5" role="alert">
      <li v-for="(e, i) in errors" :key="i">{{ e.field }}: {{ e.message }}</li>
    </ul>

    <div class="flex items-center gap-3">
      <UButton type="submit" :loading="saving" label="Save draft" />
      <UButton variant="soft" color="primary" icon="i-lucide-eye" label="Preview as published" @click="previewOpen = true" />
    </div>

    <UModal v-model:open="previewOpen" :ui="{ content: 'max-w-6xl' }">
      <template #content>
        <div class="flex max-h-[88vh] flex-col bg-white">
          <div class="flex items-center justify-between gap-3 border-b border-default px-4 py-2">
            <span class="text-sm font-medium text-gray-700">Published preview</span>
            <div class="flex items-center gap-2">
              <!-- Saved drafts: jump to the standalone review page (the shareable reviewer URL). -->
              <UButton
                v-if="mode === 'edit' && model.documentId"
                data-test="review-view-link"
                size="xs" variant="outline" color="neutral" icon="i-lucide-external-link"
                label="Review view" :to="`/preview/article/${model.documentId}`" target="_blank"
              />
              <UButton size="xs" variant="ghost" color="neutral" icon="i-lucide-x" aria-label="Close preview" @click="previewOpen = false" />
            </div>
          </div>
          <!-- py-6 (not p-6): no horizontal padding so the full-bleed splash reaches the modal's
               left/right edges; the body inset is carried by .published-layout in prose-preview.css.
               SAVED drafts get the full annotation overlay (spec Addendum A) — same threads as the
               /preview page; unsaved create-mode previews stay plain (no documentId to key threads to).
               --ann-sticky-top: 0px pins the reviewer bar to the top of the modal's scroll area. -->
          <div class="overflow-y-auto py-6" style="--ann-sticky-top: 0px">
            <AnnotatedPreview v-if="mode === 'edit' && model.documentId" content-type="article" :document-id="model.documentId">
              <PublishedArticlePreview :article="model" />
            </AnnotatedPreview>
            <PublishedArticlePreview v-else :article="model" />
          </div>
        </div>
      </template>
    </UModal>
  </UForm>
</template>
