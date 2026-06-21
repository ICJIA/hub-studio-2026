<!-- app/pages/create/[type].vue -->
<script setup lang="ts">
import ArticleForm from '~/components/forms/ArticleForm.vue'
import AppForm from '~/components/forms/AppForm.vue'
import DatasetForm from '~/components/forms/DatasetForm.vue'
import { buildSampleArticle } from '~/lib/sample-article'
import { buildSampleApp } from '~/lib/sample-app'
import { buildSampleDataset } from '~/lib/sample-dataset'

const route = useRoute()
const type = route.params.type as 'article' | 'app' | 'dataset'
// "Add sample …" links here with ?sample=1 — seed the form once with a realistic draft so the
// author can preview/edit and then Save (the Save is the create that actually writes to Strapi).
// Built once (not a computed): build*() are randomized per call.
// Sample seeding is DEV/DEMO ONLY — ignored in production (import.meta.dev is false there).
const isSample = import.meta.dev && route.query?.sample === '1'
const sampleArticle = type === 'article' && isSample ? buildSampleArticle() : undefined
const sampleApp = type === 'app' && isSample ? buildSampleApp() : undefined
const sampleDataset = type === 'dataset' && isSample ? buildSampleDataset() : undefined
</script>
<template>
  <div>
    <h1 class="text-2xl font-semibold mb-4 text-highlighted">New {{ type }}</h1>
    <ArticleForm v-if="type === 'article'" mode="create" :initial="sampleArticle" />
    <AppForm v-else-if="type === 'app'" mode="create" :initial="sampleApp" />
    <DatasetForm v-else-if="type === 'dataset'" mode="create" :initial="sampleDataset" />
    <p v-else class="text-muted">Unknown content type.</p>
  </div>
</template>
