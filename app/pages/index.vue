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
// DEV/DEMO ONLY — the sample-content shortcuts are tree-shaken from production builds.
const showDevSamples = import.meta.dev
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

      <!-- DEV/DEMO ONLY — tree-shaken from production builds (import.meta.dev). -->
      <div
        v-if="showDevSamples"
        class="rounded-lg border border-amber-300 bg-amber-50 p-4 space-y-3 dark:border-amber-800/60 dark:bg-amber-950/40"
      >
        <div class="flex items-center gap-1.5 text-sm font-semibold text-amber-800 dark:text-amber-300">
          <UIcon name="i-lucide-flask-conical" class="size-4 shrink-0" />
          Sample content — development &amp; demo only
        </div>
        <p class="text-xs leading-relaxed text-amber-800/90 dark:text-amber-200/80">
          One-click samples that fill a form with realistic but <strong>100% fake</strong> content
          (lorem ipsum + made-up names) for demonstrations. Like the dev sign-in, these exist
          <strong>only in development builds</strong> and are <strong>automatically removed at launch</strong>
          — they cannot ship to the live site.
        </p>
        <div class="flex flex-col gap-2">
          <UButton to="/create/article?sample=1" variant="soft" color="warning" icon="i-lucide-flask-conical" label="Add sample article" />
          <UButton to="/create/app?sample=1" variant="soft" color="warning" icon="i-lucide-flask-conical" label="Add sample app" />
          <UButton to="/create/dataset?sample=1" variant="soft" color="warning" icon="i-lucide-flask-conical" label="Add sample dataset" />
        </div>
      </div>

      <UCard v-if="canPublish">
        <template #header><h2 class="font-medium">Publish queue</h2></template>
        <p class="text-sm text-muted mb-2">Review submitted drafts.</p>
        <UButton to="/manage" variant="subtle" label="Open queue" />
      </UCard>
    </div>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="font-medium">Articles</h2>
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
      <ContentList :key="listType" :type="listType" />
    </UCard>
  </div>
</template>
