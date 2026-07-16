<!-- app/components/MediaLibraryGrid.vue -->
<!--
  MediaLibraryGrid: the shared "existing images" browser — newest ~20 Media Library images,
  whole-library name search (debounced), Load more paging, and a no-alt badge so authors see
  which images still need descriptions. Emits `select` with the chosen MediaRef; the CONSUMER
  owns what picking means (confirm panel / tray add). Works identically in demo-data sessions
  via useMediaLibrary()'s adapter seam; the demo note reminds presenters nothing persists.
-->
<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from '#imports'
import { DEFAULT_MEDIA_PAGE_SIZE } from '~/lib/media-library'
import { isDemoData } from '~/lib/demo'
import type { MediaRef } from '~/types/content'

const props = withDefaults(defineProps<{ pageSize?: number }>(), { pageSize: DEFAULT_MEDIA_PAGE_SIZE })
const emit = defineEmits<{ select: [ref: MediaRef] }>()

const { list } = useMediaLibrary()

const items = ref<MediaRef[]>([])
const search = ref('')
const page = ref(1)
const loading = ref(false)
const error = ref<string | null>(null)
const exhausted = ref(false)
const demoNote = isDemoData()

// Monotonic request-generation guard: each load() call claims the next generation. A response
// (success or failure) only touches state if its generation is still current when it settles —
// this way a slow, superseded request (e.g. a "Load more" that resolves after a newer reset
// search) can never clobber fresher state, no matter what order the promises settle in.
let generation = 0

async function load(reset = false) {
  const gen = ++generation
  if (reset) {
    page.value = 1
    exhausted.value = false
  }
  loading.value = true
  error.value = null
  try {
    const batch = await list({ page: page.value, pageSize: props.pageSize, search: search.value.trim() || undefined })
    if (gen !== generation) return
    items.value = reset ? batch : [...items.value, ...batch]
    exhausted.value = batch.length < props.pageSize
  } catch {
    if (gen !== generation) return
    error.value = 'Could not load the media library.'
    // A failed reset (e.g. a search) leaves nothing trustworthy on screen — clear the grid so
    // the error + Retry stand alone instead of floating stale items and an active Load more
    // under the error banner. A failed append (Load more) keeps the page you already have.
    if (reset) items.value = []
  } finally {
    if (gen === generation) loading.value = false
  }
}

function loadMore() {
  page.value += 1
  load()
}

function choose(item: MediaRef) {
  emit('select', item)
}

let debounce: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  clearTimeout(debounce)
  debounce = setTimeout(() => load(true), 300)
})
onBeforeUnmount(() => clearTimeout(debounce))
onMounted(() => load(true))

// Test seams: route through the SAME functions the UI uses.
defineExpose({ __load: load, __loadMore: loadMore, __choose: choose, __items: items, __search: search, __error: error, __exhausted: exhausted })
</script>

<template>
  <div class="media-library-grid" data-test="media-library-grid">
    <UInput
      v-model="search"
      size="sm"
      icon="i-lucide-search"
      placeholder="Search library by file name"
      aria-label="Search library by file name"
      class="w-full"
      data-test="library-search"
    />
    <p v-if="demoNote" class="mt-1 text-xs text-muted" data-test="library-demo-note">
      Demo: images added here last only for this session and are never saved.
    </p>

    <p v-if="error" role="alert" class="mt-2 text-sm text-error" data-test="library-error">
      {{ error }}
      <UButton size="xs" variant="outline" class="ml-2" data-test="library-retry" @click="load(true)">
        Retry
      </UButton>
    </p>
    <p v-else-if="!loading && items.length === 0" class="mt-2 text-sm text-muted" data-test="library-empty">
      {{ search.trim() ? 'No images match.' : 'No images yet.' }}
    </p>

    <ul v-if="items.length" class="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4" data-test="library-items">
      <li v-for="item in items" :key="item.id">
        <button
          type="button"
          class="group w-full rounded border border-default p-1 text-left hover:border-primary"
          :data-test="`library-item-${item.id}`"
          @click="choose(item)"
        >
          <img :src="item.url" :alt="item.alternativeText ?? ''" class="h-16 w-full rounded object-cover" loading="lazy">
          <span class="mt-1 block truncate text-[11px] text-muted" :title="item.name">{{ item.name }}</span>
          <span
            v-if="!(item.alternativeText ?? '').trim()"
            class="mt-0.5 inline-block rounded bg-warning/15 px-1 text-[10px] text-warning"
            :data-test="`no-alt-${item.id}`"
          >no alt text</span>
        </button>
      </li>
    </ul>

    <div class="mt-2">
      <UButton
        v-if="!exhausted && items.length"
        size="xs"
        variant="outline"
        :loading="loading"
        data-test="library-load-more"
        @click="loadMore"
      >
        Load more
      </UButton>
      <span v-else-if="loading" class="text-xs text-muted" data-test="library-loading">Loading…</span>
    </div>
  </div>
</template>
