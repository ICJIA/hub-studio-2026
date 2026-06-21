<!-- app/components/fields/RepeatableField.vue -->
<!--
  Generic repeatable-row editor: replaces v1 delimited strings with structured rows (spec §10).
  Each column is one text input; rows can be added/removed. Optional paste-to-rows: when a
  `pasteParser` is supplied (e.g. parseAuthors/parseSources/parseVariables from ~/lib/text-import),
  a textarea lets authors paste delimited text and replace the whole array. Storage stays JSON.
-->
<script setup lang="ts">
import { ref, watch } from '#imports'

type Row = Record<string, string>
// pasteParser can return typed structs (Author, Source, Variable…). Because those interfaces lack
// an index signature, we accept `unknown[]` here and cast to Row[] at the call site — all values
// are strings at runtime so the cast is safe.
const props = defineProps<{
  modelValue: Row[]
  label: string
  columns: { key: string; label: string }[]
  pasteParser?: (text: string) => unknown[]
}>()
const emit = defineEmits<{ 'update:modelValue': [value: Row[]] }>()

const pasteText = ref('')

// Internal draft tracks the most-recently-emitted state so sequential mutations
// (addRow then removeRow) compose correctly without requiring the parent to re-bind props.
const draft = ref<Row[]>([...props.modelValue])
watch(() => props.modelValue, (v) => { draft.value = [...v] }, { deep: true })

function emitRows(rows: Row[]) {
  draft.value = rows
  emit('update:modelValue', rows)
}

function blankRow(): Row {
  return Object.fromEntries(props.columns.map((c) => [c.key, ''])) as Row
}
function addRow() { emitRows([...draft.value, blankRow()]) }
function removeRow(i: number) { emitRows(draft.value.filter((_, idx) => idx !== i)) }
function updateCell(i: number, key: string, val: string) {
  emitRows(draft.value.map((row, idx) => (idx === i ? { ...row, [key]: val } : row)))
}
function applyPaste(text: string) {
  if (props.pasteParser) {
    // Cast: at runtime every value is a string; the wider input type avoids forcing index-signatures
    // on Author/Source/Variable structs.
    emitRows(props.pasteParser(text) as Row[])
  }
}

defineExpose({ addRow, removeRow, updateCell, applyPaste })
</script>

<template>
  <UFormField :label="label">
    <div class="space-y-2">
      <div v-for="(row, i) in draft" :key="i" class="flex gap-2 items-start">
        <UInput
          v-for="col in columns"
          :key="col.key"
          :model-value="row[col.key]"
          :placeholder="col.label"
          class="flex-1"
          @update:model-value="updateCell(i, col.key, String($event))"
        />
        <UButton color="neutral" variant="ghost" icon="i-lucide-trash-2" aria-label="Remove row" @click="removeRow(i)" />
      </div>
      <UButton size="sm" variant="subtle" icon="i-lucide-plus" label="Add row" @click="addRow" />

      <div v-if="pasteParser" class="pt-2 border-t border-default">
        <p class="text-xs text-muted mb-1">Or paste rows (one per line, fields separated by <code>|</code>):</p>
        <UTextarea v-model="pasteText" :rows="3" class="w-full font-mono" />
        <UButton size="xs" variant="subtle" label="Paste rows" class="mt-1" @click="applyPaste(pasteText)" />
      </div>
    </div>
  </UFormField>
</template>
