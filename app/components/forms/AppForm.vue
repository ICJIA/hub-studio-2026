<!-- app/components/forms/AppForm.vue -->
<!--
  AppForm: same save-gate + thin-component pattern as ArticleForm, with App fields. validateApp
  requires only title+slug (no date) — the date field is offered but not required. Relations
  (datasets/articles) render READ-ONLY (relation WRITE deferred).
-->
<script setup lang="ts">
import { reactive, ref } from '#imports'
import type { App } from '~/types/content'
import { blankApp } from '~/lib/forms/blank-models'
import { submitForm, prepareForCreate, type SubmitResult } from '~/lib/forms/submit'
import { validateApp } from '~/lib/validators/app'
import type { FieldError } from '~/lib/validators/article'
import { CATEGORY_OPTIONS } from '~/lib/field-options'
import { parseAuthors } from '~/lib/text-import'

const props = defineProps<{ mode: 'create' | 'edit'; initial?: App }>()
const repo = useApps()
const toast = useToast()

const model = reactive<App>(props.initial ? { ...props.initial } : blankApp())
const errors = ref<FieldError[]>([])
const saving = ref(false)

// contributors share the {title,description} row shape (parseAuthors fits).
const contributorColumns = [
  { key: 'title', label: 'Name' },
  { key: 'description', label: 'Description' },
]

function setField<K extends keyof App>(key: K, value: App[K]) { model[key] = value }

async function submit() {
  saving.value = true
  errors.value = []
  try {
    const toSave: App = props.mode === 'create' ? (prepareForCreate(model) as App) : { ...model }
    const persist = props.mode === 'create'
      ? (m: App) => repo.create(m)
      : (m: App) => repo.update(m.documentId, m)
    const res: SubmitResult<App> = await submitForm(toSave, validateApp, persist)
    if (!res.ok) { errors.value = res.errors; return }
    toast.add({ title: 'Draft saved', color: 'success' })
    // Tab-only preview (user decision 2026-07-05): save just saves. A first-time create moves
    // to the entry's edit route (it now exists); preview is the Preview link's own named tab.
    if (props.mode === 'create') {
      await navigateTo(`/edit/app/${res.saved!.documentId}`)
    }
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
      <!-- Tab-only preview: the standalone review page in a per-document named tab. -->
      <UButton
        v-if="mode === 'edit' && model.documentId"
        variant="outline" icon="i-lucide-eye" label="Preview as published"
        :to="`/preview/app/${model.documentId}`" :target="`studio-preview-${model.documentId}`"
      />
      <UButton v-else variant="outline" icon="i-lucide-eye" label="Preview as published" disabled title="Save the draft first to preview" />
    </div>

    <TextField v-model="model.title" label="Title" />

    <div class="grid gap-6 lg:grid-cols-3 items-start">
      <!-- Writing column -->
      <div class="lg:col-span-2 space-y-5">
        <MarkdownField :model-value="model.description ?? ''" label="Description" @update:model-value="model.description = $event" />
      </div>

      <!-- Details sidebar -->
      <UCard class="lg:col-span-1">
        <template #header><h3 class="font-medium text-highlighted">Details</h3></template>
        <div class="space-y-5">
          <DateField v-model="model.date" label="Date" />
          <ChipsField v-model="model.categories" label="Categories" :options="CATEGORY_OPTIONS" />
          <ChipsField v-model="model.tags" label="Tags" />
          <RepeatableField v-model="model.contributors" label="Contributors" :columns="contributorColumns" :paste-parser="parseAuthors" />
          <MediaField v-model="model.image" label="App image" />
          <TextField v-model="model.url" label="App URL" />
          <RelationList label="Linked datasets" :items="model.datasets" />
          <RelationList label="Linked articles" :items="model.articles" />
        </div>
      </UCard>
    </div>

    <ul v-if="errors.length" class="text-sm text-error list-disc pl-5" role="alert">
      <li v-for="(e, i) in errors" :key="i">{{ e.field }}: {{ e.message }}</li>
    </ul>

    <div class="flex items-center gap-3">
      <UButton type="submit" :loading="saving" label="Save draft" />
      <UButton
        v-if="mode === 'edit' && model.documentId"
        variant="ghost" color="neutral" icon="i-lucide-eye" label="Preview as published"
        :to="`/preview/app/${model.documentId}`" :target="`studio-preview-${model.documentId}`"
      />
      <UButton v-else variant="ghost" color="neutral" icon="i-lucide-eye" label="Preview as published" disabled title="Save the draft first to preview" />
    </div>
  </UForm>
</template>
