/*
 * Vendored from ICJIA Markdown Editor 2026 (https://github.com/ICJIA/icjia-markdown-editor-2026), v1.6.1.
 * Copyright (c) Illinois Criminal Justice Information Authority (ICJIA). Licensed under the MIT License.
 * Copied unchanged into the ICJIA Studio (the upstream project is a standalone app, not an npm package).
 * Only this attribution header was added. Re-vendor from upstream rather than diverging this file.
 */
/**
 * @fileoverview CodeMirror 6 Editor Configuration
 * @description Creates and configures CodeMirror editor state with markdown support,
 * syntax highlighting, keyboard shortcuts, and accessibility features.
 *
 * @module utils/editor/config
 * @requires @codemirror/view
 * @requires @codemirror/state
 * @requires @codemirror/lang-markdown
 * @requires @codemirror/language-data
 * @requires @codemirror/commands
 * @requires @codemirror/search
 * @requires @codemirror/autocomplete
 * @requires @codemirror/language
 */

import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection, rectangularSelection, crosshairCursor } from '@codemirror/view'
import { EditorState, Compartment } from '@codemirror/state'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { bracketMatching, indentOnInput, foldGutter, foldKeymap } from '@codemirror/language'
import { darkTheme } from './theme-dark'
import { lightTheme } from './theme-light'
import { markdownKeymap } from './keymaps'

/**
 * Compartment for dynamically switching between light and dark themes.
 * @constant {Compartment}
 */
export const themeCompartment = new Compartment()

/**
 * Compartment for toggling line numbers visibility.
 * @constant {Compartment}
 */
export const lineNumbersCompartment = new Compartment()

/**
 * Compartment for toggling read-only mode.
 * @constant {Compartment}
 */
export const readOnlyCompartment = new Compartment()

/**
 * Gets the appropriate theme extensions based on color mode.
 *
 * @param {boolean} isDark - Whether to use dark theme
 * @returns {Extension[]} CodeMirror theme extensions for the selected mode
 */
export function getTheme(isDark: boolean) {
  return isDark ? darkTheme : lightTheme
}

/**
 * Creates a fully configured CodeMirror editor state.
 * Includes markdown syntax support, keyboard shortcuts, history, and accessibility features.
 *
 * @param doc - The initial document content
 * @param onChange - Callback fired when document changes
 * @param isDark - Whether to use dark theme initially
 * @param onCursorLineChange - Optional callback fired when cursor line changes (for scroll sync)
 * @returns Configured CodeMirror editor state
 */
export function createEditorState(
  doc: string,
  onChange: (value: string) => void,
  isDark: boolean = true,
  /** Called when cursor line changes. Second arg true = from typing (sync immediately). */
  onCursorLineChange?: (line: number, immediate?: boolean) => void
): EditorState {
  return EditorState.create({
    doc,
    extensions: [
      // Core editing features
      history(),
      closeBrackets(),
      bracketMatching(),
      highlightActiveLine(),
      highlightSelectionMatches(),
      indentOnInput(),
      drawSelection(),
      rectangularSelection(),
      crosshairCursor(),

      // Line numbers (toggleable via compartment)
      lineNumbersCompartment.of(lineNumbers()),

      // Folding
      foldGutter(),

      // Read-only mode (toggleable via compartment)
      readOnlyCompartment.of(EditorState.readOnly.of(false)),

      // Markdown language support with code block highlighting
      markdown({
        base: markdownLanguage,
        codeLanguages: languages,
      }),

      // Theme (toggleable for dark/light via compartment)
      themeCompartment.of(getTheme(isDark)),

      // Keymaps - custom markdown shortcuts first for priority
      keymap.of([
        ...markdownKeymap,
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...foldKeymap,
        indentWithTab,
      ]),

      // Line wrapping (soft wrap)
      EditorView.lineWrapping,

      // Change and selection listener (cursor-line for scroll sync: immediate on type, debounced on selection-only)
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChange(update.state.doc.toString())
        }
        if (onCursorLineChange) {
          const line = update.state.doc.lineAt(update.state.selection.main.from).number
          const fromTyping = update.docChanged
          onCursorLineChange(line, fromTyping)
        }
      }),

      // Accessibility attributes
      EditorView.contentAttributes.of({
        'aria-label': 'Markdown editor',
        'role': 'textbox',
        'aria-multiline': 'true',
      }),
    ],
  })
}

/**
 * Updates the editor theme dynamically without recreating the editor.
 * Uses the theme compartment for efficient reconfiguration.
 *
 * @param {EditorView} view - The CodeMirror editor view
 * @param {boolean} isDark - Whether to switch to dark theme
 * @returns {void}
 */
export function updateTheme(view: EditorView, isDark: boolean) {
  view.dispatch({
    effects: themeCompartment.reconfigure(getTheme(isDark))
  })
}

/**
 * Toggles line numbers visibility in the editor.
 *
 * @param {EditorView} view - The CodeMirror editor view
 * @param {boolean} show - Whether to show line numbers
 * @returns {void}
 */
export function toggleLineNumbers(view: EditorView, show: boolean) {
  view.dispatch({
    effects: lineNumbersCompartment.reconfigure(show ? lineNumbers() : [])
  })
}

/**
 * Sets the editor to read-only or editable mode.
 *
 * @param {EditorView} view - The CodeMirror editor view
 * @param {boolean} readOnly - Whether to enable read-only mode
 * @returns {void}
 */
export function setReadOnly(view: EditorView, readOnly: boolean) {
  view.dispatch({
    effects: readOnlyCompartment.reconfigure(EditorState.readOnly.of(readOnly))
  })
}
