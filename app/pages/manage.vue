<!-- app/pages/manage.vue -->
<!--
  /manage — Manager publish queue (spec §9). adminOnly: the global guard redirects non-publishers.
  Lists draft content per type and now offers, per draft, a canPublish-gated Publish button and a
  Request-review form (Plan 6). Publishing fires a Strapi webhook → Netlify build hook → public-site
  rebuild (configured by the user; see docs/deploy-rebuild-and-email.md). No Studio code triggers
  the rebuild.
-->
<script setup lang="ts">
import { ref } from '#imports'

definePageMeta({ adminOnly: true })

const listType = ref<'article' | 'app' | 'dataset'>('article')
const refreshKey = ref(0) // bump to refetch the list after a publish
function onPublished() { refreshKey.value++ }
</script>
<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-semibold">Publish queue</h1>
    <p class="text-sm text-muted">Review drafts, request review by email, and publish.</p>
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

      <ContentList :key="`${listType}-${refreshKey}`" :type="listType" status="draft">
        <template #row-actions="{ documentId, published }">
          <div class="flex flex-wrap items-center gap-2">
            <PublishButton :type="listType" :document-id="documentId" :published="published" @published="onPublished" />
            <UPopover>
              <UButton size="xs" variant="subtle" icon="i-lucide-mail" label="Request review" />
              <template #content>
                <div class="p-3 w-80">
                  <RequestReviewForm :type="listType" :document-id="documentId" />
                </div>
              </template>
            </UPopover>
          </div>
        </template>
      </ContentList>
    </UCard>
  </div>
</template>
