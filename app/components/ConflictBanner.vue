<!-- app/components/ConflictBanner.vue -->
<!--
  Conflict banner for the save-time edit-conflict check (design §1-2, ArticleForm's save-flow
  is the reference integration Task 4 copies). Someone else's save landed on this draft after it
  was loaded — the author must choose before their own save can proceed.

  role="alert" — a DELIBERATE contrast with DraftRestoreBanner's role="status": that banner is
  informational (nothing changes until the author acts, the saved draft renders fine underneath),
  so a polite, non-interrupting announcement is correct. This banner appears because an in-progress
  SAVE was just interrupted and cannot complete until the author decides — an assertive
  announcement is warranted. error-tinted rather than warning-tinted for the same reason: it's a
  more severe outcome (a save was blocked) than a recoverable local backup, and the distinct tint
  keeps the two banners visually separable on the rare occasion they render together (after
  Load-theirs, this banner closes and DraftRestoreBanner appears — see ArticleForm).

  Button colors are a deliberate choice, not spec-mandated: "Save anyway" overwrites the other
  person's edits, so it's tinted error/solid to flag that risk; "Load their version" is the
  non-destructive path (the author's own edits are preserved via the draft-backup snapshot before
  the model is replaced), so it gets the quieter neutral/outline treatment — mirroring
  DraftRestoreBanner's solid-primary + outline-secondary pairing.
-->
<script setup lang="ts">
import { computed } from '#imports'

const props = defineProps<{ theirSavedAt: string }>()
const emit = defineEmits<{ saveAnyway: []; loadTheirs: [] }>()

// Mirrors DraftRestoreBanner's savedAtLabel computed exactly, including the fallback-to-raw-
// string behavior (not an empty string — the copy below inlines this value, so an empty
// fallback would render as "their save: )."). Duplicated rather than extracted into a shared
// helper: this same small pattern already exists independently in DraftRestoreBanner AND
// AnnotationRail's timeOf (with a DIFFERENT fallback there — empty string), so there isn't yet
// one established shared utility to slot into; introducing one would mean touching
// DraftRestoreBanner.vue too, which is out of this task's file list. Noted here for whoever
// next touches either banner.
const theirSavedAtLabel = computed(() => {
  const date = new Date(props.theirSavedAt)
  return Number.isNaN(date.getTime()) ? props.theirSavedAt : date.toLocaleString()
})
</script>

<template>
  <div
    role="alert"
    class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-error/40 bg-error/10 px-4 py-3 text-sm"
    data-test="conflict-banner"
  >
    <p class="text-highlighted">
      This draft was changed by someone else while you were editing (their save: {{ theirSavedAtLabel }}).
    </p>
    <div class="flex gap-2">
      <UButton size="xs" color="error" variant="solid" data-test="conflict-save-anyway" @click="emit('saveAnyway')">
        Save anyway
      </UButton>
      <UButton size="xs" color="neutral" variant="outline" data-test="conflict-load-theirs" @click="emit('loadTheirs')">
        Load their version
      </UButton>
    </div>
  </div>
</template>
