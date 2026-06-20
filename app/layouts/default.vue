<script setup lang="ts">
import { APP_NAME } from '~/lib/constants'

const { user, role, logout } = useAuth()
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <header class="border-b border-default">
      <div class="max-w-5xl mx-auto w-full px-4 h-14 flex items-center justify-between">
        <NuxtLink to="/" class="font-semibold">{{ APP_NAME }}</NuxtLink>
        <div v-if="user" class="flex items-center gap-3">
          <UBadge v-if="role" :label="role" variant="subtle" />
          <span class="text-sm text-muted">{{ user.email }}</span>
          <UButton size="sm" variant="ghost" label="Log out" @click="logout" />
        </div>
      </div>
    </header>
    <main class="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
      <slot />
    </main>
  </div>
</template>
