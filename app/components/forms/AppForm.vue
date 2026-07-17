<!-- app/components/forms/AppForm.vue -->
<!--
  AppForm: same save-gate + thin-component pattern as ArticleForm, with App fields. validateApp
  requires only title+slug (no date) — the date field is offered but not required. Relations
  (datasets/articles) render READ-ONLY (relation WRITE deferred). Also carries the save-time
  edit-conflict check (design §1-2) — copied from ArticleForm, the reference integration; see
  that component's comments for the full race-safety rationale.
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
import { useDraftGuard } from '~/composables/useDraftGuard'
import { hasConflict } from '~/lib/edit-conflict'

const props = defineProps<{ mode: 'create' | 'edit'; initial?: App }>()
const repo = useApps()
const toast = useToast()

const model = reactive<App>(props.initial ? { ...props.initial } : blankApp())
// The unsaved-work guard (spec §5.3-4, same pattern as ArticleForm): dirty tracking, leave
// warnings, 30s snapshots, and the restore banner below — all keyed to this form's model.
// create mode has no documentId yet, so its snapshot keys under 'new'.
const draftGuard = useDraftGuard({
  type: 'app',
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

// Auto-save on major (media) changes — edit pages only (user decision 2026-07-17; ArticleForm
// is the reference integration, see its comment): the App image's identity drives it. save()
// is submit() itself, so validation/conflict-check/"Draft saved" toast all apply the same.
const autoSave = useMediaAutoSave({
  enabled: props.mode === 'edit',
  signature: () => JSON.stringify([model.image?.id ?? null]),
  dirty: () => draftGuard.dirty.value,
  busy: () => saving.value,
  save: () => submit(),
})

// contributors share the {title,description} row shape (parseAuthors fits).
const contributorColumns = [
  { key: 'title', label: 'Name' },
  { key: 'description', label: 'Description' },
]

function setField<K extends keyof App>(key: K, value: App[K]) { model[key] = value }

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
    const toSave: App = props.mode === 'create' ? (prepareForCreate(model) as App) : { ...model }
    const persist = props.mode === 'create'
      ? (m: App) => repo.create(m)
      : (m: App) => repo.update(m.documentId, m)
    const res: SubmitResult<App> = await submitForm(toSave, validateApp, persist)
    if (!res.ok) { errors.value = res.errors; return }
    // Refresh BOTH the remembered stamp (loadedUpdatedAt) AND model.updatedAt itself
    // (final-review fix round 2, re-review non-blocking edge — see ArticleForm's comment for
    // the full rationale: without the latter, a snapshot taken after this save would embed the
    // PRE-save stamp, and a later Restore would reseed loadedUpdatedAt down to it, falsely
    // flagging the author's own earlier save as a conflict). Both refreshes run BEFORE
    // markSaved() on purpose — it captures its dirty-tracking baseline from
    // JSON.stringify(model), so mutating model.updatedAt after that call would spuriously
    // re-arm dirty tracking on a save that just succeeded.
    model.updatedAt = res.saved?.updatedAt ?? model.updatedAt
    loadedUpdatedAt.value = res.saved?.updatedAt ?? loadedUpdatedAt.value
    draftGuard.markSaved() // clear-on-save invariant: a surviving snapshot always means unsaved work
    toast.add({ title: 'Draft saved', color: 'success' })
    // Tab-only preview (user decision 2026-07-05): save just saves. A first-time create moves
    // to the entry's edit route (it now exists); preview is the Preview link's own named tab.
    if (props.mode === 'create') {
      await navigateTo(`/edit/app/${res.saved!.documentId}`)
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
  autoSave.pause() // their version replacing the model must not auto-persist (see ArticleForm)
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
    autoSave.resume()
    saving.value = false
  }
}

/** External hook (final-review Fix round 1, Finding 2): unlike ArticleForm, App's PublishButton
 *  lives on the edit PAGE, not this form's own toolbar (see app/pages/edit/[type]/
 *  [documentId].vue) — the page relays the fresh entity in via this exposed method after a
 *  successful publish/unpublish, so loadedUpdatedAt tracks the updatedAt bump publish/unpublish
 *  makes server-side (both live Strapi and the demo repo). Without it the VERY NEXT save falsely
 *  reports "changed by someone else" against the author's own publish. Mirrors ArticleForm's own
 *  onPublished (also syncs model.publishedAt for consistency, though nothing in THIS form's
 *  template reads it — App's Publish control isn't in-toolbar here). */
function onPublished(entity: App) {
  model.publishedAt = entity.publishedAt
  loadedUpdatedAt.value = entity.updatedAt ?? loadedUpdatedAt.value
}

/** Restore the draft-backup snapshot: same mid-flight guard as ArticleForm's onRestore()
 *  (final-review Fix round 1, Critical) — loadTheirs() can mount DraftRestoreBanner mid-flight (its
 *  snapshotNow() flips restoreAvailable before its own findOne() await settles), so without
 *  this guard an impatient click here would clear the very snapshot snapshotNow() just wrote.
 *  Also reseeds loadedUpdatedAt to the RESTORED snapshot's own embedded stamp (Finding 4→2) —
 *  see ArticleForm's onRestore()/useDraftGuard.restore() comments for the full rationale. */
function onRestore() {
  if (saving.value) return
  // Pause the media auto-save across the model replacement — restored content deliberately
  // stays DIRTY for the author to review and save (see ArticleForm's onRestore comment).
  autoSave.pause()
  const restored = draftGuard.restore()
  autoSave.resume()
  if (restored) loadedUpdatedAt.value = restored.updatedAt ?? loadedUpdatedAt.value
}

/** Discard the draft-backup snapshot: same mid-flight guard as onRestore() above. */
function onDiscard() {
  if (saving.value) return
  draftGuard.discard()
}

defineExpose({ submit, setField, onPublished, errors, model, loadedUpdatedAt, draftGuard, saveAnyway })
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
    <!-- :busy="saving" (final-review Fix round 1): mirrors ConflictBanner above — see DraftRestoreBanner's
         and onRestore()'s comments for the mid-flight race this closes. -->
    <DraftRestoreBanner
      v-if="draftGuard.restoreAvailable.value"
      :saved-at="draftGuard.snapshotSavedAt.value ?? ''"
      :busy="saving"
      @restore="onRestore"
      @discard="onDiscard"
    />
    <div class="flex justify-end">
      <!-- Tab-only preview: the standalone review page in a per-document named tab. -->
      <UButton
        v-if="mode === 'edit' && model.documentId"
        variant="outline" icon="i-lucide-eye" label="Preview as published"
        :to="`/preview/app/${model.documentId}`" :target="`studio-preview-${model.documentId}`" rel="opener"
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
          <MediaField v-model="model.image" label="App image" :auto-saves="mode === 'edit'" />
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
        :to="`/preview/app/${model.documentId}`" :target="`studio-preview-${model.documentId}`" rel="opener"
      />
      <UButton v-else variant="ghost" color="neutral" icon="i-lucide-eye" label="Preview as published" disabled title="Save the draft first to preview" />
    </div>
  </UForm>
</template>
