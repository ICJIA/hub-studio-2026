// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import SpecPage from '~/pages/spec.vue'

describe('/spec — in-app Spec & status page', () => {
  it('renders the design spec through the markdown pipeline (doc H1 present)', async () => {
    const wrapper = await mountSuspended(SpecPage)
    // The rewrite doc opens with "# Hub Studio 2.0" — it must arrive as rendered HTML.
    expect(wrapper.find('[data-test="spec-body"] h1').text()).toContain('Hub Studio 2.0')
  })

  it('offers .md and .docx downloads of the spec', async () => {
    const wrapper = await mountSuspended(SpecPage)
    expect(wrapper.find('[data-test="download-md"]').attributes('href')).toBe('/spec/ICJIA-Studio-20-rewrite-copperhead.md')
    expect(wrapper.find('[data-test="download-docx"]').attributes('href')).toBe('/spec/ICJIA-Studio-20-rewrite-copperhead.docx')
  })

  it('shows the current build version in the header', async () => {
    const wrapper = await mountSuspended(SpecPage)
    expect(wrapper.find('[data-test="spec-version"]').text()).toMatch(/Studio build v\d+\.\d+\.\d+/)
  })
})
