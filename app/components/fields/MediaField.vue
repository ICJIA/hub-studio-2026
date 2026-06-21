<!-- app/components/fields/MediaField.vue -->
<!--
  MediaField: wraps MediaPicker (alt-required, zero-base64) for a SINGLE media relation
  (splash/thumbnail/image/mainfile/extrafile/datafile). Holds the whole MediaRef in model
  state and emits it on select; the data-layer mapper extracts the numeric id (mediaIdForWrite)
  on save. Preview renders from the MediaRef url — NEVER a data: URI.

  kind="image" (default): shows alt/caption fields, requires alt before upload.
  kind="file": hides alt/caption, uses document upload path (PDF/office docs), shows file name only.

  When a MediaRef IS already selected, the field shows a selected state (thumbnail for images,
  file name for files) with Replace and Remove actions — the MediaPicker upload panel is hidden
  until the user explicitly replaces.
-->
<script setup lang="ts">
import { ref, computed } from '#imports'
import type { MediaRef } from '~/types/content'

const props = defineProps<{ modelValue: MediaRef | null; label: string; kind?: 'image' | 'file' }>()
const emit = defineEmits<{ 'update:modelValue': [value: MediaRef | null] }>()

const kind = computed(() => props.kind ?? 'image')
const isImage = computed(() => kind.value === 'image')

// Whether the picker panel is currently open (for replace flow).
const pickerOpen = ref(false)

const current = computed(() => props.modelValue)

function onSelect(ref: MediaRef) {
  emit('update:modelValue', ref)
  pickerOpen.value = false
}
function clear() {
  emit('update:modelValue', null)
  pickerOpen.value = false
}
function openPicker() {
  pickerOpen.value = true
}

defineExpose({ clear })
</script>

<template>
  <UFormField :label="label">
    <!-- Selected state: show when a MediaRef is set AND picker is not being used to replace. -->
    <div v-if="current && !pickerOpen" class="flex items-center gap-3 mb-2">
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

    <!-- Picker: shown when nothing is selected yet, or when replacing. -->
    <div v-if="!current || pickerOpen">
      <MediaPicker :kind="kind" @select="onSelect" />
    </div>
  </UFormField>
</template>
