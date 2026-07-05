<!-- app/components/annotations/AnnotatedPreview.vue -->
<!--
  AnnotatedPreview: the reviewer-annotation surface, extracted from the /preview page
  (spec Addendum A) so BOTH the standalone /preview/:type/:documentId page and the editor's
  Live-preview modal carry the same tools around any Published*Preview content (default slot).

  Owns the whole overlay lifecycle: the sticky reviewer bar (arm/color/filter/rail toggle),
  armed-selection → composer capture (mouse + keyboard Enter), resolve+paint of stored anchors
  over `.published-content`, the comments rail (desktop column + mobile drawer), cross-tab
  storage refresh, last-used-color persistence, and the aria-live announcements.

  Anchors are quote-based (survive edits elsewhere; orphans stay listed), painted as
  <mark data-ann-id> elements, stored via useAnnotations keyed by contentType+documentId —
  the SAME threads everywhere the entry is previewed. The article markdown is never touched.

  Sticky offset: the bar (and rail top) sit at `--ann-sticky-top` (default 4rem — directly
  under the app's sticky h-16 nav). A scrolling ancestor that isn't the window (the preview
  modal) sets `--ann-sticky-top: 0px` on its wrapper.
-->
<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from '#imports'
import type { AnnotationAnchor, AnnotationColor, AnnotationContentType, RailThread } from '~/types/annotations'
import { ANNOTATION_COLORS } from '~/types/annotations'
import { captureAnchor, resolveAnchor } from '~/lib/annotations/anchor'
import { paintOffsets, clearAnnotations } from '~/lib/annotations/paint'
import { annotationsStorageKey } from '~/lib/annotations/store-local'

const props = defineProps<{
  contentType: AnnotationContentType
  documentId: string
  /** Extra classes for the preview wrapper (the /preview page passes its full-bleed
   *  negative margins; the modal passes nothing). */
  previewClass?: string
}>()

const toast = useToast()
const ann = useAnnotations(props.contentType, props.documentId)

// A literal, non-prefixed key: keeps this UI preference out of store-local.ts's
// annotations-prefix scan (locate()'s fallback storage walk matches by prefix).
const COLOR_KEY = 'icjia-studio-annotations-ui-v1:color'
function initialColor(): AnnotationColor {
  try {
    const saved = window.localStorage.getItem(COLOR_KEY) as AnnotationColor | null
    return saved && (ANNOTATION_COLORS as readonly string[]).includes(saved) ? saved : 'yellow'
  } catch { return 'yellow' }
}

const armed = ref(false)
const color = ref<AnnotationColor>('yellow')
const filter = ref<'open' | 'resolved' | 'all'>('open')
/** Comments start HIDDEN (user decision 2026-07-05): the preview opens as a clean read;
 *  the rail appears on demand — the Show comments toggle, opening a highlight, or arming
 *  the highlighter (setArmed below). Also keeps the mobile drawer from covering content
 *  on load. */
const railOpen = ref(false)
const activeId = ref<string | null>(null)
/** Pending composer state: anchor captured, waiting for the comment body. */
const composer = ref<{ anchor: AnnotationAnchor; position: { x: number; y: number } } | null>(null)
/** document.activeElement at the moment the composer opened — restored on cancel (spec §6
 *  "traps focus and restores it on close"); cleared (superseded by a focus-the-new-mark hop
 *  instead) on save. */
const composerReturnFocus = ref<Element | null>(null)
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

/** Arming opens the rail: the select→comment flow ends in a thread there, and the narrower
 *  prose column keeps the composer clear of the preview's right edge. Disarming deliberately
 *  leaves the rail alone — reviewers disarm to read or reply without accidental captures,
 *  and auto-closing would yank that context (including a reply mid-type). */
function setArmed(v: boolean) {
  armed.value = v
  if (v) railOpen.value = true
}

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
    // Overlapping annotations nest marks within this single pass — each paintOffsets() call
    // wraps its own range independently, so a later annotation's paint wins the overlap
    // region. Cosmetic only: purely visual, and fully recovered on the next clearAnnotations().
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
/** Shared armed-selection → composer capture flow (mouse and keyboard entry points).
 *  Stores the pre-open focus target so cancelComposer() can restore it on close (spec §6). */
function tryOpenComposerFromSelection() {
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
  composerReturnFocus.value = document.activeElement
  composer.value = { anchor: res.anchor, position: { x: rect.left, y: rect.bottom + 8 } }
}

/** Enter/Space activates a painted mark (existing path — checked first, takes precedence).
 *  Otherwise, with the highlighter armed and a live text selection, Enter alone opens the
 *  composer: the keyboard-only path to start a comment (WCAG 2.1.1 — selection-to-comment
 *  isn't mouse-only). */
function onContainerKeydown(e: KeyboardEvent) {
  const mark = (e.target as HTMLElement).closest?.('mark[data-ann-id]') as HTMLElement | null
  if (mark?.dataset.annId) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openThread(mark.dataset.annId) }
    return
  }
  if (!armed.value || e.key !== 'Enter' || composer.value) return
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return
  e.preventDefault()
  tryOpenComposerFromSelection()
}

/** Armed-highlighter mouse selection flow → composer. */
function onMouseUp() {
  if (!armed.value || composer.value) return
  tryOpenComposerFromSelection()
}

/** Close the composer and restore focus to wherever it was before opening (spec §6 "traps
 *  focus and restores it on close") — otherwise Cancel/Escape would drop focus to <body>. */
function cancelComposer() {
  composer.value = null
  const el = composerReturnFocus.value
  if (el instanceof HTMLElement) el.focus({ preventScroll: true })
  composerReturnFocus.value = null
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
  if (filter.value === 'resolved') filter.value = 'open' // the new thread must be visible now
  // If the line above just flipped the filter, `watch(filter, ...)` schedules its OWN
  // repaint() — awaiting a tick lets that run first, so it can't unwrap/rewrap (and thus
  // steal focus from) the mark we're about to focus below with OUR repaint().
  await nextTick()
  repaint()
  // Meaningful post-close focus: land on the new highlight rather than dropping to <body>.
  annotationContainer()
    ?.querySelector<HTMLElement>(`mark[data-ann-id="${CSS.escape(created.id)}"]`)
    ?.focus({ preventScroll: true })
  composerReturnFocus.value = null
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
  if (e.key !== annotationsStorageKey(props.contentType, props.documentId)) return
  await ann.load()
  repaint()
}

watch(filter, () => repaint())

onMounted(async () => {
  color.value = initialColor()
  window.addEventListener('storage', onStorage)
  await ann.load()
  await nextTick() // let the slotted Published*Preview render its v-html body first
  repaint()
})

onBeforeUnmount(() => window.removeEventListener('storage', onStorage))
</script>

<template>
  <div>
    <!-- Sticky reviewer toolbar (spec §6 "sticky"): pinned below the app nav on the page
         (--ann-sticky-top default 4rem) or to the top of the modal's scroll area (0px).
         Same frosted treatment as the editor's sticky article toolbar. -->
    <div class="ann-bar-row sticky top-[var(--ann-sticky-top,4rem)] z-30 -mt-1 mb-4 flex items-center justify-between gap-3 flex-wrap border-b border-default bg-default/85 px-1 py-2 backdrop-blur-md">
      <slot name="bar-leading" />
      <div class="flex items-center gap-3 flex-wrap">
        <AnnotationBar
          :armed="armed"
          :color="color"
          :filter="filter"
          :open-count="openCount"
          :rail-open="railOpen"
          @update:armed="setArmed"
          @update:color="setColor"
          @update:filter="filter = $event"
          @toggle-rail="railOpen = !railOpen"
        />
        <slot name="bar-actions" />
      </div>
    </div>

    <div class="flex items-start gap-6">
      <div
        ref="previewWrap"
        class="min-w-0 flex-1"
        :class="[previewClass, armed ? ['ann-arming', `ann-arming--${color}`] : []]"
        @click="onContainerClick"
        @keydown="onContainerKeydown"
        @mouseup="onMouseUp"
      >
        <slot />
      </div>

      <aside v-if="railOpen" class="ann-rail-wrap hidden lg:block w-80 shrink-0 sticky top-[calc(var(--ann-sticky-top,4rem)+4rem)] max-h-[calc(100vh-var(--ann-sticky-top,4rem)-5rem)] overflow-y-auto">
        <AnnotationRail :threads="threads" :filter="filter" :active-id="activeId"
          @reply="onReply" @resolve="onResolve" @remove="onRemove" @jump="jumpToMark" />
      </aside>
    </div>

    <!-- Mobile: the rail as a slide-over drawer (z above the preview modal's overlay). -->
    <div v-if="railOpen" class="lg:hidden fixed inset-y-0 right-0 z-[60] w-80 max-w-full bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-700 shadow-xl overflow-y-auto p-3">
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
      @cancel="cancelComposer"
    />

    <p class="sr-only" role="status" aria-live="polite">{{ announce }}</p>
  </div>
</template>

<style scoped>
/* Crosshair-ish cue while the highlighter is armed. */
.ann-arming :deep(.published-content) { cursor: text; }
</style>
