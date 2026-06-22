<script setup lang="ts">
import { APP_NAME } from '~/lib/constants'
import { isDemoSession } from '~/lib/demo'
import GuidedTour from '~/components/tour/GuidedTour.vue'
import GuidedTrigger from '~/components/tour/GuidedTrigger.vue'

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

// Guided onboarding tour: one instance mounted below. The nav trigger calls launch() via this ref.
// Calling a setup METHOD (never an inline navigateTo in the template) keeps every page safe.
const guidedTour = ref<{ launch: () => void } | null>(null)
function launchTour() {
  guidedTour.value?.launch()
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
          <!-- Replay the guided tour (both roles). Calls a setup method — never an inline
               navigateTo in the template (that scoping bug crashed the prior attempt). -->
          <GuidedTrigger
            v-if="auth.isLoggedIn"
            label="Tour"
            icon="i-lucide-compass"
            variant="ghost"
            color="neutral"
            size="sm"
            tooltip="Replay the guided tour"
            @click="launchTour"
          />
          <template v-if="auth.isLoggedIn">
            <span class="hidden sm:inline text-sm text-muted">{{ auth.displayName }}</span>
            <UBadge data-tour="role-badge" :label="auth.canPublish ? 'Publisher' : 'Author'" :color="auth.canPublish ? 'primary' : 'neutral'" variant="subtle" />
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

    <!-- Single guided-tour instance (welcome → intro → spotlight). Auto-starts first-run-once on
         the dashboard; the nav "Tour" button replays it via launchTour(). Only meaningful when
         logged in (the dashboard targets require a session). -->
    <GuidedTour
      v-if="auth.isLoggedIn"
      ref="guidedTour"
      :show-demo-banner="demo && showBanner"
      :logo-url="logoSrc"
    />
  </div>
</template>
