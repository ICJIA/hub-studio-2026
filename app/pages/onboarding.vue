<!-- app/pages/onboarding.vue -->
<!--
  /onboarding — first-login profile capture for AUTHORS (Plan 7). Reachable while gated because the
  guard excludes /onboarding from its own redirect; NOT public (stays behind login) and NOT adminOnly
  (authors must reach it). The author confirms their email (prefilled + READ-ONLY), enters one or more
  reviewer/manager emails (required + validated via the shared validateStudioProfile), and picks their
  center (CENTER_OPTIONS — a placeholder list). On a clean submit it creates the studio-profile,
  flips the auth store's hasProfile to true (so the guard immediately stops gating), and returns the
  author to the dashboard. Thin over the pure validator + useStudioProfile().repo.create.
-->
<script setup lang="ts">
import { reactive, ref, computed } from '#imports'
import type { StudioProfile } from '~/types/studio-profile'
import { blankStudioProfile, validateStudioProfile } from '~/lib/studio-profile-form'
import { CENTER_OPTIONS } from '~/lib/center-options'
import type { FieldError } from '~/lib/validators/article'

definePageMeta({})

const { user } = useAuth()
const store = useAuthStore()
const profileApi = useStudioProfile()
const toast = useToast()

const authorEmail = computed(() => user.value?.email ?? '')
const model = reactive<StudioProfile>(blankStudioProfile(authorEmail.value))

const reviewersRaw = ref('')
const errors = ref<FieldError[]>([])
const busy = ref(false)

/** Parse the free-text reviewer input into a clean address list (comma / whitespace separated). */
const reviewers = computed(() =>
  reviewersRaw.value.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean),
)

function errorFor(field: string): string | undefined {
  return errors.value.find((e) => e.field === field)?.message
}

// Test/host hooks: set the reviewer list / center directly.
function setReviewers(list: string[]) { reviewersRaw.value = list.join(', ') }
function setCenter(v: string) { model.center = v }

async function submit() {
  // Keep the model in sync with the inputs before validating.
  model.authorEmail = authorEmail.value
  model.reviewers = reviewers.value

  errors.value = validateStudioProfile(model)
  if (errors.value.length > 0) {
    toast.add({ title: 'Please fix the highlighted fields', color: 'error' })
    return
  }

  busy.value = true
  try {
    await profileApi.repo.create({ ...model })
    store.setHasProfile(true) // the guard immediately stops gating
    toast.add({ title: 'Profile saved', description: 'Welcome to the Studio.', color: 'success' })
    await navigateTo('/')
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Could not save your profile.'
    errors.value = [{ field: 'form', message }]
    toast.add({ title: 'Could not save', description: message, color: 'error' })
  } finally {
    busy.value = false
  }
}

defineExpose({ setReviewers, setCenter, submit, errors, authorEmail })
</script>

<template>
  <div class="max-w-xl mx-auto py-8 space-y-4">
    <div>
      <h1 class="text-2xl font-semibold">Set up your Studio profile</h1>
      <p class="text-sm text-muted">A one-time step. Tell us who reviews your work and which center you are in.</p>
    </div>

    <form class="space-y-4" @submit.prevent="submit">
      <UFormField label="Your email">
        <UInput :model-value="authorEmail" readonly disabled class="w-full" />
      </UFormField>

      <UFormField label="Reviewer / manager email(s)" help="One or more, separated by commas or spaces." :error="errorFor('reviewers')">
        <UInput
          :model-value="reviewersRaw"
          placeholder="manager@icjia.illinois.gov"
          class="w-full"
          @update:model-value="reviewersRaw = String($event)"
        />
      </UFormField>

      <SelectField :model-value="model.center" label="Your center" :options="CENTER_OPTIONS" @update:model-value="model.center = $event ?? ''" />
      <p v-if="errorFor('center')" role="alert" class="text-sm text-error">{{ errorFor('center') }}</p>

      <p v-if="errorFor('form')" role="alert" class="text-sm text-error">{{ errorFor('form') }}</p>

      <UButton type="submit" label="Save profile and continue" :loading="busy" />
    </form>
  </div>
</template>
