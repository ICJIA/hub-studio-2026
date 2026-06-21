<!-- app/components/MarkdownEditor.vue -->
<!--
  MarkdownEditor: the ICJIA Markdown Editor 2026 CodeMirror 6 writing surface, wrapped per-instance so
  it honors the EXACT { modelValue / update:modelValue } v-model seam that MarkdownField defined in
  Plan 5 — so ArticleForm (the only mounter) is untouched. The CM setup is the VENDORED, de-singletoned
  createStudioEditorState (Task 1); the upstream's module-level content singleton (useEditor.ts) is NOT
  used. The upstream editor has NO image handling — we author it here: EditorView.domEventHandlers({
  paste, drop }) + a toolbar "Insert image" button extract File(s) and run them through the pure
  handleImageFiles core (Task 2) with useUpload().upload injected, inserting ![alt](url "caption?") at the
  cursor and selecting the alt for in-place refinement. ZERO base64 — every insert is a hosted url.
  OUR renderer (MarkdownPreview) is kept beside it as the live preview (we do NOT vendor their renderer).
  Client-only: EditorView mounts in onMounted, tears down in onBeforeUnmount (app is ssr:false).
-->
<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, useId } from '#imports'
import { EditorView } from '@codemirror/view'
import { EditorSelection } from '@codemirror/state'
import { createStudioEditorState } from '~/lib/editor/studio-editor-state'
import { handleImageFiles, type InsertedImage } from '~/lib/editor/image-insert'
import { ALLOWED_IMAGE_EXTENSIONS, hasAllowedImageExtension } from '~/lib/image-types'

const props = defineProps<{ modelValue: string; label?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const labelId = useId()
const { upload } = useUpload()
const accept = ALLOWED_IMAGE_EXTENSIONS.map((e) => `.${e}`).join(',')

const host = ref<HTMLElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const uploadError = ref<string | null>(null)
// Default to a wide, full-width editor; the Preview button splits in a live preview on demand.
const showPreview = ref(false)
let view: EditorView | null = null
// Guards the modelValue→doc watcher against re-emitting our own onChange echo.
let applyingExternal = false

/** Single emit path — CM's onChange and the test hook both route through here. */
function emitChange(value: string) {
  if (applyingExternal) return
  emit('update:modelValue', value)
}

/** Insert one built image at the current selection head and select its alt text for refinement. */
function insertAtCursor(img: InsertedImage) {
  if (!view) return
  const pos = view.state.selection.main.head
  view.dispatch({
    changes: { from: pos, insert: img.markdown },
    selection: EditorSelection.range(pos + img.altStart, pos + img.altEnd),
  })
  view.focus()
}

/** Upload + insert each image File via the pure core (DI: live upload + live insert). */
async function handleFiles(files: File[], onInsert?: (markdown: string) => void) {
  uploadError.value = null
  try {
    await handleImageFiles(files, upload, (img) => {
      insertAtCursor(img)
      onInsert?.(img.markdown)
    })
  } catch (err) {
    uploadError.value = err instanceof Error ? err.message : 'Image upload failed. Please try again.'
  }
}

/** Collect image files only: by MIME type, or by extension when type is absent (common on drop). */
function imageFilesFrom(list: FileList | null | undefined): File[] {
  if (!list || list.length === 0) return []
  return Array.from(list).filter(
    (f) => f.type.startsWith('image/') || (!f.type && hasAllowedImageExtension(f.name)),
  )
}

function onToolbarPick() { fileInput.value?.click() }
function onFileInput(e: Event) {
  const files = imageFilesFrom((e.target as HTMLInputElement).files)
  if (files.length) handleFiles(files)
  if (fileInput.value) fileInput.value.value = ''
}

// Named handlers so onBeforeUnmount can remove the exact same references.
let onPaste: ((e: ClipboardEvent) => void) | null = null
let onDrop: ((e: DragEvent) => void) | null = null

onMounted(() => {
  if (!host.value) return
  const state = createStudioEditorState({
    doc: props.modelValue,
    onChange: emitChange,
  })
  view = new EditorView({
    state,
    parent: host.value,
    // use default dispatch
  })
  // domEventHandlers must be part of the state extensions; add them via a reconfigure-free approach:
  // we attach native listeners on the CM content for paste/drop (equivalent, and simpler to wire here).
  const content = view.contentDOM

  onPaste = (e: ClipboardEvent) => {
    const files = imageFilesFrom(e.clipboardData?.files)
    if (files.length) { e.preventDefault(); handleFiles(files) }
  }
  onDrop = (e: DragEvent) => {
    const files = imageFilesFrom(e.dataTransfer?.files)
    if (files.length) { e.preventDefault(); handleFiles(files) }
  }

  content.addEventListener('paste', onPaste)
  content.addEventListener('drop', onDrop)
})

// External modelValue changes → replace the document, without re-emitting.
watch(() => props.modelValue, (next) => {
  if (!view) return
  const current = view.state.doc.toString()
  if (next === current) return
  applyingExternal = true
  view.dispatch({ changes: { from: 0, to: current.length, insert: next ?? '' } })
  applyingExternal = false
})

onBeforeUnmount(() => {
  if (view?.contentDOM) {
    if (onPaste) view.contentDOM.removeEventListener('paste', onPaste)
    if (onDrop) view.contentDOM.removeEventListener('drop', onDrop)
  }
  view?.destroy()
  view = null
})

// Test seams: route through the SAME functions CM's onChange / handlers use (not divergent logic).
defineExpose({ __emitChange: emitChange, __handleFiles: handleFiles, __uploadError: uploadError })
</script>

<template>
  <div class="markdown-editor">
    <label v-if="label" :id="labelId" class="block text-sm font-medium mb-1">{{ label }}</label>
    <div class="flex items-center justify-between gap-2 mb-2">
      <div class="flex items-center gap-2">
        <UButton size="xs" variant="subtle" icon="i-lucide-image" label="Insert image" @click="onToolbarPick" />
        <input ref="fileInput" type="file" :accept="accept" multiple class="hidden" @change="onFileInput">
      </div>
      <UButton
        size="xs"
        :variant="showPreview ? 'solid' : 'outline'"
        :icon="showPreview ? 'i-lucide-eye-off' : 'i-lucide-eye'"
        :label="showPreview ? 'Hide preview' : 'Preview'"
        :aria-pressed="showPreview"
        data-test="preview-toggle"
        @click="showPreview = !showPreview"
      />
    </div>
    <p v-if="uploadError" role="alert" class="text-sm text-red-600 mb-2">{{ uploadError }}</p>
    <div class="grid gap-3" :class="showPreview ? 'lg:grid-cols-2' : 'grid-cols-1'">
      <div ref="host" data-test="cm-host" class="cm-host border border-default rounded" :aria-labelledby="label ? labelId : undefined" />
      <div v-if="showPreview" class="markdown-preview-pane rounded border border-default bg-elevated/30 p-4 overflow-auto">
        <div class="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Preview</div>
        <MarkdownPreview :source="modelValue" />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Give the CodeMirror host a roomy authoring height; CM owns its inner DOM/theme. */
.cm-host :deep(.cm-editor) { min-height: 32rem; }
.cm-host :deep(.cm-scroller) { font-family: 'JetBrains Mono', ui-monospace, monospace; }
/* The live preview pane matches the editor height so the two read as a pair. The published
   prose is em-relative off a 20px base; scale it down here so it fits the narrow split pane
   (the full-size published view is the form's "Preview as published" modal). */
.markdown-preview-pane { min-height: 32rem; }
.markdown-preview-pane :deep(.prose-preview) { font-size: 14px; }
</style>
