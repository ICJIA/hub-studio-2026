<!-- app/components/annotations/AnnotationBar.vue -->
<!--
  The "static reviewers nav bar" (spec §6): arm the highlighter, pick the tint, filter
  open/resolved threads, open the rail. Dumb component — page owns all state; v-model
  style updates keep it trivially testable.
-->
<script setup lang="ts">
import { ref, computed, watch } from '#imports'
import { ANNOTATION_COLORS, type AnnotationColor } from '~/types/annotations'

type Filter = 'open' | 'resolved' | 'all'
const props = defineProps<{ armed: boolean; color: AnnotationColor; filter: Filter; openCount: number; railOpen: boolean; cleanView: boolean }>()
const emit = defineEmits<{
  'update:armed': [value: boolean]
  'update:color': [value: AnnotationColor]
  'update:filter': [value: Filter]
  'update:cleanView': [value: boolean]
  'toggle-rail': []
}>()

const FILTER_ORDER: Filter[] = ['open', 'resolved', 'all']
const FILTER_LABEL: Record<Filter, string> = { open: 'Open', resolved: 'Resolved', all: 'All' }
function cycleFilter() {
  const i = FILTER_ORDER.indexOf(props.filter)
  emit('update:filter', FILTER_ORDER[(i + 1) % FILTER_ORDER.length]!)
}

/** Swatch backgrounds mirror annotations.css mark tints (kept inline: tiny + colocated). */
const SWATCH: Record<AnnotationColor, string> = {
  yellow: '#fde68a', green: '#bbf7d0', blue: '#bfdbfe', pink: '#fbcfe8',
}

// ---- Roving tabindex (ARIA APG toolbar pattern) ----
// The toolbar is ONE tab stop: `roving` names the control holding tabindex=0; every other
// control is tabindex=-1. ←/→ move it (wrapping), Home/End jump, and focusing any control
// (mouse, or a swatch click) hands it the stop. The swatches sit flat in the arrow order —
// inside a toolbar, radios are ARROWED PAST and picked with Enter/Space/click, never
// selected-on-focus (that would repaint the armed tint while merely traversing).
type ControlId = 'clean' | 'arm' | AnnotationColor | 'filter' | 'rail'
const CONTROL_SELECTOR: Record<string, string> = {
  clean: 'ann-clean-toggle', arm: 'ann-arm', filter: 'ann-filter', rail: 'ann-rail-toggle',
  ...Object.fromEntries(ANNOTATION_COLORS.map((c) => [c, `ann-color-${c}`])),
}
const rootEl = ref<HTMLElement | null>(null)
const roving = ref<ControlId>('clean')
const order = computed<ControlId[]>(() =>
  props.cleanView ? ['clean'] : ['clean', 'arm', ...ANNOTATION_COLORS, 'filter', 'rail'])
/** Clean view unmounts every control but the toggle — a roving stop pointing at a hidden
 *  control would leave the toolbar with NO tab stop at all. */
watch(order, (ids) => { if (!ids.includes(roving.value)) roving.value = 'clean' })
function tabindexOf(id: ControlId): 0 | -1 {
  return roving.value === id ? 0 : -1
}
function onToolbarKeydown(e: KeyboardEvent) {
  if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return
  const ids = order.value
  const from = (e.target as HTMLElement).closest?.('[data-test]')?.getAttribute('data-test')
  const i = ids.findIndex((id) => CONTROL_SELECTOR[id] === from)
  if (i === -1) return
  e.preventDefault()
  const next = e.key === 'ArrowRight' ? ids[(i + 1) % ids.length]!
    : e.key === 'ArrowLeft' ? ids[(i - 1 + ids.length) % ids.length]!
      : e.key === 'Home' ? ids[0]! : ids[ids.length - 1]!
  roving.value = next
  rootEl.value?.querySelector<HTMLElement>(`[data-test="${CONTROL_SELECTOR[next]}"]`)?.focus()
}
</script>

<template>
  <div ref="rootEl" class="ann-bar flex items-center gap-2 flex-wrap" role="toolbar" aria-label="Review tools" @keydown="onToolbarKeydown">
    <!-- Clean view (plain published article): collapses every review control to this one
         toggle — some readers just want the article, no highlights, no comments. -->
    <UButton
      data-test="ann-clean-toggle"
      size="xs"
      :variant="cleanView ? 'solid' : 'outline'"
      color="neutral"
      :icon="cleanView ? 'i-lucide-eye' : 'i-lucide-eye-off'"
      :aria-pressed="cleanView ? 'true' : 'false'"
      :label="cleanView ? 'Show review tools' : 'Clean view'"
      :title="cleanView ? 'Bring back highlights and comments' : 'Read the article without highlights or comments'"
      :tabindex="tabindexOf('clean')"
      @focus="roving = 'clean'"
      @click="emit('update:cleanView', !cleanView)"
    />
    <UButton
      v-if="!cleanView"
      data-test="ann-arm"
      size="xs"
      :variant="armed ? 'solid' : 'outline'"
      color="primary"
      icon="i-lucide-highlighter"
      :aria-pressed="armed ? 'true' : 'false'"
      :label="armed ? 'Highlighting on' : 'Highlight'"
      :title="armed ? 'Select text, then press Enter to comment' : 'Turn on highlighting'"
      :tabindex="tabindexOf('arm')"
      @focus="roving = 'arm'"
      @click="emit('update:armed', !armed)"
    />
    <div v-if="!cleanView" class="flex items-center gap-1" role="radiogroup" aria-label="Highlight color">
      <button
        v-for="c in ANNOTATION_COLORS"
        :key="c"
        type="button"
        role="radio"
        :data-test="`ann-color-${c}`"
        class="h-5 w-5 rounded-full border border-neutral-400 dark:border-neutral-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
        :style="{ backgroundColor: SWATCH[c], boxShadow: c === color ? '0 0 0 2px #1d4ed8' : 'none' }"
        :aria-checked="c === color ? 'true' : 'false'"
        :aria-label="`Highlight color ${c}`"
        :tabindex="tabindexOf(c)"
        @focus="roving = c"
        @click="emit('update:color', c)"
      />
    </div>
    <UButton
      v-if="!cleanView"
      data-test="ann-filter"
      size="xs"
      variant="outline"
      color="neutral"
      :label="`Showing: ${FILTER_LABEL[filter]}`"
      :tabindex="tabindexOf('filter')"
      @focus="roving = 'filter'"
      @click="cycleFilter"
    />
    <UButton
      v-if="!cleanView"
      data-test="ann-rail-toggle"
      size="xs"
      variant="outline"
      color="neutral"
      :icon="railOpen ? 'i-lucide-panel-right-close' : 'i-lucide-panel-right-open'"
      :label="`${railOpen ? 'Hide' : 'Show'} comments (${openCount})`"
      :aria-expanded="railOpen ? 'true' : 'false'"
      :title="railOpen ? 'Hide the comments panel' : 'Show the comments panel'"
      :tabindex="tabindexOf('rail')"
      @focus="roving = 'rail'"
      @click="emit('toggle-rail')"
    />
  </div>
</template>
