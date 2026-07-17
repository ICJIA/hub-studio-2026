<!--
  PublishedDatasetPreview: renders a Dataset as it would appear on the public Research Hub —
  categories, tags, big Oswald title, byline (date + unit/time-period summary), a rule,
  the description as Georgia serif prose, a Variables table, a Sources list, labelled facts
  for time period and unit, and a "Download data" link when a datafile URL is present.
  Styled by prose-preview.css. The MediaRef datafile goes through safeMediaUrl (blob: allowed
  for demo/session uploads); author-typed source links stay on safeHref. No data: URIs reach
  the DOM.
-->
<script setup lang="ts">
import { computed } from '#imports'
import type { Dataset } from '~/types/content'
import { safeHref, safeMediaUrl } from '~/lib/safe-url'

const props = defineProps<{ dataset: Partial<Dataset> }>()

/** Build a short "unit / timeperiod" byline suffix. */
const bylineSuffix = computed(() => {
  const parts: string[] = []
  if (props.dataset.unit) parts.push(props.dataset.unit)
  const tp = props.dataset.timeperiod
  if (tp?.yeartype) {
    const range = [tp.yearmin, tp.yearmax].filter(Boolean).join('–')
    parts.push(range ? `${tp.yeartype} ${range}` : tp.yeartype)
  }
  return parts.join(' · ')
})

const datafileUrl = computed(() => safeMediaUrl(props.dataset.datafile?.url))

const hasTags = computed(() => Boolean(props.dataset.categories?.length || props.dataset.tags?.length))
const hasSources = computed(() => Boolean(props.dataset.sources?.length))
const hasVariables = computed(() => Boolean(props.dataset.variables?.length))
</script>

<template>
  <article class="published-article">
    <div class="published-content">
      <div v-if="hasTags" class="published-tags">
        <span v-for="c in dataset.categories" :key="'c-' + c" class="published-category">{{ c }}</span>
        <span v-for="t in dataset.tags" :key="'t-' + t" class="published-tag">{{ t }}</span>
      </div>

      <h1 class="published-title">{{ dataset.title || 'Untitled dataset' }}</h1>

      <div v-if="dataset.date || bylineSuffix" class="published-byline">
        <span v-if="dataset.date">{{ dataset.date }}</span>
        <span v-if="dataset.date && bylineSuffix">|</span>
        <span v-if="bylineSuffix">{{ bylineSuffix }}</span>
      </div>

      <hr class="published-rule">

      <div v-if="dataset.description" class="prose-preview">
        <p>{{ dataset.description }}</p>
      </div>

      <div v-if="hasVariables" class="prose-preview">
        <h2>Variables</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Definition</th>
              <th v-if="dataset.variables!.some((v) => v.values)">Values</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(v, i) in dataset.variables" :key="i">
              <td>{{ v.name }}</td>
              <td>{{ v.type }}</td>
              <td>{{ v.definition }}</td>
              <td v-if="dataset.variables!.some((row) => row.values)">{{ v.values ?? '' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="hasSources" class="prose-preview">
        <h2>Sources</h2>
        <ul>
          <li v-for="(s, i) in dataset.sources" :key="i">
            <a v-if="s.url" :href="safeHref(s.url)" target="_blank" rel="noopener noreferrer">{{ s.title || s.url }}</a>
            <span v-else>{{ s.title }}</span>
          </li>
        </ul>
      </div>

      <div v-if="dataset.unit || dataset.timeperiod" class="published-dataset-facts">
        <dl>
          <div v-if="dataset.unit" class="published-fact-row">
            <dt>Unit</dt>
            <dd>{{ dataset.unit }}</dd>
          </div>
          <div v-if="dataset.timeperiod?.yeartype" class="published-fact-row">
            <dt>Time period</dt>
            <dd>{{ dataset.timeperiod.yeartype }} {{ dataset.timeperiod.yearmin }}–{{ dataset.timeperiod.yearmax }}</dd>
          </div>
        </dl>
      </div>

      <div v-if="datafileUrl" class="published-dataset-download">
        <a :href="datafileUrl" target="_blank" rel="noopener noreferrer" class="published-open-link">Download data</a>
      </div>
    </div>
  </article>
</template>
