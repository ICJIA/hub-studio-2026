<!-- app/components/MediaPicker.vue -->
<!--
  MediaPicker: upload-new OR pick-existing, backing every media field. Eager-upload yields a
  Media Library reference whose `url` is shown in the preview — NEVER a client-side data: /
  object-URL blob (the zero-base64 invariant, design spec §7/§13). Alt-text is REQUIRED before
  an upload completes; caption is optional. Both flow to Strapi via useUpload().upload's fileInfo.
  The selected MediaRef is emitted via `select`. Form wiring into content fields is Plan 4/5.
-->
<script setup lang="ts">
import { ref, computed, onMounted } from '#imports'
import { ALLOWED_IMAGE_EXTENSIONS } from '~/lib/image-types'
import type { MediaRef } from '~/types/content'

const props = withDefaults(defineProps<{ mode?: 'upload' | 'browse' }>(), { mode: 'upload' })
const emit = defineEmits<{ select: [ref: MediaRef] }>()

const { upload, browse } = useUpload()

// Accept filter shares the data-layer allowlist (no over-rejection of valid types).
const accept = ALLOWED_IMAGE_EXTENSIONS.map((e) => `.${e}`).join(',')

// --- upload-new state ---
const file = ref<File | null>(null)
const alt = ref('')
const caption = ref('')
const busy = ref(false)
const error = ref<string | null>(null)
const submitted = ref(false)

const canSubmit = computed(() => !!file.value && alt.value.trim().length > 0 && !busy.value)
const altError = computed(() => (submitted.value && !alt.value.trim() ? 'Alt text is required' : undefined))

function setFile(f: File | null) { file.value = f; error.value = null }
function setAlt(v: string) { alt.value = v }
function setCaption(v: string) { caption.value = v }

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
  if (!canSubmit.value || !file.value) return // alt-required gate
  busy.value = true
  error.value = null
  try {
    const ref = await upload(file.value, {
      alternativeText: alt.value.trim(),
      caption: caption.value.trim() || undefined,
    })
    emit('select', ref)
    file.value = null
    alt.value = ''
    caption.value = ''
    submitted.value = false
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
defineExpose({ setFile, setAlt, setCaption, submit, choose, canSubmit, altError })
</script>

<template>
  <div class="media-picker">
    <!-- Upload-new -->
    <div v-if="mode === 'upload'">
      <div
        class="dropzone"
        @dragover.prevent
        @drop="onDrop"
      >
        <input type="file" :accept="accept" @change="onFileInput">
        <p v-if="file">{{ file.name }}</p>
        <p v-else>Drag an image here, or choose a file.</p>
      </div>

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

      <p v-if="error" role="alert">{{ error }}</p>
      <UButton :disabled="!canSubmit" @click="submit">Upload</UButton>
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
