// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ChangelogPage from '~/pages/changelog.vue'

describe('/changelog — in-app rendered changelog', () => {
  it('renders CHANGELOG.md through the markdown pipeline (doc H1 present)', async () => {
    const wrapper = await mountSuspended(ChangelogPage)
    expect(wrapper.find('[data-test="changelog-body"] h1').text()).toContain('Changelog')
  })

  it('always shows the recent releases as HTML (a dated version heading is rendered)', async () => {
    const wrapper = await mountSuspended(ChangelogPage)
    const body = wrapper.find('[data-test="changelog-body"]').text()
    // Version headings like "[0.8.4] - 2026-07-17" must arrive rendered, newest near the top.
    expect(body).toMatch(/\[\d+\.\d+\.\d+\] - \d{4}-\d{2}-\d{2}/)
  })

  it('shows the current build version in the header', async () => {
    const wrapper = await mountSuspended(ChangelogPage)
    expect(wrapper.find('[data-test="changelog-version"]').text()).toMatch(/Studio build v\d+\.\d+\.\d+/)
  })
})
