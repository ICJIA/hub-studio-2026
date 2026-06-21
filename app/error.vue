<!-- app/error.vue -->
<script setup lang="ts">
import type { NuxtError } from '#app'
import { errorHeading, errorBody } from '~/lib/error-display'
const props = defineProps<{ error: NuxtError }>()

// Audit L-5: never surface raw error.message / stack to users in production. The heading/body are
// derived by the pure error-display helpers; only import.meta.dev unlocks the thrown detail.
const heading = computed(() => errorHeading(props.error))
const body = computed(() => errorBody(props.error, import.meta.dev))
</script>
<template>
  <UApp>
    <div class="min-h-screen flex flex-col items-center justify-center gap-3 p-4 text-center">
      <h1 class="text-3xl font-semibold">{{ heading }}</h1>
      <p class="text-muted">{{ body }}</p>
      <UButton to="/" label="Back to dashboard" @click="clearError({ redirect: '/' })" />
    </div>
  </UApp>
</template>
