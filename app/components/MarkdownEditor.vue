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
import type { DropdownMenuItem } from '@nuxt/ui'
import { EditorView } from '@codemirror/view'
import { EditorSelection } from '@codemirror/state'
import { undo as cmUndo, redo as cmRedo } from '@codemirror/commands'
import { createStudioEditorState } from '~/lib/editor/studio-editor-state'
import { handleImageFiles, buildImageMarkdown, type InsertedImage } from '~/lib/editor/image-insert'
import { ALLOWED_IMAGE_EXTENSIONS, hasAllowedImageExtension } from '~/lib/image-types'
import { isDemoMode } from '~/lib/demo'
import { sampleFigureRef } from '~/lib/sample-figures'
import type { MediaRef } from '~/types/content'

/** A tray entry for the body-image gallery (full mode only). */
interface TrayImage {
  id: number
  ref: MediaRef
  filename: string
}

const props = defineProps<{ modelValue: string; label?: string; compact?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const labelId = useId()
const { upload } = useUpload()
const accept = ALLOWED_IMAGE_EXTENSIONS.map((e) => `.${e}`).join(',')

const host = ref<HTMLElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const galleryInput = ref<HTMLInputElement | null>(null)
const uploadError = ref<string | null>(null)
// Default to a wide, full-width editor; the Preview button splits in a live preview on demand.
const showPreview = ref(false)
// Body-image gallery tray (full mode only — not rendered when compact).
const trayImages = ref<TrayImage[]>([])
let trayIdSeq = 0
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

/** Add a MediaRef to the tray WITHOUT inserting into the body. Returns the tray entry. */
function addToTray(mediaRef: MediaRef, filename: string): TrayImage {
  const entry: TrayImage = { id: ++trayIdSeq, ref: mediaRef, filename }
  trayImages.value.push(entry)
  return entry
}

/** Insert a tray image into the body at the cursor. */
function insertTrayImage(entry: TrayImage) {
  const img = buildImageMarkdown(entry.ref, entry.filename)
  insertAtCursor(img)
}

/** Remove an entry from the tray (does NOT delete the uploaded file or any body text). */
function removeFromTray(id: number) {
  trayImages.value = trayImages.value.filter((e) => e.id !== id)
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

/** Upload files to the gallery tray WITHOUT auto-inserting into the body. */
async function handleGalleryFiles(files: File[]) {
  uploadError.value = null
  for (const file of files) {
    try {
      const mediaRef = await upload(file)
      addToTray(mediaRef, file.name)
    } catch (err) {
      uploadError.value = err instanceof Error ? err.message : 'Image upload failed. Please try again.'
    }
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

function onGalleryPick() { galleryInput.value?.click() }
function onGalleryFileInput(e: Event) {
  const files = imageFilesFrom((e.target as HTMLInputElement).files)
  if (files.length) handleGalleryFiles(files)
  if (galleryInput.value) galleryInput.value.value = ''
}
function onGalleryDrop(e: DragEvent) {
  e.preventDefault()
  const files = imageFilesFrom(e.dataTransfer?.files)
  if (files.length) handleGalleryFiles(files)
}

// ── Formatting toolbar commands (mirror the ICJIA markdown-editor's useEditor) ──
/** Wrap the selection with before/after markers, keeping the inner text selected. */
function wrapSelection(before: string, after: string) {
  if (!view) return
  const { from, to } = view.state.selection.main
  const selected = view.state.sliceDoc(from, to)
  view.dispatch({
    changes: { from, to, insert: `${before}${selected}${after}` },
    selection: { anchor: from + before.length, head: from + before.length + selected.length },
  })
  view.focus()
}
/** Replace the selection (or insert at the cursor); cursor lands after the text. */
function insertText(text: string) {
  if (!view) return
  const { from, to } = view.state.selection.main
  view.dispatch({ changes: { from, to, insert: text }, selection: { anchor: from + text.length } })
  view.focus()
}
/** Prepend a marker to the start of the cursor's line (lists, blockquote). */
function prefixLine(prefix: string) {
  if (!view) return
  const line = view.state.doc.lineAt(view.state.selection.main.from)
  view.dispatch({ changes: { from: line.from, insert: prefix } })
  view.focus()
}
function toggleBold() { wrapSelection('**', '**') }
function toggleItalic() { wrapSelection('_', '_') }
function toggleInlineCode() { wrapSelection('`', '`') }
function insertCodeBlock(language = '') {
  if (!view) return
  const { from, to } = view.state.selection.main
  const selected = view.state.sliceDoc(from, to)
  const block = `\`\`\`${language}\n${selected || 'code here'}\n\`\`\``
  view.dispatch({
    changes: { from, to, insert: block },
    selection: { anchor: from + 4 + language.length, head: from + 4 + language.length + (selected.length || 9) },
  })
  view.focus()
}
function insertLink() {
  if (!view) return
  const { from, to } = view.state.selection.main
  const text = view.state.sliceDoc(from, to) || 'link text'
  const markdown = `[${text}](https://example.com)`
  view.dispatch({ changes: { from, to, insert: markdown }, selection: { anchor: from + markdown.length } })
  view.focus()
}
function insertHeading(level: number) {
  if (!view || level < 1 || level > 6) return
  const line = view.state.doc.lineAt(view.state.selection.main.from)
  const existing = line.text.match(/^(#{1,6})\s/)
  const prefix = '#'.repeat(level) + ' '
  view.dispatch(
    existing
      ? { changes: { from: line.from, to: line.from + existing[0].length, insert: prefix } }
      : { changes: { from: line.from, insert: prefix } },
  )
  view.focus()
}
function insertBlockquote() { prefixLine('> ') }
function insertBulletList() { prefixLine('- ') }
function insertNumberedList() { prefixLine('1. ') }
function insertHorizontalRule() { insertText('\n---\n') }
function undo() { if (view) cmUndo({ state: view.state, dispatch: view.dispatch }) }
function redo() { if (view) cmRedo({ state: view.state, dispatch: view.dispatch }) }

/** The formatting toolbar, grouped (mirrors the ICJIA editor). Headings are a separate
    dropdown (headingItems below) so the toolbar stays compact. */
const toolbarGroups: { icon: string; label: string; run: () => void }[][] = [
  [
    { icon: 'i-lucide-bold', label: 'Bold', run: toggleBold },
    { icon: 'i-lucide-italic', label: 'Italic', run: toggleItalic },
    { icon: 'i-lucide-code', label: 'Inline code', run: toggleInlineCode },
  ],
  [
    { icon: 'i-lucide-list', label: 'Bullet list', run: insertBulletList },
    { icon: 'i-lucide-list-ordered', label: 'Numbered list', run: insertNumberedList },
    { icon: 'i-lucide-quote', label: 'Blockquote', run: insertBlockquote },
    { icon: 'i-lucide-square-code', label: 'Code block', run: () => insertCodeBlock() },
    { icon: 'i-lucide-minus', label: 'Horizontal rule', run: insertHorizontalRule },
  ],
  [
    { icon: 'i-lucide-link', label: 'Link', run: insertLink },
    { icon: 'i-lucide-image', label: 'Insert image', run: onToolbarPick },
  ],
  [
    { icon: 'i-lucide-undo-2', label: 'Undo', run: undo },
    { icon: 'i-lucide-redo-2', label: 'Redo', run: redo },
  ],
]

/** Compact toolbar: inline formatting only (Bold, Italic, Inline code, Link, Undo, Redo).
 *  No headings, no lists/blocks, no image insert. Used when compact prop is true. */
const compactToolbarGroups: { icon: string; label: string; run: () => void }[][] = [
  [
    { icon: 'i-lucide-bold', label: 'Bold', run: toggleBold },
    { icon: 'i-lucide-italic', label: 'Italic', run: toggleItalic },
    { icon: 'i-lucide-code', label: 'Inline code', run: toggleInlineCode },
    { icon: 'i-lucide-link', label: 'Link', run: insertLink },
  ],
  [
    { icon: 'i-lucide-undo-2', label: 'Undo', run: undo },
    { icon: 'i-lucide-redo-2', label: 'Redo', run: redo },
  ],
]

/** Heading levels collapsed into a dropdown menu (H1–H3). */
const headingItems: DropdownMenuItem[][] = [[
  { label: 'Heading 1', icon: 'i-lucide-heading-1', onSelect: () => insertHeading(1) },
  { label: 'Heading 2', icon: 'i-lucide-heading-2', onSelect: () => insertHeading(2) },
  { label: 'Heading 3', icon: 'i-lucide-heading-3', onSelect: () => insertHeading(3) },
]]

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

  // Demo mode blocks uploads, so the "Body images" tray (full mode only) would stay empty. Seed it
  // with a deterministic set of bundled sample FIGURES (charts/tables) so authors can click-to-Insert
  // them into the body. Display-only refs (id 0) — never written. Non-demo behavior is unchanged.
  if (!props.compact && isDemoMode() && trayImages.value.length === 0) {
    for (let n = 0; n < 8; n++) {
      const ref = sampleFigureRef(n)
      addToTray(ref, ref.name ?? `figure-${n}.svg`)
    }
  }
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
defineExpose({
  __emitChange: emitChange,
  __handleFiles: handleFiles,
  __handleGalleryFiles: handleGalleryFiles,
  __trayImages: trayImages,
  __insertTrayImage: insertTrayImage,
  __removeFromTray: removeFromTray,
  __uploadError: uploadError,
})
</script>

<template>
  <div class="markdown-editor">
    <label v-if="label" :id="labelId" class="block text-sm font-medium mb-1">{{ label }}</label>
    <div class="flex items-center justify-between gap-2 mb-2 flex-wrap">
      <div class="editor-tools flex items-center gap-1 flex-wrap">
        <!-- Compact mode: inline formatting only (Bold, Italic, Inline code, Link, Undo, Redo) -->
        <template v-if="compact">
          <template v-for="(group, gi) in compactToolbarGroups" :key="gi">
            <span v-if="gi > 0" class="w-px h-5 bg-border mx-1" aria-hidden="true" />
            <UButton
              v-for="btn in group"
              :key="btn.label"
              size="xs" variant="ghost" color="neutral"
              :icon="btn.icon" :aria-label="btn.label" :title="btn.label"
              @click="btn.run"
            />
          </template>
        </template>
        <!-- Full mode: inline formatting + headings dropdown + lists/blocks + insert + history -->
        <template v-else>
          <!-- Inline formatting -->
          <UButton
            v-for="btn in toolbarGroups[0]"
            :key="btn.label"
            size="xs" variant="ghost" color="neutral"
            :icon="btn.icon" :aria-label="btn.label" :title="btn.label"
            @click="btn.run"
          />
          <span class="w-px h-5 bg-border mx-1" aria-hidden="true" />
          <!-- Headings dropdown (H1–H3) -->
          <UDropdownMenu :items="headingItems">
            <UButton
              size="xs" variant="ghost" color="neutral"
              icon="i-lucide-heading" trailing-icon="i-lucide-chevron-down"
              aria-label="Heading" title="Heading"
            />
          </UDropdownMenu>
          <!-- Lists / blocks, insert, history -->
          <template v-for="(group, gi) in toolbarGroups.slice(1)" :key="gi">
            <span class="w-px h-5 bg-border mx-1" aria-hidden="true" />
            <UButton
              v-for="btn in group"
              :key="btn.label"
              size="xs" variant="ghost" color="neutral"
              :icon="btn.icon" :aria-label="btn.label" :title="btn.label"
              @click="btn.run"
            />
          </template>
          <input ref="fileInput" type="file" :accept="accept" multiple class="hidden" @change="onFileInput">
        </template>
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

    <!-- Body-image gallery: FULL mode only. Hidden when compact. -->
    <template v-if="!compact">
      <div class="body-image-gallery border border-dashed border-default rounded p-3 mb-3" data-test="body-image-gallery">
        <input ref="galleryInput" type="file" :accept="accept" multiple class="hidden" @change="onGalleryFileInput">
        <div class="flex items-center gap-2 mb-2" @dragover.prevent @drop="onGalleryDrop">
          <span class="text-xs font-semibold text-muted uppercase tracking-wide">Body images</span>
          <UButton size="xs" variant="outline" icon="i-lucide-upload" @click="onGalleryPick">
            Upload images
          </UButton>
          <span class="text-xs text-muted ml-1">or drag &amp; drop here</span>
        </div>
        <div v-if="trayImages.length > 0" class="flex flex-wrap gap-3 mt-2" data-test="gallery-tray">
          <div
            v-for="entry in trayImages"
            :key="entry.id"
            class="tray-item flex flex-col items-center gap-1 w-24"
            :data-test="`tray-item-${entry.id}`"
          >
            <img
              :src="entry.ref.url"
              :alt="entry.ref.alternativeText ?? entry.filename"
              width="88"
              height="64"
              class="rounded border border-default object-cover w-22 h-16"
            >
            <span class="text-xs text-muted truncate w-full text-center" :title="entry.filename">{{ entry.filename }}</span>
            <div class="flex gap-1">
              <UButton size="xs" variant="outline" icon="i-lucide-plus" :data-test="`insert-${entry.id}`" @click="insertTrayImage(entry)">
                Insert
              </UButton>
              <UButton size="xs" variant="ghost" color="neutral" icon="i-lucide-x" :aria-label="`Remove ${entry.filename} from tray`" :data-test="`remove-tray-${entry.id}`" @click="removeFromTray(entry.id)" />
            </div>
          </div>
        </div>
        <p v-else class="text-xs text-muted">No images yet. Upload to add them to the tray, then click Insert to place them in the body.</p>
      </div>
    </template>
    <div class="grid gap-3" :class="showPreview ? 'lg:grid-cols-2' : 'grid-cols-1'">
      <div ref="host" data-test="cm-host" :class="compact ? 'cm-host cm-host--compact' : 'cm-host'" class="border border-default rounded" :aria-labelledby="label ? labelId : undefined" />
      <div v-if="showPreview" :class="compact ? 'markdown-preview-pane markdown-preview-pane--compact' : 'markdown-preview-pane'" class="rounded border border-default bg-elevated/30 p-4 overflow-auto">
        <div class="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Preview</div>
        <MarkdownPreview :source="modelValue" :inline="compact" />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Give the CodeMirror host a roomy authoring height; CM owns its inner DOM/theme. */
.cm-host :deep(.cm-editor) { min-height: 32rem; }
.cm-host :deep(.cm-scroller) { font-family: 'JetBrains Mono', ui-monospace, monospace; }
/* Compact mode: a shorter editor for abstract/summary fields. */
.cm-host--compact :deep(.cm-editor) { min-height: 9rem; }
/* The live preview pane matches the editor height so the two read as a pair. The published
   prose is em-relative off a 20px base; scale it down here so it fits the narrow split pane
   (the full-size published view is the form's "Preview as published" modal). */
.markdown-preview-pane { min-height: 32rem; }
.markdown-preview-pane--compact { min-height: 9rem; }
.markdown-preview-pane :deep(.prose-preview) { font-size: 14px; }

/* Raised, 3D-looking toolbar buttons so authors immediately recognize them as buttons. */
.editor-tools :deep(button) {
  border: 1px solid var(--ui-border-accented);
  background-color: var(--ui-bg);
  box-shadow: 0 1px 1.5px rgba(0, 0, 0, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.55);
  transition: box-shadow 0.1s ease, transform 0.06s ease, background-color 0.1s ease;
}
.editor-tools :deep(button:hover) {
  background-color: var(--ui-bg-muted);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.55);
}
.editor-tools :deep(button:active) {
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.22);
  transform: translateY(0.5px);
}
.dark .editor-tools :deep(button) {
  box-shadow: 0 1px 1.5px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.07);
}
.dark .editor-tools :deep(button:hover) {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.07);
}
</style>
