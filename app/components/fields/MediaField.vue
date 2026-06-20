<!-- app/components/fields/MediaField.vue -->
<!--
  MediaField: wraps the already-built MediaPicker (alt-required, zero-base64) for a SINGLE media
  relation (splash/thumbnail/image/mainfile/extrafile/datafile). Holds the whole MediaRef in model
  state and emits it on select; the data-layer mapper extracts the numeric id (mediaIdForWrite) on
  save. Preview renders from the MediaRef url — NEVER a data: URI. Per-field type/size constraints
  (spec §7.2 / §14 #9) are a noted follow-on.
-->
<script setup lang="ts">
import { computed } from '#imports'
import type { MediaRef } from '~/types/content'

const props = defineProps<{ modelValue: MediaRef | null; label: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: MediaRef | null] }>()

const current = computed(() => props.modelValue)
function onSelect(ref: MediaRef) { emit('update:modelValue', ref) }
function clear() { emit('update:modelValue', null) }

defineExpose({ clear })
</script>

<template>
  <UFormField :label="label">
    <div v-if="current" class="flex items-center gap-3 mb-2">
      <img :src="current.url" :alt="current.alternativeText ?? ''" width="96" class="rounded border border-default">
      <div class="text-sm">
        <p>{{ current.name ?? current.url }}</p>
        <UButton size="xs" color="neutral" variant="ghost" label="Clear" @click="clear" />
      </div>
    </div>
    <MediaPicker @select="onSelect" />
  </UFormField>
</template>
