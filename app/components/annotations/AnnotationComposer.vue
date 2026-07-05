<!-- app/components/annotations/AnnotationComposer.vue -->
<!--
  Floating "Add comment" popover at the text selection (spec §6). The page owns
  positioning (viewport coords from the selection rect) and creation; this component
  only collects the body and emits save/cancel. Focus is trapped here (textarea ↔
  buttons) and Esc cancels; but CLOSE-focus is the page's job — it stores the pre-open
  focus target and restores it on cancel, or focuses the newly painted <mark> on save.
-->
<script setup lang="ts">
import { ref, onMounted, computed } from '#imports'
import { composerPosition } from '~/lib/annotations/composer-position'

const props = defineProps<{ position: { x: number; y: number }; quote: string }>()
const emit = defineEmits<{ save: [body: string]; cancel: [] }>()

const body = ref('')
const textareaEl = ref<HTMLTextAreaElement | null>(null)
const rootEl = ref<HTMLElement | null>(null)
const canSave = computed(() => body.value.trim().length > 0)
const mounted = ref(false)

/** The composer's containing block when `fixed` is NOT viewport-anchored — inside the
 *  Live-preview modal, offsetParent is the dialog (its translate creates the containing
 *  block; its overflow-hidden clips). Degenerate rects (jsdom/happy-dom report 0×0) fall
 *  back to null = plain viewport anchoring. */
function containingBlock(): DOMRect | null {
  const op = rootEl.value?.offsetParent
  if (!(op instanceof HTMLElement) || op === document.body || op === document.documentElement) return null
  const r = op.getBoundingClientRect()
  return r.width > 0 && r.height > 0 ? r : null
}

/** Clamp so the popover never clips: within the viewport AND, in the modal, within the
 *  dialog's box — converted to whichever coordinate space `fixed` resolves in. */
const style = computed(() => {
  if (!import.meta.client) return { left: `${props.position.x}px`, top: `${props.position.y}px` }
  const cb = mounted.value ? containingBlock() : null
  const pos = composerPosition({
    desired: { x: props.position.x, y: props.position.y },
    viewport: { width: window.innerWidth, height: window.innerHeight },
    container: cb ? { left: cb.left, top: cb.top, right: cb.right, bottom: cb.bottom } : null,
  })
  return { left: `${pos.left}px`, top: `${pos.top}px` }
})

onMounted(() => {
  mounted.value = true // re-run style: offsetParent is only knowable once in the DOM
  textareaEl.value?.focus()
})

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') { e.stopPropagation(); emit('cancel'); return }
  if (e.key !== 'Tab') return
  // Minimal focus trap over the popover's focusable controls.
  const focusables = Array.from(rootEl.value?.querySelectorAll<HTMLElement>('textarea, button:not([disabled])') ?? [])
  if (focusables.length === 0) return
  const first = focusables[0]!, last = focusables[focusables.length - 1]!
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
}

function save() {
  if (canSave.value) emit('save', body.value.trim())
}
</script>

<template>
  <div
    ref="rootEl"
    class="ann-composer fixed z-50 w-80 max-w-[calc(100vw-32px)] rounded-lg border border-accented bg-default p-3 shadow-lg"
    :style="style"
    role="dialog"
    aria-label="Add review comment"
    @keydown="onKeydown"
  >
    <p class="text-xs text-muted italic mb-2 line-clamp-2">“{{ quote }}”</p>
    <textarea
      ref="textareaEl"
      v-model="body"
      rows="3"
      class="w-full rounded border border-accented bg-transparent p-2 text-sm"
      placeholder="Add a comment for the author…"
      aria-label="Comment text"
    />
    <div class="mt-2 flex justify-end gap-2">
      <UButton data-test="ann-cancel" size="xs" variant="ghost" color="neutral" label="Cancel" @click="emit('cancel')" />
      <UButton data-test="ann-save" size="xs" color="primary" label="Comment" :disabled="!canSave" @click="save" />
    </div>
  </div>
</template>
