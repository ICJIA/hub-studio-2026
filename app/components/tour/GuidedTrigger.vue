<script setup lang="ts">
/**
 * Guided Tour Trigger (ported from ICJIA/nuxt-guided-tour `TourTrigger.vue`).
 * Reusable button to manually start / replay the tour. Emits `click` — the parent decides what to do
 * (we never call navigateTo from inside the template; see the layout's setup method).
 * Default icon uses lucide (`i-lucide-circle-help`) — see GuidedOverlay.vue header for why.
 */
withDefaults(
  defineProps<{
    label?: string
    icon?: string
    variant?: 'solid' | 'soft' | 'ghost' | 'outline' | 'link' | 'subtle'
    color?: 'primary' | 'secondary' | 'neutral' | 'success' | 'warning' | 'error'
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
    iconOnly?: boolean
    tooltip?: string
  }>(),
  {
    label: 'Take a tour',
    icon: 'i-lucide-circle-help',
    variant: 'ghost',
    color: 'neutral',
    size: 'sm',
    iconOnly: false,
    tooltip: 'Start the guided tour',
  },
)

const emit = defineEmits<{
  click: []
}>()
</script>

<template>
  <UTooltip :text="tooltip" :content="{ side: 'bottom', sideOffset: 8 }">
    <UButton
      :icon="icon"
      :variant="variant"
      :color="color"
      :size="size"
      :aria-label="iconOnly ? label : undefined"
      :square="iconOnly"
      @click="emit('click')"
    >
      <template v-if="!iconOnly">
        {{ label }}
      </template>
    </UButton>
  </UTooltip>
</template>
