<!-- app/pages/index.vue -->
<!--
  Role-aware dashboard (spec §9): Create + Drafts for everyone; Publish queue only for managers
  (canPublish). First-login onboarding (manager emails / center / author email) is DEFERRED — it
  needs the approved `studio-profile` Strapi collection type (create in the dev env first); leave
  the seam here and wire onboarding once the type exists (follow-on plan).
-->
<script setup lang="ts">
import { ref } from '#imports'

const { user, canPublish } = useAuth()
const listType = ref<'article' | 'app' | 'dataset'>('article')
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold">Welcome{{ user ? `, ${user.firstname || user.username || user.email}` : '' }}</h1>
      <p class="text-muted">Signed in as <strong>{{ user?.email ?? 'unknown' }}</strong>.</p>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <UCard>
        <template #header><h2 class="font-medium">Create</h2></template>
        <div class="flex flex-col gap-2">
          <UButton to="/create/article" variant="subtle" label="New article" />
          <UButton to="/create/app" variant="subtle" label="New app" />
          <UButton to="/create/dataset" variant="subtle" label="New dataset" />
        </div>
      </UCard>

      <UCard v-if="canPublish">
        <template #header><h2 class="font-medium">Publish queue</h2></template>
        <p class="text-sm text-muted mb-2">Review submitted drafts.</p>
        <UButton to="/manage" variant="subtle" label="Open queue" />
      </UCard>
    </div>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="font-medium">Drafts</h2>
          <USelect
            v-model="listType"
            :items="[
              { label: 'Articles', value: 'article' },
              { label: 'Apps', value: 'app' },
              { label: 'Datasets', value: 'dataset' },
            ]"
            size="sm"
          />
        </div>
      </template>
      <ContentList :key="listType" :type="listType" status="draft" />
    </UCard>
  </div>
</template>
