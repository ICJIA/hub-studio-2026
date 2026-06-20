<!--
  MarkdownPreview: renders `source` to HTML via the single renderMarkdown seam (lib/markdown.ts)
  inside the ONE swappable prose stylesheet (.prose-preview → assets/css/prose-preview.css).
  Used by MarkdownField's live preview (Plan 5 Task 2) and the /preview route (Task 8); both
  share renderMarkdown so editor == published. renderMarkdown uses html:false, so the rendered
  HTML is trusted plugin output (raw author HTML is escaped) — safe for v-html.
-->
<script setup lang="ts">
import { computed } from '#imports'
import { renderMarkdown } from '~/lib/markdown'

const props = defineProps<{ source: string }>()
const html = computed(() => renderMarkdown(props.source))
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -- trusted: renderMarkdown runs markdown-it with html:false -->
  <div class="prose-preview" v-html="html" />
</template>
