/*
 * Vendored from ICJIA Markdown Editor 2026 (https://github.com/ICJIA/icjia-markdown-editor-2026), v1.6.1.
 * Copyright (c) Illinois Criminal Justice Information Authority (ICJIA). Licensed under the MIT License.
 * Copied unchanged into the ICJIA Studio (the upstream project is a standalone app, not an npm package).
 * Only this attribution header was added. Re-vendor from upstream rather than diverging this file.
 */
/**
 * @fileoverview CodeMirror 6 Dark Theme
 * @description Custom ICJIA dark theme matching Nuxt UI design.
 * WCAG 2.1 AAA compliant with verified 7:1+ color contrast ratios.
 *
 * @module utils/editor/theme-dark
 * @requires @codemirror/view
 * @requires @codemirror/language
 * @requires @lezer/highlight
 *
 * Color Contrast Verification (AAA - 7:1 minimum):
 * - Gutter text (slate-300 on slate-800): 10.2:1 ratio
 * - Primary text (slate-100 on slate-800): 10.7:1 ratio
 * - Links (blue-300 on slate-800): 9.5:1 ratio
 */

import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'

/**
 * CodeMirror EditorView theme configuration for dark mode.
 * Defines base styles, gutters, selection, and scrollbars.
 *
 * @constant {Extension}
 */
export const icjiaDarkTheme = EditorView.theme({
  '&': {
    backgroundColor: '#1e293b', // slate-800
    color: '#f1f5f9', // slate-100
    fontSize: '14px',
    fontFamily: "'JetBrains Mono', monospace",
    height: '100%',
  },
  '.cm-content': {
    caretColor: '#3b82f6', // blue-500
    padding: '16px',
    minHeight: '100%',
  },
  '.cm-cursor': {
    borderLeftColor: '#3b82f6', // blue-500
    borderLeftWidth: '2px',
  },
  '.cm-selectionBackground': {
    backgroundColor: 'rgba(59, 130, 246, 0.3) !important',
  },
  '&.cm-focused .cm-selectionBackground': {
    backgroundColor: 'rgba(59, 130, 246, 0.4) !important',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  '.cm-gutters': {
    backgroundColor: '#1e293b', // slate-800
    color: '#cbd5e1', // slate-300 - WCAG AAA compliant (10.2:1 contrast)
    border: 'none',
    paddingRight: '8px',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: '#f1f5f9', // slate-100
  },
  '.cm-lineNumbers .cm-gutterElement': {
    padding: '0 8px 0 16px',
  },
  '.cm-scroller': {
    overflow: 'auto',
    // Note: focusability is handled by .cm-content which has tabindex
  },
  // Focus indicator for accessibility (WCAG 2.1 AA - 3:1 contrast minimum)
  '&.cm-focused': {
    outline: '2px solid #3b82f6', // blue-500
    outlineOffset: '-2px',
  },
  // Scrollbar styling
  '.cm-scroller::-webkit-scrollbar': {
    width: '12px',
    height: '12px',
  },
  '.cm-scroller::-webkit-scrollbar-track': {
    backgroundColor: '#0f172a', // slate-900
  },
  '.cm-scroller::-webkit-scrollbar-thumb': {
    backgroundColor: '#475569', // slate-600
    borderRadius: '6px',
    border: '3px solid #0f172a',
  },
  '.cm-scroller::-webkit-scrollbar-thumb:hover': {
    backgroundColor: '#64748b', // slate-500
  },
}, { dark: true })

/**
 * Syntax highlighting styles for the dark theme.
 * Defines colors for markdown elements: headings, emphasis, links, code, etc.
 * Uses lighter colors for visibility on dark backgrounds.
 *
 * @constant {HighlightStyle}
 */
export const icjiaDarkHighlightStyle = HighlightStyle.define([
  // Headings - blue tones for visibility
  { tag: tags.heading1, fontWeight: 'bold', fontSize: '1.5em', color: '#93c5fd' }, // blue-300
  { tag: tags.heading2, fontWeight: 'bold', fontSize: '1.3em', color: '#93c5fd' },
  { tag: tags.heading3, fontWeight: 'bold', fontSize: '1.1em', color: '#93c5fd' },
  { tag: tags.heading4, fontWeight: 'bold', color: '#93c5fd' },
  { tag: tags.heading5, fontWeight: 'bold', color: '#93c5fd' },
  { tag: tags.heading6, fontWeight: 'bold', color: '#93c5fd' },

  // Text formatting
  { tag: tags.strong, fontWeight: 'bold', color: '#f1f5f9' }, // slate-100
  { tag: tags.emphasis, fontStyle: 'italic', color: '#e2e8f0' }, // slate-200

  // Links - blue with underline for accessibility (AAA compliant)
  { tag: tags.link, color: '#93c5fd', textDecoration: 'underline' }, // blue-300 - 9.5:1 ratio
  { tag: tags.url, color: '#93c5fd' },

  // Code - green for distinction
  { tag: tags.monospace, fontFamily: "'JetBrains Mono', monospace", color: '#4ade80' }, // green-400

  // Quotes - AAA compliant muted italic
  { tag: tags.quote, color: '#cbd5e1', fontStyle: 'italic' }, // slate-300 - 10.2:1 ratio

  // Lists - amber for markers (AAA compliant)
  { tag: tags.list, color: '#c4b5fd' }, // violet-300 - 7.8:1 ratio

  // Meta/comments - AAA compliant muted
  { tag: tags.comment, color: '#94a3b8' }, // slate-400 - slightly brighter
  { tag: tags.meta, color: '#94a3b8' },

  // Processing instructions (like frontmatter) - AAA compliant
  { tag: tags.processingInstruction, color: '#c4b5fd' }, // violet-300 - 7.8:1 ratio
])

/**
 * Complete dark theme extension array for CodeMirror.
 * Combines the base theme and syntax highlighting.
 *
 * @constant {Extension[]}
 * @example
 * ```typescript
 * import { darkTheme } from './theme-dark'
 *
 * const state = EditorState.create({
 *   extensions: [...darkTheme, otherExtensions]
 * })
 * ```
 */
export const darkTheme = [
  icjiaDarkTheme,
  syntaxHighlighting(icjiaDarkHighlightStyle),
]
