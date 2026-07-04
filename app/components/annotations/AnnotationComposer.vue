<!-- app/components/annotations/AnnotationComposer.vue -->
<!--
  Floating "Add comment" popover at the text selection (spec §6). The page owns
  positioning (viewport coords from the selection rect) and creation; this component
  only collects the body. Focus is trapped (textarea ↔ buttons); Esc cancels; the
  page restores focus after close.
-->
<script setup lang="ts">
import { ref, onMounted, computed } from '#imports'

const props = defineProps<{ position: { x: number; y: number }; quote: string }>()
const emit = defineEmits<{ save: [body: string]; cancel: [] }>()

const body = ref('')
const textareaEl = ref<HTMLTextAreaElement | null>(null)
const rootEl = ref<HTMLElement | null>(null)
const canSave = computed(() => body.value.trim().length > 0)

/** Clamp so the popover never overflows the right viewport edge (320px wide + 16px gutter). */
const style = computed(() => {
  const left = import.meta.client ? Math.min(props.position.x, Math.max(16, window.innerWidth - 336)) : props.position.x
  return { left: `${left}px`, top: `${props.position.y}px` }
})

onMounted(() => textareaEl.value?.focus())

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
    class="ann-composer fixed z-50 w-80 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 p-3 shadow-lg"
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
      class="w-full rounded border border-neutral-300 dark:border-neutral-600 bg-transparent p-2 text-sm"
      placeholder="Add a comment for the author…"
      aria-label="Comment text"
    />
    <div class="mt-2 flex justify-end gap-2">
      <UButton data-test="ann-cancel" size="xs" variant="ghost" color="neutral" label="Cancel" @click="emit('cancel')" />
      <UButton data-test="ann-save" size="xs" color="primary" label="Comment" :disabled="!canSave" @click="save" />
    </div>
  </div>
</template>
