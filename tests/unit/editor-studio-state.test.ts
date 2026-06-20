// tests/unit/editor-studio-state.test.ts
// @vitest-environment nuxt
import { describe, it, expect, vi } from 'vitest'
import { EditorState } from '@codemirror/state'
import { createStudioEditorState } from '~/lib/editor/studio-editor-state'

describe('createStudioEditorState (de-singletoned vendor wrapper)', () => {
  it('builds an EditorState whose document equals the supplied doc', () => {
    const state = createStudioEditorState({ doc: '# Hello', onChange: () => {} })
    expect(state).toBeInstanceOf(EditorState)
    expect(state.doc.toString()).toBe('# Hello')
  })

  it('invokes onChange with the new document when the doc changes (via an EditorView)', async () => {
    const { EditorView } = await import('@codemirror/view')
    const onChange = vi.fn()
    const state = createStudioEditorState({ doc: '', onChange })
    const view = new EditorView({ state, parent: document.createElement('div') })
    try {
      view.dispatch({ changes: { from: 0, insert: '## Edited' } })
      expect(onChange).toHaveBeenCalled()
      expect(onChange.mock.calls.at(-1)![0]).toBe('## Edited')
    } finally {
      view.destroy()
    }
  })
})
