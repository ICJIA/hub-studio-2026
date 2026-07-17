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

  it('links to the IN-APP rendered Changelog and Roadmap (the repo is private — GitHub links would 404 for managers)', async () => {
    const wrapper = await mountSuspended(AppStatusBar)
    expect(wrapper.find('[data-test="link-changelog"]').attributes('href')).toBe('/changelog')
    expect(wrapper.find('[data-test="link-roadmap"]').attributes('href')).toBe('/roadmap')
    expect(wrapper.find('[data-test="link-repo"]').attributes('href')).toBe(REPO)
  })

  it('only the Repository link is external (new tab + rel=noopener); doc links stay in-app', async () => {
    const wrapper = await mountSuspended(AppStatusBar)
    const repo = wrapper.find('[data-test="link-repo"]')
    expect(repo.attributes('target')).toBe('_blank')
    expect(repo.attributes('rel')).toBe('noopener')
    for (const sel of ['link-changelog', 'link-roadmap', 'link-spec']) {
      expect(wrapper.find(`[data-test="${sel}"]`).attributes('target')).toBeUndefined()
    }
  })
})
