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

const props = defineProps<{ mode: 'create' | 'edit'; initial?: Dataset }>()
const repo = useDatasets()
const toast = useToast()

const model = reactive<Dataset>(props.initial ? { ...props.initial } : blankDataset())
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
    toast.add({ title: 'Draft saved', color: 'success' })
    await navigateTo(`/preview/dataset/${res.saved!.documentId}`)
  } catch {
    toast.add({ title: 'Save failed', description: 'Please try again.', color: 'error' })
  } finally {
    saving.value = false
  }
}

defineExpose({ submit, setField, errors, model })
</script>

<template>
  <UForm :state="model" class="space-y-5" @submit.prevent="submit">
    <TextField v-model="model.title" label="Title" />
    <DateField v-model="model.date" label="Date" />
    <ChipsField v-model="model.categories" label="Categories" :options="CATEGORY_OPTIONS" />
    <ChipsField v-model="model.tags" label="Tags" />
    <TextField v-model="model.description" label="Description" />
    <SelectField v-model="model.unit" label="Unit" :options="UNIT_OPTIONS" />

    <UFormField label="Time period">
      <div class="flex gap-2">
        <USelect v-model="tpYeartype" :items="(TIMEPERIOD_TYPE_OPTIONS as readonly string[]).map((o) => ({ label: o, value: o }))" placeholder="Type" />
        <UInput v-model="tpYearmin" placeholder="From (yyyy)" />
        <UInput v-model="tpYearmax" placeholder="To (yyyy)" />
      </div>
    </UFormField>

    <RepeatableField v-model="model.sources" label="Sources" :columns="sourceColumns" :paste-parser="parseSources" />
    <RepeatableField v-model="model.variables" label="Variables" :columns="variableColumns" :paste-parser="parseVariables" />

    <UFormField label="Notes (one per line)">
      <UTextarea v-model="notesText" :rows="3" class="w-full" />
    </UFormField>

    <UFormField label="Project dataset">
      <USwitch v-model="model.project" />
    </UFormField>

    <MediaField v-model="model.datafile" label="Data file" />

    <RelationList label="Linked apps" :items="model.apps" />
    <RelationList label="Linked articles" :items="model.articles" />

    <ul v-if="errors.length" class="text-sm text-error list-disc pl-5" role="alert">
      <li v-for="(e, i) in errors" :key="i">{{ e.field }}: {{ e.message }}</li>
    </ul>

    <UButton type="submit" :loading="saving" label="Save draft" />
  </UForm>
</template>
