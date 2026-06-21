<!-- app/components/PublishButton.vue -->
<!--
  PublishButton: the canPublish-GATED publish affordance (Plan 6). DEFAULT-DENY — renders nothing
  for a non-publisher, so an author never sees or reaches Publish. For a publisher: confirm →
  repo.publish(documentId) (Content-Manager publish action) → emit `published` + toast. This UI gate
  is DEFENSE-IN-DEPTH: Strapi ALSO enforces the publisher role server-side (an author's JWT → 403),
  surfaced here as an error. Replaces the Plan-5 "Coming in Plan 6" placeholder.
-->
<script setup lang="ts">
import { ref, computed } from '#imports'
import type { Article, App, Dataset } from '~/types/content'

type Entity = Article | App | Dataset

const props = defineProps<{ type: 'article' | 'app' | 'dataset'; documentId: string; published?: boolean }>()
const emit = defineEmits<{ published: [entity: Entity] }>()

const { canPublish } = useAuth()
const repo = props.type === 'article' ? useArticles() : props.type === 'app' ? useApps() : useDatasets()
const toast = useToast()

const open = ref(false)        // confirm dialog
const busy = ref(false)
const error = ref<string | null>(null)

const label = computed(() => (props.published ? 'Published' : 'Publish'))

/** Run the publish: call the repo's CM publish action, emit the result, surface success/error. */
async function confirmPublish() {
  busy.value = true
  error.value = null
  try {
    const entity = (await repo.publish(props.documentId)) as Entity
    emit('published', entity)
    open.value = false
    toast.add({ title: 'Published', description: 'The entry is now live.', color: 'success' })
  } catch (e) {
    // Strapi rejects a non-publisher JWT with 403 (defense-in-depth); surface it.
    error.value = e instanceof Error ? e.message : 'Publish failed.'
    toast.add({ title: 'Publish failed', description: error.value, color: 'error' })
  } finally {
    busy.value = false
  }
}

defineExpose({ confirmPublish, open })
</script>

<template>
  <!-- Default-deny: only publishers see anything at all. -->
  <div v-if="canPublish" class="inline-flex flex-col gap-1">
    <UButton
      :label="label"
      :disabled="busy || published"
      :loading="busy"
      color="primary"
      icon="i-lucide-globe"
      @click="open = true"
    />

    <UModal v-model:open="open" title="Publish this entry?">
      <template #body>
        <p class="text-sm">
          Publishing makes the entry live and triggers a public-site rebuild. This cannot be undone here.
        </p>
        <p v-if="error" role="alert" class="text-sm text-error mt-2">{{ error }}</p>
      </template>
      <template #footer>
        <UButton color="neutral" variant="ghost" label="Cancel" :disabled="busy" @click="open = false" />
        <UButton color="primary" label="Publish" :loading="busy" @click="confirmPublish" />
      </template>
    </UModal>
  </div>
</template>
