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
import { parseAuthors } from '~/lib/text-import'

const props = defineProps<{ mode: 'create' | 'edit'; initial?: Article }>()
const repo = useArticles()
const toast = useToast()

const model = reactive<Article>(props.initial ? { ...props.initial } : blankArticle())
const errors = ref<FieldError[]>([])
const saving = ref(false)
const previewOpen = ref(false)

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

defineExpose({ submit, setField, errors, model })
</script>

<template>
  <UForm :state="model" class="space-y-6" @submit.prevent="submit">
    <div class="flex justify-end">
      <UButton variant="outline" icon="i-lucide-eye" label="Preview as published" @click="previewOpen = true" />
    </div>

    <TextField v-model="model.title" label="Title" />

    <div class="grid gap-6 lg:grid-cols-3 items-start">
      <!-- Writing column -->
      <div class="lg:col-span-2 space-y-5">
        <MarkdownField :model-value="model.abstract ?? ''" label="Abstract" compact @update:model-value="model.abstract = $event" />
        <RepeatableField v-model="model.authors" label="Authors" :columns="authorColumns" :paste-parser="parseAuthors" />
        <MarkdownField v-model="model.markdown" label="Body (Markdown)" />
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
          <SelectField v-model="model.mainfiletype" label="Main file type" :options="MAINFILETYPE_OPTIONS" />
          <MediaField v-model="model.mainfile" label="Main file" kind="file" />
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
      <UButton variant="ghost" color="neutral" icon="i-lucide-eye" label="Preview as published" @click="previewOpen = true" />
    </div>

    <UModal v-model:open="previewOpen" :ui="{ content: 'max-w-6xl' }">
      <template #content>
        <div class="flex max-h-[88vh] flex-col bg-white">
          <div class="flex items-center justify-between border-b border-default px-4 py-2">
            <span class="text-sm font-medium text-gray-700">Published preview</span>
            <UButton size="xs" variant="ghost" color="neutral" icon="i-lucide-x" aria-label="Close preview" @click="previewOpen = false" />
          </div>
          <div class="overflow-y-auto p-6">
            <PublishedArticlePreview :article="model" />
          </div>
        </div>
      </template>
    </UModal>
  </UForm>
</template>
