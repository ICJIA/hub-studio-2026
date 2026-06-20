<!-- app/pages/create/[type].vue -->
<script setup lang="ts">
import ArticleForm from '~/components/forms/ArticleForm.vue'
import AppForm from '~/components/forms/AppForm.vue'
import DatasetForm from '~/components/forms/DatasetForm.vue'

const route = useRoute()
const type = route.params.type as 'article' | 'app' | 'dataset'
</script>
<template>
  <div>
    <h1 class="text-2xl font-semibold mb-4">New {{ type }}</h1>
    <ArticleForm v-if="type === 'article'" mode="create" />
    <AppForm v-else-if="type === 'app'" mode="create" />
    <DatasetForm v-else-if="type === 'dataset'" mode="create" />
    <p v-else class="text-muted">Unknown content type.</p>
  </div>
</template>
