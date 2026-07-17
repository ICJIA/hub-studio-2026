// app/lib/editor/studio-editor-state.ts
// OUR thin, de-singletoned entry point over the vendored ICJIA CodeMirror config (vendor/config.ts).
// The upstream editor keeps its document in a MODULE-LEVEL singleton (useEditor.ts: `const content =
// ref('')`), which cannot back per-instance form fields — so we do NOT copy that. The vendored
// createEditorState is already framework-agnostic and exposes a clean onChange callback; this wrapper
// adapts it to a small options object and is the ONE seam our MarkdownEditor component imports, so a
// future re-vendor of the upstream config is a single-import change here.
import type { EditorState } from '@codemirror/state'
import { createEditorState } from './vendor/config'

export interface StudioEditorOptions {
  /** Initial document text (the field's current modelValue). */
  doc: string
  /** Fired with the full document string whenever it changes (→ emit('update:modelValue')). */
  onChange: (value: string) => void
  /** Dark vs light CodeMirror theme. Defaults to true (matches the upstream default). */
  isDark?: boolean
  /** Fired with the 1-based cursor line on every selection/document update — feeds the
   *  "Insert lands at line N" awareness in the sidebar BodyImagesField. Optional. */
  onCursorLine?: (line: number) => void
}

/** Build a per-instance CodeMirror EditorState from the vendored ICJIA config (no singleton). */
export function createStudioEditorState(opts: StudioEditorOptions): EditorState {
  // The vendored 4th arg also passes a second `immediate` flag; our callers only need the line.
  return createEditorState(opts.doc, opts.onChange, opts.isDark ?? true, opts.onCursorLine)
}
