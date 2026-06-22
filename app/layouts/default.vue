<script setup lang="ts">
import { watch } from '#imports'
import { APP_NAME } from '~/lib/constants'
import { isDemoSession } from '~/lib/demo'

const auth = useAuthStore()
const { logout } = useAuth()
const demo = isDemoSession()
// The demo banner is dismissable, but its dismissed state is intentionally NOT persisted — it
// returns each session (a plain ref resets on reload). Light/dark IS persisted (colorMode storageKey).
const showBanner = ref(true)
const logoSrc = '/images/icjia-logo.png'

const colorMode = useColorMode()
function toggleColorMode() {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}

// Guided onboarding tour (nuxt-guided-tour). ONE instance lives here in the layout so it survives
// route changes and a single TourTrigger in the nav can replay it. Auto-start (first-run-once via
// the module's versioned localStorage key) and the spotlight steps only make sense on the dashboard
// (that's where the target elements are), so we gate auto-start + replay to the `/` route.
const route = useRoute()
const studioTour = useStudioTour()

function onDashboard() {
  return route.path === '/'
}

onMounted(() => {
  // First-run auto-start: only on the dashboard, only if logged in (the tour spotlights the
  // signed-in dashboard chrome). The module itself ensures it fires at most once (localStorage).
  if (onDashboard() && auth.isLoggedIn) studioTour.maybeAutoStart()
})

// Replay entry point used by the editor toolbar's TourTrigger: it navigates to `/?tour=1`. When we
// land on the dashboard with that flag, launch the tour, then strip the query so a reload won't
// replay it.
watch(
  () => [route.path, route.query.tour] as const,
  ([path, flag]) => {
    if (path === '/' && flag != null) {
      studioTour.launch()
      navigateTo('/', { replace: true })
    }
  },
  { immediate: true },
)

// Nav re-launch button: replay only makes sense where the tour runs (the dashboard). Clicking it
// from the dashboard launches immediately; the editor-toolbar trigger routes here via `/?tour=1`.
function relaunchFromNav() {
  if (onDashboard()) studioTour.launch()
  else navigateTo('/?tour=1')
}
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <!-- Demo mode banner -->
    <div
      v-if="demo && showBanner"
      data-tour="demo-banner"
      class="relative w-full bg-amber-100 border-b border-amber-300 text-amber-900 text-xs text-center py-2 pl-4 pr-10"
      role="status"
    >
      <span class="font-semibold">Demo mode</span> — public demonstration with sample content. There is
      <span class="font-semibold">no secure login</span>, and nothing you change is saved (all data is in-memory and resets each session).
      <button
        type="button"
        class="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-amber-700 transition-colors hover:bg-amber-200/70 hover:text-amber-900"
        aria-label="Dismiss demo notice"
        @click="showBanner = false"
      >
        <UIcon name="i-lucide-x" class="size-4 block" />
      </button>
    </div>

    <header class="sticky top-0 z-20 border-b border-default bg-default/85 backdrop-blur-md">
      <div class="max-w-6xl mx-auto w-full px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <NuxtLink to="/" class="flex items-center gap-2.5 font-semibold text-highlighted transition-opacity hover:opacity-80">
          <img :src="logoSrc" alt="ICJIA" class="h-9 w-auto rounded">
          <span class="hidden sm:inline">{{ APP_NAME }}</span>
        </NuxtLink>
        <div class="flex items-center gap-2 sm:gap-3">
          <template v-if="auth.isLoggedIn">
            <span class="hidden sm:inline text-sm text-muted">{{ auth.displayName }}</span>
            <UBadge data-tour="role-badge" :label="auth.canPublish ? 'Publisher' : 'Author'" :color="auth.canPublish ? 'primary' : 'neutral'" variant="subtle" />
            <!-- Re-launch the guided tour. Visible to both authors and editors (the tour runs on the
                 dashboard where this nav is shown); replays even after it's been seen/skipped. -->
            <TourTrigger
              icon-only
              icon="i-lucide-circle-help"
              tooltip="Take the guided tour"
              label="Take the guided tour"
              @click="relaunchFromNav"
            />
            <UButton size="sm" variant="ghost" color="neutral" label="Log out" @click="logout" />
          </template>
          <!-- Theme toggle is always the last button -->
          <UButton
            data-tour="theme-toggle"
            size="sm" variant="ghost" color="neutral"
            :icon="colorMode.value === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon'"
            :aria-label="`Switch to ${colorMode.value === 'dark' ? 'light' : 'dark'} mode`"
            title="Toggle light / dark"
            @click="toggleColorMode"
          />
        </div>
      </div>
    </header>
    <main class="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <slot />
    </main>

    <!-- Guided tour driver (nuxt-guided-tour). Welcome → optional intro slides → spotlight overlay.
         All three are skippable: Esc / backdrop / Skip on the welcome & intro, and Esc / Skip on the
         overlay, each marking the tour seen so a reload won't re-trigger first-run. -->
    <TourWelcome
      :is-visible="studioTour.showWelcome.value"
      title="Welcome to the Research Hub Studio"
      description="This is the staff tool for the ICJIA Research Hub. Want a 60-second tour of the dashboard?"
      subdescription="You can replay it anytime from the help button in the top bar."
      start-label="Start the tour"
      skip-label="No thanks, I'll explore"
      @start-tour="studioTour.startFromWelcome"
      @skip-tour="studioTour.skipFromWelcome"
    />

    <TourIntro
      :is-visible="studioTour.showIntro.value"
      :slides="studioTour.introSlides"
      @next="studioTour.completeIntro"
      @skip="studioTour.skipIntro"
    />

    <TourOverlay
      :is-active="studioTour.tour.isActive.value"
      :current-step="studioTour.tour.currentStep.value"
      :progress="studioTour.tour.progress.value"
      @next="studioTour.tour.next"
      @previous="studioTour.tour.previous"
      @cancel="studioTour.tour.cancel"
    />
  </div>
</template>
