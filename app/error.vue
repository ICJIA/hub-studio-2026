<!-- app/error.vue -->
<script setup lang="ts">
import type { NuxtError } from '#app'
defineProps<{ error: NuxtError }>()
</script>
<template>
  <UApp>
    <div class="min-h-screen flex flex-col items-center justify-center gap-3 p-4 text-center">
      <h1 class="text-3xl font-semibold">{{ error.statusCode === 404 ? 'Page not found' : 'Something went wrong' }}</h1>
      <p class="text-muted">{{ error.statusCode === 404 ? 'That page does not exist.' : (error.message || 'Unexpected error.') }}</p>
      <UButton to="/" label="Back to dashboard" @click="clearError({ redirect: '/' })" />
    </div>
  </UApp>
</template>
