<!--
  PublishedAppPreview: renders an App as it would appear on the public Research Hub — categories,
  tags, big Oswald title, splash image, byline (contributors + date), a rule, the description as
  Georgia serif prose, and an "Open app" link when a URL is present. Styled by prose-preview.css
  (the swappable hub stylesheet). The MediaRef image goes through safeMediaUrl (blob: allowed for
  demo/session uploads); the author-typed app URL stays on safeHref. No data: URIs reach the DOM.
-->
<script setup lang="ts">
import { computed } from '#imports'
import type { App } from '~/types/content'
import { safeHref, safeMediaUrl } from '~/lib/safe-url'

const props = defineProps<{ app: Partial<App> }>()

/** "A, B and C" — the byline format the public site uses. */
const bylineLine = computed(() => {
  const names = (props.app.contributors ?? []).map((c) => c?.title?.trim()).filter(Boolean) as string[]
  if (names.length === 0) return ''
  if (names.length === 1) return names[0]!
  return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1]
})

const imageUrl = computed(() => safeMediaUrl(props.app.image?.url))

const appUrl = computed(() => (props.app.url ? safeHref(props.app.url) : ''))

const hasTags = computed(() => Boolean(props.app.categories?.length || props.app.tags?.length))
</script>

<template>
  <article class="published-article">
    <img v-if="imageUrl" :src="imageUrl" :alt="app.image?.alternativeText ?? ''" class="published-splash">

    <div class="published-content">
      <div v-if="hasTags" class="published-tags">
        <span v-for="c in app.categories" :key="'c-' + c" class="published-category">{{ c }}</span>
        <span v-for="t in app.tags" :key="'t-' + t" class="published-tag">{{ t }}</span>
      </div>

      <h1 class="published-title">{{ app.title || 'Untitled app' }}</h1>

      <div v-if="bylineLine || app.date" class="published-byline">
        <span v-if="bylineLine" class="published-authors">{{ bylineLine }}</span>
        <span v-if="bylineLine && app.date">|</span>
        <span v-if="app.date">{{ app.date }}</span>
      </div>

      <hr class="published-rule">

      <MarkdownPreview v-if="app.description" :source="app.description" />

      <div v-if="appUrl && appUrl !== '#'" class="published-app-link">
        <a :href="appUrl" target="_blank" rel="noopener noreferrer" class="published-open-link">Open app</a>
      </div>
    </div>
  </article>
</template>
