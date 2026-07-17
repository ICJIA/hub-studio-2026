<!-- app/components/forms/DatasetForm.vue -->
<!--
  DatasetForm: same save-gate + thin pattern, with Dataset fields. timeperiod is a small inline
  object editor (yeartype select + yearmin/yearmax); notes is a string[] edited via a per-line
  textarea (parseNotes). validateDataset requires title+slug+date and checks unit/timeperiod.yeartype
  against the option lists. Relations (apps/articles) render READ-ONLY (relation WRITE deferred).
  Also carries the save-time edit-conflict check (design §1-2) — copied from ArticleForm, the
  reference integration; see that component's comments for the full race-safety rationale.
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
import { hasConflict } from '~/lib/edit-conflict'

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

// Edit-conflict save-time check (design §1-2; ArticleForm is the reference integration this
// copies — see its comments for the full rationale, including Fix round 1's race-condition
// hardening). loadedUpdatedAt remembers the server `updatedAt` this form's edits are based on,
// refreshed after every successful save so consecutive saves by the SAME author never
// self-conflict. conflictTheirAt holds the OTHER save's stamp while ConflictBanner is up (null
// otherwise — that's what gates the banner). bypassConflictOnce is a one-shot escape hatch for
// Save-anyway: it never drives the template, so a plain (non-reactive) closure variable is
// enough — cleared after every save attempt in submit()'s finally.
const loadedUpdatedAt = ref<string | null>(props.initial?.updatedAt ?? null)
const conflictTheirAt = ref<string | null>(null)
let bypassConflictOnce = false

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
  // Re-entrancy guard for the WHOLE flow (ArticleForm Fix round 1 — see its comment for the
  // race this closes): covers the primary Save button, Save-anyway, and any future caller, so
  // an in-flight loadTheirs() can never be raced by a second save attempt. Placed BEFORE
  // `saving.value = true` and outside the try/finally on purpose: a pure no-op bail-out that
  // must never touch `saving` or `bypassConflictOnce`.
  if (saving.value) return
  saving.value = true
  errors.value = []
  try {
    // EDIT mode only (create has no prior server state to conflict with) — skipped when the
    // one-shot bypass is armed (Save-anyway).
    if (props.mode === 'edit' && !bypassConflictOnce) {
      const serverAt = await repo.getUpdatedAt(model.documentId)
      if (hasConflict(loadedUpdatedAt.value, serverAt)) {
        conflictTheirAt.value = serverAt
        return // abort: no validate, no persist — the author chooses Save-anyway or Load-theirs
      }
    }
    const toSave: Dataset = props.mode === 'create' ? (prepareForCreate(model) as Dataset) : { ...model }
    const persist = props.mode === 'create'
      ? (m: Dataset) => repo.create(m)
      : (m: Dataset) => repo.update(m.documentId, m)
    const res: SubmitResult<Dataset> = await submitForm(toSave, validateDataset, persist)
    if (!res.ok) { errors.value = res.errors; return }
    draftGuard.markSaved() // clear-on-save invariant: a surviving snapshot always means unsaved work
    loadedUpdatedAt.value = res.saved?.updatedAt ?? loadedUpdatedAt.value
    toast.add({ title: 'Draft saved', color: 'success' })
    // Tab-only preview (user decision 2026-07-05): save just saves. A first-time create moves
    // to the entry's edit route (it now exists); preview is the Preview link's own named tab.
    if (props.mode === 'create') {
      await navigateTo(`/edit/dataset/${res.saved!.documentId}`)
    }
  } catch {
    toast.add({ title: 'Save failed', description: 'Please try again.', color: 'error' })
  } finally {
    bypassConflictOnce = false // one-shot: cleared after every attempt, whether it won or lost
    saving.value = false
  }
}

/** Save anyway: arm the one-shot bypass and re-invoke submit(). Guarded by the same `if
 *  (saving.value) return` check submit() makes internally — added here TOO (ArticleForm Fix
 *  round 1), because without it a click here would still mutate bypassConflictOnce/conflictTheirAt
 *  before submit()'s own guard bailed out, corrupting state out from under whichever operation IS
 *  actually in flight (e.g. loadTheirs()). */
function saveAnyway() {
  if (saving.value) return
  bypassConflictOnce = true
  conflictTheirAt.value = null
  void submit()
}

/** Load their version: snapshot the author's current edits FIRST — so they aren't lost — then
 *  replace the model wholesale with the freshly-fetched draft (same `findOne(id, { status:
 *  'draft' })` call the edit page uses) and re-base the guard's dirty baseline against it
 *  WITHOUT clearing the snapshot just written (resetBaseline, not markSaved — see
 *  useDraftGuard's doc comment for why markSaved would be wrong here). This banner intentionally
 *  stays rendered (conflictTheirAt untouched) across the await below — see ArticleForm's
 *  loadTheirs comment for the full race-safety rationale (the `saving` guard above, plus
 *  ConflictBanner's `busy` prop wired below, are what make that safe). */
async function loadTheirs() {
  if (saving.value) return
  saving.value = true
  try {
    draftGuard.snapshotNow()
    const fresh = await repo.findOne(model.documentId, { status: 'draft' })
    Object.assign(model, fresh)
    loadedUpdatedAt.value = fresh.updatedAt ?? null
    draftGuard.resetBaseline()
    conflictTheirAt.value = null
  } catch {
    toast.add({ title: 'Could not load their version', description: 'Please try again.', color: 'error' })
  } finally {
    saving.value = false
  }
}

defineExpose({ submit, setField, errors, model, loadedUpdatedAt, draftGuard, saveAnyway })
</script>

<template>
  <UForm :state="model" class="space-y-6" @submit.prevent="submit">
    <!-- ConflictBanner first: mirrors ArticleForm's ordering (the two CAN render together — see
         its comment). :busy="saving" reflects the same busy state across submit()/saveAnyway()/
         loadTheirs() — see ArticleForm's and ConflictBanner's comments for the race this closes. -->
    <ConflictBanner
      v-if="conflictTheirAt"
      :their-saved-at="conflictTheirAt ?? ''"
      :busy="saving"
      @save-anyway="saveAnyway"
      @load-theirs="loadTheirs"
    />
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
