<!-- app/components/DraftRestoreBanner.vue -->
<!--
  Restore banner for a surviving draft snapshot (unsaved-work guard, spec §1). Non-blocking
  by design (user decision): the saved draft renders beneath; nothing changes until the
  author clicks Restore (apply the snapshot, still unsaved) or Discard (drop it). role=status
  so screen readers announce it without stealing focus.

  `busy` (final-review Fix round 1, Critical — mirror of ConflictBanner's own `busy` prop):
  ArticleForm/AppForm/DatasetForm's loadTheirs() can mount THIS banner mid-flight — its
  snapshotNow() flips the guard's restoreAvailable true (so the freshly-written snapshot is
  visible for recovery) BEFORE its own findOne() await settles. Without this prop, both buttons
  stay clickable for that entire window: an impatient Restore or Discard click there runs the
  guard's raw restore()/discard(), clearing the very snapshot snapshotNow() just wrote to
  protect the author's pre-replace edits — destroying the local backup this whole feature
  exists to provide. The host form's `saving` ref (already the single source of truth for "some
  save-ish operation is in flight" — see ConflictBanner's comment) is wired through to this
  prop, disabling both buttons here too. (The `saving`-checked early-returns in the form's own
  onRestore()/onDiscard() wrappers are the actual race-closing fix; `busy` here is the
  complementary UI-level defense — real users shouldn't see a clickable button that will
  secretly no-op.)
-->
<script setup lang="ts">
import { computed } from '#imports'

const props = defineProps<{ savedAt: string; busy?: boolean }>()
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
      <UButton
        size="xs" color="warning" variant="solid" :disabled="busy" :loading="busy"
        data-test="draft-restore" @click="emit('restore')"
      >
        Restore
      </UButton>
      <UButton
        size="xs" color="neutral" variant="outline" :disabled="busy" :loading="busy"
        data-test="draft-discard" @click="emit('discard')"
      >
        Discard
      </UButton>
    </div>
  </div>
</template>
