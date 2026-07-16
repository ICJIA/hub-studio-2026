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
-->
<script setup lang="ts">
import { ref, computed, watch } from '#imports'
import type { MediaRef } from '~/types/content'

const props = defineProps<{ modelValue: MediaRef | null; label: string; kind?: 'image' | 'file' }>()
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

/**
 * Persist alt/caption edits to the media record on commit (blur). Skips display-only refs
 * (id 0 — dev sample content), empty alt (the required-field error owns that state), and
 * no-op edits. Demo/session refs (negative ids) persist through the demo adapter in-memory.
 * On failure the local value is kept so the author can retry.
 */
async function persistInfo() {
  const mediaRef = current.value
  if (!mediaRef || !isImage.value || mediaRef.id === 0) return
  const altValue = (mediaRef.alternativeText ?? '').trim()
  const captionValue = (mediaRef.caption ?? '').trim()
  if (!altValue) return
  if (altValue === persistedAlt.value.trim() && captionValue === persistedCaption.value.trim()) return
  persistError.value = null
  try {
    const updated = await updateInfo(mediaRef.id, { alternativeText: altValue, caption: captionValue })
    persistedAlt.value = updated.alternativeText ?? ''
    persistedCaption.value = updated.caption ?? ''
  } catch {
    persistError.value = 'Could not save the image details to the library. Retry by editing the field again.'
  }
}

function onSelect(mediaRef: MediaRef) {
  emit('update:modelValue', mediaRef)
  pickerOpen.value = false
  altTouched.value = false
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
