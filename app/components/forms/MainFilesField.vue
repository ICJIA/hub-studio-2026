<!-- app/components/forms/MainFilesField.vue -->
<!--
  MainFilesField: the "Main Files" field — zero-or-more downloadable PDF attachments for an article
  (the report PDF the public "Downloads" links point at). Models a MediaRef[] via v-model, mirroring
  BodyImagesField's shape (upload/drop + a removable list + demo seeding).

  - Drop or pick one or more PDF files (accept .pdf / application/pdf). 0 is fine; 1+ is fine.
  - Lists each file by filename with a per-file remove (×).
  - Enforces a MAX (runtimeConfig.public.maxMainFiles, default 3 from studio.config.ts). At max:
    adding is disabled and a hint is shown.
  - Demo mode blocks uploads, so the drop is disabled and the list is seeded with 1-2 bundled sample
    PDF refs (display-only id-0 refs → never written; see mediaIdsForWrite) so it never looks broken.
  ZERO base64 — every url is a hosted Media Library url (or a bundled demo PDF), never a data: URI.
-->
<script setup lang="ts">
import { ref, computed, onMounted } from '#imports'
import { useUpload } from '~/composables/useUpload'
import { isDemoMode } from '~/lib/demo'
import { sampleMainFileRef } from '~/lib/sample-files'
import type { MediaRef } from '~/types/content'

const props = defineProps<{ modelValue: MediaRef[] }>()
const emit = defineEmits<{ 'update:modelValue': [value: MediaRef[]] }>()

const { uploadDocument } = useUpload()

/** Single editable cap, sourced from studio.config.ts via runtimeConfig.public.maxMainFiles. */
const maxFiles = computed(() => useRuntimeConfig().public.maxMainFiles as number)

const files = computed(() => props.modelValue ?? [])
const atMax = computed(() => files.value.length >= maxFiles.value)
const demo = computed(() => isDemoMode())
/** Adding is blocked at the cap, or in demo mode (uploads are disabled there). */
const addDisabled = computed(() => atMax.value || demo.value)

const fileInput = ref<HTMLInputElement | null>(null)
const uploadError = ref<string | null>(null)

/** PDFs only: by MIME type, or by .pdf extension when type is absent (common on drop). */
function pdfFilesFrom(list: FileList | null | undefined): File[] {
  if (!list || list.length === 0) return []
  return Array.from(list).filter(
    (f) => f.type === 'application/pdf' || (!f.type && /\.pdf$/i.test(f.name)),
  )
}

/** Append a ref without exceeding the cap. Emits a fresh array (immutable update for v-model). */
function addRef(ref: MediaRef) {
  if (files.value.length >= maxFiles.value) return
  emit('update:modelValue', [...files.value, ref])
}

/** Remove the file at `index` (does NOT delete the uploaded file). */
function removeAt(index: number) {
  emit('update:modelValue', files.value.filter((_, i) => i !== index))
}

/**
 * Upload PDFs to the list (sequential, keeps order), respecting the cap. Builds the next array
 * locally and emits ONCE at the end: v-model round-trips asynchronously, so reading files.value
 * mid-loop would lag — tracking the working array here keeps the cap exact within one drop/pick.
 */
async function handleFiles(list: File[]) {
  uploadError.value = null
  const next = [...files.value]
  for (const file of list) {
    if (next.length >= maxFiles.value) break // cap reached → don't even attempt the upload
    try {
      const mediaRef = await uploadDocument(file)
      next.push(mediaRef)
    } catch (err) {
      uploadError.value = err instanceof Error ? err.message : 'File upload failed. Please try again.'
    }
  }
  if (next.length !== files.value.length) emit('update:modelValue', next)
}

function onPick() {
  if (addDisabled.value) return
  fileInput.value?.click()
}
function onFileInput(e: Event) {
  const list = pdfFilesFrom((e.target as HTMLInputElement).files)
  if (list.length) handleFiles(list)
  if (fileInput.value) fileInput.value.value = ''
}
function onDrop(e: DragEvent) {
  e.preventDefault()
  if (addDisabled.value) return
  const list = pdfFilesFrom(e.dataTransfer?.files)
  if (list.length) handleFiles(list)
}

onMounted(() => {
  // Demo mode blocks uploads, so seed the list with a deterministic 1-2 bundled sample PDFs (only
  // when empty) so the field + the preview's Downloads section don't look broken. Display-only refs
  // (id 0) — never written. Non-demo behavior is unchanged (seed runs ONLY in demo mode).
  if (isDemoMode() && files.value.length === 0) {
    const seeded = [sampleMainFileRef(0), sampleMainFileRef(1)].slice(0, maxFiles.value)
    emit('update:modelValue', seeded)
  }
})

// Test seams: route through the SAME functions the UI uses (not divergent logic).
defineExpose({
  __handleFiles: handleFiles,
  __addRef: addRef,
  __removeAt: removeAt,
  __uploadError: uploadError,
  __maxFiles: maxFiles,
})
</script>

<template>
  <UFormField label="Main Files">
    <div class="main-files-panel border border-dashed border-default rounded p-3" data-test="main-files-field">
      <input ref="fileInput" type="file" accept=".pdf,application/pdf" multiple class="hidden" @change="onFileInput">
      <div class="flex flex-wrap items-center gap-2" @dragover.prevent @drop="onDrop">
        <UButton
          size="xs" variant="outline" icon="i-lucide-upload"
          :disabled="addDisabled"
          data-test="main-files-add"
          @click="onPick"
        >
          Add PDF
        </UButton>
        <span v-if="!addDisabled" class="text-xs text-muted">or drag &amp; drop PDFs here</span>
      </div>
      <p class="mt-1 text-xs text-muted">
        Attach one or more PDF files. They appear as download buttons on the published article.
      </p>

      <p v-if="atMax" class="mt-2 text-xs text-muted" data-test="main-files-max-hint">
        Maximum of {{ maxFiles }} files reached. Remove one to add another.
      </p>
      <p v-else-if="demo" class="mt-2 text-xs text-muted" data-test="main-files-demo-hint">
        Uploads are disabled in the demo. The sample PDFs below stand in for your own files.
      </p>

      <p v-if="uploadError" role="alert" class="mt-2 text-sm text-error" data-test="main-files-error">{{ uploadError }}</p>

      <ul v-if="files.length > 0" class="mt-3 space-y-2" data-test="main-files-list">
        <li
          v-for="(file, i) in files"
          :key="`${file.id}-${i}`"
          class="main-file-item flex items-center gap-2 rounded border border-default bg-elevated/30 p-2"
          :data-test="`main-file-item-${i}`"
        >
          <UIcon name="i-lucide-file-text" class="shrink-0 text-muted" />
          <span class="min-w-0 flex-1 truncate text-xs font-medium text-highlighted" :title="file.name ?? file.url">
            {{ file.name ?? file.url }}
          </span>
          <UButton
            size="xs" color="neutral" variant="ghost" icon="i-lucide-x"
            :aria-label="`Remove ${file.name ?? file.url}`"
            :data-test="`main-file-remove-${i}`"
            @click="removeAt(i)"
          />
        </li>
      </ul>
      <p v-else class="mt-2 text-xs text-muted" data-test="main-files-empty">
        No files yet.
      </p>
    </div>
  </UFormField>
</template>
