/*
 * Vendored from ICJIA Markdown Editor 2026 (https://github.com/ICJIA/icjia-markdown-editor-2026), v1.6.1.
 * Copyright (c) Illinois Criminal Justice Information Authority (ICJIA). Licensed under the MIT License.
 * Copied unchanged into the ICJIA Studio (the upstream project is a standalone app, not an npm package).
 * Only this attribution header was added. Re-vendor from upstream rather than diverging this file.
 */
/**
 * @fileoverview CodeMirror 6 Light Theme
 * @description Custom ICJIA light theme matching Nuxt UI design.
 * WCAG 2.1 AAA compliant with verified 7:1+ color contrast ratios.
 *
 * @module utils/editor/theme-light
 * @requires @codemirror/view
 * @requires @codemirror/language
 * @requires @lezer/highlight
 *
 * Color Contrast Verification (AAA - 7:1 minimum):
 * - Gutter text (slate-700 on slate-50): 9.3:1 ratio
 * - Headings (blue-800 on white): 8.6:1 ratio
 * - Links (blue-700 on white): 7.3:1 ratio
 */

import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'

/**
 * CodeMirror EditorView theme configuration for light mode.
 * Defines base styles, gutters, selection, and scrollbars.
 *
 * @constant {Extension}
 */
export const icjiaLightTheme = EditorView.theme({
  '&': {
    backgroundColor: '#ffffff',
    color: '#0f172a', // slate-900
    fontSize: '14px',
    fontFamily: "'JetBrains Mono', monospace",
    height: '100%',
  },
  '.cm-content': {
    caretColor: '#2563eb', // blue-600
    padding: '16px',
    minHeight: '100%',
  },
  '.cm-cursor': {
    borderLeftColor: '#2563eb', // blue-600
    borderLeftWidth: '2px',
  },
  '.cm-selectionBackground': {
    backgroundColor: 'rgba(59, 130, 246, 0.2) !important',
  },
  '&.cm-focused .cm-selectionBackground': {
    backgroundColor: 'rgba(59, 130, 246, 0.3) !important',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
  '.cm-gutters': {
    backgroundColor: '#f8fafc', // slate-50
    color: '#334155', // slate-700 - WCAG AAA compliant (9.3:1 contrast on slate-50)
    border: 'none',
    borderRight: '1px solid #e2e8f0', // slate-200
    paddingRight: '8px',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    color: '#0f172a', // slate-900
  },
  '.cm-lineNumbers .cm-gutterElement': {
    padding: '0 8px 0 16px',
  },
  '.cm-scroller': {
    overflow: 'auto',
  },
  // Focus indicator for accessibility (WCAG 2.1 AA - 3:1 contrast minimum)
  '&.cm-focused': {
    outline: '2px solid #2563eb', // blue-600
    outlineOffset: '-2px',
  },
  // Scrollbar styling
  '.cm-scroller::-webkit-scrollbar': {
    width: '12px',
    height: '12px',
  },
  '.cm-scroller::-webkit-scrollbar-track': {
    backgroundColor: '#f1f5f9', // slate-100
  },
  '.cm-scroller::-webkit-scrollbar-thumb': {
    backgroundColor: '#cbd5e1', // slate-300
    borderRadius: '6px',
    border: '3px solid #f1f5f9',
  },
  '.cm-scroller::-webkit-scrollbar-thumb:hover': {
    backgroundColor: '#94a3b8', // slate-400
  },
}, { dark: false })

/**
 * Syntax highlighting styles for the light theme.
 * Defines colors for markdown elements: headings, emphasis, links, code, etc.
 * All colors verified for WCAG AAA (7:1+) contrast on white background.
 *
 * @constant {HighlightStyle}
 */
export const icjiaLightHighlightStyle = HighlightStyle.define([
  // Headings - darker blue for AAA visibility on light bg (8.6:1 ratio)
  { tag: tags.heading1, fontWeight: 'bold', fontSize: '1.5em', color: '#1e40af' }, // blue-800
  { tag: tags.heading2, fontWeight: 'bold', fontSize: '1.3em', color: '#1e40af' },
  { tag: tags.heading3, fontWeight: 'bold', fontSize: '1.1em', color: '#1e40af' },
  { tag: tags.heading4, fontWeight: 'bold', color: '#1e40af' },
  { tag: tags.heading5, fontWeight: 'bold', color: '#1e40af' },
  { tag: tags.heading6, fontWeight: 'bold', color: '#1e40af' },

  // Text formatting
  { tag: tags.strong, fontWeight: 'bold', color: '#0f172a' }, // slate-900
  { tag: tags.emphasis, fontStyle: 'italic', color: '#1e293b' }, // slate-800 - 12.6:1

  // Links - blue with underline for AAA accessibility (8.6:1 ratio)
  { tag: tags.link, color: '#1e40af', textDecoration: 'underline' }, // blue-800
  { tag: tags.url, color: '#1e40af' },

  // Code - darker green for distinction (WCAG AAA - 7:1+ on white)
  { tag: tags.monospace, fontFamily: "'JetBrains Mono', monospace", color: '#14532d' }, // green-900 - 12.5:1

  // Quotes - AAA compliant muted italic (9.3:1 ratio)
  { tag: tags.quote, color: '#334155', fontStyle: 'italic' }, // slate-700

  // Lists - violet for markers (AAA compliant - 7.9:1 on white)
  { tag: tags.list, color: '#6d28d9' }, // violet-700

  // Meta/comments - AAA compliant muted (9.3:1 ratio)
  { tag: tags.comment, color: '#334155' }, // slate-700
  { tag: tags.meta, color: '#334155' },

  // Processing instructions - AAA compliant (7.9:1 ratio)
  { tag: tags.processingInstruction, color: '#6d28d9' }, // violet-700
])

/**
 * Complete light theme extension array for CodeMirror.
 * Combines the base theme and syntax highlighting.
 *
 * @constant {Extension[]}
 * @example
 * ```typescript
 * import { lightTheme } from './theme-light'
 *
 * const state = EditorState.create({
 *   extensions: [...lightTheme, otherExtensions]
 * })
 * ```
 */
export const lightTheme = [
  icjiaLightTheme,
  syntaxHighlighting(icjiaLightHighlightStyle),
]
