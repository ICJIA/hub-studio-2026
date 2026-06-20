<!-- app/components/ImageDropzone.vue -->
<!--
  ImageDropzone: the author's inline-figure flow (design spec §7.3). Drag-and-drop one or more
  images → eager-upload EACH via useUpload().upload (extension-gate + SVG-sanitize happen inside)
  → render a clickable thumbnail gallery from each url → clicking a thumbnail emits `insert` with
  the markdown snippet ![alt](url "caption"). Every src/snippet is a Media Library URL — NEVER
  base64. Wiring this into the editor's uploadHandler is deferred to Plan 4/5.
-->
<script setup lang="ts">
import { ref } from '#imports'
import { ALLOWED_IMAGE_EXTENSIONS } from '~/lib/image-types'
import type { MediaRef } from '~/types/content'
import { toMarkdown } from '~/components/image-markdown'

const emit = defineEmits<{ insert: [snippet: string] }>()
const { upload } = useUpload()

const accept = ALLOWED_IMAGE_EXTENSIONS.map((e) => `.${e}`).join(',')
const gallery = ref<MediaRef[]>([])
const errors = ref<string[]>([])

/** Eager-upload each dropped/selected file; collect the resulting MediaRefs into the gallery. */
async function handleFiles(files: File[] | FileList) {
  for (const file of Array.from(files)) {
    try {
      const ref = await upload(file)
      gallery.value.push(ref)
    } catch (e) {
      errors.value.push(`${file.name}: ${e instanceof Error ? e.message : 'upload failed'}`)
    }
  }
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  if (e.dataTransfer?.files?.length) handleFiles(e.dataTransfer.files)
}
function onFileInput(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files?.length) handleFiles(input.files)
}

/** Click-to-insert: emit the markdown snippet for this image (URL, never base64). */
function insert(ref: MediaRef) { emit('insert', toMarkdown(ref)) }

defineExpose({ handleFiles, insert, gallery })
</script>

<template>
  <div class="image-dropzone">
    <div class="dropzone" @dragover.prevent @drop="onDrop">
      <input type="file" :accept="accept" multiple @change="onFileInput">
      <p>Drag images here, or choose files. Click a thumbnail to insert it.</p>
    </div>

    <ul v-if="errors.length" class="errors" role="alert">
      <li v-for="(msg, i) in errors" :key="i">{{ msg }}</li>
    </ul>

    <div class="grid">
      <button
        v-for="item in gallery"
        :key="item.id"
        type="button"
        class="thumb"
        :title="`Insert ${item.alternativeText ?? item.name ?? 'image'}`"
        @click="insert(item)"
      >
        <img :src="item.url" :alt="item.alternativeText ?? ''" width="120">
      </button>
    </div>
  </div>
</template>
