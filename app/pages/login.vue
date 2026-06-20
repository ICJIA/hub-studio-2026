<script setup lang="ts">
import { APP_NAME } from '~/lib/constants'

definePageMeta({ public: true, layout: false })

const { login } = useAuth()
const toast = useToast()

const state = reactive({ identifier: '', password: '' })
const loading = ref(false)

async function onSubmit() {
  loading.value = true
  try {
    await login(state.identifier, state.password)
    await navigateTo('/')
  } catch {
    toast.add({ title: 'Login failed', description: 'Check your email and password.', color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <UCard class="w-full max-w-sm">
      <template #header>
        <h1 class="text-lg font-semibold">{{ APP_NAME }}</h1>
        <p class="text-sm text-muted">Sign in to continue</p>
      </template>

      <UForm :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField label="Email" name="identifier">
          <UInput v-model="state.identifier" type="email" autocomplete="username" class="w-full" />
        </UFormField>
        <UFormField label="Password" name="password">
          <UInput v-model="state.password" type="password" autocomplete="current-password" class="w-full" />
        </UFormField>
        <UButton type="submit" block :loading="loading" label="Sign in" />
      </UForm>
    </UCard>
  </div>
</template>
