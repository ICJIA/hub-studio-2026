<script setup lang="ts">
/**
 * GuidedTour — the single tour orchestrator.
 *
 * Renders the welcome → intro → spotlight flow and owns ONE `useGuidedTour(...)` instance (the
 * ported composable, deliberately NOT named `useTour` so it can never collide with @nuxt/ui's
 * `useTour`). Mounted once in the default layout.
 *
 * Behaviour:
 *   - First-run-once auto-start, ONLY on the dashboard route ('/'), gated by the composable's
 *     localStorage flag (`hasCompletedTour`). A reload after seeing/skipping does NOT re-trigger.
 *   - Skippable everywhere: Esc / backdrop / "Skip" all mark the tour as seen.
 *   - `launch()` (exposed) replays the full flow on demand — used by the nav GuidedTrigger.
 */
import GuidedWelcome from './GuidedWelcome.vue'
import GuidedIntro from './GuidedIntro.vue'
import GuidedOverlay from './GuidedOverlay.vue'
import { useGuidedTour } from '../../composables/useGuidedTour'
import {
  GUIDED_TOUR_VERSION,
  GUIDED_TOUR_STORAGE_PREFIX,
  GUIDED_TOUR_AUTOSTART_DELAY,
  GUIDED_TOUR_INTRO_SLIDES,
  buildGuidedTourSteps,
} from '../../composables/guided-tour-config'

const props = withDefaults(
  defineProps<{
    /** Whether the demo banner is currently on screen (adds a demo-banner spotlight step). */
    showDemoBanner?: boolean
    /** Logo shown in the welcome card. */
    logoUrl?: string
  }>(),
  {
    showDemoBanner: false,
    logoUrl: '',
  },
)

const { canPublish } = useAuth()
const route = useRoute()

// Build the role/context-aware steps. Recomputed if the role or banner visibility changes; the
// composable reads `steps` at start time, and we re-create the instance below when steps change.
const steps = computed(() =>
  buildGuidedTourSteps({
    canPublish: canPublish.value,
    showDemoBanner: props.showDemoBanner,
  }),
)

// One tour instance. We pass a getter-backed steps array; since the composable captures `steps`
// by reference at call time, we keep a single instance and mutate its backing array in place so
// the spotlight count always reflects the current role without re-instantiating mid-tour.
const tour = useGuidedTour({
  version: GUIDED_TOUR_VERSION,
  autoStart: true,
  autoStartDelay: GUIDED_TOUR_AUTOSTART_DELAY,
  storageKeyPrefix: GUIDED_TOUR_STORAGE_PREFIX,
  // Spread into a fresh array the composable owns; sync() below keeps it current.
  steps: [...steps.value],
})

/** Keep the composable's steps array in sync with the computed role-aware steps (in place). */
function syncSteps() {
  tour.steps.splice(0, tour.steps.length, ...steps.value)
}
watch(steps, syncSteps, { deep: false })

// Phase machine: welcome → intro → spotlight (the composable drives the spotlight).
const showWelcome = ref(false)
const showIntro = ref(false)

function startWelcome() {
  syncSteps()
  showIntro.value = false
  showWelcome.value = true
}

function onWelcomeStart() {
  showWelcome.value = false
  showIntro.value = true
}

function onWelcomeSkip() {
  showWelcome.value = false
  tour.markAsSeen()
}

function onIntroNext() {
  showIntro.value = false
  tour.start()
}

function onIntroSkip() {
  showIntro.value = false
  tour.markAsSeen()
}

/** Public: replay the entire flow (welcome → intro → spotlight). Used by the nav trigger. */
function launch() {
  // Cancel any in-progress spotlight without re-marking (it is already seen), then restart clean.
  tour.resetCompletion()
  startWelcome()
}

defineExpose({ launch })

// First-run-once auto-start — ONLY on the dashboard ('/'). The composable's localStorage flag
// (hasCompletedTour) is the single source of truth for "already seen"; ssr:false means this runs
// on the client where localStorage is available.
onMounted(() => {
  if (route.path !== '/') return
  if (tour.hasCompletedTour.value) return
  window.setTimeout(() => {
    // Re-check the route in case the user navigated away during the delay.
    if (route.path === '/' && !tour.hasCompletedTour.value) {
      startWelcome()
    }
  }, GUIDED_TOUR_AUTOSTART_DELAY)
})
</script>

<template>
  <div class="guided-tour-root">
    <GuidedWelcome
      :is-visible="showWelcome"
      title="Welcome to the Research Hub Studio"
      description="Take a 60-second tour to see how to create, preview, and (for editors) publish content."
      subdescription="You can replay it anytime from “Tour” in the top navigation."
      :logo-url="logoUrl"
      logo-alt="ICJIA"
      start-label="Start tour"
      @start-tour="onWelcomeStart"
      @skip-tour="onWelcomeSkip"
    />

    <GuidedIntro
      :is-visible="showIntro"
      :slides="GUIDED_TOUR_INTRO_SLIDES"
      @next="onIntroNext"
      @skip="onIntroSkip"
    />

    <GuidedOverlay
      :is-active="tour.isActive.value"
      :current-step="tour.currentStep.value"
      :progress="tour.progress.value"
      @next="tour.next"
      @previous="tour.previous"
      @cancel="tour.cancel"
    />
  </div>
</template>
