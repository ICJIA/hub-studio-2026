<!-- app/components/RequestReviewForm.vue -->
<!--
  RequestReviewForm: the "Request review" affordance (Plan 6, LOCKED decision 4). Reviewer email(s)
  (manual entry now; onboarding prefill is deferred) + an optional message → POST the same-origin
  Nitro route /api/request-review with the caller's admin JWT as a Bearer token (so the route's
  anti-abuse /admin/users/me check passes). The route builds + sends the email containing the
  EXACT /preview/:type/:documentId link. The Mailgun key NEVER reaches the client — this only sends
  the reviewer list + message + bearer token to our own server. Available to any signed-in user
  (review is not publish-gated).
-->
<script setup lang="ts">
import { ref, computed, onMounted } from '#imports'
import { isValidEmail } from '~/lib/review-email'

const props = defineProps<{ type: 'article' | 'app' | 'dataset'; documentId: string }>()
const emit = defineEmits<{ sent: [] }>()

const auth = useAuthStore()
const toast = useToast()

const reviewersRaw = ref('')
const message = ref('')
const busy = ref(false)
const error = ref<string | null>(null)

/** Parse the free-text input into a clean address list (comma / whitespace / newline separated). */
const reviewers = computed(() =>
  reviewersRaw.value.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean),
)

function setReviewers(v: string) { reviewersRaw.value = v; error.value = null }
function setMessage(v: string) { message.value = v }

// PREFILL (Plan 7, additive + graceful): if the signed-in author has a studio-profile, seed the
// reviewer field from its reviewers. Wrapped fail-open — ANY error (the studio-profile type not
// existing yet, no profile, no email, a network error) leaves the field empty, exactly as before.
onMounted(async () => {
  if (reviewersRaw.value.trim()) return // don't clobber a value the user already typed
  try {
    const email = auth.user?.email
    if (!email) return
    const profile = await useStudioProfile().findByAuthorEmail(email)
    if (profile && profile.reviewers.length > 0) {
      setReviewers(profile.reviewers.join(', '))
    }
  } catch (e) {
    console.warn('[request-review] reviewer prefill skipped', e)
  }
})

async function send() {
  error.value = null
  const list = reviewers.value
  if (list.length === 0) { error.value = 'Enter at least one reviewer email.'; return }
  const bad = list.find((r) => !isValidEmail(r))
  if (bad) { error.value = `Invalid email: ${bad}`; return } // client-side gate; server re-validates

  busy.value = true
  try {
    await $fetch('/api/request-review', {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth.jwt ?? ''}` },
      body: {
        type: props.type,
        documentId: props.documentId,
        reviewers: list,
        message: message.value.trim() || undefined,
      },
    })
    emit('sent')
    reviewersRaw.value = ''
    message.value = ''
    toast.add({ title: 'Review requested', description: 'The preview link was emailed to the reviewer(s).', color: 'success' })
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to send the review email.'
    toast.add({ title: 'Could not send', description: error.value, color: 'error' })
  } finally {
    busy.value = false
  }
}

defineExpose({ setReviewers, setMessage, send, error, busy })
</script>

<template>
  <form class="space-y-2" @submit.prevent="send">
    <UFormField label="Reviewer email(s)" help="One or more, separated by commas or spaces.">
      <UInput
        :model-value="reviewersRaw"
        placeholder="reviewer@icjia.illinois.gov"
        class="w-full"
        @update:model-value="setReviewers(String($event))"
      />
    </UFormField>
    <UFormField label="Message (optional)">
      <UTextarea
        :model-value="message"
        :rows="3"
        class="w-full"
        @update:model-value="setMessage(String($event))"
      />
    </UFormField>
    <p v-if="error" role="alert" class="text-sm text-error">{{ error }}</p>
    <UButton type="submit" label="Send review request" icon="i-lucide-mail" :loading="busy" />
  </form>
</template>
