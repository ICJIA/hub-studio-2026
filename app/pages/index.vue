<script setup lang="ts">
const { user, role, isAdmin } = useAuth()
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold">Welcome{{ user ? `, ${user.username}` : '' }}</h1>
      <p class="text-muted">
        Signed in as <strong>{{ role ?? 'unknown role' }}</strong>.
      </p>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <UCard>
        <template #header><h2 class="font-medium">Create</h2></template>
        <p class="text-sm text-muted">Start a new article, app, or dataset. (Coming in a later phase.)</p>
      </UCard>

      <UCard>
        <template #header><h2 class="font-medium">My drafts</h2></template>
        <p class="text-sm text-muted">Continue editing your drafts. (Coming in a later phase.)</p>
      </UCard>

      <UCard v-if="isAdmin">
        <template #header><h2 class="font-medium">Publish queue</h2></template>
        <p class="text-sm text-muted">Review and publish submitted drafts. (Coming in a later phase.)</p>
      </UCard>
    </div>
  </div>
</template>
