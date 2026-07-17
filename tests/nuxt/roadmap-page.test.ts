// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import RoadmapPage from '~/pages/roadmap.vue'

describe('/roadmap — in-app rendered roadmap', () => {
  it('renders ROADMAP.md through the markdown pipeline (doc H1 present)', async () => {
    const wrapper = await mountSuspended(RoadmapPage)
    expect(wrapper.find('[data-test="roadmap-body"] h1').text()).toContain('Roadmap')
  })

  it('shows the living sections managers monitor (Done (recent) / Next)', async () => {
    const wrapper = await mountSuspended(RoadmapPage)
    const body = wrapper.find('[data-test="roadmap-body"]').text()
    expect(body).toContain('Done (recent)')
    expect(body).toContain('Next (proposed)')
  })

  it('shows the current build version in the header', async () => {
    const wrapper = await mountSuspended(RoadmapPage)
    expect(wrapper.find('[data-test="roadmap-version"]').text()).toMatch(/Studio build v\d+\.\d+\.\d+/)
  })
})
