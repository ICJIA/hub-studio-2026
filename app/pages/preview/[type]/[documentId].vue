<!-- app/pages/preview/[type]/[documentId].vue -->
<!--
  /preview/:type/:documentId — render a saved DRAFT exactly as it would publish, via the same
  Published*Preview components + renderMarkdown the editor modal uses (so preview == published),
  inside the swappable hub stylesheet (prose-preview.css). This is the shareable draft link: it
  stays private behind the global auth guard, so anyone signed in to the Studio (the reviewers)
  can open it — the "Copy share link" button grabs the stable URL.

  REVIEWER ANNOTATIONS (spec: docs/superpowers/specs/2026-07-04-reviewer-annotations-design.md):
  highlights + threaded comments as a pure overlay on the rendered preview. Anchors are captured
  from text selections over .published-content, stored via useAnnotations (localStorage in
  Phase 1), and painted as <mark data-ann-id> elements after render. The article markdown is
  never touched.
-->
<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from '#imports'
import type { Article, App, Dataset } from '~/types/content'
import type { AnnotationAnchor, AnnotationColor, AnnotationContentType, RailThread } from '~/types/annotations'
import { ANNOTATION_COLORS } from '~/types/annotations'
import { captureAnchor, resolveAnchor } from '~/lib/annotations/anchor'
import { paintOffsets, clearAnnotations } from '~/lib/annotations/paint'
import { ANNOTATIONS_STORAGE_PREFIX, annotationsStorageKey } from '~/lib/annotations/store-local'

const route = useRoute()
const type = route.params.type as 'article' | 'app' | 'dataset'
const documentId = route.params.documentId as string
const toast = useToast()

const repo = type === 'article' ? useArticles() : type === 'app' ? useApps() : useDatasets()
const entry = ref<Article | App | Dataset | null>(null)
const loading = ref(true)

const asArticle = computed(() => (type === 'article' ? (entry.value as Article | null) : null))
const asApp = computed(() => (type === 'app' ? (entry.value as App | null) : null))
const asDataset = computed(() => (type === 'dataset' ? (entry.value as Dataset | null) : null))

/** Copy this draft's stable preview URL — opens for anyone signed in to the Studio. */
async function copyShareLink() {
  try {
    await navigator.clipboard.writeText(window.location.href)
    toast.add({ title: 'Share link copied', description: 'Anyone signed in to the Studio can open it.', color: 'success' })
  } catch {
    toast.add({ title: 'Could not copy link', description: window.location.href, color: 'error' })
  }
}

// ---------------------------------------------------------------------------
// Reviewer annotations
// ---------------------------------------------------------------------------

const ann = useAnnotations(type as AnnotationContentType, documentId)

const COLOR_KEY = `${ANNOTATIONS_STORAGE_PREFIX}:color`
function initialColor(): AnnotationColor {
  try {
    const saved = window.localStorage.getItem(COLOR_KEY) as AnnotationColor | null
    return saved && (ANNOTATION_COLORS as readonly string[]).includes(saved) ? saved : 'yellow'
  } catch { return 'yellow' }
}

const armed = ref(false)
const color = ref<AnnotationColor>('yellow')
const filter = ref<'open' | 'resolved' | 'all'>('open')
const railOpen = ref(true)
const activeId = ref<string | null>(null)
/** Pending composer state: anchor captured, waiting for the comment body. */
const composer = ref<{ anchor: AnnotationAnchor; position: { x: number; y: number } } | null>(null)
/** id → resolved start offset (null = orphan). Drives rail order + orphan flags. */
const resolvedStarts = ref<Record<string, number | null>>({})

const previewWrap = ref<HTMLElement | null>(null)
function annotationContainer(): Element | null {
  return previewWrap.value?.querySelector('.published-content') ?? null
}

const openCount = computed(() => ann.annotations.value.filter((a) => !a.resolved).length)
const threads = computed<RailThread[]>(() => ann.annotations.value.map((a) => ({
  annotation: a,
  orphan: resolvedStarts.value[a.id] === null,
  start: resolvedStarts.value[a.id] ?? null,
})))

function setColor(c: AnnotationColor) {
  color.value = c
  try { window.localStorage.setItem(COLOR_KEY, c) } catch { /* preference only */ }
}

/** Whether a painted annotation is visible under the current filter. */
function visibleUnderFilter(resolved: boolean): boolean {
  return filter.value === 'all' || (filter.value === 'resolved') === resolved
}

/** Re-resolve + repaint every annotation. Idempotent: clears first, then paints the
 *  filtered set; records start offsets (null → orphan) for the rail. */
function repaint() {
  const container = annotationContainer()
  if (!container) return
  clearAnnotations(container)
  const starts: Record<string, number | null> = {}
  for (const a of ann.annotations.value) {
    const span = resolveAnchor(container, a.anchor)
    starts[a.id] = span ? span.start : null
    if (!span || !visibleUnderFilter(a.resolved)) continue
    const marks = paintOffsets(container, span.start, span.end, a.id, a.color)
    for (const m of marks) {
      if (a.resolved) m.classList.add('ann--resolved')
      if (a.id === activeId.value) m.classList.add('ann--active')
      m.setAttribute('aria-label', `Review comment by ${a.createdBy.name}: ${a.anchor.exact.slice(0, 60)}`)
    }
  }
  resolvedStarts.value = starts
}

/** Open a thread from its highlight: activate, open the rail, let the rail scroll to it. */
function openThread(id: string) {
  activeId.value = id
  railOpen.value = true
  repaint()
  // repaint() replaced the activated mark with a fresh element — restore keyboard focus
  // to it so Enter/Space activation doesn't drop focus to <body>.
  annotationContainer()
    ?.querySelector<HTMLElement>(`mark[data-ann-id="${CSS.escape(id)}"]`)
    ?.focus({ preventScroll: true })
}

/** Click / keyboard activation on painted marks (event delegation on the wrapper). */
function onContainerClick(e: MouseEvent) {
  const mark = (e.target as HTMLElement).closest?.('mark[data-ann-id]') as HTMLElement | null
  if (mark?.dataset.annId) openThread(mark.dataset.annId)
}
function onContainerKeydown(e: KeyboardEvent) {
  if (e.key !== 'Enter' && e.key !== ' ') return
  const mark = (e.target as HTMLElement).closest?.('mark[data-ann-id]') as HTMLElement | null
  if (mark?.dataset.annId) { e.preventDefault(); openThread(mark.dataset.annId) }
}

/** Armed-highlighter selection flow → composer. */
function onMouseUp() {
  if (!armed.value || composer.value) return
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return
  const container = annotationContainer()
  if (!container) return
  const range = sel.getRangeAt(0)
  const res = captureAnchor(container, range)
  if (!res.ok) {
    if (res.reason !== 'outside' && res.reason !== 'empty') {
      const msg = res.reason === 'katex'
        ? 'Math and rendered widgets can’t be highlighted — select the surrounding text instead.'
        : 'That selection is too long to highlight — pick a shorter passage.'
      toast.add({ title: 'Can’t highlight that selection', description: msg, color: 'warning' })
    }
    return
  }
  const rect = range.getBoundingClientRect()
  composer.value = { anchor: res.anchor, position: { x: rect.left, y: rect.bottom + 8 } }
}

/** Screen-reader announcements for actions with no visible focus change (spec §6). */
const announce = ref('')
/** Blank the live region for a tick first: a consecutive IDENTICAL message would otherwise
 *  be an identical ref write — no DOM mutation, so screen readers would not re-announce. */
async function say(msg: string) {
  announce.value = ''
  await nextTick()
  announce.value = msg
}

async function saveComposer(body: string) {
  if (!composer.value) return
  const created = await ann.createAnnotation(composer.value.anchor, color.value, body)
  composer.value = null
  window.getSelection()?.removeAllRanges()
  await nextTick()
  activeId.value = created.id
  repaint()
  await say('Comment added')
}

async function onReply(id: string, body: string) { await ann.reply(id, body) }
async function onResolve(id: string, resolved: boolean) {
  await ann.setResolved(id, resolved)
  repaint()
  await say(resolved ? 'Thread resolved' : 'Thread reopened')
}
async function onRemove(id: string) {
  await ann.removeAnnotation(id)
  if (activeId.value === id) activeId.value = null
  repaint()
  await say('Thread deleted')
}

/** Rail → highlight: scroll the mark into view and flash it active. */
function jumpToMark(id: string) {
  activeId.value = id
  repaint()
  const mark = annotationContainer()?.querySelector<HTMLElement>(`mark[data-ann-id="${CSS.escape(id)}"]`)
  if (!mark) return
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  mark.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' })
  mark.focus({ preventScroll: true })
}

/** Another tab wrote THIS document's annotations → reload + repaint. Exact-key match:
 *  events for other documents (or the color preference) are none of our business. */
async function onStorage(e: StorageEvent) {
  if (e.key !== annotationsStorageKey(type, documentId)) return
  await ann.load()
  repaint()
}

watch(filter, () => repaint())

onMounted(async () => {
  color.value = initialColor()
  window.addEventListener('storage', onStorage)
  try {
    entry.value = await repo.findOne(documentId, { status: 'draft' })
  } finally {
    loading.value = false
  }
  await ann.load()
  await nextTick() // let the Published*Preview render its v-html body first
  repaint()
})

onBeforeUnmount(() => window.removeEventListener('storage', onStorage))
</script>

<template>
  <!-- the page has the sticky Studio header (~4rem), so the TOC sticks below it -->
  <div class="max-w-6xl mx-auto" style="--published-toc-top: 5rem">
    <p v-if="loading" class="text-muted">Loading…</p>
    <template v-else-if="entry">
      <div class="flex items-center justify-between gap-4 mb-5 flex-wrap">
        <p class="text-xs text-muted uppercase tracking-wide">Draft preview</p>
        <div class="flex items-center gap-3 flex-wrap">
          <AnnotationBar
            :armed="armed"
            :color="color"
            :filter="filter"
            :open-count="openCount"
            @update:armed="armed = $event"
            @update:color="setColor"
            @update:filter="filter = $event"
            @toggle-rail="railOpen = !railOpen"
          />
          <UButton size="xs" variant="outline" color="neutral" icon="i-lucide-link" label="Copy share link" @click="copyShareLink" />
        </div>
      </div>

      <div class="flex items-start gap-6">
        <!-- -mx-4 sm:-mx-6 cancels the layout <main>'s horizontal padding so the article (and its
             full-bleed splash) reaches the container's edges. The body inset is carried
             by .published-layout / .published-content in prose-preview.css, so text stays readable. -->
        <div
          ref="previewWrap"
          class="-mx-4 sm:-mx-6 min-w-0 flex-1"
          :class="{ 'ann-arming': armed }"
          @click="onContainerClick"
          @keydown="onContainerKeydown"
          @mouseup="onMouseUp"
        >
          <PublishedArticlePreview v-if="asArticle" :article="asArticle" />
          <PublishedAppPreview v-else-if="asApp" :app="asApp" />
          <PublishedDatasetPreview v-else-if="asDataset" :dataset="asDataset" />
        </div>

        <aside v-if="railOpen" class="ann-rail-wrap hidden lg:block w-80 shrink-0 sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
          <AnnotationRail :threads="threads" :filter="filter" :active-id="activeId"
            @reply="onReply" @resolve="onResolve" @remove="onRemove" @jump="jumpToMark" />
        </aside>
      </div>

      <!-- Mobile: the rail as a slide-over drawer -->
      <div v-if="railOpen" class="lg:hidden fixed inset-y-0 right-0 z-40 w-80 max-w-full bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-700 shadow-xl overflow-y-auto p-3">
        <div class="flex justify-end mb-2">
          <UButton size="xs" variant="ghost" color="neutral" icon="i-lucide-x" aria-label="Close comments" @click="railOpen = false" />
        </div>
        <AnnotationRail :threads="threads" :filter="filter" :active-id="activeId"
          @reply="onReply" @resolve="onResolve" @remove="onRemove" @jump="jumpToMark" />
      </div>

      <AnnotationComposer
        v-if="composer"
        :position="composer.position"
        :quote="composer.anchor.exact"
        @save="saveComposer"
        @cancel="composer = null"
      />

      <p class="sr-only" role="status" aria-live="polite">{{ announce }}</p>
    </template>
    <p v-else class="text-muted">Not found.</p>
  </div>
</template>

<style scoped>
/* Crosshair-ish cue while the highlighter is armed. */
.ann-arming :deep(.published-content) { cursor: text; }
</style>
