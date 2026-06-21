// tests/nuxt/repeatable-field.test.ts
// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { parseAuthors } from '~/lib/text-import'
import RepeatableField from '~/components/fields/RepeatableField.vue'

const columns = [
  { key: 'title', label: 'Name' },
  { key: 'description', label: 'Description' },
]

describe('RepeatableField', () => {
  it('adds and removes rows, emitting the updated array', async () => {
    const wrapper = await mountSuspended(RepeatableField, {
      props: { modelValue: [{ title: 'Jane', description: 'Researcher' }], label: 'Authors', columns },
    })
    await wrapper.vm.$.exposed!.addRow()
    let last = wrapper.emitted('update:modelValue')!.at(-1)![0] as Record<string, string>[]
    expect(last).toHaveLength(2)

    await wrapper.vm.$.exposed!.removeRow(0)
    last = wrapper.emitted('update:modelValue')!.at(-1)![0] as Record<string, string>[]
    expect(last).toHaveLength(1)
  })

  it('paste-to-rows replaces the array via the supplied parser', async () => {
    const wrapper = await mountSuspended(RepeatableField, {
      props: { modelValue: [], label: 'Authors', columns, pasteParser: parseAuthors },
    })
    await wrapper.vm.$.exposed!.applyPaste('Jane Doe | Researcher\nJohn Roe | Analyst')
    const last = wrapper.emitted('update:modelValue')!.at(-1)![0] as Record<string, string>[]
    expect(last).toEqual([
      { title: 'Jane Doe', description: 'Researcher' },
      { title: 'John Roe', description: 'Analyst' },
    ])
  })

  it('renders a custom addLabel on the add button (default is "Add row")', async () => {
    const def = await mountSuspended(RepeatableField, {
      props: { modelValue: [], label: 'Authors', columns },
    })
    expect(def.html()).toContain('Add row')

    const custom = await mountSuspended(RepeatableField, {
      props: { modelValue: [], label: 'Authors', columns, addLabel: 'Add Author' },
    })
    expect(custom.html()).toContain('Add Author')
    expect(custom.html()).not.toContain('Add row')
  })

  it('shows a "(max N)" hint and disables the add button at the cap (addRow becomes a no-op)', async () => {
    const wrapper = await mountSuspended(RepeatableField, {
      props: {
        modelValue: [{ title: 'A', description: '' }, { title: 'B', description: '' }],
        label: 'Authors', columns, max: 2,
      },
    })
    // The hint renders.
    expect(wrapper.find('[data-test="repeatable-max-hint"]').text()).toBe('(max 2)')
    // The add button is disabled at the cap.
    const addBtn = wrapper.findAll('button').find((b) => b.text().includes('Add row'))!
    expect(addBtn.attributes('disabled')).toBeDefined()
    // The imperative addRow path also respects the cap (no emit).
    await wrapper.vm.$.exposed!.addRow()
    expect(wrapper.emitted('update:modelValue')).toBeFalsy()
  })

  it('does NOT render a paste UI for authors when no pasteParser is supplied', async () => {
    const wrapper = await mountSuspended(RepeatableField, {
      props: { modelValue: [], label: 'Authors', columns, addLabel: 'Add Author', max: 10 },
    })
    expect(wrapper.html()).not.toContain('Or paste rows')
    expect(wrapper.html()).not.toContain('Paste rows')
  })
})
