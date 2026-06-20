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
})
