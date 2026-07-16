<!-- app/components/DraftRestoreBanner.vue -->
<!--
  Restore banner for a surviving draft snapshot (unsaved-work guard, spec §1). Non-blocking
  by design (user decision): the saved draft renders beneath; nothing changes until the
  author clicks Restore (apply the snapshot, still unsaved) or Discard (drop it). role=status
  so screen readers announce it without stealing focus.
-->
<script setup lang="ts">
import { computed } from '#imports'

const props = defineProps<{ savedAt: string }>()
const emit = defineEmits<{ restore: []; discard: [] }>()

const savedAtLabel = computed(() => {
  const date = new Date(props.savedAt)
  return Number.isNaN(date.getTime()) ? props.savedAt : date.toLocaleString()
})
</script>

<template>
  <div
    role="status"
    class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm"
    data-test="draft-restore-banner"
  >
    <p class="text-highlighted">
      <span class="font-semibold">Unsaved changes from {{ savedAtLabel }} found.</span>
      They were backed up in this browser before the draft was last closed.
    </p>
    <div class="flex gap-2">
      <UButton size="xs" color="warning" variant="solid" data-test="draft-restore" @click="emit('restore')">
        Restore
      </UButton>
      <UButton size="xs" color="neutral" variant="outline" data-test="draft-discard" @click="emit('discard')">
        Discard
      </UButton>
    </div>
  </div>
</template>
