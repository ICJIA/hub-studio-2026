// app/composables/useStudioTour.ts
// Thin orchestration over the `nuxt-guided-tour` module's `useTour()` for the Studio onboarding.
//
// One instance drives the whole tour and lives in the default layout (which wraps every page, so it
// survives route changes). It:
//   - builds ROLE-AWARE steps from useAuth().canPublish (editor sees the Publish-queue step; author
//     does not) — see app/tour.config.ts buildTourConfig();
//   - runs the welcome → intro slides → spotlight flow;
//   - exposes `launch()` so a TourTrigger anywhere can replay the tour even after it's been seen.
//
// First-run-once and skippability are the module's built-ins: completion persists in localStorage
// under a versioned key (`studio-tour-v1`), and cancel()/Esc/skip all mark-as-seen. We only decide
// WHEN to auto-show the welcome (first run) — the caller gates that to the dashboard route.
import { ref } from '#imports'
import { buildTourConfig, introSlides } from '~/tour.config'

// NOTE on the auto-imported `useTour`: @nuxt/ui v4 also ships a `useTour` with a different,
// incompatible API (open/index/current, no localStorage/markAsSeen). The nuxt-guided-tour module
// registers its own via addImports, which WINS — Nuxt's generated .nuxt/types/imports.d.ts maps the
// auto-imported `useTour` to nuxt-guided-tour. So the bare auto-import below is the correct,
// fully-typed one (a deep `dist/...` import can't be used: the package's exports map doesn't expose
// it, which TypeScript rejects). The build-time "Duplicated imports useTour" warning just notes the
// shadowing and is expected/benign.

export function useStudioTour() {
  const { canPublish } = useAuth()

  // Build steps for THIS viewer's role now — useTour() snapshots `steps` and won't re-read them.
  const tour = useTour(buildTourConfig(canPublish.value))

  // Welcome modal → optional intro slides → spotlight walkthrough.
  const showWelcome = ref(false)
  const showIntro = ref(false)

  /** First-run gate: show the welcome once, only if the user has never completed/skipped the tour. */
  function maybeAutoStart() {
    if (tour.autoStart && !tour.hasCompletedTour.value) {
      setTimeout(() => {
        // Re-check: another path (or a fast skip) may have marked it seen during the delay.
        if (!tour.hasCompletedTour.value) showWelcome.value = true
      }, tour.autoStartDelay)
    }
  }

  /** Replay from the welcome regardless of seen/skipped state (the TourTrigger entry point). */
  function launch() {
    tour.resetCompletion()
    showIntro.value = false
    showWelcome.value = true
  }

  function startFromWelcome() {
    showWelcome.value = false
    if (introSlides.length > 0) showIntro.value = true
    else tour.start()
  }

  function skipFromWelcome() {
    showWelcome.value = false
    tour.markAsSeen() // skippable → mark seen so a reload won't re-trigger first-run
  }

  function completeIntro() {
    showIntro.value = false
    tour.start()
  }

  function skipIntro() {
    showIntro.value = false
    tour.markAsSeen()
  }

  return {
    tour,
    introSlides,
    showWelcome,
    showIntro,
    maybeAutoStart,
    launch,
    startFromWelcome,
    skipFromWelcome,
    completeIntro,
    skipIntro,
  }
}
