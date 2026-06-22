<!-- app/components/ContentList.vue -->
<!--
  ContentList: paginated, columnar listing for one content type. Shows ALL items (published + draft)
  unless a `status` is passed — it is NOT author-scoped.
  Fetches via repo.listPage({ status, sort, type, page, pageSize }).
  Columns: Date · Title · Type · Author(s) · Status · Actions.
  Articles also get a "Type" filter dropdown above the list: it filters across ALL articles through
  the repo (not just the loaded page) and re-pages from 1; "All types" clears it.
  The #row-actions slot (used by manage.vue) passes :document-id and :published.
-->
<script setup lang="ts">
import { ref, watch, computed, onMounted } from '#imports'
import type { ContentStatus } from '~/types/content'
import type { PagedResult } from '~/lib/repository'
import { ARTICLE_TYPE_OPTIONS, articleTypeLabel } from '~/lib/field-options'

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
    <!-- Article TYPE filter — filters across ALL articles via the repo, then re-pages from 1.
         "All types" clears it. Shown for the article list only (apps/datasets have no `type`). -->
    <div v-if="showTypeFilter" class="mb-3 flex items-center gap-2">
      <label class="text-sm text-muted" for="content-list-type-filter">Type</label>
      <USelect
        id="content-list-type-filter"
        v-model="selectedType"
        :items="typeItems"
        size="sm"
        class="min-w-[14rem]"
        aria-label="Filter by article type"
      />
    </div>

    <p v-if="loading" class="text-sm text-muted">Loading…</p>
    <template v-else>
      <p v-if="result.total === 0" class="text-sm text-muted">
        No {{ status ? `${status} ` : '' }}{{ type }}s{{ activeType ? ` of type "${articleTypeLabel(activeType)}"` : '' }} yet.
      </p>
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
                  <NuxtLink :to="`/preview/${type}/${item.documentId}`" class="text-primary underline">Preview</NuxtLink>
                  <slot name="row-actions" :document-id="item.documentId" :published="item.publishedAt != null" />
                </span>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Pager -->
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
