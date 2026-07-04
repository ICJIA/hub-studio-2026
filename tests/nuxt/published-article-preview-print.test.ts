// tests/nuxt/published-article-preview-print.test.ts
// @vitest-environment nuxt
import { describe, it, expect, vi, afterEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { Article } from '~/types/content'

import PublishedArticlePreview from '~/components/PublishedArticlePreview.vue'

const article: Partial<Article> = {
  title: 'Print Test Article',
  markdown: '## Section One\n\nBody text here.',
  date: '2024-01-01',
}

describe('PublishedArticlePreview – printArticle()', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('creates a hidden iframe, writes article HTML into it, and calls iframe window.print()', async () => {
    const wrapper = await mountSuspended(PublishedArticlePreview, { props: { article } })

    // Build a lightweight fake iframe with a trackable contentWindow.
    const loadListeners: (() => void)[] = []
    const iwinPrint = vi.fn()
    const iwinFocus = vi.fn()
    const docWrite = vi.fn()
    const mockIwin = {
      print: iwinPrint,
      focus: iwinFocus,
      addEventListener: vi.fn((event: string, cb: () => void) => {
        if (event === 'load') loadListeners.push(cb)
      }),
      document: { open: vi.fn(), write: docWrite, close: vi.fn() },
    }
    const mockIframe = {
      setAttribute: vi.fn(),
      style: { cssText: '' },
      contentWindow: mockIwin,
      parentNode: null,
    } as unknown as HTMLIFrameElement

    // Intercept createElement so 'iframe' returns the fake; all other tags use the real impl.
    const origCreate = document.createElement.bind(document)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(vi.spyOn(document, 'createElement') as any).mockImplementation((tag: string) => {
      if (tag === 'iframe') return mockIframe
      return origCreate(tag)
    })
    // Prevent jsdom from rejecting a non-Node argument to appendChild.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(vi.spyOn(document.body, 'appendChild') as any).mockReturnValue(mockIframe)

    wrapper.vm.$.exposed!.printArticle()

    // The iframe document should have been opened and the article HTML written into it.
    expect(mockIwin.document.open).toHaveBeenCalled()
    expect(docWrite).toHaveBeenCalled()
    const written = docWrite.mock.calls[0]![0] as string
    expect(written).toContain('published-article')
    expect(written).toContain('Print Test Article')

    // Simulate the iframe load event — this triggers doPrint().
    for (const cb of loadListeners) cb()

    expect(iwinFocus).toHaveBeenCalled()
    // print() must be called exactly once (the fallback timer is still pending but
    // won't fire a second time because `printed` is already true).
    expect(iwinPrint).toHaveBeenCalledTimes(1)
  })

  it('falls back to window.print() when rootEl is absent', async () => {
    const wrapper = await mountSuspended(PublishedArticlePreview, { props: { article } })

    // jsdom doesn't implement window.print; stub it so the fallback can be observed.
    const printStub = vi.fn()
    vi.stubGlobal('print', printStub)

    // Null out the template ref to simulate a missing article element.
    wrapper.vm.$.exposed!.rootEl.value = null
    wrapper.vm.$.exposed!.printArticle()

    expect(printStub).toHaveBeenCalledOnce()
  })

  it('print clone contains no annotation marks (highlights never print)', async () => {
    const wrapper = await mountSuspended(PublishedArticlePreview, { props: { article } })

    // Paint an annotation into the live DOM exactly as the preview page does.
    const { textContentOf } = await import('~/lib/annotations/anchor')
    const { paintOffsets } = await import('~/lib/annotations/paint')
    const body = wrapper.element.querySelector('.prose-preview')!
    const text = textContentOf(body)
    const start = text.indexOf('Body text')
    expect(start).toBeGreaterThan(-1)
    paintOffsets(body, start, start + 'Body text'.length, 'a1', 'yellow')
    expect(wrapper.element.querySelectorAll('mark[data-ann-id]')).toHaveLength(1)

    // Fake iframe (same shape as the first test in this file).
    const docWrite = vi.fn()
    const mockIwin = {
      print: vi.fn(), focus: vi.fn(), addEventListener: vi.fn(),
      document: { open: vi.fn(), write: docWrite, close: vi.fn() },
    }
    const mockIframe = {
      setAttribute: vi.fn(), style: { cssText: '' }, contentWindow: mockIwin, parentNode: null,
    } as unknown as HTMLIFrameElement
    const origCreate = document.createElement.bind(document)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(vi.spyOn(document, 'createElement') as any).mockImplementation((tag: string) => {
      if (tag === 'iframe') return mockIframe
      return origCreate(tag)
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(vi.spyOn(document.body, 'appendChild') as any).mockReturnValue(mockIframe)

    wrapper.vm.$.exposed!.printArticle()

    const written = docWrite.mock.calls[0]![0] as string
    expect(written).not.toContain('data-ann-id')     // mark wrapper stripped from the clone
    expect(written).toContain('Body text here.')     // …but the text survives
    // The LIVE DOM keeps its highlight — only the print clone is unwrapped.
    expect(wrapper.element.querySelectorAll('mark[data-ann-id]')).toHaveLength(1)
  })
})

describe('PublishedArticlePreview – Downloads (Main Files under the TOC)', () => {
  function pdf(name: string, url: string): NonNullable<Article['mainfiles']>[number] {
    return { id: 1, url, name, alternativeText: null, caption: null, mime: 'application/pdf' }
  }

  it('renders one distinct download button per main file, labelled by filename, linking to its url with download', async () => {
    const withFiles: Partial<Article> = {
      ...article,
      mainfiles: [
        pdf('report.pdf', '/files/demo/report.pdf'),
        pdf('appendix.pdf', '/files/demo/appendix.pdf'),
      ],
    }
    const wrapper = await mountSuspended(PublishedArticlePreview, { props: { article: withFiles } })
    expect(wrapper.find('[data-test="published-downloads"]').exists()).toBe(true)
    const links = wrapper.findAll('.published-download-link')
    expect(links).toHaveLength(2)
    expect(links[0]!.attributes('href')).toBe('/files/demo/report.pdf')
    expect(links[0]!.attributes('download')).toBe('report.pdf')
    expect(links[0]!.text()).toContain('report.pdf')
    expect(links[1]!.attributes('href')).toBe('/files/demo/appendix.pdf')
    expect(links[1]!.text()).toContain('appendix.pdf')
  })

  it('renders NOTHING (no Downloads section) when there are no main files', async () => {
    const wrapper = await mountSuspended(PublishedArticlePreview, { props: { article: { ...article, mainfiles: [] } } })
    expect(wrapper.find('[data-test="published-downloads"]').exists()).toBe(false)
    expect(wrapper.findAll('.published-download-link')).toHaveLength(0)
  })

  it('a single main file yields exactly one download button', async () => {
    const wrapper = await mountSuspended(PublishedArticlePreview, {
      props: { article: { ...article, mainfiles: [pdf('only.pdf', '/files/demo/only.pdf')] } },
    })
    expect(wrapper.findAll('.published-download-link')).toHaveLength(1)
  })

  it('passes the file url through the href allowlist (no javascript:/data:)', async () => {
    const wrapper = await mountSuspended(PublishedArticlePreview, {
      props: { article: { ...article, mainfiles: [pdf('evil.pdf', 'javascript:alert(1)')] } },
    })
    const link = wrapper.find('.published-download-link')
    expect(link.attributes('href')).toBe('#') // safeHref collapses the hostile scheme
  })
})
