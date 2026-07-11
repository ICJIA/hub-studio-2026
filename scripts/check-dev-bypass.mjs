#!/usr/bin/env node
/**
 * CI bundle guard for the dev/demo login bypass (audit §"launch-time" item: "add a CI check
 * that fails if it ships"). Scans a built output directory for the sentinel token defined in
 * app/lib/dev-auth.ts.
 *
 * Pre-launch posture (runbook §0, corrected 2026-07-05): the bypass code SHIPS in a production
 * bundle but is unreachable (`import.meta.dev` and `demoMode` both false). So today CI runs
 * only the PRESENT expectation against the DEMO build — a positive control proving this scan
 * really detects the token. The ABSENT expectation is the LAUNCH GATE: enable it in
 * .github/workflows/ci.yml after deleting app/lib/dev-auth.ts and its call sites (runbook §4).
 *
 * Usage: node scripts/check-dev-bypass.mjs <builtDir> --expect present|absent
 * Exit: 0 = expectation met · 1 = violated · 2 = bad invocation
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

/** Pull the sentinel string out of app/lib/dev-auth.ts source. Throws if the constant is gone —
 *  a renamed/removed token must break the guard loudly, never let it scan for nothing. */
export function extractSentinel(source) {
  const m = /DEV_ADMIN_TOKEN\s*=\s*'([^']+)'/.exec(source)
  if (!m) {
    throw new Error(
      'DEV_ADMIN_TOKEN not found in app/lib/dev-auth.ts — if the bypass was removed, ' +
        'flip the CI step to --expect absent; if the constant was renamed, update this script.',
    )
  }
  return m[1]
}

/** Recursively scan rootDir; return sorted relative paths of files containing the token. */
export function scanForToken(rootDir, token) {
  const hits = []
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.isFile() && readFileSync(full, 'utf8').includes(token)) {
        hits.push(relative(rootDir, full))
      }
    }
  }
  walk(rootDir)
  return hits.sort()
}

/** Turn an expectation + scan hits into a pass/fail verdict with an actionable message. */
export function evaluate(expectation, hits) {
  if (expectation === 'absent') {
    return hits.length === 0
      ? { ok: true, message: 'OK: dev-bypass sentinel absent from the bundle (launch gate satisfied).' }
      : {
          ok: false,
          message:
            `FAIL: dev-bypass sentinel shipped in: ${hits.join(', ')} — ` +
            'delete app/lib/dev-auth.ts and its call sites before a production launch (runbook §4).',
        }
  }
  if (expectation === 'present') {
    return hits.length > 0
      ? { ok: true, message: `OK: sentinel present (positive control) in: ${hits.join(', ')}` }
      : {
          ok: false,
          message:
            'FAIL: sentinel NOT found in the demo bundle — the guard has rotted ' +
            '(token changed, demo login removed, or the scan is broken).',
        }
  }
  throw new Error("--expect must be 'present' or 'absent'")
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (invokedDirectly) {
  const [dir, flag, expectation] = process.argv.slice(2)
  if (!dir || flag !== '--expect' || !expectation) {
    console.error('Usage: node scripts/check-dev-bypass.mjs <builtDir> --expect present|absent')
    process.exit(2)
  }
  const devAuth = readFileSync(
    fileURLToPath(new URL('../app/lib/dev-auth.ts', import.meta.url)),
    'utf8',
  )
  const result = evaluate(expectation, scanForToken(dir, extractSentinel(devAuth)))
  console.log(result.message)
  process.exit(result.ok ? 0 : 1)
}
