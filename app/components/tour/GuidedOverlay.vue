<script setup lang="ts">
/**
 * Guided Tour Overlay (ported from ICJIA/nuxt-guided-tour `TourOverlay.vue`).
 * Displays the tour step dialog. WCAG 2.1 AA: focus management + screen reader support.
 *
 * Icons swapped from `i-heroicons-*` to `i-lucide-*` because this app bundles lucide and runs
 * with `icon.fallbackToApi:false` under a tight CSP (`connect-src 'self'`) — heroicons would not
 * resolve at runtime. The matching lucide names are listed in nuxt.config's clientBundle.icons.
 */
import type { TourStep, TourProgress } from '../../composables/guided-tour-types'

const props = defineProps<{
  isActive: boolean
  currentStep: TourStep | null
  progress: TourProgress
}>()

const emit = defineEmits<{
  next: []
  previous: []
  cancel: []
}>()

const dialogRef = ref<HTMLElement | null>(null)
const bodyRef = ref<HTMLElement | null>(null)

const dialogStyle = computed(() => {
  return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
})

function handleGlobalKeydown(event: KeyboardEvent) {
  if (!props.isActive) return
  switch (event.key) {
    case 'Escape':
      event.preventDefault()
      event.stopPropagation()
      emit('cancel')
      break
    case 'ArrowRight':
      event.preventDefault()
      emit('next')
      break
    case 'ArrowLeft':
      event.preventDefault()
      emit('previous')
      break
  }
}

watch(
  () => props.isActive,
  (active) => {
    if (import.meta.client) {
      if (active) {
        window.addEventListener('keydown', handleGlobalKeydown)
      } else {
        window.removeEventListener('keydown', handleGlobalKeydown)
      }
    }
  },
)

onUnmounted(() => {
  if (import.meta.client) {
    window.removeEventListener('keydown', handleGlobalKeydown)
  }
})

watch(
  () => props.currentStep?.id,
  () => {
    if (props.isActive) {
      nextTick(() => {
        dialogRef.value?.focus()
        if (bodyRef.value) {
          bodyRef.value.scrollTop = 0
        }
      })
    }
  },
)

const isFirstStep = computed(() => props.progress.current === 1)
const isLastStep = computed(() => props.progress.current === props.progress.total)
</script>

<template>
  <Teleport to="body">
    <Transition name="tour-fade">
      <div v-if="isActive && currentStep" class="tour-overlay">
        <div class="tour-backdrop" aria-hidden="true" @click="emit('cancel')" />

        <div
          ref="dialogRef"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="`tour-title-${currentStep.id}`"
          :aria-describedby="`tour-content-${currentStep.id}`"
          tabindex="-1"
          class="tour-dialog"
          :style="dialogStyle"
        >
          <UCard
            class="tour-card"
            :ui="{
              root: 'w-96 max-w-[90vw] bg-white dark:bg-gray-900',
              header: 'px-6 pt-5 pb-2',
              body: 'px-6 pt-2 pb-3',
              footer: 'px-6 pt-3 pb-5',
            }"
          >
            <template #header>
              <div class="tour-header">
                <div class="tour-title-row">
                  <UIcon
                    v-if="currentStep.icon"
                    :name="currentStep.icon"
                    class="tour-icon"
                    aria-hidden="true"
                  />
                  <h2 :id="`tour-title-${currentStep.id}`" class="tour-title">
                    {{ currentStep.title }}
                  </h2>
                </div>
                <div class="tour-progress-badge">{{ progress.current }} / {{ progress.total }}</div>
              </div>
            </template>

            <div :id="`tour-content-${currentStep.id}`" ref="bodyRef" class="tour-body">
              <p class="tour-content">
                {{ currentStep.content }}
              </p>

              <p v-if="currentStep.tip" class="tour-tip">
                {{ currentStep.tip }}
              </p>
            </div>

            <template #footer>
              <div class="tour-footer">
                <button type="button" class="tour-skip-btn" @click="emit('cancel')">
                  Skip tour
                </button>

                <div class="tour-nav-buttons">
                  <button
                    v-if="!isFirstStep"
                    type="button"
                    class="tour-back-btn"
                    @click="emit('previous')"
                  >
                    <UIcon name="i-lucide-arrow-left" class="tour-btn-icon" />
                    Back
                  </button>
                  <button type="button" class="tour-next-btn" @click="emit('next')">
                    {{ isLastStep ? 'Finish' : 'Next' }}
                    <UIcon
                      :name="isLastStep ? 'i-lucide-check' : 'i-lucide-arrow-right'"
                      class="tour-btn-icon"
                    />
                  </button>
                </div>
              </div>
            </template>
          </UCard>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.tour-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
}

.tour-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 1;
  cursor: pointer;
}

.tour-dialog {
  position: fixed;
  z-index: 2;
  outline: none;
}

.tour-card {
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  background: #f8fafc !important;
  min-height: 260px;
  display: flex;
  flex-direction: column;
}

.dark .tour-card,
:root.dark .tour-card {
  background: linear-gradient(180deg, #475569 0%, #334155 100%) !important;
}

.tour-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.tour-title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.tour-icon {
  width: 1.25rem;
  height: 1.25rem;
  color: var(--ui-primary);
  flex-shrink: 0;
}

.tour-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--ui-text);
  margin: 0;
  line-height: 1.3;
}

.tour-progress-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: #334155;
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  border-radius: 9999px;
  border: 1px solid #cbd5e1;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
  min-width: 3.5rem;
}

.dark .tour-progress-badge,
:root.dark .tour-progress-badge {
  color: #e2e8f0;
  background: linear-gradient(135deg, #334155 0%, #1e293b 100%);
  border-color: #475569;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.tour-body {
  min-height: 100px;
  max-height: 220px;
  overflow-y: auto;
}

.tour-content {
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--ui-text-muted);
  margin: 0;
  min-height: 3.5rem;
}

.tour-tip {
  font-size: 0.75rem;
  line-height: 1.4;
  color: var(--ui-text-dimmed);
  margin: 0.75rem 0 0;
  padding: 0.5rem;
  background: var(--ui-bg-elevated);
  border-radius: 0.375rem;
  border-left: 3px solid var(--ui-primary);
}

.tour-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.tour-nav-buttons {
  display: flex;
  gap: 0.5rem;
}

.tour-skip-btn,
.tour-back-btn,
.tour-next-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  padding: 0.5rem 0.875rem;
  font-size: 0.8125rem;
  font-weight: 500;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.15s ease;
  border: none;
}

.tour-btn-icon {
  width: 0.875rem;
  height: 0.875rem;
  flex-shrink: 0;
}

.tour-skip-btn {
  color: #64748b;
  background: transparent;
  border: 1px solid #cbd5e1;
}

.tour-skip-btn:hover {
  color: #475569;
  background: rgba(0, 0, 0, 0.05);
  border-color: #94a3b8;
}

.tour-skip-btn:focus-visible {
  outline: 2px solid var(--ui-primary, #3b82f6);
  outline-offset: 2px;
}

.tour-back-btn {
  color: #374151;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
}

.tour-back-btn:hover {
  background: #e2e8f0;
  border-color: #cbd5e1;
}

.tour-back-btn:focus-visible {
  outline: 2px solid var(--ui-primary, #3b82f6);
  outline-offset: 2px;
}

.tour-next-btn {
  color: #ffffff;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border: none;
  box-shadow:
    0 1px 2px rgba(59, 130, 246, 0.3),
    0 2px 4px -1px rgba(59, 130, 246, 0.2);
}

.tour-next-btn:hover {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  box-shadow:
    0 2px 8px rgba(59, 130, 246, 0.4),
    0 4px 8px -2px rgba(59, 130, 246, 0.3);
  transform: translateY(-1px);
}

.tour-next-btn:active {
  transform: translateY(0);
}

.tour-next-btn:focus-visible {
  outline: 2px solid #60a5fa;
  outline-offset: 2px;
}

.dark .tour-skip-btn,
:root.dark .tour-skip-btn {
  color: #94a3b8;
  border-color: #475569;
}

.dark .tour-skip-btn:hover,
:root.dark .tour-skip-btn:hover {
  color: #e2e8f0;
  background: rgba(255, 255, 255, 0.05);
  border-color: #64748b;
}

.dark .tour-back-btn,
:root.dark .tour-back-btn {
  color: #e2e8f0;
  background: #374151;
  border-color: #4b5563;
}

.dark .tour-back-btn:hover,
:root.dark .tour-back-btn:hover {
  background: #4b5563;
  border-color: #6b7280;
}

.tour-fade-enter-active,
.tour-fade-leave-active {
  transition: opacity 0.2s ease;
}

.tour-fade-enter-from,
.tour-fade-leave-to {
  opacity: 0;
}

@media (max-width: 640px) {
  .tour-dialog {
    left: 1rem !important;
    right: 1rem;
    width: auto;
  }
  .tour-card {
    max-width: 100%;
  }
  .tour-footer {
    flex-direction: column;
    gap: 0.5rem;
  }
  .tour-footer > button:first-child {
    order: 2;
  }
  .tour-nav-buttons {
    width: 100%;
    justify-content: flex-end;
  }
}

@media (prefers-reduced-motion: reduce) {
  .tour-fade-enter-active,
  .tour-fade-leave-active {
    transition: none;
  }
}
</style>
