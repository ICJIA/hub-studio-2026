<!-- app/pages/create/[type].vue -->
<script setup lang="ts">
import { computed } from '#imports'
import ArticleForm from '~/components/forms/ArticleForm.vue'
import AppForm from '~/components/forms/AppForm.vue'
import DatasetForm from '~/components/forms/DatasetForm.vue'
import { buildSampleArticle } from '~/lib/sample-article'

const route = useRoute()
const type = route.params.type as 'article' | 'app' | 'dataset'
// "Add sample article" links here with ?sample=1 — seed the form with a realistic draft so the
// author can preview/edit and then Save (the Save is the create that actually writes to Strapi).
const sampleArticle = computed(() => (type === 'article' && route.query?.sample === '1' ? buildSampleArticle() : undefined))
</script>
<template>
  <div>
    <h1 class="text-2xl font-semibold mb-4 text-highlighted">New {{ type }}</h1>
    <ArticleForm v-if="type === 'article'" mode="create" :initial="sampleArticle" />
    <AppForm v-else-if="type === 'app'" mode="create" />
    <DatasetForm v-else-if="type === 'dataset'" mode="create" />
    <p v-else class="text-muted">Unknown content type.</p>
  </div>
</template>
