<!-- app/components/fields/MediaField.vue -->
<!--
  MediaField: wraps MediaPicker (alt-required, zero-base64) for a SINGLE media relation
  (splash/thumbnail/image/mainfile/extrafile/datafile). Holds the whole MediaRef in model
  state and emits it on select; the data-layer mapper extracts the numeric id (mediaIdForWrite)
  on save. Preview renders from the MediaRef url — NEVER a data: URI.

  kind="image" (default): shows alt/caption fields, requires alt before upload.
  When a MediaRef IS already selected for kind="image", the selected state renders:
    - thumbnail + Replace/Remove actions (as before)
    - editable Alt text (required, flagged if empty) and Caption (optional) fields,
      pre-filled from the MediaRef; editing them emits an updated MediaRef via v-model.
  kind="file": hides alt/caption, uses document upload path (PDF/office docs), shows file name only.

  Persist-on-blur contract: blurring either selected-state input calls persistInfo(), which
  writes alt/caption to the media record via useMediaLibrary().updateInfo (updateFileInfo on
  the Strapi adapter). It skips id 0 (dev sample refs), an empty alt (the required-field error
  owns that state), and no-op edits (compared against the last-persisted baseline for the
  current id, reseeded on every id change). On failure the local (unsaved) value is left in
  place and the baseline is restored so a later blur retries; see persistInfo()'s own doc
  comment for the optimistic-baseline + sequence/id-guard mechanics that keep concurrent,
  replaced-image, and same-id-overlapping-edit write-backs from duplicating or clobbering
  each other.
-->
<script setup lang="ts">
import { ref, computed, watch } from '#imports'
import type { MediaRef } from '~/types/content'

// autoSaves: the parent form saves the draft by itself after this field changes (edit pages —
// see useMediaAutoSave). Only the selection toast's guidance line reads it: instructing a
// manual save there would be wrong, and vice versa on create pages, which stay manual.
const props = defineProps<{ modelValue: MediaRef | null; label: string; kind?: 'image' | 'file'; autoSaves?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: MediaRef | null] }>()

const kind = computed(() => props.kind ?? 'image')
const isImage = computed(() => kind.value === 'image')

// Whether the picker panel is currently open (for replace flow).
const pickerOpen = ref(false)
// Whether the author has interacted with alt (for the "required" flag on the selected state).
const altTouched = ref(false)

const current = computed(() => props.modelValue)

// Derived alt/caption error (only when image is selected and alt is empty after touch).
const altError = computed(() =>
  isImage.value && current.value && altTouched.value && !current.value.alternativeText?.trim()
    ? 'Alt text is required'
    : undefined,
)

const { updateInfo } = useMediaLibrary()
const toast = useToast()

// Last-persisted alt/caption for the CURRENT media id — persistInfo only fires on a real change.
const persistError = ref<string | null>(null)
const persistedAlt = ref('')
const persistedCaption = ref('')
watch(
  () => current.value?.id,
  () => {
    persistError.value = null
    persistedAlt.value = current.value?.alternativeText ?? ''
    persistedCaption.value = current.value?.caption ?? ''
  },
  { immediate: true },
)

// Monotonic per-call sequence guard: each persistInfo() call that actually proceeds (past the
// no-op check) claims the next sequence number. A response (success or failure) only touches
// state if its sequence is still the CURRENT one when it settles — this catches the case the
// id guard alone can't: two overlapping calls on the SAME id resolving out of order, where the
// older call's late response would otherwise pass the id check and clobber the newer call's
// already-applied baseline. Mirrors the request-generation guard in MediaLibraryGrid.vue's load().
let persistSeq = 0

/**
 * Persist alt/caption edits to the media record on commit (blur). Skips display-only refs
 * (id 0 — dev sample content), empty alt (the required-field error owns that state), and
 * no-op edits. Demo/session refs (negative ids) persist through the demo adapter in-memory.
 * On failure the local value is kept so the author can retry.
 *
 * Optimistic baseline + sequence/id guard (kills stale-baseline races around the await):
 *  - The outgoing values are adopted as the baseline BEFORE the await settles, so a second
 *    blur that fires while this call is still in flight (e.g. tab from alt straight to
 *    caption) compares against the value already in flight and no-ops instead of firing a
 *    duplicate call.
 *  - The response (success) and the restore (failure) are only applied if this call is still
 *    both the latest one fired (`seq === persistSeq`) AND still for the current media id. The
 *    id half covers a late response after Replace; the sequence half covers a late response
 *    from an OLDER overlapping call on the SAME id (e.g. two edits blurred in quick succession
 *    where the second call's response lands first) — a stale call does nothing at all: no
 *    baseline write, no error paint over a since-succeeded edit.
 */
async function persistInfo() {
  const mediaRef = current.value
  if (!mediaRef || !isImage.value || mediaRef.id === 0) return
  const altValue = (mediaRef.alternativeText ?? '').trim()
  const captionValue = (mediaRef.caption ?? '').trim()
  if (!altValue) return
  if (altValue === persistedAlt.value.trim() && captionValue === persistedCaption.value.trim()) return
  const calledId = mediaRef.id
  const seq = ++persistSeq
  const previousAlt = persistedAlt.value
  const previousCaption = persistedCaption.value
  persistedAlt.value = altValue
  persistedCaption.value = captionValue
  persistError.value = null
  try {
    const updated = await updateInfo(mediaRef.id, { alternativeText: altValue, caption: captionValue })
    if (seq === persistSeq && current.value?.id === calledId) {
      persistedAlt.value = updated.alternativeText ?? ''
      persistedCaption.value = updated.caption ?? ''
    }
  } catch {
    if (seq === persistSeq && current.value?.id === calledId) {
      persistedAlt.value = previousAlt
      persistedCaption.value = previousCaption
      persistError.value = 'Could not save the image details to the library. Retry by editing the field again.'
    }
  }
}

function onSelect(mediaRef: MediaRef) {
  emit('update:modelValue', mediaRef)
  pickerOpen.value = false
  altTouched.value = false
  // Manager-visible confirmation the pick landed (the picker collapsing alone is easy to miss).
  // Guidance line matches who saves: edit pages auto-save on media changes (the parent sets
  // autoSaves and its own "Draft saved" toast follows), create pages still need the manual save.
  toast.add({
    title: `${props.label} selected`,
    description: props.autoSaves
      ? `${mediaRef.name ?? 'File'} — the draft saves automatically; the Live preview will show it.`
      : `${mediaRef.name ?? 'File'} — save the draft to update the Live preview.`,
    color: 'success',
  })
}
function clear() {
  emit('update:modelValue', null)
  pickerOpen.value = false
  altTouched.value = false
}
function openPicker() {
  pickerOpen.value = true
}

/** Emit an updated MediaRef when alt or caption is edited in the selected state. */
function updateAlt(value: string) {
  if (!current.value) return
  altTouched.value = true
  emit('update:modelValue', { ...current.value, alternativeText: value })
}
function updateCaption(value: string) {
  if (!current.value) return
  emit('update:modelValue', { ...current.value, caption: value || null })
}

defineExpose({ clear, __persistInfo: persistInfo, __persistError: persistError })
</script>

<template>
  <UFormField :label="label">
    <!-- Selected state: show when a MediaRef is set AND picker is not being used to replace. -->
    <div v-if="current && !pickerOpen">
      <div class="flex items-center gap-3 mb-2">
        <!-- Thumbnail for images; just the file icon for files. -->
        <img
          v-if="isImage"
          :src="current.url"
          :alt="current.alternativeText ?? ''"
          width="96"
          class="rounded border border-default object-cover"
        >
        <div class="min-w-0 flex-1 text-sm">
          <p class="truncate font-medium" :title="current.name ?? current.url">
            {{ current.name ?? current.url }}
          </p>
          <div class="flex gap-2 mt-1">
            <UButton size="xs" variant="outline" icon="i-lucide-refresh-cw" @click="openPicker">
              Replace
            </UButton>
            <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-x" @click="clear">
              Remove
            </UButton>
          </div>
        </div>
      </div>

      <!-- Editable alt text + caption for selected images (kind="image" only). -->
      <template v-if="isImage">
        <UFormField label="Alt text (required)" :error="altError" class="mt-3">
          <UInput
            :model-value="current.alternativeText ?? ''"
            placeholder="Describe the image for screen readers"
            data-test="selected-alt"
            class="w-full"
            @update:model-value="updateAlt($event as string)"
            @blur="persistInfo"
          />
        </UFormField>
        <UFormField label="Caption (optional)" class="mt-3">
          <UInput
            :model-value="current.caption ?? ''"
            placeholder="Optional caption shown beneath the image"
            data-test="selected-caption"
            class="w-full"
            @update:model-value="updateCaption($event as string)"
            @blur="persistInfo"
          />
        </UFormField>
        <p v-if="persistError" role="alert" class="mt-2 text-sm text-error" data-test="persist-error">
          {{ persistError }}
        </p>
      </template>
    </div>

    <!-- Picker: shown when nothing is selected yet, or when replacing. -->
    <div v-if="!current || pickerOpen">
      <MediaPicker :kind="kind" @select="onSelect" />
    </div>
  </UFormField>
</template>
