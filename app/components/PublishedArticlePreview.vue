<!--
  PublishedArticlePreview: renders an article as it appears on the public Research Hub
  (icjia.illinois.gov/researchhub) — splash image, category + tags, the big Oswald title,
  the bordered abstract, the author byline + date, a rule, then the Markdown body via
  MarkdownPreview. Styled entirely by prose-preview.css (the swappable hub stylesheet) so
  an author sees a faithful "as published" preview — live from the form (the editor modal)
  or from a saved draft (the /preview/:type/:documentId page / a shared link).
-->
<script setup lang="ts">
import { computed } from '#imports'
import type { Article } from '~/types/content'
import { safeHref } from '~/lib/safe-url'

const props = defineProps<{ article: Partial<Article> }>()

/** "A, B and C" — the byline format the public site uses. */
const authorLine = computed(() => {
  const names = (props.article.authors ?? []).map((a) => a?.title?.trim()).filter(Boolean) as string[]
  if (names.length === 0) return ''
  if (names.length === 1) return names[0]!
  return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1]
})

/** Splash url through the href allowlist (no data:/javascript:); empty when absent. */
const splashUrl = computed(() => {
  const u = props.article.splash?.url
  return u ? safeHref(u) : ''
})

const hasTags = computed(() => Boolean(props.article.categories?.length || props.article.tags?.length))
</script>

<template>
  <article class="published-article">
    <img v-if="splashUrl" :src="splashUrl" :alt="article.splash?.alternativeText ?? ''" class="published-splash">

    <div v-if="hasTags" class="published-tags">
      <span v-for="c in article.categories" :key="'c-' + c" class="published-category">{{ c }}</span>
      <span v-for="t in article.tags" :key="'t-' + t" class="published-tag">{{ t }}</span>
    </div>

    <h1 class="published-title">{{ article.title || 'Untitled article' }}</h1>

    <div v-if="article.abstract" class="published-abstract">{{ article.abstract }}</div>

    <div v-if="authorLine || article.date" class="published-byline">
      <span v-if="authorLine" class="published-authors">{{ authorLine }}</span>
      <span v-if="authorLine && article.date">|</span>
      <span v-if="article.date">{{ article.date }}</span>
    </div>

    <hr class="published-rule">

    <MarkdownPreview :source="article.markdown ?? ''" />
  </article>
</template>
