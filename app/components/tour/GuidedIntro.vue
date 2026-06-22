<script setup lang="ts">
/**
 * Guided Tour Intro (ported from ICJIA/nuxt-guided-tour `TourIntro.vue`).
 * Informational slides shown before the spotlight steps. WCAG 2.1 AA.
 * Icons use lucide (`i-lucide-*`) — see GuidedOverlay.vue header for why.
 */
import type { IntroSlide } from '../../composables/guided-tour-types'

const props = withDefaults(
  defineProps<{
    isVisible: boolean
    slides?: IntroSlide[]
  }>(),
  {
    slides: () => [],
  },
)

const emit = defineEmits<{
  next: []
  skip: []
}>()

const currentSlide = ref(0)
const totalSlides = computed(() => props.slides.length)

const dialogRef = ref<HTMLElement | null>(null)
const contentRef = ref<HTMLElement | null>(null)

watch(
  () => props.isVisible,
  (visible) => {
    if (visible) {
      currentSlide.value = 0
      nextTick(() => {
        dialogRef.value?.focus()
        if (contentRef.value) {
          contentRef.value.scrollTop = 0
        }
      })
    }
  },
)

watch(currentSlide, () => {
  nextTick(() => {
    if (contentRef.value) {
      contentRef.value.scrollTop = 0
    }
  })
})

function handleKeydown(event: KeyboardEvent) {
  if (!props.isVisible) return
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('skip')
  } else if (event.key === 'ArrowRight' || event.key === 'Enter') {
    event.preventDefault()
    handleNext()
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

function handleNext() {
  if (currentSlide.value < totalSlides.value - 1) {
    currentSlide.value++
  } else {
    emit('next')
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="intro-fade">
      <div v-if="isVisible && slides.length > 0" class="intro-overlay">
        <div class="intro-backdrop" aria-hidden="true" @click="emit('skip')" />

        <div
          ref="dialogRef"
          role="dialog"
          aria-modal="true"
          aria-labelledby="intro-title"
          aria-describedby="intro-description"
          tabindex="-1"
          class="intro-dialog"
        >
          <UCard
            class="intro-card"
            :ui="{
              root: 'w-[32rem] max-w-[90vw] bg-white dark:bg-gray-900',
              header: 'px-6 pt-6 pb-3',
              body: 'px-6 pt-0 pb-4',
              footer: 'px-6 pt-4 pb-6',
            }"
          >
            <template #header>
              <div class="intro-header">
                <div class="intro-title-row">
                  <UIcon :name="slides[currentSlide]?.icon" class="intro-icon" aria-hidden="true" />
                  <h2 id="intro-title" class="intro-title">
                    {{ slides[currentSlide]?.title }}
                  </h2>
                </div>
                <div v-if="totalSlides > 1" class="intro-progress-badge">
                  {{ currentSlide + 1 }} / {{ totalSlides }}
                </div>
              </div>
            </template>

            <div id="intro-description" ref="contentRef" class="intro-content">
              <div
                v-for="(paragraph, idx) in slides[currentSlide]?.content"
                :key="idx"
                class="intro-paragraph"
              >
                {{ paragraph }}
              </div>

              <div v-if="slides[currentSlide]?.examples" class="intro-examples">
                <h3 class="intro-examples-title">Quick Examples:</h3>
                <div class="intro-examples-grid">
                  <div
                    v-for="(example, idx) in slides[currentSlide]?.examples"
                    :key="idx"
                    class="intro-example"
                  >
                    <div class="intro-example-label">{{ example.label }}</div>
                    <div class="intro-example-syntax">{{ example.syntax }}</div>
                    <div class="intro-example-arrow">&rarr;</div>
                    <div class="intro-example-result">{{ example.result }}</div>
                  </div>
                </div>
              </div>

              <div v-if="slides[currentSlide]?.benefits" class="intro-benefits">
                <div
                  v-for="(benefit, idx) in slides[currentSlide]?.benefits"
                  :key="idx"
                  class="intro-benefit"
                >
                  <div class="intro-benefit-icon-wrapper">
                    <UIcon :name="benefit.icon" class="intro-benefit-icon" />
                  </div>
                  <div class="intro-benefit-content">
                    <h4 class="intro-benefit-title">{{ benefit.title }}</h4>
                    <p class="intro-benefit-description">{{ benefit.description }}</p>
                  </div>
                </div>
              </div>

              <div v-if="slides[currentSlide]?.conversions" class="intro-conversions">
                <div
                  v-for="(conversion, idx) in slides[currentSlide]?.conversions"
                  :key="idx"
                  class="intro-conversion"
                >
                  <div class="intro-conversion-header">
                    <span class="intro-conversion-from">{{ conversion.from }}</span>
                    <UIcon name="i-lucide-arrow-right" class="intro-conversion-arrow" />
                    <span class="intro-conversion-to">{{ conversion.to }}</span>
                  </div>
                  <div class="intro-conversion-problem">
                    <strong>Problem:</strong> {{ conversion.problem }}
                  </div>
                  <div class="intro-conversion-solution">
                    <strong>Solution:</strong> {{ conversion.solution }}
                  </div>
                </div>
              </div>

              <div v-if="slides[currentSlide]?.callout" class="intro-callout">
                <div class="intro-callout-header">
                  <UIcon :name="slides[currentSlide]?.callout?.icon" class="intro-callout-icon" />
                  <h4 class="intro-callout-title">{{ slides[currentSlide]?.callout?.title }}</h4>
                </div>
                <p class="intro-callout-text">{{ slides[currentSlide]?.callout?.text }}</p>
              </div>

              <p v-if="slides[currentSlide]?.footer" class="intro-footer-text">
                {{ slides[currentSlide]?.footer }}
              </p>
            </div>

            <template #footer>
              <div class="intro-footer">
                <UButton variant="ghost" color="neutral" size="md" @click="emit('skip')">
                  Skip tour
                </UButton>

                <UButton
                  color="primary"
                  size="md"
                  :icon="currentSlide < totalSlides - 1 ? 'i-lucide-arrow-right' : 'i-lucide-play'"
                  @click="handleNext"
                >
                  {{ currentSlide < totalSlides - 1 ? 'Next' : 'Start Guided Tour' }}
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
.intro-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.intro-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1;
  cursor: pointer;
}

.intro-dialog {
  position: relative;
  z-index: 2;
  outline: none;
}

.intro-card {
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  background: #f8fafc !important;
}

.dark .intro-card,
:root.dark .intro-card {
  background: linear-gradient(180deg, #475569 0%, #334155 100%) !important;
}

.intro-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.intro-title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.intro-icon {
  width: 1.5rem;
  height: 1.5rem;
  color: var(--ui-primary);
  flex-shrink: 0;
}

.intro-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--ui-text);
  margin: 0;
  line-height: 1.3;
}

.intro-progress-badge {
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

.dark .intro-progress-badge,
:root.dark .intro-progress-badge {
  color: #e2e8f0;
  background: linear-gradient(135deg, #334155 0%, #1e293b 100%);
  border-color: #475569;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.intro-content {
  text-align: left;
  max-height: 60vh;
  overflow-y: auto;
}

.intro-paragraph {
  font-size: 0.9375rem;
  line-height: 1.6;
  color: var(--ui-text-muted);
  margin: 0 0 1rem;
}

.intro-examples {
  margin: 1.5rem 0;
  padding: 1rem;
  background: var(--ui-bg-elevated);
  border-radius: 0.5rem;
  border: 1px solid var(--ui-border);
}

.intro-examples-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ui-text);
  margin: 0 0 0.75rem;
}

.intro-examples-grid {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.intro-example {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: var(--ui-bg);
  border-radius: 0.375rem;
  font-size: 0.8125rem;
}

.intro-example-label {
  grid-column: 1 / -1;
  font-weight: 500;
  color: var(--ui-text-dimmed);
  font-size: 0.75rem;
  margin-bottom: 0.25rem;
}

.intro-example-syntax {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: var(--ui-text);
  background: rgba(59, 130, 246, 0.1);
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-weight: 500;
}

.intro-example-arrow {
  color: var(--ui-text-dimmed);
  font-weight: 600;
  justify-self: center;
}

.intro-example-result {
  font-weight: 600;
  color: var(--ui-primary);
}

.intro-footer-text {
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--ui-text-dimmed);
  margin: 1rem 0 0;
  font-style: italic;
}

.intro-benefits {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 1rem 0;
}

.intro-benefit {
  display: flex;
  gap: 0.75rem;
  padding: 0.875rem;
  background: var(--ui-bg-elevated);
  border-radius: 0.5rem;
  border: 1px solid var(--ui-border);
  transition: all 0.2s ease;
}

.intro-benefit:hover {
  border-color: var(--ui-primary);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
}

.intro-benefit-icon-wrapper {
  flex-shrink: 0;
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--ui-primary) 0%, #2563eb 100%);
  border-radius: 0.5rem;
}

.intro-benefit-icon {
  width: 1.25rem;
  height: 1.25rem;
  color: white;
}

.intro-benefit-content {
  flex: 1;
}

.intro-benefit-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ui-text);
  margin: 0 0 0.25rem;
  line-height: 1.3;
}

.intro-benefit-description {
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--ui-text-muted);
  margin: 0;
}

.intro-conversions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 1rem 0;
}

.intro-conversion {
  padding: 1rem;
  background: var(--ui-bg-elevated);
  border-radius: 0.5rem;
  border: 1px solid var(--ui-border);
  transition: all 0.2s ease;
}

.intro-conversion:hover {
  border-color: var(--ui-primary);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
}

.intro-conversion-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--ui-border);
}

.intro-conversion-from {
  font-size: 0.875rem;
  font-weight: 600;
  color: #fca5a5;
  background: rgba(252, 165, 165, 0.15);
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
}

.intro-conversion-arrow {
  width: 1rem;
  height: 1rem;
  color: var(--ui-text-dimmed);
  flex-shrink: 0;
}

.intro-conversion-to {
  font-size: 0.875rem;
  font-weight: 600;
  color: #86efac;
  background: rgba(134, 239, 172, 0.15);
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
}

.intro-conversion-problem,
.intro-conversion-solution {
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--ui-text-muted);
  margin: 0.5rem 0;
}

.intro-conversion-problem strong {
  color: #fca5a5;
  font-weight: 700;
}

.intro-conversion-solution strong {
  color: #86efac;
  font-weight: 700;
}

:root:not(.dark) .intro-conversion-from,
.light .intro-conversion-from {
  color: #dc2626;
  background: rgba(220, 38, 38, 0.1);
}

:root:not(.dark) .intro-conversion-to,
.light .intro-conversion-to {
  color: #16a34a;
  background: rgba(22, 163, 74, 0.1);
}

:root:not(.dark) .intro-conversion-problem strong,
.light .intro-conversion-problem strong {
  color: #dc2626;
}

:root:not(.dark) .intro-conversion-solution strong,
.light .intro-conversion-solution strong {
  color: #16a34a;
}

.intro-callout {
  margin: 1.25rem 0;
  padding: 1rem;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%);
  border-radius: 0.5rem;
  border: 2px solid var(--ui-primary);
}

.intro-callout-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.intro-callout-icon {
  width: 1.25rem;
  height: 1.25rem;
  color: var(--ui-primary);
  flex-shrink: 0;
}

.intro-callout-title {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--ui-text);
  margin: 0;
  line-height: 1.3;
}

.intro-callout-text {
  font-size: 0.8125rem;
  line-height: 1.6;
  color: var(--ui-text);
  margin: 0;
  font-weight: 500;
}

.intro-footer {
  display: flex;
  flex-direction: column-reverse;
  gap: 0.5rem;
}

.intro-footer :deep(button) {
  cursor: pointer;
}

@media (min-width: 480px) {
  .intro-footer {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
  .intro-example {
    grid-template-columns: 5rem 1fr auto 1fr;
  }
  .intro-example-label {
    grid-column: 1;
    margin-bottom: 0;
  }
}

.intro-fade-enter-active,
.intro-fade-leave-active {
  transition: opacity 0.25s ease;
}

.intro-fade-enter-from,
.intro-fade-leave-to {
  opacity: 0;
}

.intro-fade-enter-active .intro-dialog {
  animation: intro-scale 0.25s ease-out;
}

@keyframes intro-scale {
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
  .intro-fade-enter-active,
  .intro-fade-leave-active {
    transition: none;
  }
  .intro-fade-enter-active .intro-dialog {
    animation: none;
  }
}
</style>
