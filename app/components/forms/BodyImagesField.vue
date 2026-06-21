<!-- app/components/forms/BodyImagesField.vue -->
<!--
  BodyImagesField: the SIDEBAR body-image insert panel (moved out of MarkdownEditor's in-editor tray).
  It OWNS the body-image tray: the upload button/drop (the existing useUpload path) AND, in demo mode
  only, the seeding of ~8 bundled sample FIGURES (sampleFigureRef) so authors can click-to-insert sample
  charts/tables (the demo blocks uploads).

  For EACH tray image the author chooses, per-image, how it lands in the body:
    - Alt   (REQUIRED — Insert is disabled while Alt is empty, with a hint)
    - Caption (optional)
    - Position: Below (default) / Above / None
    - Alignment: Centered (default) / Left — disabled when Position=None or Caption is empty
  Insert builds the markdown via the pure buildFigureMarkdown(...) and emits('insert', markdown); the
  parent (ArticleForm) forwards it to the body MarkdownField's imperative insertMarkdown(). ZERO base64 —
  every tray url is a hosted Media Library url (or a bundled demo SVG), never a data: URI.
-->
<script setup lang="ts">
import { ref, onMounted } from '#imports'
import { useUpload } from '~/composables/useUpload'
import { buildFigureMarkdown, type FigureCaptionPosition, type FigureCaptionAlign } from '~/lib/editor/figure-insert'
import { provisionalAltFromName } from '~/lib/editor/image-insert'
import { ALLOWED_IMAGE_EXTENSIONS, hasAllowedImageExtension } from '~/lib/image-types'
import { isDemoMode } from '~/lib/demo'
import { sampleFigureRef } from '~/lib/sample-figures'
import type { MediaRef } from '~/types/content'

/** A tray entry: a hosted (or bundled demo) image plus the per-image insert controls' draft state. */
interface TrayImage {
  id: number
  ref: MediaRef
  filename: string
  alt: string
  caption: string
  position: FigureCaptionPosition
  align: FigureCaptionAlign
}

const emit = defineEmits<{ insert: [markdown: string] }>()

const { upload } = useUpload()
const accept = ALLOWED_IMAGE_EXTENSIONS.map((e) => `.${e}`).join(',')

const trayImages = ref<TrayImage[]>([])
const fileInput = ref<HTMLInputElement | null>(null)
const uploadError = ref<string | null>(null)
let trayIdSeq = 0

const positionItems = [
  { label: 'Below', value: 'below' as const },
  { label: 'Above', value: 'above' as const },
  { label: 'None', value: 'none' as const },
]
const alignItems = [
  { label: 'Centered', value: 'center' as const },
  { label: 'Left', value: 'left' as const },
]

/** Add a MediaRef to the tray with sensible per-image defaults (Below/Centered; alt seeded from ref). */
function addToTray(mediaRef: MediaRef, filename: string): TrayImage {
  const seededAlt = mediaRef.alternativeText?.trim() || provisionalAltFromName(filename)
  const entry: TrayImage = {
    id: ++trayIdSeq,
    ref: mediaRef,
    filename,
    alt: seededAlt,
    caption: mediaRef.caption?.trim() ?? '',
    position: 'below',
    align: 'center',
  }
  trayImages.value.push(entry)
  return entry
}

/** Remove an entry from the tray (does NOT delete the uploaded file or any body text). */
function removeFromTray(id: number) {
  trayImages.value = trayImages.value.filter((e) => e.id !== id)
}

/** Build the figure markdown from the entry's per-image controls and ask the parent to insert it. */
function insertEntry(entry: TrayImage) {
  if (!entry.alt.trim()) return
  const markdown = buildFigureMarkdown({
    url: entry.ref.url,
    alt: entry.alt.trim(),
    caption: entry.caption,
    position: entry.position,
    align: entry.align,
  })
  emit('insert', markdown)
}

/** Collect image files only: by MIME type, or by extension when type is absent (common on drop). */
function imageFilesFrom(list: FileList | null | undefined): File[] {
  if (!list || list.length === 0) return []
  return Array.from(list).filter(
    (f) => f.type.startsWith('image/') || (!f.type && hasAllowedImageExtension(f.name)),
  )
}

/** Upload files to the tray WITHOUT auto-inserting into the body (sequential, keeps order). */
async function handleFiles(files: File[]) {
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

function onPick() { fileInput.value?.click() }
function onFileInput(e: Event) {
  const files = imageFilesFrom((e.target as HTMLInputElement).files)
  if (files.length) handleFiles(files)
  if (fileInput.value) fileInput.value.value = ''
}
function onDrop(e: DragEvent) {
  e.preventDefault()
  const files = imageFilesFrom(e.dataTransfer?.files)
  if (files.length) handleFiles(files)
}

onMounted(() => {
  // Demo mode blocks uploads, so the tray would stay empty. Seed it with a deterministic set of bundled
  // sample FIGURES (charts/tables) so authors can click-to-Insert them into the body. Display-only refs
  // (id 0) — never written. Non-demo behavior is unchanged (seed runs ONLY in demo mode).
  if (isDemoMode() && trayImages.value.length === 0) {
    for (let n = 0; n < 8; n++) {
      const ref = sampleFigureRef(n)
      addToTray(ref, ref.name ?? `figure-${n}.svg`)
    }
  }
})

// Test seams: route through the SAME functions the UI uses (not divergent logic).
defineExpose({
  __trayImages: trayImages,
  __handleFiles: handleFiles,
  __addToTray: addToTray,
  __removeFromTray: removeFromTray,
  __insertEntry: insertEntry,
  __uploadError: uploadError,
})
</script>

<template>
  <UFormField label="Body images">
    <div class="body-images-panel border border-dashed border-default rounded p-3" data-test="body-images-field">
      <input ref="fileInput" type="file" :accept="accept" multiple class="hidden" @change="onFileInput">
      <div class="flex flex-wrap items-center gap-2" @dragover.prevent @drop="onDrop">
        <UButton size="xs" variant="outline" icon="i-lucide-upload" @click="onPick">
          Upload images
        </UButton>
        <span class="text-xs text-muted">or drag &amp; drop here</span>
      </div>
      <p class="mt-1 text-xs text-muted">
        Upload to add an image, set its alt + caption, then Insert to place it in the body at the cursor.
      </p>

      <p v-if="uploadError" role="alert" class="mt-2 text-sm text-error">{{ uploadError }}</p>

      <ul v-if="trayImages.length > 0" class="mt-3 space-y-3" data-test="body-images-tray">
        <li
          v-for="entry in trayImages"
          :key="entry.id"
          class="tray-item rounded border border-default bg-elevated/30 p-2"
          :data-test="`tray-item-${entry.id}`"
        >
          <div class="flex items-start gap-2">
            <img
              :src="entry.ref.url"
              :alt="entry.alt || entry.filename"
              width="64"
              height="48"
              class="mt-0.5 h-12 w-16 shrink-0 rounded border border-default object-cover"
            >
            <div class="min-w-0 flex-1">
              <p class="truncate text-xs font-medium text-highlighted" :title="entry.filename">{{ entry.filename }}</p>
            </div>
            <UButton
              size="xs" color="neutral" variant="ghost" icon="i-lucide-x"
              :aria-label="`Remove ${entry.filename}`"
              :data-test="`remove-${entry.id}`"
              @click="removeFromTray(entry.id)"
            />
          </div>

          <div class="mt-2 space-y-2">
            <UFormField :error="entry.alt.trim() ? undefined : 'Alt text is required'">
              <template #label><span class="text-xs">Alt text (required)</span></template>
              <UInput
                v-model="entry.alt"
                size="xs"
                placeholder="Describe the image for screen readers"
                class="w-full"
                :data-test="`alt-${entry.id}`"
              />
            </UFormField>

            <UFormField>
              <template #label><span class="text-xs">Caption (optional)</span></template>
              <UInput
                v-model="entry.caption"
                size="xs"
                placeholder="Optional caption"
                class="w-full"
                :data-test="`caption-${entry.id}`"
              />
            </UFormField>

            <div class="flex gap-2">
              <UFormField class="flex-1">
                <template #label><span class="text-xs">Position</span></template>
                <USelect
                  v-model="entry.position"
                  :items="positionItems"
                  size="xs"
                  class="w-full"
                  :data-test="`position-${entry.id}`"
                />
              </UFormField>
              <UFormField class="flex-1">
                <template #label><span class="text-xs">Alignment</span></template>
                <USelect
                  v-model="entry.align"
                  :items="alignItems"
                  size="xs"
                  class="w-full"
                  :disabled="entry.position === 'none' || !entry.caption.trim()"
                  :data-test="`align-${entry.id}`"
                />
              </UFormField>
            </div>

            <UButton
              size="xs" variant="solid" icon="i-lucide-plus" block
              :disabled="!entry.alt.trim()"
              :data-test="`insert-${entry.id}`"
              @click="insertEntry(entry)"
            >
              Insert
            </UButton>
            <p v-if="!entry.alt.trim()" class="text-xs text-muted" :data-test="`alt-hint-${entry.id}`">
              Add alt text to enable Insert.
            </p>
          </div>
        </li>
      </ul>
      <p v-else class="mt-2 text-xs text-muted" data-test="body-images-empty">
        No images yet.
      </p>
    </div>
  </UFormField>
</template>
