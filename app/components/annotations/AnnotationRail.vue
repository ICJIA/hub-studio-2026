<!-- app/components/annotations/AnnotationRail.vue -->
<!--
  The comments rail (spec §6): threads in document order (orphans last), reply box,
  resolve/reopen, delete (creator or Editor — canDeleteAnnotation), click-quote → jump
  to the highlight. Reads the auth store directly (PublishButton precedent). Comment
  bodies are Vue-interpolated text — NEVER v-html.

  Two layout modes:
  - flow (mobile drawer): cards stack normally.
  - ALIGNED (desktop aside passes `alignTops`, px per annotation id): Word-style margin
    comments — each card absolutely positioned level with its highlight, overlaps pushed
    down by the pure collision pass in lib/annotations/rail-layout.ts. Card heights are
    live-measured (ResizeObserver: replies grow cards), orphans align to the top.
-->
<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from '#imports'
import type { RailThread } from '~/types/annotations'
import { canDeleteAnnotation } from '~/lib/annotations/attribution'
import { layoutRailCards } from '~/lib/annotations/rail-layout'
import { useAuthStore } from '~/stores/auth'

type Filter = 'open' | 'resolved' | 'all'

const props = defineProps<{
  threads: RailThread[]
  filter: Filter
  activeId: string | null
  /** Word-style alignment (desktop rail): px top per annotation id, measured from the
   *  painted mark; null/absent id → orphan → aligns to the top. Omit for flow layout. */
  alignTops?: Record<string, number | null>
}>()
const emit = defineEmits<{
  reply: [id: string, body: string]
  resolve: [id: string, resolved: boolean]
  remove: [id: string]
  jump: [id: string]
}>()

const auth = useAuthStore()
const me = computed(() => ({ email: auth.user?.email ?? '', canPublish: auth.canPublish }))

/** Root of THIS rail instance. Card lookups are scoped here — never document-global —
 *  because the preview page mounts two rails at once (desktop aside + mobile drawer):
 *  global ids would be duplicated and getElementById would always hit the first copy. */
const rootEl = ref<HTMLElement | null>(null)

const drafts = ref<Record<string, string>>({})

const visible = computed(() => {
  const byFilter = props.threads.filter((t) =>
    props.filter === 'all' ? true : props.filter === 'resolved' ? t.annotation.resolved : !t.annotation.resolved,
  )
  return [...byFilter].sort((a, b) => {
    if (a.orphan !== b.orphan) return a.orphan ? 1 : -1
    if (!a.orphan) return (a.start ?? 0) - (b.start ?? 0)
    return a.annotation.createdAt.localeCompare(b.annotation.createdAt)
  })
})

// ---- Word-style aligned mode (only when the parent passes alignTops) ----
const aligned = computed(() => props.alignTops !== undefined)
const CARD_GAP = 12
const FALLBACK_CARD_HEIGHT = 140 // pre-measure estimate; corrected on the next frame

const cardEls = new Map<string, HTMLElement>()
const cardHeights = ref<Record<string, number>>({})

function setCardEl(id: string, el: unknown) {
  if (el instanceof HTMLElement) cardEls.set(id, el)
  else cardEls.delete(id)
}

let ro: ResizeObserver | null = null
function measureCards() {
  const next: Record<string, number> = {}
  for (const [id, el] of cardEls) next[id] = el.offsetHeight || FALLBACK_CARD_HEIGHT
  cardHeights.value = next
}
/** (Re)observe the current card set — cards mount/unmount with filter changes. */
async function observeCards() {
  if (!aligned.value) return
  await nextTick()
  measureCards()
  if (typeof ResizeObserver === 'undefined') return
  ro?.disconnect()
  ro = new ResizeObserver(() => measureCards())
  for (const el of cardEls.values()) ro.observe(el)
}
watch(() => [props.threads, props.filter, props.alignTops] as const, observeCards, { deep: true })
onMounted(observeCards)
onBeforeUnmount(() => ro?.disconnect())

const layout = computed(() => layoutRailCards(
  visible.value.map((t) => ({
    id: t.annotation.id,
    desiredTop: Math.max(0, props.alignTops?.[t.annotation.id] ?? 0),
    height: cardHeights.value[t.annotation.id] ?? FALLBACK_CARD_HEIGHT,
  })),
  CARD_GAP,
))

function cardStyle(id: string): Record<string, string> | undefined {
  if (!aligned.value) return undefined
  return { position: 'absolute', left: '0', right: '0', top: `${layout.value.positions[id] ?? 0}px` }
}

function sendReply(id: string) {
  const body = (drafts.value[id] ?? '').trim()
  if (!body) return
  emit('reply', id, body)
  drafts.value = { ...drafts.value, [id]: '' }
}

function timeOf(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString()
}

async function scrollToActive(id: string | null) {
  if (!id) return
  await nextTick()
  const el = rootEl.value?.querySelector<HTMLElement>(`[data-card-id="${CSS.escape(id)}"]`)
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' })
}

// A rail (re)mounted with a non-null activeId scrolls the active card into view on first
// paint too, not only on later changes. onMounted (not `watch { immediate }`): under a
// Suspense boundary the pending tree renders into a detached container and only enters the
// document when the boundary resolves — an immediate watcher's nextTick fires before the
// rootEl ref is populated, so the card lookup would miss. onMounted is deferred until the
// tree is really mounted (and, unlike an immediate watcher, never runs during SSR setup).
watch(() => props.activeId, scrollToActive)
onMounted(() => { void scrollToActive(props.activeId) })
</script>

<template>
  <section
    ref="rootEl"
    class="ann-rail"
    :class="{ 'ann-rail--aligned': aligned }"
    :style="aligned ? { position: 'relative', height: `${layout.totalHeight}px` } : undefined"
    aria-label="Review comments"
  >
    <p v-if="visible.length === 0" class="text-sm text-muted p-3">
      No {{ filter === 'all' ? '' : filter + ' ' }}comments yet. Turn on <strong>Highlight</strong> and select text to add one.
    </p>
    <article
      v-for="t in visible"
      :key="t.annotation.id"
      :ref="(el) => setCardEl(t.annotation.id, el)"
      :data-card-id="t.annotation.id"
      data-test="ann-card"
      class="rounded-lg border p-3 bg-default"
      :class="[
        aligned ? 'ann-card--aligned' : 'mb-3',
        t.annotation.id === activeId ? 'border-primary' : 'border-default',
      ]"
      :style="cardStyle(t.annotation.id)"
    >
      <header class="flex items-center gap-2 mb-1">
        <span class="h-3 w-3 rounded-full shrink-0" :class="`ann-dot--${t.annotation.color}`" aria-hidden="true" />
        <span class="text-sm font-medium">{{ t.annotation.createdBy.name }}</span>
        <span class="text-xs text-muted">{{ t.annotation.createdBy.roleLabel }}</span>
        <span v-if="t.annotation.resolved" class="text-xs text-muted ml-auto">Resolved</span>
      </header>

      <button
        type="button"
        data-test="ann-quote"
        class="text-left text-xs italic text-muted line-clamp-2 hover:underline"
        :disabled="t.orphan"
        :aria-label="`Go to highlight: ${t.annotation.anchor.exact}`"
        @click="emit('jump', t.annotation.id)"
      >“{{ t.annotation.anchor.exact }}”</button>
      <p v-if="t.orphan" class="text-xs text-warning mt-1">
        <UIcon name="i-lucide-map-pin-off" class="align-text-bottom" /> text changed — highlight not found
      </p>

      <ul class="mt-2 space-y-2">
        <li v-for="c in t.annotation.comments" :key="c.id" class="text-sm">
          <span class="font-medium">{{ c.authorName }}</span>
          <span class="text-xs text-muted ml-1">{{ timeOf(c.createdAt) }}</span>
          <p class="whitespace-pre-wrap">{{ c.body }}</p>
        </li>
      </ul>

      <div class="mt-2 flex items-center gap-1">
        <input
          data-test="ann-reply-input"
          :value="drafts[t.annotation.id] ?? ''"
          type="text"
          class="flex-1 rounded border border-accented bg-transparent px-2 py-1 text-sm"
          placeholder="Reply…"
          :aria-label="`Reply to ${t.annotation.createdBy.name}`"
          @input="drafts = { ...drafts, [t.annotation.id]: ($event.target as HTMLInputElement).value }"
          @keydown.enter.prevent="sendReply(t.annotation.id)"
        >
        <UButton data-test="ann-reply-send" size="xs" variant="ghost" icon="i-lucide-reply" aria-label="Send reply" @click="sendReply(t.annotation.id)" />
      </div>

      <footer class="mt-2 flex items-center gap-2">
        <UButton
          data-test="ann-resolve"
          size="xs"
          :variant="t.annotation.resolved ? 'outline' : 'soft'"
          :color="t.annotation.resolved ? 'neutral' : 'success'"
          :icon="t.annotation.resolved ? 'i-lucide-rotate-ccw' : 'i-lucide-check'"
          :label="t.annotation.resolved ? 'Reopen' : 'Resolve'"
          @click="emit('resolve', t.annotation.id, !t.annotation.resolved)"
        />
        <UButton
          v-if="canDeleteAnnotation(t.annotation, me)"
          data-test="ann-delete"
          size="xs"
          variant="ghost"
          color="error"
          icon="i-lucide-trash-2"
          aria-label="Delete thread"
          @click="emit('remove', t.annotation.id)"
        />
      </footer>
    </article>
  </section>
</template>

<style scoped>
.ann-dot--yellow { background-color: #fde68a; }
.ann-dot--green  { background-color: #bbf7d0; }
.ann-dot--blue   { background-color: #bfdbfe; }
.ann-dot--pink   { background-color: #fbcfe8; }

/* Aligned cards glide to their recomputed spots (new replies, filter flips, reflows). */
@media (prefers-reduced-motion: no-preference) {
  .ann-card--aligned { transition: top 150ms ease-out; }
}
</style>
