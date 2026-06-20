/*
 * Vendored from ICJIA Markdown Editor 2026 (https://github.com/ICJIA/icjia-markdown-editor-2026), v1.6.1.
 * Copyright (c) Illinois Criminal Justice Information Authority (ICJIA). Licensed under the MIT License.
 * Copied unchanged into the ICJIA Studio (the upstream project is a standalone app, not an npm package).
 * Only this attribution header was added. Re-vendor from upstream rather than diverging this file.
 */
/**
 * @fileoverview Custom Markdown Keyboard Shortcuts
 * @description Provides custom keyboard bindings for markdown formatting.
 * WCAG 2.1 AA compliant - all shortcuts are documented and discoverable.
 *
 * @module utils/editor/keymaps
 * @requires @codemirror/view
 */

import type { KeyBinding } from '@codemirror/view'
import type { EditorView } from '@codemirror/view'

/**
 * Wraps the selected text with before/after delimiter strings.
 * Maintains the selection on the wrapped content.
 *
 * @param {EditorView} view - The CodeMirror editor view
 * @param {string} before - String to insert before selection
 * @param {string} after - String to insert after selection
 * @returns {boolean} Always returns true to indicate the command was handled
 */
function wrapSelection(view: EditorView, before: string, after: string): boolean {
  const { state } = view
  const { from, to } = state.selection.main
  const selectedText = state.sliceDoc(from, to)

  view.dispatch({
    changes: {
      from,
      to,
      insert: `${before}${selectedText}${after}`,
    },
    selection: {
      anchor: from + before.length,
      head: from + before.length + selectedText.length,
    },
  })

  view.focus()
  return true
}

/**
 * Inserts text at the current cursor position.
 *
 * @param {EditorView} view - The CodeMirror editor view
 * @param {string} text - The text to insert
 * @returns {boolean} Always returns true to indicate the command was handled
 */
function insertAtCursor(view: EditorView, text: string): boolean {
  const { state } = view
  const { from } = state.selection.main

  view.dispatch({
    changes: { from, insert: text },
    selection: { anchor: from + text.length },
  })

  view.focus()
  return true
}

/**
 * Inserts a prefix at the start of the current line.
 * Useful for adding list markers, blockquote markers, etc.
 *
 * @param {EditorView} view - The CodeMirror editor view
 * @param {string} prefix - The prefix to insert at line start
 * @returns {boolean} Always returns true to indicate the command was handled
 */
function insertLinePrefix(view: EditorView, prefix: string): boolean {
  const { state } = view
  const { from } = state.selection.main
  const line = state.doc.lineAt(from)

  view.dispatch({
    changes: { from: line.from, insert: prefix },
  })

  view.focus()
  return true
}

/**
 * Inserts or replaces a heading at the current line.
 * If the line already has a heading, it replaces the existing heading level.
 *
 * @param {EditorView} view - The CodeMirror editor view
 * @param {number} level - The heading level (1-6)
 * @returns {boolean} Always returns true to indicate the command was handled
 */
function insertHeading(view: EditorView, level: number): boolean {
  const { state } = view
  const { from } = state.selection.main
  const line = state.doc.lineAt(from)
  const lineText = line.text

  // Check if line already has a heading
  const existingHeading = lineText.match(/^(#{1,6})\s/)
  const prefix = '#'.repeat(level) + ' '

  if (existingHeading) {
    // Replace existing heading
    view.dispatch({
      changes: { from: line.from, to: line.from + existingHeading[0].length, insert: prefix },
    })
  } else {
    // Add heading prefix
    view.dispatch({
      changes: { from: line.from, insert: prefix },
    })
  }

  view.focus()
  return true
}

/**
 * Inserts a fenced code block at the cursor position.
 * If text is selected, it becomes the code block content.
 *
 * @param {EditorView} view - The CodeMirror editor view
 * @returns {boolean} Always returns true to indicate the command was handled
 */
function insertCodeBlock(view: EditorView): boolean {
  const { state } = view
  const { from, to } = state.selection.main
  const selectedText = state.sliceDoc(from, to)

  const codeBlock = `\`\`\`\n${selectedText || 'code here'}\n\`\`\``

  view.dispatch({
    changes: { from, to, insert: codeBlock },
    selection: { anchor: from + 4, head: from + 4 + (selectedText.length || 9) },
  })

  view.focus()
  return true
}

/**
 * Inserts a markdown link at the cursor position.
 * If text is selected, it becomes the link text.
 * The "url" placeholder is selected for easy replacement.
 *
 * @param {EditorView} view - The CodeMirror editor view
 * @returns {boolean} Always returns true to indicate the command was handled
 */
function insertLink(view: EditorView): boolean {
  const { state } = view
  const { from, to } = state.selection.main
  const selectedText = state.sliceDoc(from, to)

  const linkText = selectedText || 'link text'
  const markdown = `[${linkText}](url)`

  view.dispatch({
    changes: { from, to, insert: markdown },
    // Select "url" for easy replacement
    selection: { anchor: from + linkText.length + 3, head: from + linkText.length + 6 },
  })

  view.focus()
  return true
}

/**
 * Custom markdown keymap with all formatting shortcuts.
 * Follows the design specification requirements for keyboard accessibility.
 *
 * Shortcuts include:
 * - Mod+B: Bold
 * - Mod+I: Italic
 * - Mod+`: Inline code
 * - Mod+Shift+`: Code block
 * - Mod+1-6: Headings
 * - Mod+Q: Blockquote
 * - Mod+Shift+8: Bullet list
 * - Mod+Shift+7: Numbered list
 * - Mod+K: Insert link
 * - Mod+-: Horizontal rule
 *
 * @constant {KeyBinding[]}
 */
export const markdownKeymap: KeyBinding[] = [
  // Text formatting
  {
    key: 'Mod-b',
    run: (view) => wrapSelection(view, '**', '**'),
    preventDefault: true,
  },
  {
    key: 'Mod-i',
    run: (view) => wrapSelection(view, '_', '_'),
    preventDefault: true,
  },
  {
    key: 'Mod-`',
    run: (view) => wrapSelection(view, '`', '`'),
    preventDefault: true,
  },
  {
    key: 'Mod-Shift-`',
    run: insertCodeBlock,
    preventDefault: true,
  },

  // Headings (Mod+1 through Mod+6)
  {
    key: 'Mod-1',
    run: (view) => insertHeading(view, 1),
    preventDefault: true,
  },
  {
    key: 'Mod-2',
    run: (view) => insertHeading(view, 2),
    preventDefault: true,
  },
  {
    key: 'Mod-3',
    run: (view) => insertHeading(view, 3),
    preventDefault: true,
  },
  {
    key: 'Mod-4',
    run: (view) => insertHeading(view, 4),
    preventDefault: true,
  },
  {
    key: 'Mod-5',
    run: (view) => insertHeading(view, 5),
    preventDefault: true,
  },
  {
    key: 'Mod-6',
    run: (view) => insertHeading(view, 6),
    preventDefault: true,
  },

  // Block formatting
  {
    key: 'Mod-q',
    run: (view) => insertLinePrefix(view, '> '),
    preventDefault: true,
  },

  // Lists
  {
    key: 'Mod-Shift-8',
    run: (view) => insertLinePrefix(view, '- '),
    preventDefault: true,
  },
  {
    key: 'Mod-Shift-7',
    run: (view) => insertLinePrefix(view, '1. '),
    preventDefault: true,
  },

  // Insert elements
  {
    key: 'Mod-k',
    run: insertLink,
    preventDefault: true,
  },
  {
    key: 'Mod--',
    run: (view) => insertAtCursor(view, '\n---\n'),
    preventDefault: true,
  },
]

/**
 * Interface for app-level keyboard shortcuts.
 * These shortcuts are handled at the application level (not in CodeMirror)
 * because they require access to Vue composables.
 *
 * @interface AppShortcut
 * @property {string} key - The key combination (using Mod for Cmd/Ctrl)
 * @property {string} description - Human-readable description of the shortcut
 * @property {string} action - The action identifier to invoke
 */
export interface AppShortcut {
  key: string
  description: string
  action: string
}

/**
 * Array of app-level keyboard shortcuts for documentation and help display.
 * These shortcuts are handled by the useKeyboardShortcuts composable.
 *
 * @constant {AppShortcut[]}
 */
export const appShortcuts: AppShortcut[] = [
  { key: 'Mod-Alt-t', description: 'Open table builder', action: 'openTableBuilder' },
  { key: 'Mod-s', description: 'Download markdown', action: 'downloadMarkdown' },
  { key: 'Mod-Shift-c', description: 'Copy markdown', action: 'copyMarkdown' },
  { key: 'Mod-Shift-h', description: 'Copy HTML', action: 'copyHtml' },
  { key: 'Mod-o', description: 'Upload markdown', action: 'uploadMarkdown' },
]
