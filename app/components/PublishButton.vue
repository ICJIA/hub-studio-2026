<!-- app/components/PublishButton.vue -->
<!--
  PublishButton: the canPublish-GATED publish/unpublish toggle (Plan 6). DEFAULT-DENY — renders
  nothing for a non-publisher, so an author never sees or reaches Publish/Unpublish. For a
  publisher: a DRAFT shows "Publish" → repo.publish(documentId); a PUBLISHED entry shows
  "Unpublish" → repo.unpublish(documentId). Both confirm via a modal, then emit `published` with
  the updated entity + toast. This UI gate is DEFENSE-IN-DEPTH: Strapi ALSO enforces the publisher
  role server-side (an author's JWT → 403), surfaced here as an error.
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

// Toggle: a published entry offers Unpublish; a draft offers Publish.
const isPublished = computed(() => props.published === true)
const label = computed(() => (isPublished.value ? 'Unpublish' : 'Publish'))
const icon = computed(() => (isPublished.value ? 'i-lucide-archive' : 'i-lucide-globe'))
const color = computed(() => (isPublished.value ? 'neutral' : 'primary'))
const title = computed(() => (isPublished.value ? 'Unpublish this entry?' : 'Publish this entry?'))

/** Publish a draft: call the repo's CM publish action, emit the result, surface success/error. */
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

/** Unpublish an entry: call the repo's CM unpublish action, emit the now-draft entity. */
async function confirmUnpublish() {
  busy.value = true
  error.value = null
  try {
    const entity = (await repo.unpublish(props.documentId)) as Entity
    emit('published', entity)
    open.value = false
    toast.add({ title: 'Unpublished', description: 'The entry is back to a draft.', color: 'success' })
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Unpublish failed.'
    toast.add({ title: 'Unpublish failed', description: error.value, color: 'error' })
  } finally {
    busy.value = false
  }
}

/** Route the confirm button to the right action for the current state. */
function onConfirm() {
  return isPublished.value ? confirmUnpublish() : confirmPublish()
}

defineExpose({ confirmPublish, confirmUnpublish, open })
</script>

<template>
  <!-- Default-deny: only publishers see anything at all. -->
  <div v-if="canPublish" class="inline-flex flex-col gap-1">
    <UButton
      :label="label"
      :disabled="busy"
      :loading="busy"
      :color="color"
      :icon="icon"
      @click="open = true"
    />

    <UModal v-model:open="open" :title="title">
      <template #body>
        <p v-if="isPublished" class="text-sm">
          Unpublishing returns the entry to Draft (it leaves the live site) and triggers a public-site rebuild.
        </p>
        <p v-else class="text-sm">
          Publishing makes the entry live and triggers a public-site rebuild. This cannot be undone here.
        </p>
        <p v-if="error" role="alert" class="text-sm text-error mt-2">{{ error }}</p>
      </template>
      <template #footer>
        <UButton color="neutral" variant="ghost" label="Cancel" :disabled="busy" @click="open = false" />
        <UButton :color="color" :label="label" :loading="busy" @click="onConfirm" />
      </template>
    </UModal>
  </div>
</template>
