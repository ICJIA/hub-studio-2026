import { describe, it, expect } from 'vitest'
import { buildFigureMarkdown } from '~/lib/editor/figure-insert'
import { containsBase64 } from '~/lib/base64-guard'

const URL = '/uploads/figure_xyz.png'
const ALT = 'Outcome chart'

describe('buildFigureMarkdown', () => {
  it('position "below" with a caption: image then a blank line then the emphasis caption', () => {
    expect(buildFigureMarkdown({ url: URL, alt: ALT, caption: 'Figure 2.', position: 'below', align: 'center' }))
      .toBe('![Outcome chart](/uploads/figure_xyz.png)\n\n*Figure 2.*\n')
  })

  it('position "below" + align "left": appends the {.fig-caption-left} attrs tag', () => {
    expect(buildFigureMarkdown({ url: URL, alt: ALT, caption: 'Figure 2.', position: 'below', align: 'left' }))
      .toBe('![Outcome chart](/uploads/figure_xyz.png)\n\n*Figure 2.*{.fig-caption-left}\n')
  })

  it('position "above" with a caption: the emphasis caption then a blank line then the image', () => {
    expect(buildFigureMarkdown({ url: URL, alt: ALT, caption: 'Figure 2.', position: 'above', align: 'center' }))
      .toBe('*Figure 2.*\n\n![Outcome chart](/uploads/figure_xyz.png)\n')
  })

  it('position "above" + align "left": leading caption carries the {.fig-caption-left} tag', () => {
    expect(buildFigureMarkdown({ url: URL, alt: ALT, caption: 'Figure 2.', position: 'above', align: 'left' }))
      .toBe('*Figure 2.*{.fig-caption-left}\n\n![Outcome chart](/uploads/figure_xyz.png)\n')
  })

  it('position "none": image only, regardless of caption text or align', () => {
    expect(buildFigureMarkdown({ url: URL, alt: ALT, caption: 'Figure 2.', position: 'none', align: 'center' }))
      .toBe('![Outcome chart](/uploads/figure_xyz.png)\n')
    expect(buildFigureMarkdown({ url: URL, alt: ALT, caption: 'Figure 2.', position: 'none', align: 'left' }))
      .toBe('![Outcome chart](/uploads/figure_xyz.png)\n')
  })

  it('empty/whitespace caption: image only even when position is below/above', () => {
    expect(buildFigureMarkdown({ url: URL, alt: ALT, caption: '', position: 'below', align: 'center' }))
      .toBe('![Outcome chart](/uploads/figure_xyz.png)\n')
    expect(buildFigureMarkdown({ url: URL, alt: ALT, caption: '   ', position: 'above', align: 'left' }))
      .toBe('![Outcome chart](/uploads/figure_xyz.png)\n')
    expect(buildFigureMarkdown({ url: URL, alt: ALT, caption: undefined, position: 'below', align: 'center' }))
      .toBe('![Outcome chart](/uploads/figure_xyz.png)\n')
  })

  it('trims surrounding whitespace from the caption text', () => {
    expect(buildFigureMarkdown({ url: URL, alt: ALT, caption: '  Figure 2.  ', position: 'below', align: 'center' }))
      .toBe('![Outcome chart](/uploads/figure_xyz.png)\n\n*Figure 2.*\n')
  })

  it('never produces base64 — the url is the hosted MediaRef url', () => {
    const md = buildFigureMarkdown({ url: URL, alt: ALT, caption: 'cap', position: 'below', align: 'center' })
    expect(containsBase64(md)).toBe(false)
    expect(md).not.toMatch(/data:/)
  })
})
