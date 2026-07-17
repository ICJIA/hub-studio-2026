// tests/nuxt/preview-annotations.test.ts
// @vitest-environment nuxt
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useAuthStore } from '~/stores/auth'

// Pin the annotation store seam to localStorage (the suite's storage fixture): the nuxt test
// env is neither a demo build nor import.meta.dev, so the real isDemoData() would select the
// network-backed Strapi adapter (unit-tested separately in annotations-store-strapi.test.ts).
vi.mock('~/lib/demo', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~/lib/demo')>()),
  isDemoData: () => true,
}))
import { makeDevAdminSession } from '~/lib/dev-auth'
import { annotationsStorageKey, ANNOTATIONS_STORAGE_PREFIX } from '~/lib/annotations/store-local'
import type { Article } from '~/types/content'
import type { ReviewAnnotation } from '~/types/annotations'

const article: Partial<Article> = {
  documentId: 'a1', title: 'Annotated Draft',
  // The trailing link exercises the interactive-target scoping of the keyboard-create path.
  markdown: 'The quick brown fox jumps over the lazy dog. See [details](https://example.com/) here.',
}
const findOneMock = vi.fn().mockResolvedValue(article)
mockNuxtImport('useArticles', () => () => ({ list: vi.fn(), findOne: findOneMock, create: vi.fn(), update: vi.fn(), remove: vi.fn() }))
mockNuxtImport('useRoute', () => () => ({ params: { type: 'article', documentId: 'a1' } }))

import PreviewPage from '~/pages/preview/[type]/[documentId].vue'

const seed: ReviewAnnotation = {
  id: 'seed-1', contentType: 'article', documentId: 'a1',
  anchor: { exact: 'brown fox', prefix: 'The quick ', suffix: ' jumps over', offset: 10 },
  color: 'green', resolved: false, createdAt: '2026-07-04T00:00:00.000Z',
  createdBy: { name: 'Dev Editor', email: 'dev-editor@localhost', roleLabel: 'Editor · demo' },
  comments: [{ id: 'c1', body: 'Consider a citation here.', authorName: 'Dev Editor', authorEmail: 'dev-editor@localhost', createdAt: '2026-07-04T00:00:00.000Z' }],
}
/** A second open thread on the same document — for the consecutive-identical-announcement case. */
const seed2: ReviewAnnotation = {
  ...seed, id: 'seed-2',
  anchor: { exact: 'lazy dog', prefix: 'over the ', suffix: '.', offset: 35 },
  comments: [{ ...seed.comments[0]!, id: 'c2', body: 'Second note.' }],
}

/** Build a Range over the first occurrence of `exact` within `container`'s concatenated
 *  text nodes, and make it the live window selection — mirrors a mouse-drag selection
 *  (same offset-walk approach as app/lib/annotations/anchor.ts, keyed by substring so
 *  callers don't need to know the numeric offset in the rendered DOM). */
function selectExact(container: Element, exact: string): Range {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  let full = ''
  let n: Node | null
  while ((n = walker.nextNode())) { nodes.push(n as Text); full += (n as Text).data }
  const start = full.indexOf(exact)
  if (start === -1) throw new Error(`selectExact: not found in container text: ${exact}`)
  const end = start + exact.length
  const range = document.createRange()
  let pos = 0
  let startSet = false
  for (const node of nodes) {
    const next = pos + node.data.length
    if (!startSet && start < next) { range.setStart(node, start - pos); startSet = true }
    if (startSet && end <= next) { range.setEnd(node, end - pos); break }
    pos = next
  }
  const sel = window.getSelection()!
  sel.removeAllRanges()
  sel.addRange(range)
  return range
}

beforeEach(() => {
  for (let i = window.localStorage.length - 1; i >= 0; i--) {
    const k = window.localStorage.key(i)
    if (k?.startsWith(ANNOTATIONS_STORAGE_PREFIX)) window.localStorage.removeItem(k)
  }
  useAuthStore().setSession(makeDevAdminSession('editor'))
  window.localStorage.setItem(annotationsStorageKey('article', 'a1'), JSON.stringify([seed]))
})

describe('preview page — annotations', () => {
  it('mounts the reviewer bar; the rail starts HIDDEN and opens on the toggle', async () => {
    const wrapper = await mountSuspended(PreviewPage)
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0)) // load → nextTick paint
    expect(wrapper.find('[data-test="ann-arm"]').exists()).toBe(true)
    // Default-closed (user decision 2026-07-05): the preview opens clean; comments on demand.
    expect(wrapper.text()).not.toContain('Consider a citation here.')
    await wrapper.find('[data-test="ann-rail-toggle"]').trigger('click')
    expect(wrapper.text()).toContain('Consider a citation here.')
  })
  it('paints the stored annotation over the rendered markdown', async () => {
    const wrapper = await mountSuspended(PreviewPage)
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))
    const mark = wrapper.find('mark[data-ann-id="seed-1"]')
    expect(mark.exists()).toBe(true)
    expect(mark.text()).toBe('brown fox')
    expect(mark.classes()).toContain('ann--green')
  })
  it('shows an orphan flag when the quote no longer matches', async () => {
    window.localStorage.setItem(annotationsStorageKey('article', 'a1'), JSON.stringify([
      { ...seed, id: 'ghost', anchor: { exact: 'vanished words', prefix: '', suffix: '', offset: 3 } },
    ]))
    const wrapper = await mountSuspended(PreviewPage)
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))
    await wrapper.find('[data-test="ann-rail-toggle"]').trigger('click') // rail starts hidden
    expect(wrapper.find('mark[data-ann-id="ghost"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('text changed — highlight not found')
  })
  it('resolving via the rail unpaints under the default open filter', async () => {
    const wrapper = await mountSuspended(PreviewPage)
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))
    await wrapper.find('[data-test="ann-rail-toggle"]').trigger('click') // rail starts hidden
    await wrapper.find('[data-test="ann-resolve"]').trigger('click')
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.find('mark[data-ann-id="seed-1"]').exists()).toBe(false)
  })
  it('renders no global ann-card ids anywhere (desktop rail + mobile drawer mount concurrently)', async () => {
    const wrapper = await mountSuspended(PreviewPage, { attachTo: document.body })
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))
    await wrapper.find('[data-test="ann-rail-toggle"]').trigger('click') // rail starts hidden
    expect(wrapper.text()).toContain('Consider a citation here.') // rail(s) rendered with the thread
    expect(document.querySelectorAll('[id^="ann-card-"]')).toHaveLength(0)
    wrapper.unmount()
  })
  it('keyboard-activating a mark (Enter) keeps focus on the highlight after repaint', async () => {
    const wrapper = await mountSuspended(PreviewPage, { attachTo: document.body })
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))
    const mark = wrapper.find('mark[data-ann-id="seed-1"]')
    expect(mark.exists()).toBe(true)
    ;(mark.element as HTMLElement).focus()
    await mark.trigger('keydown', { key: 'Enter' })
    await new Promise((r) => setTimeout(r, 0))
    const active = document.activeElement as HTMLElement | null
    expect(active?.tagName).toBe('MARK')
    expect(active?.getAttribute('data-ann-id')).toBe('seed-1')
    wrapper.unmount()
  })
  it('reloads on a storage event for THIS document\'s exact key and ignores other keys', async () => {
    const wrapper = await mountSuspended(PreviewPage)
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.find('mark[data-ann-id="seed-1"]').exists()).toBe(true)
    // Another tab clears THIS doc's storage, but the event is keyed to a DIFFERENT doc → ignore.
    window.localStorage.setItem(annotationsStorageKey('article', 'a1'), JSON.stringify([]))
    window.dispatchEvent(new StorageEvent('storage', { key: annotationsStorageKey('article', 'other-doc') }))
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.find('mark[data-ann-id="seed-1"]').exists()).toBe(true)
    // The event for this doc's exact key → reload + repaint picks up the cleared list.
    window.dispatchEvent(new StorageEvent('storage', { key: annotationsStorageKey('article', 'a1') }))
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.find('mark[data-ann-id="seed-1"]').exists()).toBe(false)
  })
  it('re-announces consecutive identical status messages (live region blanks between them)', async () => {
    window.localStorage.setItem(annotationsStorageKey('article', 'a1'), JSON.stringify([seed, seed2]))
    const wrapper = await mountSuspended(PreviewPage)
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))
    await wrapper.find('[data-test="ann-rail-toggle"]').trigger('click') // rail starts hidden
    await wrapper.find('[data-test="ann-resolve"]').trigger('click') // resolve thread 1
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))
    const status = wrapper.find('p[role="status"]')
    expect(status.text()).toBe('Thread resolved')
    // Screen readers only re-announce a live region when its DOM actually mutates. Count
    // mutations during the SECOND identical announcement — a plain `announce = same-string`
    // write never touches the DOM (Vue skips identical ref writes), so nothing is re-announced.
    let mutations = 0
    const observer = new MutationObserver((records) => { mutations += records.length })
    observer.observe(status.element, { childList: true, characterData: true, subtree: true })
    await wrapper.find('[data-test="ann-resolve"]').trigger('click') // resolve thread 2 → same message
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))
    mutations += observer.takeRecords().length
    observer.disconnect()
    expect(status.text()).toBe('Thread resolved')
    expect(mutations).toBeGreaterThan(0)
  })
  it('cancel restores focus to the element that had it before the composer opened', async () => {
    const wrapper = await mountSuspended(PreviewPage, { attachTo: document.body })
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))
    await wrapper.find('[data-test="ann-arm"]').trigger('click')
    const opener = document.createElement('button')
    opener.type = 'button'
    document.body.appendChild(opener)
    opener.focus()
    expect(document.activeElement).toBe(opener)
    const container = wrapper.find('.published-content').element as HTMLElement
    selectExact(container, 'lazy dog')
    await wrapper.find('.ann-arming').trigger('mouseup')
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.find('.ann-composer').exists()).toBe(true)
    await wrapper.find('[data-test="ann-cancel"]').trigger('click')
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.find('.ann-composer').exists()).toBe(false)
    expect(document.activeElement).toBe(opener)
    opener.remove()
    wrapper.unmount()
  })
  it('save focuses the newly painted mark, and snaps a Resolved filter back to Open so the new thread is visible', async () => {
    const wrapper = await mountSuspended(PreviewPage, { attachTo: document.body })
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))
    await wrapper.find('[data-test="ann-arm"]').trigger('click')
    await wrapper.find('[data-test="ann-filter"]').trigger('click') // open -> resolved
    expect(wrapper.find('[data-test="ann-filter"]').text()).toContain('Resolved')
    const container = wrapper.find('.published-content').element as HTMLElement
    selectExact(container, 'lazy dog')
    await wrapper.find('.ann-arming').trigger('mouseup')
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.find('.ann-composer').exists()).toBe(true)
    await wrapper.find('textarea').setValue('New note')
    await wrapper.find('[data-test="ann-save"]').trigger('click')
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))
    // Item 5 hardening: creating a thread while filtered to Resolved must not hide it.
    expect(wrapper.find('[data-test="ann-filter"]').text()).toContain('Open')
    const stored = JSON.parse(window.localStorage.getItem(annotationsStorageKey('article', 'a1')) ?? '[]') as ReviewAnnotation[]
    const created = stored.find((a) => a.anchor.exact === 'lazy dog')
    expect(created).toBeTruthy()
    expect(wrapper.find(`mark[data-ann-id="${created!.id}"]`).exists()).toBe(true)
    const active = document.activeElement as HTMLElement | null
    expect(active?.tagName).toBe('MARK')
    expect(active?.getAttribute('data-ann-id')).toBe(created!.id)
    wrapper.unmount()
  })
  it('shared-link visit (no window.opener): bar links back to the editor and the dashboard', async () => {
    const wrapper = await mountSuspended(PreviewPage)
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))
    const editor = wrapper.find('[data-test="preview-back-to-editor"]')
    expect(editor.exists()).toBe(true)
    expect(editor.attributes('href')).toBe('/edit/article/a1')
    expect(wrapper.find('[data-test="preview-close-tab"]').exists()).toBe(false)
    const dash = wrapper.find('[data-test="preview-back-to-dashboard"]')
    expect(dash.exists()).toBe(true)
    expect(dash.attributes('href')).toBe('/')
  })
  it('opened FROM the Studio (window.opener set): Close preview closes the tab — never a second editor', async () => {
    Object.defineProperty(window, 'opener', { value: {}, configurable: true, writable: true })
    const closeSpy = vi.spyOn(window, 'close').mockImplementation(() => {})
    try {
      const wrapper = await mountSuspended(PreviewPage)
      await new Promise((r) => setTimeout(r, 0))
      await new Promise((r) => setTimeout(r, 0))
      expect(wrapper.find('[data-test="preview-back-to-editor"]').exists()).toBe(false)
      const close = wrapper.find('[data-test="preview-close-tab"]')
      expect(close.exists()).toBe(true)
      await close.trigger('click')
      expect(closeSpy).toHaveBeenCalled()
    } finally {
      closeSpy.mockRestore()
      Object.defineProperty(window, 'opener', { value: null, configurable: true, writable: true })
    }
  })
  it('Clean view unpaints all highlights and hides the review controls; toggling back repaints', async () => {
    const wrapper = await mountSuspended(PreviewPage)
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.find('mark[data-ann-id="seed-1"]').exists()).toBe(true)
    await wrapper.find('[data-test="ann-clean-toggle"]').trigger('click')
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.find('mark[data-ann-id="seed-1"]').exists()).toBe(false) // plain article
    expect(wrapper.find('[data-test="ann-arm"]').exists()).toBe(false)      // controls collapsed
    await wrapper.find('[data-test="ann-clean-toggle"]').trigger('click')   // back to review view
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.find('mark[data-ann-id="seed-1"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="ann-arm"]').exists()).toBe(true)
  })
  it('rail starts hidden; arming auto-opens it; disarming leaves it open (deliberate asymmetry)', async () => {
    const wrapper = await mountSuspended(PreviewPage)
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))
    const toggle = () => wrapper.find('[data-test="ann-rail-toggle"]')
    expect(toggle().attributes('aria-expanded')).toBe('false') // default HIDDEN (user decision 2026-07-05)
    await wrapper.find('[data-test="ann-arm"]').trigger('click') // arm → open
    expect(toggle().attributes('aria-expanded')).toBe('true')
    await wrapper.find('[data-test="ann-arm"]').trigger('click') // disarm → rail stays
    expect(toggle().attributes('aria-expanded')).toBe('true')
    wrapper.unmount()
  })
  it('arming carries the chosen color on the wrapper (drives the live ::selection tint)', async () => {
    // The color preference key survives the annotations-prefix cleanup in beforeEach —
    // clear it explicitly so this test always starts from the yellow default.
    window.localStorage.removeItem('icjia-studio-annotations-ui-v1:color')
    const wrapper = await mountSuspended(PreviewPage)
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.find('.ann-arming').exists()).toBe(false) // unarmed: native selection
    await wrapper.find('[data-test="ann-arm"]').trigger('click')
    expect(wrapper.find('.ann-arming.ann-arming--yellow').exists()).toBe(true)
    await wrapper.find('[data-test="ann-color-green"]').trigger('click')
    expect(wrapper.find('.ann-arming.ann-arming--green').exists()).toBe(true)
    expect(wrapper.find('.ann-arming--yellow').exists()).toBe(false)
    wrapper.unmount()
  })
  it('mobile drawer is a labelled modal dialog; opening moves focus in, Escape closes and restores it', async () => {
    // Simulate a mobile viewport: the drawer's focus hop keys off the lg media query.
    const mm = vi.spyOn(window, 'matchMedia').mockImplementation((q: string) =>
      ({ matches: false, media: q } as MediaQueryList))
    try {
      const wrapper = await mountSuspended(PreviewPage, { attachTo: document.body })
      await new Promise((r) => setTimeout(r, 0))
      await new Promise((r) => setTimeout(r, 0))
      const toggle = wrapper.find('[data-test="ann-rail-toggle"]')
      ;(toggle.element as HTMLElement).focus()
      await toggle.trigger('click')
      await new Promise((r) => setTimeout(r, 0))
      const drawer = wrapper.find('[data-test="ann-drawer"]')
      expect(drawer.exists()).toBe(true)
      expect(drawer.attributes('role')).toBe('dialog')
      expect(drawer.attributes('aria-modal')).toBe('true')
      expect(drawer.attributes('aria-label')).toBe('Review comments')
      // Focus hopped to the drawer's close button (modal open behavior).
      expect(document.activeElement?.getAttribute('data-test')).toBe('ann-drawer-close')
      // Escape closes the drawer and hands focus back to the opener.
      await drawer.trigger('keydown', { key: 'Escape' })
      await new Promise((r) => setTimeout(r, 0))
      expect(wrapper.find('[data-test="ann-drawer"]').exists()).toBe(false)
      expect(document.activeElement).toBe(toggle.element)
      wrapper.unmount()
    } finally { mm.mockRestore() }
  })
  it('mobile drawer Tab wraps within the dialog (minimal focus trap)', async () => {
    const mm = vi.spyOn(window, 'matchMedia').mockImplementation((q: string) =>
      ({ matches: false, media: q } as MediaQueryList))
    try {
      const wrapper = await mountSuspended(PreviewPage, { attachTo: document.body })
      await new Promise((r) => setTimeout(r, 0))
      await new Promise((r) => setTimeout(r, 0))
      await wrapper.find('[data-test="ann-rail-toggle"]').trigger('click')
      await new Promise((r) => setTimeout(r, 0))
      const drawer = wrapper.find('[data-test="ann-drawer"]')
      const focusables = drawer.element.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, textarea, select')
      expect(focusables.length).toBeGreaterThan(1)
      const last = focusables[focusables.length - 1]!
      last.focus()
      await wrapper.find('[data-test="ann-drawer"]').trigger('keydown', { key: 'Tab' })
      expect(document.activeElement?.getAttribute('data-test')).toBe('ann-drawer-close')
      // Shift+Tab from the first wraps back to the last.
      await wrapper.find('[data-test="ann-drawer"]').trigger('keydown', { key: 'Tab', shiftKey: true })
      expect(document.activeElement).toBe(last)
      wrapper.unmount()
    } finally { mm.mockRestore() }
  })
  it('desktop (lg) viewport: opening the rail never steals focus into the hidden drawer', async () => {
    const mm = vi.spyOn(window, 'matchMedia').mockImplementation((q: string) =>
      ({ matches: q.includes('min-width'), media: q } as MediaQueryList))
    try {
      const wrapper = await mountSuspended(PreviewPage, { attachTo: document.body })
      await new Promise((r) => setTimeout(r, 0))
      await new Promise((r) => setTimeout(r, 0))
      const toggle = wrapper.find('[data-test="ann-rail-toggle"]')
      ;(toggle.element as HTMLElement).focus()
      await toggle.trigger('click')
      await new Promise((r) => setTimeout(r, 0))
      expect(wrapper.find('[data-test="ann-drawer"]').exists()).toBe(true) // rendered, css-hidden on lg
      expect(document.activeElement).toBe(toggle.element) // focus untouched
      wrapper.unmount()
    } finally { mm.mockRestore() }
  })
  it('keyboard-only: Enter with a live selection (armed, target not on a mark) opens the composer', async () => {
    const wrapper = await mountSuspended(PreviewPage, { attachTo: document.body })
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))
    await wrapper.find('[data-test="ann-arm"]').trigger('click')
    const container = wrapper.find('.published-content').element as HTMLElement
    selectExact(container, 'jumps over')
    await wrapper.find('.ann-arming').trigger('keydown', { key: 'Enter' })
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.find('.ann-composer').exists()).toBe(true)
    expect(wrapper.text()).toContain('jumps over')
    wrapper.unmount()
  })
  it('keyboard-only: Enter with focus on <body> (where caret-browsing selections leave it) opens the composer', async () => {
    const wrapper = await mountSuspended(PreviewPage, { attachTo: document.body })
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))
    await wrapper.find('[data-test="ann-arm"]').trigger('click')
    const container = wrapper.find('.published-content').element as HTMLElement
    selectExact(container, 'jumps over')
    ;(document.activeElement as HTMLElement | null)?.blur?.()
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.find('.ann-composer').exists()).toBe(true)
    expect(wrapper.text()).toContain('jumps over')
    wrapper.unmount()
  })
  it('scoping: Enter on a focused in-article link is never captured by the create path', async () => {
    const wrapper = await mountSuspended(PreviewPage, { attachTo: document.body })
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))
    await wrapper.find('[data-test="ann-arm"]').trigger('click')
    const container = wrapper.find('.published-content').element as HTMLElement
    const link = container.querySelector<HTMLAnchorElement>('a[href]')
    expect(link).toBeTruthy()
    selectExact(container, 'jumps over')
    link!.focus()
    link!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.find('.ann-composer').exists()).toBe(false) // Enter follows the link instead
    wrapper.unmount()
  })
  it('scoping: Enter while typing in a rail reply box is never captured by the create path', async () => {
    const wrapper = await mountSuspended(PreviewPage, { attachTo: document.body })
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))
    await wrapper.find('[data-test="ann-arm"]').trigger('click') // arms + auto-opens the rail
    const container = wrapper.find('.published-content').element as HTMLElement
    selectExact(container, 'jumps over')
    const reply = wrapper.find('[data-test="ann-reply-input"]')
    expect(reply.exists()).toBe(true)
    ;(reply.element as HTMLInputElement).focus()
    reply.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.find('.ann-composer').exists()).toBe(false)
    wrapper.unmount()
  })
  it('scoping: Enter on a toolbar button keeps its native meaning (never opens the composer)', async () => {
    const wrapper = await mountSuspended(PreviewPage, { attachTo: document.body })
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))
    const arm = wrapper.find('[data-test="ann-arm"]')
    await arm.trigger('click')
    const container = wrapper.find('.published-content').element as HTMLElement
    selectExact(container, 'jumps over')
    ;(arm.element as HTMLElement).focus()
    arm.element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.find('.ann-composer').exists()).toBe(false)
    wrapper.unmount()
  })
})
