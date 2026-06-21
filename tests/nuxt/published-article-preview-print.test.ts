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
})
