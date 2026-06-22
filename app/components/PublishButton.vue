<!-- app/components/PublishButton.vue -->
<!--
  PublishButton: the canPublish-aware publish/unpublish toggle (Plan 6). For a publisher a DRAFT
  shows "Publish" → repo.publish(documentId); a PUBLISHED entry shows "Unpublish" →
  repo.unpublish(documentId). Both confirm via a modal, then emit `published` with the updated entity
  + toast. A NON-publisher (author) sees the SAME control but DIMMED/DISABLED — clicking (or
  hovering, via the tooltip) explains "You must be an editor to publish to the Hub." so managers can
  see the difference between the roles; the publish/unpublish actions are unreachable for them.

  This UI gate is DEFENSE-IN-DEPTH and intentionally show-disabled (not hidden): the role still
  governs the action. Strapi ALSO enforces the publisher role server-side (an author's JWT → 403),
  so even if the disabled control were forced open the write would fail closed. The disabled state +
  the early return in onClick are what keep an author from ever invoking repo.publish/unpublish.
-->
<script setup lang="ts">
import { ref, computed } from '#imports'
import type { Article, App, Dataset } from '~/types/content'

type Entity = Article | App | Dataset

const props = defineProps<{ type: 'article' | 'app' | 'dataset'; documentId: string; published?: boolean; size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' }>()
const emit = defineEmits<{ published: [entity: Entity] }>()

const { canPublish } = useAuth()
const repo = props.type === 'article' ? useArticles() : props.type === 'app' ? useApps() : useDatasets()
const toast = useToast()

/** Shown to an author on hover (tooltip) and on click (toast) — the role can't publish to the Hub. */
const AUTHOR_DENIED_MESSAGE = 'You must be an editor to publish to the Hub.'

const open = ref(false)        // confirm dialog
const busy = ref(false)
const error = ref<string | null>(null)

// Toggle: a published entry offers Unpublish; a draft offers Publish.
const isPublished = computed(() => props.published === true)
const label = computed(() => (isPublished.value ? 'Unpublish' : 'Publish'))
const icon = computed(() => (isPublished.value ? 'i-lucide-archive' : 'i-lucide-globe'))
// Color-coded for at-a-glance state: Publish = success (go live), Unpublish = warning (take down).
const color = computed(() => (isPublished.value ? 'warning' : 'success'))
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

/**
 * Click handler for the toggle. DEFAULT-DENY: an author (canPublish false) never opens the confirm
 * modal — they get the "must be an editor" explainer and the publish/unpublish action is unreachable
 * (it never calls repo.publish/unpublish). A publisher opens the confirm dialog exactly as before.
 */
function onClick() {
  if (!canPublish.value) {
    toast.add({ title: 'Editors only', description: AUTHOR_DENIED_MESSAGE, color: 'info' })
    return
  }
  open.value = true
}

defineExpose({ confirmPublish, confirmUnpublish, onClick, open })
</script>

<template>
  <div class="inline-flex flex-col gap-1">
    <!-- PUBLISHER: the live toggle (active solid button → confirm modal → real publish/unpublish). -->
    <UButton
      v-if="canPublish"
      :label="label"
      :disabled="busy"
      :loading="busy"
      :color="color"
      :icon="icon"
      :size="props.size"
      variant="solid"
      @click="onClick"
    />

    <!-- AUTHOR: the SAME control, DIMMED + disabled, with an explainer on hover (native title) and on
         click (toast). The wrapper carries the click so the disabled button still surfaces the
         "editors only" message (a native disabled <button> swallows clicks). The action stays
         unreachable — onClick early-returns. A native `title` is used (not UTooltip) so the control
         needs no TooltipProvider ancestor and degrades cleanly anywhere it's mounted. -->
    <span
      v-else
      class="inline-flex cursor-not-allowed"
      role="button"
      :title="AUTHOR_DENIED_MESSAGE"
      :aria-label="AUTHOR_DENIED_MESSAGE"
      @click="onClick"
    >
      <UButton
        :label="label"
        :color="color"
        :icon="icon"
        :size="props.size"
        variant="solid"
        disabled
        aria-disabled="true"
        class="pointer-events-none opacity-50"
        tabindex="-1"
      />
    </span>

    <!-- Confirm dialog is publisher-only: an author never reaches open=true (onClick early-returns). -->
    <UModal v-if="canPublish" v-model:open="open" :title="title">
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
