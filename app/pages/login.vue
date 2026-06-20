<script setup lang="ts">
import { APP_NAME } from '~/lib/constants'
// DEV-ONLY — remove before production (see app/lib/dev-auth.ts header).
import { DEV_ADMIN_IDENTIFIER, DEV_ADMIN_PASSWORD } from '~/lib/dev-auth'

definePageMeta({ public: true, layout: false })

const { login } = useAuth()
const toast = useToast()

const state = reactive({ identifier: '', password: '' })
const loading = ref(false)

// DEV-ONLY fixed-admin shortcut. `import.meta.dev` is false in production builds,
// so the footer and its handler are tree-shaken away. See app/lib/dev-auth.ts.
const showDevAdmin = import.meta.dev

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

/** Fill the fixed dev credentials and submit — bypasses any native email validation. */
function signInAsDevAdmin() {
  state.identifier = DEV_ADMIN_IDENTIFIER
  state.password = DEV_ADMIN_PASSWORD
  return onSubmit()
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

      <template v-if="showDevAdmin" #footer>
        <div class="space-y-2 text-xs text-muted">
          <p>
            <span class="font-medium text-warning">Dev only:</span>
            fixed admin (<code>{{ DEV_ADMIN_IDENTIFIER }}</code> / <code>{{ DEV_ADMIN_PASSWORD }}</code>),
            no Strapi account needed.
          </p>
          <UButton
            color="neutral"
            variant="subtle"
            size="xs"
            block
            :loading="loading"
            label="Sign in as dev admin"
            @click="signInAsDevAdmin"
          />
        </div>
      </template>
    </UCard>
  </div>
</template>
