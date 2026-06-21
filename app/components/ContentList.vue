<!-- app/components/ContentList.vue -->
<!--
  ContentList: paginated, columnar listing for one content type.
  Fetches via repo.listPage({ status, sort, page, pageSize }).
  Columns: Date · Title · Author(s) · Status · Actions.
  The #row-actions slot (used by manage.vue) passes :document-id and :published.
-->
<script setup lang="ts">
import { ref, watch, onMounted } from '#imports'
import type { ContentStatus } from '~/types/content'
import type { PagedResult } from '~/lib/repository'

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
}

const result = ref<PagedResult<AnyItem>>({
  items: [], total: 0, page: 1, pageSize: props.pageSize, pageCount: 1,
})
const page = ref(1)
const loading = ref(true)

async function fetchPage() {
  loading.value = true
  try {
    // Sort by the article date so the Date column reads newest-first (true reverse-chronological).
    const data = await repo.listPage({ status: props.status, sort: 'date:desc', page: page.value, pageSize: props.pageSize })
    result.value = data as PagedResult<AnyItem>
  } finally {
    loading.value = false
  }
}

onMounted(fetchPage)
watch(page, fetchPage)

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
    <p v-if="loading" class="text-sm text-muted">Loading…</p>
    <template v-else>
      <p v-if="result.total === 0" class="text-sm text-muted">
        No {{ status ? `${status} ` : '' }}{{ type }}s yet.
      </p>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm border-collapse">
          <thead>
            <tr class="border-b border-default text-left text-muted">
              <th scope="col" class="py-2 pr-4 font-medium whitespace-nowrap">Date</th>
              <th scope="col" class="py-2 pr-4 font-medium min-w-[12rem]">Title</th>
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
