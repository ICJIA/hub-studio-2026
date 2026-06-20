<!-- app/components/MarkdownField.vue -->
<!--
  MarkdownField: a BASIC markdown editor — a textarea bound via v-model beside a live
  MarkdownPreview. This is the SEAM the full ICJIA Markdown Editor 2026 (CodeMirror 6 +
  uploadHandler) slots into in Plan 4: the replacement keeps this exact { modelValue /
  update:modelValue } contract, so the content forms don't change. Live preview uses the
  shared renderMarkdown (parity with published output).
-->
<script setup lang="ts">
import { computed } from '#imports'

const props = defineProps<{ modelValue: string; label?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const value = computed({
  get: () => props.modelValue,
  set: (v: string) => emit('update:modelValue', v),
})
</script>

<template>
  <div class="markdown-field">
    <label v-if="label" class="block text-sm font-medium mb-1">{{ label }}</label>
    <div class="grid gap-3 md:grid-cols-2">
      <UTextarea v-model="value" :rows="16" class="w-full font-mono" placeholder="Write Markdown…" />
      <MarkdownPreview :source="value" />
    </div>
  </div>
</template>
