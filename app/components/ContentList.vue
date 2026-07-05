<!-- app/components/ContentList.vue -->
<!--
  ContentList: paginated listing for one content type, in TWO switchable views. Shows ALL
  items (published + draft) unless a `status` is passed — it is NOT author-scoped.
  Fetches via repo.listPage({ status, sort, type, page, pageSize }).

  Views (persisted per browser, icjia-studio-content-view-v1):
  - CARDS (default — user decision 2026-07-05, "visual-first for new users"): media cards,
    splash/image left with the STATUS BADGE riding the artwork corner, title + date/type/
    authors + a plain-text excerpt right, and the same Edit / Preview / row-actions tools.
  - LIST: the original columnar table (Date · Title · Type · Author(s) · Status · Actions).

  Articles also get a "Type" filter dropdown: it filters across ALL articles through the
  repo (not just the loaded page) and re-pages from 1; "All types" clears it.
  The #row-actions slot (used by manage.vue) passes :document-id and :published to BOTH views.
-->
<script setup lang="ts">
import { ref, watch, computed, onMounted } from '#imports'
import type { ContentStatus } from '~/types/content'
import type { PagedResult } from '~/lib/repository'
import { ARTICLE_TYPE_OPTIONS, articleTypeLabel } from '~/lib/field-options'
import { plainExcerpt } from '~/lib/text-excerpt'
import { safeHref } from '~/lib/safe-url'

const props = withDefaults(defineProps<{
  type: 'article' | 'app' | 'dataset'
  status?: ContentStatus
  pageSize?: number
}>(), { pageSize: 25 })

const repo = props.type === 'article' ? useArticles() : props.type === 'app' ? useApps() : useDatasets()

type AnyItem = {
  documentId: string
  title: string
  date?: string | null
  publishedAt?: string | null
  authors?: { title: string }[]
  contributors?: { title: string }[]
  updatedAt?: string | null
  type?: string | null
  // Card view: articles carry splash + abstract; apps carry image + description.
  splash?: { url?: string } | null
  image?: { url?: string } | null
  abstract?: string | null
  description?: string | null
}

// ---- Card ⇄ list view toggle (cards by default; the choice sticks per browser) ----
const VIEW_STORAGE_KEY = 'icjia-studio-content-view-v1'
const view = ref<'cards' | 'list'>('cards')
onMounted(() => {
  try { if (window.localStorage.getItem(VIEW_STORAGE_KEY) === 'list') view.value = 'list' } catch { /* preference only */ }
})
function setView(v: 'cards' | 'list') {
  view.value = v
  try { window.localStorage.setItem(VIEW_STORAGE_KEY, v) } catch { /* preference only */ }
}

function imageUrlOf(item: AnyItem): string | null {
  const media = props.type === 'article' ? item.splash : props.type === 'app' ? item.image : null
  if (!media?.url) return null
  // 2026-07-05 audit F-1 (defense-in-depth): media URLs come from the admin-only Media
  // Library, but pin the scheme anyway — same safeHref allowlist as every other URL sink;
  // anything else renders the neutral placeholder instead.
  const safe = safeHref(media.url)
  return safe === '#' ? null : safe
}
function excerptOf(item: AnyItem): string {
  return plainExcerpt(props.type === 'article' ? item.abstract : item.description, 240)
}

const result = ref<PagedResult<AnyItem>>({
  items: [], total: 0, page: 1, pageSize: props.pageSize, pageCount: 1,
})
const page = ref(1)
const loading = ref(true)

// Article `type` filter. Only articles carry a `type`, so the dropdown is shown for articles only.
// ALL_TYPES is a non-empty sentinel for "All types" — reka-ui's SelectItem forbids an empty-string
// value, so we use a token and map it to `undefined` (no repo filter) when querying.
const ALL_TYPES = '__all__'
const showTypeFilter = computed(() => props.type === 'article')
const selectedType = ref(ALL_TYPES)
const typeItems = computed(() => [
  { label: 'All types', value: ALL_TYPES },
  ...ARTICLE_TYPE_OPTIONS.map((t) => ({ label: articleTypeLabel(t), value: t })),
])
/** The type to send to the repo: undefined for "All types" (or a non-article list), else the value. */
const activeType = computed(() =>
  showTypeFilter.value && selectedType.value !== ALL_TYPES ? selectedType.value : undefined,
)

async function fetchPage() {
  loading.value = true
  try {
    // Sort by the article date so the Date column reads newest-first (true reverse-chronological).
    // selectedType filters across ALL items at the repo (undefined when '' / not an article list).
    const data = await repo.listPage({
      status: props.status,
      sort: 'date:desc',
      type: activeType.value,
      page: page.value,
      pageSize: props.pageSize,
    })
    result.value = data as PagedResult<AnyItem>
  } finally {
    loading.value = false
  }
}

onMounted(fetchPage)
watch(page, fetchPage)
// Changing the type filter re-pages from 1 (the watch on `page` won't fire if we're already on 1,
// so refetch explicitly here). Setting page to 1 first keeps the pager consistent across filters.
watch(selectedType, () => {
  if (page.value !== 1) page.value = 1 // triggers fetchPage via the page watch
  else fetchPage()
})

function formatDate(d: string | null | undefined): string {
  if (!d) return '—'
  return d.slice(0, 10) // YYYY-MM-DD
}

function authorLabel(item: AnyItem): string {
  const names = props.type === 'article'
    ? (item.authors ?? []).map((a) => a.title)
    : props.type === 'app'
      ? (item.contributors ?? []).map((c) => c.title)
      : []
  if (!names.length) return '—'
  if (names.length <= 2) return names.join(', ')
  return `${names.slice(0, 2).join(', ')} +${names.length - 2} more`
}
</script>

<template>
  <div>
    <!-- Header row: the article TYPE filter (articles only) + the card/list view toggle. -->
    <div class="mb-3 flex items-center gap-2 flex-wrap">
      <template v-if="showTypeFilter">
        <label class="text-sm text-muted" for="content-list-type-filter">Type</label>
        <USelect
          id="content-list-type-filter"
          v-model="selectedType"
          :items="typeItems"
          size="sm"
          class="min-w-[14rem]"
          aria-label="Filter by article type"
        />
      </template>
      <div class="ml-auto flex items-center gap-1" role="group" aria-label="View mode">
        <UButton
          data-test="view-cards"
          size="xs" color="neutral" icon="i-lucide-layout-grid" label="Cards"
          :variant="view === 'cards' ? 'solid' : 'outline'"
          :aria-pressed="view === 'cards' ? 'true' : 'false'"
          title="Card view" @click="setView('cards')"
        />
        <UButton
          data-test="view-list"
          size="xs" color="neutral" icon="i-lucide-list" label="List"
          :variant="view === 'list' ? 'solid' : 'outline'"
          :aria-pressed="view === 'list' ? 'true' : 'false'"
          title="List view" @click="setView('list')"
        />
      </div>
    </div>

    <p v-if="loading" class="text-sm text-muted">Loading…</p>
    <template v-else>
      <p v-if="result.total === 0" class="text-sm text-muted">
        No {{ status ? `${status} ` : '' }}{{ type }}s{{ activeType ? ` of type "${articleTypeLabel(activeType)}"` : '' }} yet.
      </p>
      <div v-else>
        <!-- CARD VIEW (default): the visual read — splash left with the status riding the
             artwork, everything a row would tell you (plus an excerpt) on the right. -->
        <ul v-if="view === 'cards'" data-test="content-cards" class="space-y-4">
          <li v-for="item in result.items" :key="item.documentId">
            <article class="flex flex-col sm:flex-row gap-4 rounded-lg border border-default bg-default p-3 sm:p-4 shadow-sm transition-shadow hover:shadow-md hover:border-accented">
              <div class="relative sm:w-56 shrink-0">
                <!-- The artwork is a door to the editor (aria-label carries the name — the
                     image is decorative). The badge stays OUTSIDE the link so the accessible
                     name stays clean. -->
                <NuxtLink
                  data-test="card-image-link"
                  :to="`/edit/${type}/${item.documentId}`"
                  :aria-label="`Edit ${item.title || '(untitled)'}`"
                  class="block rounded-md transition hover:opacity-90"
                >
                  <img
                    v-if="imageUrlOf(item)"
                    :src="imageUrlOf(item)!"
                    alt=""
                    loading="lazy"
                    class="h-40 sm:h-36 w-full rounded-md object-cover"
                  >
                  <div v-else data-test="card-image-placeholder" class="h-40 sm:h-36 w-full rounded-md bg-muted flex items-center justify-center" aria-hidden="true">
                    <UIcon name="i-lucide-image" class="size-7 text-dimmed" />
                  </div>
                </NuxtLink>
                <!-- Signature: state rides the artwork — Published/Draft reads at a glance.
                     Green = published, RED = draft (user decision 2026-07-05: a stronger
                     go/stop read than the table's quiet gray). -->
                <UBadge
                  data-test="card-status"
                  class="absolute left-2 top-2 shadow-sm"
                  :label="item.publishedAt ? 'Published' : 'Draft'"
                  :color="item.publishedAt ? 'success' : 'error'"
                  variant="solid"
                  size="sm"
                />
              </div>
              <div class="min-w-0 flex-1">
                <h3 class="text-base font-semibold leading-snug">
                  <NuxtLink
                    :to="`/edit/${type}/${item.documentId}`"
                    class="text-highlighted hover:text-primary hover:underline line-clamp-2"
                    :title="item.title || '(untitled)'"
                  >{{ item.title || '(untitled)' }}</NuxtLink>
                </h3>
                <div class="mt-1 flex items-center gap-x-2 gap-y-1 flex-wrap text-xs text-muted">
                  <span class="whitespace-nowrap">{{ formatDate(item.date) }}</span>
                  <UBadge v-if="showTypeFilter && item.type" :label="articleTypeLabel(item.type)" color="neutral" variant="subtle" size="sm" />
                  <span v-if="authorLabel(item) !== '—'" class="truncate">{{ authorLabel(item) }}</span>
                </div>
                <p v-if="excerptOf(item)" class="mt-2 text-sm text-toned line-clamp-3">{{ excerptOf(item) }}</p>
                <div class="mt-3 flex items-center gap-2 flex-wrap">
                  <UButton size="xs" variant="soft" color="primary" icon="i-lucide-pencil" label="Edit" :to="`/edit/${type}/${item.documentId}`" />
                  <!-- Tab-only preview: same per-document named tab the editor uses. -->
                  <UButton size="xs" variant="outline" color="neutral" icon="i-lucide-eye" label="Preview" :to="`/preview/${type}/${item.documentId}`" :target="`studio-preview-${item.documentId}`" />
                  <slot name="row-actions" :document-id="item.documentId" :published="item.publishedAt != null" />
                </div>
              </div>
            </article>
          </li>
        </ul>

        <!-- LIST VIEW: the original columnar table. -->
        <div v-else class="overflow-x-auto">
        <table class="w-full text-sm border-collapse">
          <thead>
            <tr class="border-b border-default text-left text-muted">
              <th scope="col" class="py-2 pr-4 font-medium whitespace-nowrap">Date</th>
              <th scope="col" class="py-2 pr-4 font-medium min-w-[12rem]">Title</th>
              <th v-if="showTypeFilter" scope="col" class="py-2 pr-4 font-medium whitespace-nowrap">Type</th>
              <th scope="col" class="py-2 pr-4 font-medium min-w-[8rem]">Author(s)</th>
              <th scope="col" class="py-2 pr-4 font-medium whitespace-nowrap">Status</th>
              <th scope="col" class="py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr v-for="item in result.items" :key="item.documentId" class="hover:bg-muted/30">
              <td class="py-2 pr-4 whitespace-nowrap text-muted">{{ formatDate(item.date) }}</td>
              <td class="py-2 pr-4 max-w-[20rem]">
                <NuxtLink
                  :to="`/edit/${type}/${item.documentId}`"
                  class="text-primary underline block truncate"
                  :title="item.title || '(untitled)'"
                >{{ item.title || '(untitled)' }}</NuxtLink>
              </td>
              <td v-if="showTypeFilter" class="py-2 pr-4 whitespace-nowrap">
                <UBadge
                  v-if="item.type"
                  :label="articleTypeLabel(item.type)"
                  color="neutral"
                  variant="subtle"
                  size="sm"
                />
                <span v-else class="text-muted">—</span>
              </td>
              <td class="py-2 pr-4 max-w-[14rem] truncate text-muted" :title="authorLabel(item)">
                {{ authorLabel(item) }}
              </td>
              <td class="py-2 pr-4 whitespace-nowrap">
                <UBadge
                  :label="item.publishedAt ? 'Published' : 'Draft'"
                  :color="item.publishedAt ? 'success' : 'neutral'"
                  variant="subtle"
                  size="sm"
                />
              </td>
              <td class="py-2">
                <span class="flex gap-3 items-center">
                  <NuxtLink :to="`/edit/${type}/${item.documentId}`" class="text-primary underline">Edit</NuxtLink>
                  <!-- Tab-only preview: same per-document named tab the editor's Live preview uses. -->
                  <NuxtLink :to="`/preview/${type}/${item.documentId}`" :target="`studio-preview-${item.documentId}`" class="text-primary underline">Preview</NuxtLink>
                  <slot name="row-actions" :document-id="item.documentId" :published="item.publishedAt != null" />
                </span>
              </td>
            </tr>
          </tbody>
        </table>
        </div>

        <!-- Pager (shared by both views) -->
        <div class="mt-4 flex items-center gap-3 text-sm text-muted">
          <UButton
            size="xs"
            variant="subtle"
            color="neutral"
            label="Prev"
            :disabled="page <= 1"
            @click="page--"
          />
          <span>Page {{ result.page }} of {{ result.pageCount }} · {{ result.total }} total</span>
          <UButton
            size="xs"
            variant="subtle"
            color="neutral"
            label="Next"
            :disabled="page >= result.pageCount"
            @click="page++"
          />
        </div>
      </div>
    </template>
  </div>
</template>
