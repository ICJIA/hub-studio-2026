<!-- app/components/annotations/AnnotationBar.vue -->
<!--
  The "static reviewers nav bar" (spec §6): arm the highlighter, pick the tint, filter
  open/resolved threads, open the rail. Dumb component — page owns all state; v-model
  style updates keep it trivially testable.
-->
<script setup lang="ts">
import { ANNOTATION_COLORS, type AnnotationColor } from '~/types/annotations'

type Filter = 'open' | 'resolved' | 'all'
const props = defineProps<{ armed: boolean; color: AnnotationColor; filter: Filter; openCount: number; railOpen: boolean }>()
const emit = defineEmits<{
  'update:armed': [value: boolean]
  'update:color': [value: AnnotationColor]
  'update:filter': [value: Filter]
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
</script>

<template>
  <div class="ann-bar flex items-center gap-2 flex-wrap" role="toolbar" aria-label="Review tools">
    <UButton
      data-test="ann-arm"
      size="xs"
      :variant="armed ? 'solid' : 'outline'"
      color="primary"
      icon="i-lucide-highlighter"
      :aria-pressed="armed ? 'true' : 'false'"
      :label="armed ? 'Highlighting on' : 'Highlight'"
      :title="armed ? 'Select text, then press Enter to comment' : 'Turn on highlighting'"
      @click="emit('update:armed', !armed)"
    />
    <div class="flex items-center gap-1" role="group" aria-label="Highlight color">
      <button
        v-for="c in ANNOTATION_COLORS"
        :key="c"
        type="button"
        :data-test="`ann-color-${c}`"
        class="h-5 w-5 rounded-full border border-neutral-400 dark:border-neutral-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
        :style="{ backgroundColor: SWATCH[c], boxShadow: c === color ? '0 0 0 2px #1d4ed8' : 'none' }"
        :aria-pressed="c === color ? 'true' : 'false'"
        :aria-label="`Highlight color ${c}`"
        @click="emit('update:color', c)"
      />
    </div>
    <UButton
      data-test="ann-filter"
      size="xs"
      variant="outline"
      color="neutral"
      :label="`Showing: ${FILTER_LABEL[filter]}`"
      @click="cycleFilter"
    />
    <UButton
      data-test="ann-rail-toggle"
      size="xs"
      variant="outline"
      color="neutral"
      :icon="railOpen ? 'i-lucide-panel-right-close' : 'i-lucide-panel-right-open'"
      :label="`${railOpen ? 'Hide' : 'Show'} comments (${openCount})`"
      :aria-expanded="railOpen ? 'true' : 'false'"
      :title="railOpen ? 'Hide the comments panel' : 'Show the comments panel'"
      @click="emit('toggle-rail')"
    />
  </div>
</template>
