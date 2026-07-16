// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
// JSON module import (not node:fs) — the nuxt test env serves modules through the dev-server
// scheme, so import.meta.url is not a file: URL there.
import pkg from '../../package.json'
import AppStatusBar from '~/components/AppStatusBar.vue'

const REPO = 'https://github.com/ICJIA/copperhead-studio-20'

describe('AppStatusBar', () => {
  it('shows the current build version from package.json (via runtimeConfig)', async () => {
    const wrapper = await mountSuspended(AppStatusBar)
    expect(wrapper.find('[data-test="version-pill"]').text()).toContain(`Studio build v${pkg.version}`)
  })

  it('links to the in-app Spec & status page', async () => {
    const wrapper = await mountSuspended(AppStatusBar)
    const link = wrapper.find('[data-test="link-spec"]')
    expect(link.attributes('href')).toBe('/spec')
    expect(link.text()).toContain('Spec & status')
  })

  it('links to the ALWAYS-CURRENT rendered Changelog and Roadmap on GitHub (blob/main)', async () => {
    const wrapper = await mountSuspended(AppStatusBar)
    expect(wrapper.find('[data-test="link-changelog"]').attributes('href')).toBe(`${REPO}/blob/main/CHANGELOG.md`)
    expect(wrapper.find('[data-test="link-roadmap"]').attributes('href')).toBe(`${REPO}/blob/main/ROADMAP.md`)
    expect(wrapper.find('[data-test="link-repo"]').attributes('href')).toBe(REPO)
  })

  it('external links open in a new tab with rel=noopener', async () => {
    const wrapper = await mountSuspended(AppStatusBar)
    for (const sel of ['link-changelog', 'link-roadmap', 'link-repo']) {
      const link = wrapper.find(`[data-test="${sel}"]`)
      expect(link.attributes('target')).toBe('_blank')
      expect(link.attributes('rel')).toBe('noopener')
    }
  })
})
