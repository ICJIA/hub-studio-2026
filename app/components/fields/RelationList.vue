<!-- app/components/fields/RelationList.vue -->
<script setup lang="ts">
// READ-ONLY: relation WRITE is deferred by the data layer (*Write payloads carry no relation
// fields). This shows the related items' titles only; there is no connect/disconnect here.
import type { RelationRef } from '~/types/content'

defineProps<{ label: string; items: RelationRef[] }>()
</script>

<template>
  <UFormField :label="label">
    <p v-if="!items.length" class="text-sm text-muted">None.</p>
    <ul v-else class="text-sm list-disc pl-5">
      <li v-for="item in items" :key="item.documentId">{{ item.title }}</li>
    </ul>
    <p class="text-xs text-muted mt-1">Linking related content is not editable here (planned).</p>
  </UFormField>
</template>
