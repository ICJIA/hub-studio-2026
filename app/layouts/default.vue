<script setup lang="ts">
import { APP_NAME } from '~/lib/constants'
import { isDemoSession } from '~/lib/demo'

const auth = useAuthStore()
const { logout } = useAuth()
const demo = isDemoSession()
const logoSrc = '/images/icjia-logo.png'

const colorMode = useColorMode()
function toggleColorMode() {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <!-- Demo mode banner -->
    <div
      v-if="demo"
      class="w-full bg-amber-50 border-b border-amber-200 text-amber-800 text-xs text-center py-1.5 px-4"
      role="status"
    >
      Demo mode — sample content. Changes are kept only for this session and are never saved to the server.
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
            <UBadge :label="auth.canPublish ? 'Publisher' : 'Author'" :color="auth.canPublish ? 'primary' : 'neutral'" variant="subtle" />
            <UButton size="sm" variant="ghost" color="neutral" label="Log out" @click="logout" />
          </template>
          <!-- Theme toggle is always the last button -->
          <UButton
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
  </div>
</template>
