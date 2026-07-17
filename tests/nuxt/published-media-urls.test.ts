// tests/nuxt/published-media-urls.test.ts
// @vitest-environment nuxt
// MediaRef-derived urls in the Published previews go through safeMediaUrl: blob: (demo/session
// uploads) RENDERS, data: is rejected by HIDING the element entirely — never a truthy '#'
// src/href that paints a broken image (the pre-fix behavior this file locks out).
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { Article, App, Dataset, MediaRef } from '~/types/content'

import PublishedArticlePreview from '~/components/PublishedArticlePreview.vue'
import PublishedAppPreview from '~/components/PublishedAppPreview.vue'
import PublishedDatasetPreview from '~/components/PublishedDatasetPreview.vue'

const BLOB_URL = 'blob:http://localhost:3000/0aa2b6c3-4d5e-6f70-8192-a3b4c5d6e7f8'

function mediaRef(url: string): MediaRef {
  return {
    id: -21, url, name: 'session-upload.jpg',
    alternativeText: 'A session upload', caption: null, width: null, height: null, mime: 'image/jpeg',
  }
}

describe('PublishedArticlePreview media urls', () => {
  it('renders a blob: splash (demo session upload) with the blob src', async () => {
    const article: Partial<Article> = { title: 'T', markdown: '', splash: mediaRef(BLOB_URL) }
    const wrapper = await mountSuspended(PublishedArticlePreview, { props: { article } })
    const img = wrapper.find('img.published-splash')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe(BLOB_URL)
  })

  it('renders no splash img at all for a data: url (never a broken src="#")', async () => {
    const article: Partial<Article> = { title: 'T', markdown: '', splash: mediaRef('data:image/png;base64,AAAA') }
    const wrapper = await mountSuspended(PublishedArticlePreview, { props: { article } })
    expect(wrapper.find('img.published-splash').exists()).toBe(false)
  })

  it('renders a blob: main-file download with the blob href', async () => {
    const article: Partial<Article> = {
      title: 'T', markdown: '',
      mainfiles: [{ ...mediaRef(BLOB_URL), name: 'report.pdf', mime: 'application/pdf' }],
    }
    const wrapper = await mountSuspended(PublishedArticlePreview, { props: { article } })
    const link = wrapper.find('[data-test="published-download-0"]')
    expect(link.exists()).toBe(true)
    expect(link.attributes('href')).toBe(BLOB_URL)
  })
})

describe('PublishedAppPreview media urls', () => {
  it('renders a blob: app image with the blob src', async () => {
    const app: Partial<App> = { title: 'T', image: mediaRef(BLOB_URL) }
    const wrapper = await mountSuspended(PublishedAppPreview, { props: { app } })
    const img = wrapper.find('img.published-splash')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe(BLOB_URL)
  })
})

describe('PublishedDatasetPreview media urls', () => {
  it('renders a blob: datafile download link with the blob href', async () => {
    const dataset: Partial<Dataset> = { title: 'T', datafile: mediaRef(BLOB_URL) }
    const wrapper = await mountSuspended(PublishedDatasetPreview, { props: { dataset } })
    const link = wrapper.find('.published-dataset-download a')
    expect(link.exists()).toBe(true)
    expect(link.attributes('href')).toBe(BLOB_URL)
  })
})
