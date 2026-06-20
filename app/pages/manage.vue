<!-- app/pages/manage.vue -->
<!--
  /manage — Manager publish queue (spec §9). adminOnly: the global guard redirects non-publishers.
  Lists draft content per type (read-only). The Publish action + Netlify rebuild + Mailgun review
  email is Plan 6 — the queue lists but cannot publish here.
-->
<script setup lang="ts">
import { ref } from '#imports'

definePageMeta({ adminOnly: true })

const listType = ref<'article' | 'app' | 'dataset'>('article')
</script>
<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-semibold">Publish queue</h1>
    <p class="text-sm text-muted">Drafts awaiting review. Publishing arrives in a later phase (Plan 6).</p>
    <UCard>
      <template #header>
        <USelect
          v-model="listType"
          :items="[
            { label: 'Articles', value: 'article' },
            { label: 'Apps', value: 'app' },
            { label: 'Datasets', value: 'dataset' },
          ]"
          size="sm"
        />
      </template>
      <ContentList :key="listType" :type="listType" status="draft" />
    </UCard>
  </div>
</template>
