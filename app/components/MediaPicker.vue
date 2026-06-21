<!-- app/components/MediaPicker.vue -->
<!--
  MediaPicker: upload-new OR pick-existing, backing every media field. Eager-upload yields a
  Media Library reference whose `url` is shown in the preview — NEVER a client-side data: /
  object-URL blob (the zero-base64 invariant, design spec §7/§13). Alt-text is REQUIRED before
  an image upload completes; caption is optional. Both flow to Strapi via useUpload().upload's
  fileInfo. For `kind="file"` (PDF/docs) alt/caption are hidden and the document upload path
  is used. The native <input type="file"> is always HIDDEN; the browser "No file chosen" text
  is never rendered. The selected MediaRef is emitted via `select`.
-->
<script setup lang="ts">
import { ref, computed, onMounted } from '#imports'
import { ALLOWED_IMAGE_EXTENSIONS, ALLOWED_DOCUMENT_EXTENSIONS } from '~/lib/image-types'
import type { MediaRef } from '~/types/content'

const props = withDefaults(
  defineProps<{ mode?: 'upload' | 'browse'; kind?: 'image' | 'file' }>(),
  { mode: 'upload', kind: 'image' },
)
const emit = defineEmits<{ select: [ref: MediaRef] }>()

const { upload, uploadDocument, browse } = useUpload()

// Accept filter: images for kind="image", documents for kind="file".
const accept = computed(() =>
  props.kind === 'file'
    ? ALLOWED_DOCUMENT_EXTENSIONS.map((e) => `.${e}`).join(',')
    : ALLOWED_IMAGE_EXTENSIONS.map((e) => `.${e}`).join(','),
)

// --- upload-new state ---
const fileInputRef = ref<HTMLInputElement | null>(null)
const file = ref<File | null>(null)
const alt = ref('')
const caption = ref('')
const busy = ref(false)
const error = ref<string | null>(null)
const submitted = ref(false)

// For kind="image": require alt. For kind="file": no alt needed.
const canSubmit = computed(() =>
  props.kind === 'file'
    ? !!file.value && !busy.value
    : !!file.value && alt.value.trim().length > 0 && !busy.value,
)
const altError = computed(() =>
  props.kind === 'image' && submitted.value && !alt.value.trim() ? 'Alt text is required' : undefined,
)

function setFile(f: File | null) { file.value = f; error.value = null }
function setAlt(v: string) { alt.value = v }
function setCaption(v: string) { caption.value = v }

function openFilePicker() {
  fileInputRef.value?.click()
}

function onFileInput(e: Event) {
  const input = e.target as HTMLInputElement
  setFile(input.files?.[0] ?? null)
}
function onDrop(e: DragEvent) {
  e.preventDefault()
  setFile(e.dataTransfer?.files?.[0] ?? null)
}

async function submit() {
  submitted.value = true
  if (!canSubmit.value || !file.value) return // alt-required gate (images only)
  busy.value = true
  error.value = null
  try {
    let ref: MediaRef
    if (props.kind === 'file') {
      ref = await uploadDocument(file.value)
    } else {
      ref = await upload(file.value, {
        alternativeText: alt.value.trim(),
        caption: caption.value.trim() || undefined,
      })
    }
    emit('select', ref)
    file.value = null
    alt.value = ''
    caption.value = ''
    submitted.value = false
    // Reset the native input so the same file can be re-selected.
    if (fileInputRef.value) fileInputRef.value.value = ''
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Upload failed.'
  } finally {
    busy.value = false
  }
}

// --- pick-existing state ---
const items = ref<MediaRef[]>([])

async function loadLibrary() { items.value = await browse() }
function choose(ref: MediaRef) { emit('select', ref) }

onMounted(() => { if (props.mode === 'browse') loadLibrary() })

// Exposed for component tests (and for parent-driven control in later plans).
defineExpose({ setFile, setAlt, setCaption, submit, choose, canSubmit, altError, openFilePicker })
</script>

<template>
  <div class="media-picker">
    <!-- Upload-new -->
    <div v-if="mode === 'upload'">
      <!-- Hidden native file input — never renders "No file chosen" to the user. -->
      <input
        ref="fileInputRef"
        type="file"
        :accept="accept"
        class="sr-only"
        tabindex="-1"
        aria-hidden="true"
        @change="onFileInput"
      >

      <!-- Dropzone (drag-and-drop still works) -->
      <div
        class="dropzone border-2 border-dashed border-default rounded-lg p-4 text-center"
        @dragover.prevent
        @drop="onDrop"
      >
        <!-- No file selected yet -->
        <template v-if="!file">
          <p class="text-sm text-muted mb-2">
            {{ kind === 'file' ? 'Drag a document here, or choose a file.' : 'Drag an image here, or choose a file.' }}
          </p>
          <UButton size="sm" variant="outline" icon="i-lucide-upload" @click="openFilePicker">
            Choose file
          </UButton>
        </template>

        <!-- File selected — show selected state with name + actions -->
        <template v-else>
          <div class="flex items-center gap-3 justify-center flex-wrap">
            <span class="text-sm font-medium truncate max-w-xs" :title="file.name">{{ file.name }}</span>
            <div class="flex gap-2">
              <UButton size="xs" variant="outline" icon="i-lucide-refresh-cw" @click="openFilePicker">
                Replace
              </UButton>
              <UButton size="xs" variant="ghost" color="neutral" icon="i-lucide-x" @click="setFile(null)">
                Remove
              </UButton>
            </div>
          </div>
        </template>
      </div>

      <!-- Alt text + caption: only for images -->
      <template v-if="kind === 'image'">
        <UFormField label="Alt text (required)" :error="altError" class="mt-3">
          <UInput
            :model-value="alt"
            placeholder="Describe the image for screen readers"
            class="w-full"
            @update:model-value="setAlt($event)"
          />
        </UFormField>
        <UFormField label="Caption (optional)" class="mt-3">
          <UInput
            :model-value="caption"
            placeholder="Optional caption shown beneath the image"
            class="w-full"
            @update:model-value="setCaption($event)"
          />
        </UFormField>
      </template>

      <p v-if="error" role="alert" class="text-sm text-error mt-2">{{ error }}</p>
      <UButton class="mt-3" :disabled="!canSubmit" @click="submit">Upload</UButton>
    </div>

    <!-- Pick-existing -->
    <div v-else class="grid">
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        @click="choose(item)"
      >
        <img :src="item.url" :alt="item.alternativeText ?? ''" width="120">
      </button>
    </div>
  </div>
</template>
