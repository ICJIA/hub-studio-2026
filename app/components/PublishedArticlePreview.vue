<!--
  PublishedArticlePreview: renders an article as it appears on the public Research Hub
  (icjia.illinois.gov/researchhub) — splash, a sticky Table of Contents (from the body's h2
  section headings), category + tags, the big Oswald title, the bordered abstract, the author
  byline + date, a rule, then the Markdown body. Styled entirely by prose-preview.css (the
  swappable hub stylesheet) so an author sees a faithful "as published" preview — live from the
  form (the editor modal) or from a saved draft (the /preview/:type/:documentId page / link).
-->
<script setup lang="ts">
import { computed } from '#imports'
import type { Article } from '~/types/content'
import { renderMarkdown } from '~/lib/markdown'
import { safeHref } from '~/lib/safe-url'

const props = defineProps<{ article: Partial<Article> }>()

/** Heading-text → anchor id (used both to id the <h2> and to link the TOC at it). */
function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '')
}

/** Render the body and, in one pass, give each <h2> an id and collect it for the TOC. */
const rendered = computed(() => {
  const toc: { id: string; text: string }[] = []
  const html = renderMarkdown(props.article.markdown ?? '').replace(
    /<h2>([\s\S]*?)<\/h2>/g,
    (_m, inner: string) => {
      const text = inner.replace(/<[^>]+>/g, '').trim()
      if (!text) return `<h2>${inner}</h2>`
      const id = slugify(text)
      toc.push({ id, text })
      return `<h2 id="${id}">${inner}</h2>`
    },
  )
  return { html, toc }
})

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

    <div class="published-layout">
      <!-- Sticky table of contents, built from the body's h2 section headings. -->
      <nav v-if="rendered.toc.length" class="published-toc" aria-label="Table of contents">
        <p class="published-toc-heading">Table of Contents</p>
        <ul>
          <li v-for="item in rendered.toc" :key="item.id">
            <a :href="`#${item.id}`">{{ item.text }}</a>
          </li>
        </ul>
      </nav>

      <div class="published-content">
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

        <!-- eslint-disable-next-line vue/no-v-html -- trusted: renderMarkdown runs markdown-it with html:false -->
        <div class="prose-preview" v-html="rendered.html" />
      </div>
    </div>
  </article>
</template>
