<!-- app/components/forms/DatasetForm.vue -->
<!--
  DatasetForm: same save-gate + thin pattern, with Dataset fields. timeperiod is a small inline
  object editor (yeartype select + yearmin/yearmax); notes is a string[] edited via a per-line
  textarea (parseNotes). validateDataset requires title+slug+date and checks unit/timeperiod.yeartype
  against the option lists. Relations (apps/articles) render READ-ONLY (relation WRITE deferred).
-->
<script setup lang="ts">
import { reactive, ref, computed } from '#imports'
import type { Dataset } from '~/types/content'
import { blankDataset } from '~/lib/forms/blank-models'
import { submitForm, prepareForCreate, type SubmitResult } from '~/lib/forms/submit'
import { validateDataset } from '~/lib/validators/dataset'
import type { FieldError } from '~/lib/validators/article'
import { CATEGORY_OPTIONS, UNIT_OPTIONS, TIMEPERIOD_TYPE_OPTIONS } from '~/lib/field-options'
import { parseSources, parseVariables, parseNotes, formatNotes } from '~/lib/text-import'
import { useDraftGuard } from '~/composables/useDraftGuard'

const props = defineProps<{ mode: 'create' | 'edit'; initial?: Dataset }>()
const repo = useDatasets()
const toast = useToast()

const model = reactive<Dataset>(props.initial ? { ...props.initial } : blankDataset())
// The unsaved-work guard (spec §5.3-4, same pattern as ArticleForm): dirty tracking, leave
// warnings, 30s snapshots, and the restore banner below — all keyed to this form's model.
// create mode has no documentId yet, so its snapshot keys under 'new'.
const draftGuard = useDraftGuard({
  type: 'dataset',
  documentId: props.mode === 'edit' ? (props.initial?.documentId ?? null) : null,
  model,
})
const errors = ref<FieldError[]>([])
const saving = ref(false)

const sourceColumns = [
  { key: 'title', label: 'Title' },
  { key: 'url', label: 'URL' },
]
const variableColumns = [
  { key: 'name', label: 'Name' },
  { key: 'type', label: 'Type' },
  { key: 'definition', label: 'Definition' },
  { key: 'values', label: 'Values' },
]

// notes: string[] <-> textarea text (one per line).
const notesText = computed({
  get: () => formatNotes(model.notes),
  set: (t: string) => { model.notes = parseNotes(t) },
})

// timeperiod: local flat strings for the inline editor; sync back to model on each change.
const tpYeartype = computed({
  get: () => model.timeperiod?.yeartype ?? '',
  set: (v: string) => { model.timeperiod = v ? { yeartype: v, yearmin: tpYearmin.value, yearmax: tpYearmax.value } : null },
})
const tpYearmin = computed({
  get: () => String(model.timeperiod?.yearmin ?? ''),
  set: (v: string) => { if (model.timeperiod) model.timeperiod = { ...model.timeperiod, yearmin: v } },
})
const tpYearmax = computed({
  get: () => String(model.timeperiod?.yearmax ?? ''),
  set: (v: string) => { if (model.timeperiod) model.timeperiod = { ...model.timeperiod, yearmax: v } },
})

function setField<K extends keyof Dataset>(key: K, value: Dataset[K]) { model[key] = value }

async function submit() {
  saving.value = true
  errors.value = []
  try {
    const toSave: Dataset = props.mode === 'create' ? (prepareForCreate(model) as Dataset) : { ...model }
    const persist = props.mode === 'create'
      ? (m: Dataset) => repo.create(m)
      : (m: Dataset) => repo.update(m.documentId, m)
    const res: SubmitResult<Dataset> = await submitForm(toSave, validateDataset, persist)
    if (!res.ok) { errors.value = res.errors; return }
    draftGuard.markSaved() // clear-on-save invariant: a surviving snapshot always means unsaved work
    toast.add({ title: 'Draft saved', color: 'success' })
    // Tab-only preview (user decision 2026-07-05): save just saves. A first-time create moves
    // to the entry's edit route (it now exists); preview is the Preview link's own named tab.
    if (props.mode === 'create') {
      await navigateTo(`/edit/dataset/${res.saved!.documentId}`)
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
    <DraftRestoreBanner
      v-if="draftGuard.restoreAvailable.value"
      :saved-at="draftGuard.snapshotSavedAt.value ?? ''"
      @restore="draftGuard.restore()"
      @discard="draftGuard.discard()"
    />
    <div class="flex justify-end">
      <!-- Tab-only preview: the standalone review page in a per-document named tab. -->
      <UButton
        v-if="mode === 'edit' && model.documentId"
        variant="outline" icon="i-lucide-eye" label="Preview as published"
        :to="`/preview/dataset/${model.documentId}`" :target="`studio-preview-${model.documentId}`" rel="opener"
      />
      <UButton v-else variant="outline" icon="i-lucide-eye" label="Preview as published" disabled title="Save the draft first to preview" />
    </div>

    <TextField v-model="model.title" label="Title" />

    <div class="grid gap-6 lg:grid-cols-3 items-start">
      <!-- Writing column -->
      <div class="lg:col-span-2 space-y-5">
        <TextField v-model="model.description" label="Description" />
        <RepeatableField v-model="model.variables" label="Variables" :columns="variableColumns" :paste-parser="parseVariables" />
        <RepeatableField v-model="model.sources" label="Sources" :columns="sourceColumns" :paste-parser="parseSources" />
        <UFormField label="Notes (one per line)">
          <UTextarea v-model="notesText" :rows="3" class="w-full" />
        </UFormField>
      </div>

      <!-- Details sidebar -->
      <UCard class="lg:col-span-1">
        <template #header><h3 class="font-medium text-highlighted">Details</h3></template>
        <div class="space-y-5">
          <DateField v-model="model.date" label="Date" />
          <ChipsField v-model="model.categories" label="Categories" :options="CATEGORY_OPTIONS" />
          <ChipsField v-model="model.tags" label="Tags" />
          <SelectField v-model="model.unit" label="Unit" :options="UNIT_OPTIONS" />
          <UFormField label="Time period">
            <div class="flex gap-2">
              <USelect v-model="tpYeartype" :items="(TIMEPERIOD_TYPE_OPTIONS as readonly string[]).map((o) => ({ label: o, value: o }))" placeholder="Type" />
              <UInput v-model="tpYearmin" placeholder="From (yyyy)" />
              <UInput v-model="tpYearmax" placeholder="To (yyyy)" />
            </div>
          </UFormField>
          <UFormField label="Project dataset">
            <USwitch v-model="model.project" />
          </UFormField>
          <MediaField v-model="model.datafile" label="Data file" kind="file" />
          <RelationList label="Linked apps" :items="model.apps" />
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
        :to="`/preview/dataset/${model.documentId}`" :target="`studio-preview-${model.documentId}`" rel="opener"
      />
      <UButton v-else variant="ghost" color="neutral" icon="i-lucide-eye" label="Preview as published" disabled title="Save the draft first to preview" />
    </div>
  </UForm>
</template>
