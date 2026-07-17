<!-- app/components/MediaPicker.vue -->
<!--
  MediaPicker: LIBRARY-FIRST image picking. For kind="image" it renders [Library | Upload]
  tabs (Library default): the Library tab browses the Media Library (MediaLibraryGrid). A tile
  whose image already HAS alt text commits in ONE click (select emits straight from the tile —
  no confirm step); only an alt-LESS image opens the pick-confirm panel, which REQUIRES alt —
  the typed alt is written back to the media record (updateInfo; in-memory in demo) so the
  shared library improves. The Upload tab is the original eager-upload flow (alt REQUIRED before an image
  upload completes; caption optional), now routed through useMediaLibrary().uploadImage so it
  is demo-capable. Every emitted `url` is a Media Library URL or (demo sessions only) a blob:
  object URL — NEVER a data: URI (the zero-base64 invariant, design spec §7/§13).
  kind="file" (PDF/docs) is unchanged: upload-only, no tabs, no alt/caption, via
  useUpload().uploadDocument. The native <input type="file"> is always HIDDEN.
  The [Library|Upload] tab bar is UTabs (@nuxt/ui, built on Reka UI's
  TabsRoot/TabsList/TabsTrigger/TabsContent) — a spec-correct ARIA Tabs pattern
  (id/aria-controls/aria-labelledby linking + roving-tabindex/ArrowLeft/ArrowRight/
  Home/End keyboard model) instead of a hand-rolled tablist that only *looked* like one.
-->
<script setup lang="ts">
import { ref, computed } from '#imports'
import { ALLOWED_IMAGE_EXTENSIONS, ALLOWED_DOCUMENT_EXTENSIONS } from '~/lib/image-types'
import type { UploadInfo } from '~/lib/upload'
import type { MediaRef } from '~/types/content'

const props = withDefaults(defineProps<{ kind?: 'image' | 'file' }>(), { kind: 'image' })
const emit = defineEmits<{ select: [ref: MediaRef] }>()

const { uploadDocument } = useUpload()
const { uploadImage, updateInfo } = useMediaLibrary()

// Accept filter: images for kind="image", documents for kind="file".
const accept = computed(() =>
  props.kind === 'file'
    ? ALLOWED_DOCUMENT_EXTENSIONS.map((e) => `.${e}`).join(',')
    : ALLOWED_IMAGE_EXTENSIONS.map((e) => `.${e}`).join(','),
)

// --- tabs (images only; kind="file" renders the upload block directly, no tabs) ---
// UTabs owns the full ARIA Tabs contract (id/aria-controls/aria-labelledby linking
// between each tab and its panel, plus the roving-tabindex + arrow-key/Home/End
// keyboard model) — `tab` stays the single source of truth (and the __tab test seam);
// `tabItems` only declares identity + which named slot holds each panel's content.
const tab = ref<'library' | 'upload'>('library')
const tabItems = [
  { label: 'Library', value: 'library' as const, slot: 'library' as const },
  { label: 'Upload', value: 'upload' as const, slot: 'upload' as const },
]
// UTabs' modelValue/update:modelValue are typed string|number (Reka's generic Tabs
// contract, shared with every value type a consumer might use); bridge explicitly so
// `tab` keeps its narrow 'library'|'upload' type for every other reader (__tab, etc.)
// instead of widening it to string everywhere.
function onTabChange(value: string | number) {
  tab.value = value === 'upload' ? 'upload' : 'library'
}

// --- upload-new state (unchanged flow) ---
const fileInputRef = ref<HTMLInputElement | null>(null)
const file = ref<File | null>(null)
const alt = ref('')
const caption = ref('')
const busy = ref(false)
const error = ref<string | null>(null)
const submitted = ref(false)

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
function openFilePicker() { fileInputRef.value?.click() }

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
    let mediaRef: MediaRef
    if (props.kind === 'file') {
      mediaRef = await uploadDocument(file.value)
    } else {
      mediaRef = await uploadImage(file.value, {
        alternativeText: alt.value.trim(),
        caption: caption.value.trim() || undefined,
      })
    }
    emit('select', mediaRef)
    file.value = null
    alt.value = ''
    caption.value = ''
    submitted.value = false
    if (fileInputRef.value) fileInputRef.value.value = ''
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Upload failed.'
  } finally {
    busy.value = false
  }
}

// --- library pick-confirm state ---
const picked = ref<MediaRef | null>(null)
const pickedAlt = ref('')
const pickedCaption = ref('')
const pickBusy = ref(false)
const pickError = ref<string | null>(null)

const pickedNeedsAlt = computed(() => !!picked.value && !(picked.value.alternativeText ?? '').trim())
const canUsePicked = computed(() =>
  !!picked.value && !pickBusy.value && (!pickedNeedsAlt.value || pickedAlt.value.trim().length > 0),
)

// Monotonic per-flow generation guard: usePicked() claims the next generation when it actually
// starts a write-back (the "needs alt" path); onLibrarySelect (a new/different pick) and
// clearPicked both bump it too, so picking a different image or cancelling invalidates any
// in-flight write-back. The write-back's settling (success OR failure) only commits — select
// emit, `picked` clear, or error paint — if its generation is still current; a stale settle is a
// pure no-op. Mirrors MediaLibraryGrid.load()'s `generation` guard and MediaField.persistInfo()'s
// `persistSeq` guard (and BodyImagesField's identical `pickSeq` guard on its own confirm flow).
// `pickBusy`'s reset in usePicked's `finally` deliberately stays unconditional — only one
// write-back can ever be in flight at a time (the synchronous canUsePicked/pickBusy guard
// prevents overlap), so there's no newer in-flight request a stale settle could stomp on.
let pickSeq = 0

/** Single-click commit (user decision 2026-07-17): a tile whose image already HAS alt text
 *  emits select right from the click — no "Use this image" confirm step, which rendered BELOW
 *  the grid (off-viewport on the edit page's sidebar) and read as "my click did nothing". Same
 *  rule BodyImagesField.onLibraryPick has always applied to its tray. The pick-confirm panel
 *  below now exists ONLY as the alt-required gate; existing alt is never silently overwritten. */
function onLibrarySelect(mediaRef: MediaRef) {
  pickSeq++ // a new pick invalidates any in-flight write-back for whatever was picked before
  if ((mediaRef.alternativeText ?? '').trim()) {
    picked.value = null
    pickError.value = null
    emit('select', mediaRef)
    return
  }
  picked.value = mediaRef
  pickedAlt.value = ''
  pickedCaption.value = mediaRef.caption ?? ''
  pickError.value = null
}

async function usePicked() {
  if (!picked.value || !canUsePicked.value) return
  // Image already has alt → use as-is; existing alt is NEVER silently overwritten here.
  if (!pickedNeedsAlt.value) {
    emit('select', picked.value)
    picked.value = null
    return
  }
  // Missing alt → the typed alt is REQUIRED and written back to the shared record.
  const seq = ++pickSeq
  pickBusy.value = true
  pickError.value = null
  try {
    const info: UploadInfo = { alternativeText: pickedAlt.value.trim() }
    if (pickedCaption.value.trim()) info.caption = pickedCaption.value.trim()
    const updated = await updateInfo(picked.value.id, info)
    if (seq !== pickSeq) return // cancelled or superseded while in flight — commit nothing
    emit('select', updated)
    picked.value = null
  } catch {
    if (seq !== pickSeq) return // cancelled or superseded while in flight — no stale error paint
    pickError.value = 'Could not save the alt text. Please try again.'
  } finally {
    pickBusy.value = false
  }
}

// clearPicked (the "X" cancel button) is deliberately left clickable while pickBusy is true (no
// :disabled on that UButton) — cancelling a mid-flight write-back is exactly the affordance this
// generation guard exists for. Bumping pickSeq is what makes that click actually abort the
// pending commit, not just hide the panel, once usePicked()'s in-flight call settles.
function clearPicked() {
  pickSeq++
  picked.value = null
  pickedAlt.value = ''
  pickedCaption.value = ''
  pickError.value = null
}

// Exposed for component tests (and for parent-driven control).
defineExpose({
  setFile, setAlt, setCaption, submit, canSubmit, altError, openFilePicker,
  __tab: tab,
  __onLibrarySelect: onLibrarySelect,
  __usePicked: usePicked,
  __picked: picked,
  __pickedAlt: pickedAlt,
  __pickedCaption: pickedCaption,
  __pickError: pickError,
})
</script>

<template>
  <div class="media-picker">
    <!-- Tabs: images only. UTabs supplies the full ARIA Tabs relationship (id +
         aria-controls + aria-labelledby between each tab and its panel) and keyboard
         model (roving tabindex, ArrowLeft/ArrowRight/Home/End) — see the file-header
         comment. `items[].slot` routes each tab's panel content to the named slot below. -->
    <UTabs
      v-if="kind === 'image'"
      :model-value="tab"
      :items="tabItems"
      size="xs"
      :ui="{ list: 'mb-3' }"
      @update:model-value="onTabChange"
    >
      <template #library>
        <div data-test="library-panel">
          <MediaLibraryGrid @select="onLibrarySelect" />

          <div v-if="picked" class="mt-3 rounded border border-default p-3" data-test="pick-confirm">
            <div class="flex items-start gap-3">
              <img :src="picked.url" :alt="picked.alternativeText ?? ''" width="96" class="rounded border border-default object-cover">
              <div class="min-w-0 flex-1 text-sm">
                <p class="truncate font-medium" :title="picked.name">{{ picked.name }}</p>
                <p v-if="!pickedNeedsAlt" class="mt-1 text-xs text-muted">Alt text: {{ picked.alternativeText }}</p>
                <p v-else class="mt-1 text-xs text-warning" data-test="pick-needs-alt">
                  This library image has no alt text.
                </p>
              </div>
              <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-x" aria-label="Cancel selection" @click="clearPicked" />
            </div>

            <template v-if="pickedNeedsAlt">
              <UFormField label="Alt text (required)" class="mt-3">
                <UInput
                  :model-value="pickedAlt"
                  placeholder="Describe the image for screen readers"
                  class="w-full"
                  data-test="picked-alt"
                  @update:model-value="pickedAlt = $event as string"
                />
              </UFormField>
              <UFormField label="Caption (optional)" class="mt-3">
                <UInput
                  :model-value="pickedCaption"
                  placeholder="Optional caption shown beneath the image"
                  class="w-full"
                  data-test="picked-caption"
                  @update:model-value="pickedCaption = $event as string"
                />
              </UFormField>
            </template>

            <p v-if="pickError" role="alert" class="mt-2 text-sm text-error" data-test="pick-error">{{ pickError }}</p>
            <UButton class="mt-3" :disabled="!canUsePicked" :loading="pickBusy" data-test="use-picked" @click="usePicked">
              Use this image
            </UButton>
          </div>
        </div>
      </template>

      <template #upload>
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
          <template v-if="!file">
            <p class="text-sm text-muted mb-2">Drag an image here, or choose a file.</p>
            <UButton size="sm" variant="outline" icon="i-lucide-upload" @click="openFilePicker">
              Choose file
            </UButton>
          </template>

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

        <UFormField label="Alt text (required)" :error="altError" class="mt-3">
          <UInput
            :model-value="alt"
            placeholder="Describe the image for screen readers"
            class="w-full"
            @update:model-value="setAlt($event as string)"
          />
        </UFormField>
        <UFormField label="Caption (optional)" class="mt-3">
          <UInput
            :model-value="caption"
            placeholder="Optional caption shown beneath the image"
            class="w-full"
            @update:model-value="setCaption($event as string)"
          />
        </UFormField>

        <p v-if="error" role="alert" class="text-sm text-error mt-2">{{ error }}</p>
        <UButton class="mt-3" :disabled="!canSubmit" @click="submit">Upload</UButton>
      </template>
    </UTabs>

    <!-- kind="file": upload-only, no tabs at all — stays completely outside the tabs.
         (This duplicates the dropzone/input/submit markup from the #upload slot above
         rather than sharing it: kind="file" must render with NO tablist/tabpanel in the
         DOM at all, so this block can never be a UTabs panel — there's no single node
         Vue can place in two structurally different parents at once.) -->
    <div v-if="kind === 'file'">
      <input
        ref="fileInputRef"
        type="file"
        :accept="accept"
        class="sr-only"
        tabindex="-1"
        aria-hidden="true"
        @change="onFileInput"
      >

      <div
        class="dropzone border-2 border-dashed border-default rounded-lg p-4 text-center"
        @dragover.prevent
        @drop="onDrop"
      >
        <template v-if="!file">
          <p class="text-sm text-muted mb-2">Drag a document here, or choose a file.</p>
          <UButton size="sm" variant="outline" icon="i-lucide-upload" @click="openFilePicker">
            Choose file
          </UButton>
        </template>

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

      <p v-if="error" role="alert" class="text-sm text-error mt-2">{{ error }}</p>
      <UButton class="mt-3" :disabled="!canSubmit" @click="submit">Upload</UButton>
    </div>
  </div>
</template>
