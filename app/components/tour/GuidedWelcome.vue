<script setup lang="ts">
/**
 * Guided Tour Welcome (ported from ICJIA/nuxt-guided-tour `TourWelcome.vue`).
 * First-run modal asking whether to take the guided tour. WCAG 2.1 AA.
 * Icons use lucide (`i-lucide-*`) — see GuidedOverlay.vue header for why.
 */
const props = withDefaults(
  defineProps<{
    isVisible: boolean
    title?: string
    description?: string
    subdescription?: string
    logoUrl?: string
    logoAlt?: string
    startLabel?: string
    skipLabel?: string
  }>(),
  {
    title: 'Welcome!',
    description: 'Would you like a quick guided tour to learn about all the features?',
    subdescription: '',
    logoUrl: '',
    logoAlt: 'Logo',
    startLabel: 'Start',
    skipLabel: "No thanks, I'll explore on my own",
  },
)

const emit = defineEmits<{
  startTour: []
  skipTour: []
}>()

const dialogRef = ref<HTMLElement | null>(null)

watch(
  () => props.isVisible,
  (visible) => {
    if (visible) {
      nextTick(() => {
        dialogRef.value?.focus()
      })
    }
  },
)

function handleKeydown(event: KeyboardEvent) {
  if (!props.isVisible) return
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('skipTour')
  }
}

watch(
  () => props.isVisible,
  (visible) => {
    if (import.meta.client) {
      if (visible) {
        window.addEventListener('keydown', handleKeydown)
      } else {
        window.removeEventListener('keydown', handleKeydown)
      }
    }
  },
)

onUnmounted(() => {
  if (import.meta.client) {
    window.removeEventListener('keydown', handleKeydown)
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="welcome-fade">
      <div v-if="isVisible" class="welcome-overlay">
        <div class="welcome-backdrop" aria-hidden="true" @click="emit('skipTour')" />

        <div
          ref="dialogRef"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="welcome-title"
          aria-describedby="welcome-description"
          tabindex="-1"
          class="welcome-dialog"
        >
          <UCard
            class="welcome-card"
            :ui="{
              root: 'w-96 max-w-[90vw] bg-white dark:bg-gray-900',
              header: 'px-6 pt-6 pb-3',
              body: 'px-6 pt-0 pb-4',
              footer: 'px-6 pt-4 pb-6',
            }"
          >
            <template #header>
              <div class="welcome-header">
                <div v-if="logoUrl" class="welcome-logo-wrapper">
                  <img :src="logoUrl" :alt="logoAlt" class="welcome-logo" />
                </div>
                <h2 id="welcome-title" class="welcome-title">
                  {{ title }}
                </h2>
              </div>
            </template>

            <div id="welcome-description" class="welcome-content">
              <p class="welcome-text">
                {{ description }}
              </p>
              <p v-if="subdescription" class="welcome-subtext">
                {{ subdescription }}
              </p>
            </div>

            <template #footer>
              <div class="welcome-footer">
                <UButton variant="ghost" color="neutral" size="md" @click="emit('skipTour')">
                  {{ skipLabel }}
                </UButton>

                <UButton color="primary" size="md" icon="i-lucide-play" @click="emit('startTour')">
                  {{ startLabel }}
                </UButton>
              </div>
            </template>
          </UCard>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.welcome-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.welcome-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1;
  cursor: pointer;
}

.welcome-dialog {
  position: relative;
  z-index: 2;
  outline: none;
}

.welcome-card {
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  background: #f8fafc !important;
}

.dark .welcome-card,
:root.dark .welcome-card {
  background: linear-gradient(180deg, #475569 0%, #334155 100%) !important;
}

.welcome-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.75rem;
}

.welcome-logo-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
}

.welcome-logo {
  max-width: 75px;
  max-height: 75px;
  width: auto;
  height: auto;
  object-fit: contain;
}

.welcome-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--ui-text);
  margin: 0;
  line-height: 1.3;
}

.welcome-content {
  text-align: center;
}

.welcome-text {
  font-size: 0.9375rem;
  line-height: 1.6;
  color: var(--ui-text-muted);
  margin: 0 0 0.75rem;
}

.welcome-subtext {
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--ui-text-dimmed);
  margin: 0;
}

.welcome-footer {
  display: flex;
  flex-direction: column-reverse;
  gap: 0.5rem;
}

.welcome-footer :deep(button) {
  cursor: pointer;
}

@media (min-width: 480px) {
  .welcome-footer {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
}

.welcome-fade-enter-active,
.welcome-fade-leave-active {
  transition: opacity 0.25s ease;
}

.welcome-fade-enter-from,
.welcome-fade-leave-to {
  opacity: 0;
}

.welcome-fade-enter-active .welcome-dialog {
  animation: welcome-scale 0.25s ease-out;
}

@keyframes welcome-scale {
  from {
    transform: scale(0.95);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .welcome-fade-enter-active,
  .welcome-fade-leave-active {
    transition: none;
  }
  .welcome-fade-enter-active .welcome-dialog {
    animation: none;
  }
}
</style>
