<!-- app/components/MarkdownField.vue -->
<!--
  MarkdownField: the editor SEAM. Plan 5 shipped this as a basic textarea + live preview and reserved
  the { modelValue / update:modelValue } contract for the full editor. Plan 4 fulfills that: the body is
  now a thin pass-through to MarkdownEditor (the vendored ICJIA CodeMirror 6 surface + our authored
  paste/drop/toolbar image pipeline), while the public v-model contract is UNCHANGED — so ArticleForm
  (the only mounter) and the other forms are untouched. The live preview remains OUR renderMarkdown.

  It also FORWARDS the editor's imperative insertMarkdown(text) so the sidebar BodyImagesField can place
  a figure into the body at the cursor via a parent ref.
-->
<script setup lang="ts">
import { ref, computed } from '#imports'

const props = defineProps<{ modelValue: string; label?: string; compact?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const editor = ref<{ insertMarkdown: (text: string) => number | null; cursorLine: number } | null>(null)

const value = computed({
  get: () => props.modelValue,
  set: (v: string) => emit('update:modelValue', v),
})

/** Forward an imperative insert to the underlying editor (used by the sidebar BodyImagesField);
 *  returns the 1-based line the insert began on (null before the editor mounts). */
function insertMarkdown(text: string): number | null {
  return editor.value?.insertMarkdown(text) ?? null
}

/** The editor's live 1-based cursor line (1 before mount) — exposed refs unwrap on the
 *  child instance, so this computed stays reactive through the template ref. */
const cursorLine = computed(() => editor.value?.cursorLine ?? 1)

defineExpose({ insertMarkdown, cursorLine })
</script>

<template>
  <MarkdownEditor ref="editor" v-model="value" :label="label" :compact="compact" />
</template>
