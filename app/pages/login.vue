<script setup lang="ts">
import { APP_NAME } from '~/lib/constants'
// DEV-ONLY in normal builds; ALSO the demo sign-in in the public demo build (see isDemoMode).
import { DEV_ADMIN_IDENTIFIER, DEV_ADMIN_PASSWORD } from '~/lib/dev-auth'
import { isDemoMode } from '~/lib/demo'

definePageMeta({ public: true, layout: false })

const { login } = useAuth()
const logoSrc = '/images/icjia-logo.png'
const toast = useToast()

const state = reactive({ identifier: '', password: '' })
const loading = ref(false)

// Public demo build: hide the real Strapi email/password form entirely and offer ONLY the
// demo sign-in. Baked at build (NUXT_PUBLIC_DEMO_MODE) — false in a normal build, so the real
// form renders exactly as today.
const demoMode = isDemoMode()

// Dev fixed-admin footer shortcut. `import.meta.dev` is false in production builds, so this
// footer and its handler are tree-shaken away from any non-dev build. See app/lib/dev-auth.ts.
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
    <div class="w-full max-w-sm space-y-3">
      <UCard>
      <template #header>
        <div class="flex items-center gap-2.5">
          <img :src="logoSrc" alt="ICJIA" class="h-10 w-auto rounded">
          <div>
            <h1 class="text-base font-semibold text-highlighted leading-tight">{{ APP_NAME }}</h1>
            <p class="text-sm text-muted">Sign in to continue</p>
          </div>
        </div>
      </template>

      <!-- Public demo build: ONLY the demo sign-in (the real Strapi form is not rendered at all). -->
      <div v-if="demoMode" class="space-y-3">
        <div class="rounded-md border border-amber-300 bg-amber-50 p-3 dark:border-amber-800/60 dark:bg-amber-950/40">
          <p class="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
            <UIcon name="i-lucide-flask-conical" class="size-4 shrink-0" />
            Demonstration
          </p>
          <p class="mt-1 text-xs leading-relaxed text-amber-800/90 dark:text-amber-200/80">
            This is a public, self-contained demonstration of the Hub Studio. Because it is running in
            <strong>demo mode</strong>, there is <strong>no secure, authenticated login</strong> — anyone may
            enter, all content is sample data held only in your browser, and nothing is ever saved to the
            server. In the live (non-demo) Studio, sign-in is a <strong>secure username&nbsp;/&nbsp;password
            login</strong> through ICJIA's Strapi staff accounts.
          </p>
        </div>
        <UButton block size="lg" :loading="loading" icon="i-lucide-flask-conical" label="Enter the demo" @click="signInAsDevAdmin" />
      </div>

      <!-- Normal build: the real Strapi email/password form (unchanged). -->
      <UForm v-else :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField label="Email" name="identifier">
          <UInput v-model="state.identifier" type="email" autocomplete="username" class="w-full" />
        </UFormField>
        <UFormField label="Password" name="password">
          <UInput v-model="state.password" type="password" autocomplete="current-password" class="w-full" />
        </UFormField>
        <UButton type="submit" block :loading="loading" label="Sign in" />
      </UForm>

      <template v-if="showDevAdmin && !demoMode" #footer>
        <div class="rounded-md border border-amber-300 bg-amber-50 p-3 space-y-2 dark:border-amber-800/60 dark:bg-amber-950/40">
          <p class="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
            <UIcon name="i-lucide-flask-conical" class="size-4 shrink-0" />
            Development &amp; demo only — automatically removed at launch
          </p>
          <p class="text-xs leading-relaxed text-amber-800/90 dark:text-amber-200/80">
            The <code>{{ DEV_ADMIN_IDENTIFIER }}</code> / <code>{{ DEV_ADMIN_PASSWORD }}</code> shortcut is a
            convenience for local development and demos. It exists <strong>only in development builds</strong> and is
            automatically stripped from the production app — <strong>it cannot ship to the live site</strong>. This is a
            deliberate, documented decision, reviewed in the red/blue team security audit. The live application
            authenticates <strong>exclusively through Strapi staff accounts</strong>.
          </p>
          <UButton
            color="neutral"
            variant="subtle"
            size="xs"
            block
            class="mt-1 ring-1 ring-amber-300 dark:ring-amber-800/60"
            :loading="loading"
            icon="i-lucide-flask-conical"
            label="Sign in as dev admin (dev / demo only)"
            @click="signInAsDevAdmin"
          />
        </div>
      </template>
      </UCard>

      <!-- No self-signup: accounts are provisioned by Research & Analysis in Strapi. Hidden in the
           public demo (there is no real account to provision). -->
      <p v-if="!demoMode" class="text-center text-xs text-muted leading-relaxed">
        Don't have a Hub Studio 2.0 ID? Contact <span class="font-medium text-toned">Research &amp; Analysis</span> for more information.
      </p>
    </div>
  </div>
</template>
