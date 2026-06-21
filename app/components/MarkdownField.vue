<!-- app/components/MarkdownField.vue -->
<!--
  MarkdownField: the editor SEAM. Plan 5 shipped this as a basic textarea + live preview and reserved
  the { modelValue / update:modelValue } contract for the full editor. Plan 4 fulfills that: the body is
  now a thin pass-through to MarkdownEditor (the vendored ICJIA CodeMirror 6 surface + our authored
  paste/drop/toolbar image pipeline), while the public v-model contract is UNCHANGED — so ArticleForm
  (the only mounter) and the other forms are untouched. The live preview remains OUR renderMarkdown.
-->
<script setup lang="ts">
const props = defineProps<{ modelValue: string; label?: string; compact?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const value = computed({
  get: () => props.modelValue,
  set: (v: string) => emit('update:modelValue', v),
})
</script>

<template>
  <MarkdownEditor v-model="value" :label="label" :compact="compact" />
</template>
