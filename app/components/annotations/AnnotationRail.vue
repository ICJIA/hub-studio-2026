<!-- app/components/annotations/AnnotationRail.vue -->
<!--
  The comments rail (spec §6): threads in document order (orphans last), reply box,
  resolve/reopen, delete (creator or Editor — canDeleteAnnotation), click-quote → jump
  to the highlight. Reads the auth store directly (PublishButton precedent). Comment
  bodies are Vue-interpolated text — NEVER v-html.
-->
<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from '#imports'
import type { RailThread } from '~/types/annotations'
import { canDeleteAnnotation } from '~/lib/annotations/attribution'
import { useAuthStore } from '~/stores/auth'

type Filter = 'open' | 'resolved' | 'all'

const props = defineProps<{ threads: RailThread[]; filter: Filter; activeId: string | null }>()
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
  <section ref="rootEl" class="ann-rail" aria-label="Review comments">
    <p v-if="visible.length === 0" class="text-sm text-muted p-3">
      No {{ filter === 'all' ? '' : filter + ' ' }}comments yet. Turn on <strong>Highlight</strong> and select text to add one.
    </p>
    <article
      v-for="t in visible"
      :key="t.annotation.id"
      :data-card-id="t.annotation.id"
      data-test="ann-card"
      class="rounded-lg border p-3 mb-3 bg-white dark:bg-neutral-900"
      :class="t.annotation.id === activeId ? 'border-blue-600 dark:border-blue-400' : 'border-neutral-200 dark:border-neutral-700'"
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
          class="flex-1 rounded border border-neutral-300 dark:border-neutral-600 bg-transparent px-2 py-1 text-sm"
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
</style>
