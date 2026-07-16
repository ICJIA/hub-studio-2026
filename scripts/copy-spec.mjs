#!/usr/bin/env node
/**
 * Publish the manager-facing spec so it can be downloaded from the app.
 *
 * Copies docs/ICJIA-Studio-20-rewrite-copperhead.{md,docx} into public/spec/ BEFORE the
 * Nuxt build (predev / prebuild / pregenerate hooks), so both the production build and the
 * demo generate bundle the downloads that back the /spec page's buttons. public/spec/ is
 * git-ignored — these are build artifacts of the docs, not sources.
 *
 * (The hub copies post-generate into .output; copying into public/ pre-build is simpler
 * here and covers `nuxt dev` too.)
 */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const outDir = fileURLToPath(new URL('../public/spec/', import.meta.url))
mkdirSync(outDir, { recursive: true })

const files = [
  'ICJIA-Studio-20-rewrite-copperhead.md',
  'ICJIA-Studio-20-rewrite-copperhead.docx',
]

let copied = 0
const missing = []
for (const file of files) {
  const src = fileURLToPath(new URL(`../docs/${file}`, import.meta.url))
  if (existsSync(src)) {
    copyFileSync(src, `${outDir}${file}`)
    copied++
  } else {
    missing.push(file)
  }
}

console.log(`[copy-spec] copied ${copied}/${files.length} file(s) to public/spec/`)
if (missing.length) console.warn(`[copy-spec] missing source(s): ${missing.join(', ')}`)
