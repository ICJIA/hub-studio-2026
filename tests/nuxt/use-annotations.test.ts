// tests/nuxt/use-annotations.test.ts
// @vitest-environment nuxt
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { defineComponent } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'

// The nuxt test env compiles with import.meta.dev=false, so the real isDemoSession() can never fire
// here; forcing it true keeps the 'Editor · demo' assertion verifying that the composable threads
// isDemoSession() into annotationAuthor({ demo }) — the pure demo-marker logic itself is covered in
// tests/unit/annotations-attribution.test.ts.
vi.mock('~/lib/demo', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~/lib/demo')>()),
  isDemoSession: () => true,
  // Pin the store seam to localStorage: this suite exercises the Phase-1 adapter semantics
  // (the Strapi adapter has its own unit suite, tests/unit/annotations-store-strapi.test.ts).
  isDemoData: () => true,
}))

import { useAnnotations } from '~/composables/useAnnotations'
import { useAuthStore } from '~/stores/auth'
import { makeDevAdminSession } from '~/lib/dev-auth'
import { ANNOTATIONS_STORAGE_PREFIX } from '~/lib/annotations/store-local'

/** Instantiate the composable inside a real component setup() (via mountSuspended) so useToast()'s
 *  inject() has a component context — keeps the test output free of Vue warnings. */
async function setupAnnotations(contentType: 'article', documentId: string) {
  let instance!: ReturnType<typeof useAnnotations>
  const Harness = defineComponent({
    setup() { instance = useAnnotations(contentType, documentId); return () => null },
  })
  await mountSuspended(Harness)
  return instance
}

beforeEach(() => {
  // clear any keys from earlier tests
  for (let i = window.localStorage.length - 1; i >= 0; i--) {
    const k = window.localStorage.key(i)
    if (k?.startsWith(ANNOTATIONS_STORAGE_PREFIX)) window.localStorage.removeItem(k)
  }
  useAuthStore().setSession(makeDevAdminSession('editor'))
})

describe('useAnnotations', () => {
  it('creates an annotation with session attribution and the body as comments[0]', async () => {
    const ann = await setupAnnotations('article', 'doc-xyz')
    await ann.load()
    const created = await ann.createAnnotation({ exact: 'q', prefix: '', suffix: '', offset: 0 }, 'green', 'Tighten this.')
    expect(created.comments[0]!.body).toBe('Tighten this.')
    expect(created.createdBy.name).toBe('Dev Editor')
    expect(created.createdBy.roleLabel).toBe('Editor · demo')  // dev session ⇒ demo marker
    expect(created.color).toBe('green')
    expect(ann.annotations.value).toHaveLength(1)
  })
  it('reply, resolve, and remove update reactive state and persist', async () => {
    const ann = await setupAnnotations('article', 'doc-xyz')
    await ann.load()
    const created = await ann.createAnnotation({ exact: 'q', prefix: '', suffix: '', offset: 0 }, 'yellow', 'Note')
    await ann.reply(created.id, 'Agreed')
    expect(ann.annotations.value[0]!.comments).toHaveLength(2)
    await ann.setResolved(created.id, true)
    expect(ann.annotations.value[0]!.resolved).toBe(true)
    const fresh = await setupAnnotations('article', 'doc-xyz')
    await fresh.load()
    expect(fresh.annotations.value[0]!.resolved).toBe(true) // persisted
    await ann.removeAnnotation(created.id)
    expect(ann.annotations.value).toHaveLength(0)
  })
})
