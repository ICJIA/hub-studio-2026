// Type shims for packages that ship without bundled TypeScript declarations.
declare module 'markdown-it-katex' {
  import type MarkdownIt from 'markdown-it'
  const katexPlugin: MarkdownIt.PluginSimple
  export default katexPlugin
}
