// @vitest-environment nuxt
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent } from 'vue'

// useMediaLibrary is auto-imported (no explicit `import` below), so the Nuxt auto-import
// transform injects its import ahead of this file's own top-level statements; that pulls in
// the mocked '~/lib/demo-media-library' / '~/lib/media-library' before a plain top-level
// `const` here would have run, and the vi.mock factories' `{ makeDemoMediaLibrary }` /
// `{ createStrapiMediaLibrary }` shorthand dereferences them immediately — a TDZ
// ReferenceError. vi.hoisted runs before any vi.mock factory can, regardless of import order.
const { demoLib, strapiLib, makeDemoMediaLibrary, createStrapiMediaLibrary } = vi.hoisted(() => {
  const demoLib = {
    list: vi.fn().mockResolvedValue([{ id: -1, url: '/images/demo/a.jpg' }]),
    upload: vi.fn().mockResolvedValue({ id: -25, url: 'blob:demo/z' }),
    updateInfo: vi.fn().mockResolvedValue({ id: -1, url: '/images/demo/a.jpg' }),
  }
  const strapiLib = {
    list: vi.fn().mockResolvedValue([{ id: 7, url: '/uploads/x.jpg' }]),
    upload: vi.fn().mockResolvedValue({ id: 8, url: '/uploads/y.jpg' }),
    updateInfo: vi.fn().mockResolvedValue({ id: 7, url: '/uploads/x.jpg' }),
  }
  return {
    demoLib,
    strapiLib,
    makeDemoMediaLibrary: vi.fn(() => demoLib),
    createStrapiMediaLibrary: vi.fn(() => strapiLib),
  }
})
let demoData = false

vi.mock('~/lib/demo-media-library', () => ({ makeDemoMediaLibrary }))
vi.mock('~/lib/media-library', () => ({ createStrapiMediaLibrary, DEFAULT_MEDIA_PAGE_SIZE: 20 }))
vi.mock('~/lib/demo', () => ({
  isDemoData: () => demoData,
  isDemoMode: () => demoData,
  isDemoSession: () => false,
}))

// Probe component: grabs the composable in setup (needs the Nuxt app context).
type MediaApi = ReturnType<typeof import('~/composables/useMediaLibrary')['useMediaLibrary']>
let api!: MediaApi
const Probe = defineComponent({
  setup() {
    api = useMediaLibrary()
    return () => null
  },
})

describe('useMediaLibrary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('selects the Strapi adapter for real sessions', async () => {
    demoData = false
    await mountSuspended(Probe)
    const refs = await api.list({ search: 'x' })
    expect(createStrapiMediaLibrary).toHaveBeenCalled()
    expect(makeDemoMediaLibrary).not.toHaveBeenCalled()
    expect(refs[0]!.id).toBe(7)
  })

  it('selects the in-memory demo adapter for demo-data sessions', async () => {
    demoData = true
    await mountSuspended(Probe)
    const refs = await api.list()
    expect(makeDemoMediaLibrary).toHaveBeenCalled()
    expect(refs[0]!.id).toBe(-1)
  })

  it('uploadImage gates by extension BEFORE reaching either adapter (parity with live)', async () => {
    demoData = true
    await mountSuspended(Probe)
    const bad = new File(['x'], 'evil.gif', { type: 'image/gif' })
    await expect(api.uploadImage(bad)).rejects.toThrow(/unsupported image type/i)
    expect(demoLib.upload).not.toHaveBeenCalled()
  })

  it('uploadImage passes gated files through to the adapter with info', async () => {
    demoData = true
    await mountSuspended(Probe)
    const ok = new File(['x'], 'chart.png', { type: 'image/png' })
    await api.uploadImage(ok, { alternativeText: 'Chart' })
    expect(demoLib.upload).toHaveBeenCalledWith(ok, { alternativeText: 'Chart' }, undefined)
  })
})
