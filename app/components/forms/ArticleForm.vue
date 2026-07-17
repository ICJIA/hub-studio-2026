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
import { useDraftGuard } from '~/composables/useDraftGuard'
import { hasConflict } from '~/lib/edit-conflict'

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
// The unsaved-work guard (spec §5.3-4, reference integration): dirty tracking, leave warnings,
// 30s snapshots, and the restore banner below — all keyed to this form's model. create mode has
// no documentId yet, so its snapshot keys under 'new'.
const draftGuard = useDraftGuard({
  type: 'article',
  documentId: props.mode === 'edit' ? (props.initial?.documentId ?? null) : null,
  model,
})
const errors = ref<FieldError[]>([])
const saving = ref(false)

// Edit-conflict save-time check (design §1-2; this form is the reference integration Task 4
// copies for App/Dataset). loadedUpdatedAt remembers the server `updatedAt` this form's edits
// are based on, refreshed after every successful save so consecutive saves by the SAME author
// never self-conflict. conflictTheirAt holds the OTHER save's stamp while ConflictBanner is up
// (null otherwise — that's what gates the banner). bypassConflictOnce is a one-shot escape hatch
// for Save-anyway: it never drives the template, so a plain (non-reactive) closure variable is
// enough — cleared after every save attempt in submit()'s finally, so a bypass can never silently
// outlive the single attempt it was granted for.
const loadedUpdatedAt = ref<string | null>(props.initial?.updatedAt ?? null)
const conflictTheirAt = ref<string | null>(null)
let bypassConflictOnce = false

// Auto-save on major (media) changes — edit pages only (user decision 2026-07-17): picking/
// replacing/removing the splash or a main file, and inserting a body figure, save the draft by
// themselves so the select → saved → Live-preview chain never depends on the manual Save click.
// The signature is media IDENTITY (ids), so alt/caption typing and body-text edits never fire
// it. mainfiles filters display-only id-0 refs (MainFilesField's demo mount-time sample-PDF
// seed) so a demo edit page can't auto-save just by opening; the splash's own id 0 stays IN —
// clearing a demo splash to null IS a real, previewable change. save() is submit() itself:
// validation, the conflict check, the "Draft saved" toast, and markSaved() all apply the same.
const autoSave = useMediaAutoSave({
  enabled: props.mode === 'edit',
  signature: () => JSON.stringify([
    model.splash?.id ?? null,
    (model.mainfiles ?? []).filter((f) => f && f.id !== 0).map((f) => f.id),
  ]),
  dirty: () => draftGuard.dirty.value,
  busy: () => saving.value,
  save: () => submit(),
})

// Ref to the body MarkdownField so the sidebar BodyImagesField can insert figures at the cursor.
// insertMarkdown returns the 1-based line the insert began on; cursorLine is the live cursor
// position (both forwarded from the CodeMirror editor) — they power the sidebar's "lands at
// line N" awareness for authors who don't yet know the cursor decides the insertion point.
const bodyField = ref<{ insertMarkdown: (text: string) => number | null; cursorLine: number } | null>(null)

/** Sidebar tray → body editor: place the figure at the cursor and SAY where it landed. The
 *  insert changes the body markdown (not any media id), so the auto-save is requested
 *  explicitly here — a figure landing in the body is exactly as previewable as a splash swap. */
function onInsertFigure(markdown: string) {
  const line = bodyField.value?.insertMarkdown(markdown) ?? null
  toast.add({
    title: line ? `Image inserted at line ${line}` : 'Image inserted',
    description: props.mode === 'edit'
      ? 'The draft saves automatically — the Live preview will show it.'
      : 'Save the draft to update the Live preview.',
    color: 'success',
  })
  autoSave.request()
}

/** Live-preview click while the form has unsaved changes: the preview page renders the last
 *  SAVED draft (demo and live alike), so say so — otherwise a manager who picks a splash and
 *  immediately clicks Live preview reads the stale preview as "my change didn't take". The
 *  navigation itself proceeds untouched (this never blocks the link). */
function onPreviewClick() {
  if (!draftGuard.dirty.value) return
  toast.add({
    title: 'Preview shows the last saved draft',
    description: 'Save the draft to include your newest changes, then preview again.',
    color: 'warning',
  })
}

const authorColumns = [
  { key: 'title', label: 'Name' },
  { key: 'description', label: 'Description' },
]

// Test/parent hook to set a field without going through the DOM.
function setField<K extends keyof Article>(key: K, value: Article[K]) { model[key] = value }

async function submit() {
  // Fix round 1 (Critical, reviewer-found): re-entrancy guard for the WHOLE flow, covering every
  // entry point — the primary Save button, Save-anyway, and any future caller. The gap this
  // closes: ConflictBanner deliberately stays MOUNTED across loadTheirs()'s own await (see its
  // comment below), and — before this fix — nothing here or in saveAnyway() ever READ `saving`,
  // only wrote it. So while loadTheirs() had `saving` true and its findOne() in flight, an
  // impatient Save-anyway click sailed straight through: it persisted the STALE, pre-replace
  // model (bypassing the conflict check entirely, since Save-anyway's whole point is to bypass
  // it), and if that persist won the race, its success path called markSaved() — clearing the
  // very snapshot snapshotNow() had just written to protect the author's edits. Silent overwrite
  // of a colleague's save, backup destroyed in the same stroke: exactly what this feature exists
  // to prevent. Placed BEFORE `saving.value = true` and outside the try/finally on purpose: a
  // pure no-op bail-out that must never touch `saving` or `bypassConflictOnce` — whatever
  // operation is ALREADY in flight owns that state, not this blocked call.
  if (saving.value) return
  saving.value = true
  errors.value = []
  try {
    // EDIT mode only (create has no prior server state to conflict with) — skipped when the
    // one-shot bypass is armed (Save-anyway). This await is the async gap a stale-settlement bug
    // could hide in: `saving` is true from the line above, and the submit button's
    // `:loading="saving"` binding disables it (UButton ties disabled to loading) for the whole
    // round trip — so a second PRIMARY-button submit() can't start mid-check. (ConflictBanner's
    // OWN buttons needed the separate fixes above and on ConflictBanner's `busy` prop — a
    // disabled PRIMARY button was never the whole story.) Edits the author types while this
    // await is pending are safe too, by construction: `model` isn't snapshotted into `toSave`
    // until AFTER this block, so a slow check can never cause a stale, pre-edit save.
    if (props.mode === 'edit' && !bypassConflictOnce) {
      const serverAt = await repo.getUpdatedAt(model.documentId)
      if (hasConflict(loadedUpdatedAt.value, serverAt)) {
        conflictTheirAt.value = serverAt
        return // abort: no validate, no persist — the author chooses Save-anyway or Load-theirs
      }
    }
    const toSave: Article = props.mode === 'create' ? (prepareForCreate(model) as Article) : { ...model }
    const persist = props.mode === 'create'
      ? (m: Article) => repo.create(m)
      : (m: Article) => repo.update(m.documentId, m)
    const res: SubmitResult<Article> = await submitForm(toSave, validateArticle, persist)
    if (!res.ok) { errors.value = res.errors; return }
    // Refresh BOTH the remembered stamp (loadedUpdatedAt — the save-time conflict check's own
    // baseline) AND model.updatedAt itself (final-review fix round 2, re-review non-blocking
    // edge): without the latter, a snapshot taken AFTER this save (interval or snapshotNow)
    // would embed the PRE-save stamp still sitting in model.updatedAt, and a later Restore
    // would reseed loadedUpdatedAt DOWN to that stale value (see onRestore()'s Finding-4→2
    // reseed) — falsely flagging the author's own earlier save as a conflict on the next save.
    // Both refreshes run BEFORE markSaved() on purpose: markSaved() captures its dirty-tracking
    // baseline from `JSON.stringify(model)`, so mutating model.updatedAt AFTER that call would
    // spuriously re-arm dirty tracking on a save that just succeeded.
    model.updatedAt = res.saved?.updatedAt ?? model.updatedAt
    loadedUpdatedAt.value = res.saved?.updatedAt ?? loadedUpdatedAt.value
    draftGuard.markSaved() // clear-on-save invariant: a surviving snapshot always means unsaved work
    toast.add({ title: 'Draft saved', color: 'success' })
    // Tab-only preview (user decision 2026-07-05): save just saves. A first-time create moves
    // to the entry's edit route (it now exists); preview is always the Live preview link,
    // which opens the standalone review page in its own named tab.
    if (props.mode === 'create') {
      await navigateTo(`/edit/article/${res.saved!.documentId}`)
    }
  } catch {
    toast.add({ title: 'Save failed', description: 'Please try again.', color: 'error' })
  } finally {
    bypassConflictOnce = false // one-shot: cleared after every attempt, whether it won or lost
    saving.value = false
  }
}

/** Save anyway: arm the one-shot bypass and re-invoke submit(). Guarded by the same `if
 *  (saving.value) return` check submit() now makes internally — added here TOO (Fix round 1),
 *  because without it a click here would still mutate bypassConflictOnce/conflictTheirAt before
 *  submit()'s own guard bailed out, corrupting state out from under whichever operation IS
 *  actually in flight (e.g. loadTheirs()). An earlier version of this comment argued
 *  conflictTheirAt's synchronous clear made this "self-guarding" — true only for a SECOND
 *  Save-anyway click, never for a click arriving while a DIFFERENT flow (loadTheirs) is running;
 *  that gap is exactly what let the stale-model race through. ConflictBanner's `busy` prop
 *  (wired below) is the complementary UI-level defense — real users shouldn't see a clickable
 *  button that would now silently no-op — but this function-level guard is what actually makes
 *  it safe regardless of what the DOM allows. */
function saveAnyway() {
  if (saving.value) return
  bypassConflictOnce = true
  conflictTheirAt.value = null
  void submit()
}

/** Load their version: snapshot the author's current edits FIRST — so they aren't lost — then
 *  replace the model wholesale with the freshly-fetched draft (same `findOne(id, { status:
 *  'draft' })` call the edit page uses, so this is comparing/replacing against the SAME version)
 *  and re-base the guard's dirty baseline against it WITHOUT clearing the snapshot just written
 *  (resetBaseline, not markSaved — see useDraftGuard's doc comment for why markSaved would be
 *  wrong here). Object.assign is sufficient with no prior clear: `fresh` is a full domain object
 *  carrying every Article key, so every key on `model` gets freshly overwritten and nothing can
 *  linger — the same reasoning useDraftGuard.restore() already relies on.
 *
 *  This banner intentionally stays rendered (conflictTheirAt untouched) across the await below —
 *  so a failed fetch can be retried from the same prompt instead of the banner vanishing on a
 *  transient error. Fix round 1: that design choice is exactly what let a stale-model race
 *  through ConflictBanner's OTHER button (Save-anyway) while this await was pending — the guard
 *  is `saving` itself (checked at top, reused across submit()/saveAnyway() too) plus
 *  ConflictBanner's `busy` prop passed below; neither existed when this comment first shipped. */
async function loadTheirs() {
  if (saving.value) return
  saving.value = true
  autoSave.pause() // their version replacing the model must not auto-persist (belt: the busy
  try {           // gate + post-resetBaseline clean state already drop the deferred attempt)
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

/** Toolbar Publish/Unpublish succeeded: reflect the new published state locally (so the toolbar
 *  toggles live), forward to the parent edit page, and (final-review Fix round 1, Finding 2)
 *  refresh loadedUpdatedAt from the response — publish/unpublish bumps the server's updatedAt
 *  (both live Strapi and the demo repo), so without this the VERY NEXT save falsely reports
 *  "changed by someone else" against the author's own publish. */
function onPublished(entity: Article) {
  model.publishedAt = entity.publishedAt
  loadedUpdatedAt.value = entity.updatedAt ?? loadedUpdatedAt.value
  emit('published', entity)
}

/** Restore the draft-backup snapshot: guarded the same way saveAnyway()/loadTheirs() are
 *  (final-review Fix round 1, Critical — mirror of the ConflictBanner/loadTheirs race): loadTheirs()
 *  can mount DraftRestoreBanner mid-flight (its snapshotNow() flips restoreAvailable before its
 *  own findOne() await settles), so without this guard an impatient click here would clear the
 *  very snapshot snapshotNow() just wrote. See DraftRestoreBanner's `busy`-prop comment for the
 *  full race and ArticleForm's loadTheirs()/submit() comments for the sibling races this
 *  mirrors.
 *
 *  Also reseeds loadedUpdatedAt (final-review Fix round 1, Finding 4→2) to the RESTORED
 *  snapshot's own embedded stamp — not left at whatever loadedUpdatedAt already was — so a
 *  subsequent save's conflict check compares against the content the author is ACTUALLY about
 *  to save, which may be far staler than "since this page loaded" (e.g. recovered from
 *  yesterday's crash on a different machine). See useDraftGuard.restore()'s doc comment for the
 *  full rationale; this is what makes ROADMAP's "cross-machine stale-restore risk is mitigated
 *  by edit-conflict detection" claim actually true rather than aspirational. */
function onRestore() {
  if (saving.value) return
  // Restored content is deliberately left DIRTY for the author to review and save — pause the
  // media auto-save across the model replacement so a snapshot's different splash/files can't
  // silently persist the whole restored draft the instant Restore is clicked.
  autoSave.pause()
  const restored = draftGuard.restore()
  autoSave.resume()
  if (restored) loadedUpdatedAt.value = restored.updatedAt ?? loadedUpdatedAt.value
}

/** Discard the draft-backup snapshot: same mid-flight guard as onRestore() above — a stray
 *  Discard click during loadTheirs()'s fetch would otherwise wipe the snapshot snapshotNow()
 *  just wrote, with nothing left to fall back on once the model is replaced. */
function onDiscard() {
  if (saving.value) return
  draftGuard.discard()
}

defineExpose({ submit, setField, onPublished, errors, model, loadedUpdatedAt, draftGuard, saveAnyway })
</script>

<template>
  <UForm :state="model" class="space-y-6" @submit.prevent="submit">
    <!-- ConflictBanner first: the two CAN render together — a pre-existing snapshot makes the
         restore banner visible even before Load-theirs runs, and loadTheirs()'s own snapshotNow()
         call flips it on mid-flight, before conflictTheirAt clears on success. Conflict takes the
         top slot: it's the more urgent, save-blocking decision of the two.
         :busy="saving" (Fix round 1): this banner stays mounted across loadTheirs()'s own await,
         so its buttons must reflect the SAME busy state the primary Save button already does —
         see ConflictBanner's and submit()'s comments for the race this closes. -->
    <ConflictBanner
      v-if="conflictTheirAt"
      :their-saved-at="conflictTheirAt ?? ''"
      :busy="saving"
      @save-anyway="saveAnyway"
      @load-theirs="loadTheirs"
    />
    <!-- :busy="saving" (final-review Fix round 1): this banner can be mounted mid-flight by loadTheirs()'s
         own snapshotNow() call, so its buttons must reflect the same busy state ConflictBanner
         already does — see DraftRestoreBanner's and onRestore()'s comments for the race this
         closes. -->
    <DraftRestoreBanner
      v-if="draftGuard.restoreAvailable.value"
      :saved-at="draftGuard.snapshotSavedAt.value ?? ''"
      :busy="saving"
      @restore="onRestore"
      @discard="onDiscard"
    />
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
          <!-- Tab-only preview (user decision 2026-07-05): opens the standalone review page in
               a NAMED tab — one preview tab per document, reused (and refreshed) on every click. -->
          <UButton
            v-if="mode === 'edit' && model.documentId"
            data-test="live-preview-link"
            size="sm" variant="soft" color="primary" icon="i-lucide-eye" label="Live preview"
            :to="`/preview/article/${model.documentId}`" :target="`studio-preview-${model.documentId}`" rel="opener"
            @click="onPreviewClick"
          />
          <UButton
            v-else
            data-test="live-preview-disabled"
            size="sm" variant="soft" color="primary" icon="i-lucide-eye" label="Live preview"
            disabled title="Save the draft first to preview"
          />
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
          <MediaField v-model="model.splash" label="Splash image" :auto-saves="mode === 'edit'" />
          <BodyImagesField :insert-line="bodyField?.cursorLine ?? null" @insert="onInsertFigure" />
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
      <UButton
        v-if="mode === 'edit' && model.documentId"
        variant="soft" color="primary" icon="i-lucide-eye" label="Preview as published"
        :to="`/preview/article/${model.documentId}`" :target="`studio-preview-${model.documentId}`" rel="opener"
        @click="onPreviewClick"
      />
      <UButton
        v-else
        variant="soft" color="primary" icon="i-lucide-eye" label="Preview as published"
        disabled title="Save the draft first to preview"
      />
    </div>
  </UForm>
</template>
