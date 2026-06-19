// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { UButton } from '#components'

describe('toolchain smoke', () => {
  it('renders a Nuxt UI button', async () => {
    const wrapper = await mountSuspended(UButton, { slots: { default: () => 'Go' } })
    expect(wrapper.text()).toContain('Go')
  })
})
