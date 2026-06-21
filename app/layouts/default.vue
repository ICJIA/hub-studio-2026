<script setup lang="ts">
import { APP_NAME } from '~/lib/constants'

const auth = useAuthStore()
const { logout } = useAuth()
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <header class="sticky top-0 z-20 border-b border-default bg-default/85 backdrop-blur-md">
      <div class="max-w-6xl mx-auto w-full px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <NuxtLink to="/" class="flex items-center gap-2.5 font-semibold text-highlighted transition-opacity hover:opacity-80">
          <span class="grid place-items-center size-8 rounded-lg bg-primary text-inverted text-[0.7rem] font-bold tracking-tight">IC</span>
          <span class="hidden sm:inline">{{ APP_NAME }}</span>
        </NuxtLink>
        <div v-if="auth.isLoggedIn" class="flex items-center gap-2 sm:gap-3">
          <span class="hidden sm:inline text-sm text-muted">{{ auth.displayName }}</span>
          <UBadge :label="auth.canPublish ? 'Publisher' : 'Author'" :color="auth.canPublish ? 'primary' : 'neutral'" variant="subtle" />
          <UButton size="sm" variant="ghost" color="neutral" label="Log out" @click="logout" />
        </div>
      </div>
    </header>
    <main class="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <slot />
    </main>
  </div>
</template>
