<!--
  PublishedArticlePreview: renders an article as it appears on the public Research Hub
  (icjia.illinois.gov/researchhub) — splash, a sticky Table of Contents (from the body's h2
  section headings), category + tags, the Oswald title, the bordered abstract, the author
  byline + date + a print button, a rule, the Markdown body, then the end matter (About the
  Authors / Funding Acknowledgment / Suggested Citation). Styled entirely by prose-preview.css
  (the swappable hub stylesheet) so an author sees a faithful "as published" preview — live from
  the form (the editor modal) or from a saved draft (the /preview/:type/:documentId page / link).
-->
<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from '#imports'
import type { Article } from '~/types/content'
import { renderArticleBody, renderInline } from '~/lib/markdown'
import { safeHref } from '~/lib/safe-url'
import { pickActiveHeadingId } from '~/lib/toc-scrollspy'

const props = defineProps<{ article: Partial<Article> }>()

/** Render the body and collect the h2 Table of Contents from the markdown AST (audit M-2:
 *  ids are assigned + escaped at the token level, NOT by regex-rewriting rendered HTML). */
const rendered = computed(() => renderArticleBody(props.article.markdown ?? ''))

/** "A, B and C" — the byline format the public site uses (shows ALL authors). */
const authorLine = computed(() => {
  const names = (props.article.authors ?? []).map((a) => a?.title?.trim()).filter(Boolean) as string[]
  if (names.length === 0) return ''
  if (names.length === 1) return names[0]!
  return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1]
})

/** Authors that carry a bio, for the "About the Authors" end matter. */
const authorsWithBio = computed(() =>
  (props.article.authors ?? []).filter((a) => a?.title && a?.description) as { title: string; description: string }[],
)
/** "Name, bio." with a single trailing period. */
function bioLine(a: { title: string; description: string }): string {
  const d = a.description.trim()
  return `${a.title}, ${d}${/[.!?]$/.test(d) ? '' : '.'}`
}

/** Splash url through the href allowlist (no data:/javascript:); empty when absent. */
const splashUrl = computed(() => {
  const u = props.article.splash?.url
  return u ? safeHref(u) : ''
})
const hasTags = computed(() => Boolean(props.article.categories?.length || props.article.tags?.length))

/** Downloadable Main Files (PDFs) for the "Downloads" section under the TOC. Each carries a
 *  safe href (no data:/javascript:) and a display filename; empty list ⇒ section renders nothing. */
const downloads = computed(() =>
  (props.article.mainfiles ?? [])
    .filter((f) => f && f.url)
    .map((f) => ({ href: safeHref(f.url), name: f.name?.trim() || f.url })),
)

function printArticle() {
  if (!import.meta.client) return
  if (!rootEl.value) {
    window.print()
    return
  }

  // Copy the page's stylesheets so the article keeps hub typography in the iframe.
  const styleLinks = Array.from(
    document.querySelectorAll<HTMLElement>('link[rel="stylesheet"], style'),
  ).map((el) => el.outerHTML).join('\n')

  // Sanitise the title for insertion into <head>.
  const rawTitle = props.article.title ?? 'Article'
  const safeTitle = rawTitle
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

  // Hidden same-origin iframe — isolates the print from the app shell.
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
  document.body.appendChild(iframe)

  const iwin = iframe.contentWindow!
  let printed = false

  const removeIframe = () => {
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe)
  }

  const doPrint = () => {
    if (printed) return
    printed = true
    iwin.focus()
    iwin.print()
    iwin.addEventListener('afterprint', () => setTimeout(removeIframe, 200))
    setTimeout(removeIframe, 30_000) // safety: remove even if afterprint never fires
  }

  // Print once the iframe's resources (fonts/images) have loaded.
  iwin.addEventListener('load', () => doPrint())
  // Fallback: if load doesn't fire within 1.2 s, print anyway (guard is in doPrint).
  setTimeout(() => doPrint(), 1200)

  // Write the article into the iframe. The dark class is NOT copied — print must be light.
  const doc = iwin.document
  doc.open()
  doc.write(
    `<!DOCTYPE html>\n<html>\n<head>\n<meta charset="utf-8">\n<title>${safeTitle}</title>\n${styleLinks}\n</head>\n<body>${rootEl.value.outerHTML}</body>\n</html>`,
  )
  doc.close()
}

// ---------------------------------------------------------------------------
// Scroll-spy + smooth scroll
// ---------------------------------------------------------------------------

/** The root element of this component (<article class="published-article">). */
const rootEl = ref<HTMLElement | null>(null)

/** The resolved scroll container (an overflow-y:auto/scroll ancestor, or window). */
let scrollContainer: HTMLElement | Window | null = null

/** The scroll offset in px: --published-toc-top value + 16px margin. */
let scrollOffset = 32 // sensible default before mount

/** Active TOC id for the scroll-spy highlight. */
const activeId = ref<string | null>(null)

/** rAF handle for throttling. */
let rafId: number | null = null

/** Bound event listeners so we can remove them. */
let scrollListener: (() => void) | null = null
let resizeListener: (() => void) | null = null

/**
 * Walk up from `el` to find the nearest scrollable overflow-y ancestor.
 * Returns null if none found before <html>.
 */
function findScrollParent(el: HTMLElement): HTMLElement | null {
  let node: HTMLElement | null = el.parentElement
  while (node && node !== document.documentElement) {
    const style = window.getComputedStyle(node)
    const oy = style.overflowY
    if ((oy === 'auto' || oy === 'scroll') && node.scrollHeight > node.clientHeight) {
      return node
    }
    node = node.parentElement
  }
  return null
}

/**
 * Read --published-toc-top off the component root and parse its px value.
 * Falls back to 16 if not set or not parseable.
 */
function readTocTop(el: HTMLElement): number {
  const raw = window.getComputedStyle(el).getPropertyValue('--published-toc-top').trim()
  if (!raw) return 16
  const num = parseFloat(raw)
  if (!Number.isFinite(num)) return 16
  // getComputedStyle returns CSS custom properties UNRESOLVED (e.g. "5rem", not "80px"),
  // so convert rem/em to px ourselves; bare numbers/px pass through.
  if (raw.endsWith('rem')) return num * (parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16)
  if (raw.endsWith('em')) return num * (parseFloat(window.getComputedStyle(el).fontSize) || 16)
  return num
}

/** Collect h2[id] headings and compute their top relative to the container viewport top. */
function collectHeadings(): { id: string; top: number }[] {
  if (!import.meta.client || !rootEl.value) return []

  const headings = Array.from(rootEl.value.querySelectorAll<HTMLElement>('h2[id]'))
  let containerTop = 0

  if (scrollContainer && scrollContainer !== window) {
    const container = scrollContainer as HTMLElement
    containerTop = container.getBoundingClientRect().top
  }
  // For window, containerTop stays 0 (viewport top is 0).

  return headings.map((h) => ({
    id: h.id,
    top: h.getBoundingClientRect().top - containerTop,
  }))
}

/** rAF-throttled scroll handler — updates activeId. */
function onScroll() {
  if (rafId !== null) return
  rafId = requestAnimationFrame(() => {
    rafId = null
    const headings = collectHeadings()
    activeId.value = pickActiveHeadingId(headings, scrollOffset)
  })
}

/**
 * Smooth-scroll the container so that the heading with `id` lands `scrollOffset`
 * from the top of the container's viewport. Sets activeId immediately.
 */
function scrollToHeading(id: string) {
  if (!import.meta.client) return

  activeId.value = id

  const target = rootEl.value?.querySelector<HTMLElement>(`#${CSS.escape(id)}`)
  if (!target) return

  if (!scrollContainer || scrollContainer === window) {
    // Window scroll: use getBoundingClientRect relative to the viewport.
    const targetTop = target.getBoundingClientRect().top + window.scrollY
    window.scrollTo({ top: targetTop - scrollOffset, behavior: 'smooth' })
  } else {
    const container = scrollContainer as HTMLElement
    const containerRect = container.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    // Current scroll position + delta to align target at scrollOffset from container top.
    const delta = targetRect.top - containerRect.top - scrollOffset
    container.scrollBy({ top: delta, behavior: 'smooth' })
  }
}

onMounted(() => {
  if (!import.meta.client || !rootEl.value) return

  // Resolve scroll container.
  const parent = findScrollParent(rootEl.value)
  scrollContainer = parent ?? window

  // Resolve offset: --published-toc-top (inherited from ancestor, readable via rootEl) + 16px margin.
  // We read off the closest ancestor that might set the property, which is the component root
  // (the property cascades down from the page wrapper).
  scrollOffset = readTocTop(rootEl.value) + 16

  // Initial active section.
  const headings = collectHeadings()
  activeId.value = pickActiveHeadingId(headings, scrollOffset)

  // Attach listeners.
  scrollListener = onScroll
  resizeListener = () => {
    const headings = collectHeadings()
    activeId.value = pickActiveHeadingId(headings, scrollOffset)
  }

  const target = scrollContainer === window ? window : (scrollContainer as HTMLElement)
  target.addEventListener('scroll', scrollListener, { passive: true })
  window.addEventListener('resize', resizeListener, { passive: true })
})

onBeforeUnmount(() => {
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
  if (scrollListener && scrollContainer) {
    const target = scrollContainer === window ? window : (scrollContainer as HTMLElement)
    target.removeEventListener('scroll', scrollListener)
  }
  if (resizeListener) {
    window.removeEventListener('resize', resizeListener)
  }
  scrollListener = null
  resizeListener = null
  scrollContainer = null
})

defineExpose({ printArticle, rootEl })
</script>

<template>
  <article ref="rootEl" class="published-article">
    <img v-if="splashUrl" :src="splashUrl" :alt="article.splash?.alternativeText ?? ''" class="published-splash">

    <div class="published-layout">
      <!-- LEFT COLUMN — one grid cell holding the sticky TOC AND the per-file downloads, stacked.
           They MUST share a single wrapper: otherwise each is its own grid item and the downloads
           land in the article column (column 2), shoving the body into column 1. -->
      <aside class="published-aside">
      <!-- Sticky table of contents, built from the body's h2 section headings. -->
      <nav v-if="rendered.toc.length" class="published-toc" aria-label="Table of contents">
        <p class="published-toc-heading">Table of Contents</p>
        <ul>
          <li v-for="item in rendered.toc" :key="item.id">
            <a
              :href="`#${item.id}`"
              :class="{ 'published-toc-link--active': item.id === activeId }"
              :aria-current="item.id === activeId ? 'location' : undefined"
              @click.prevent="scrollToHeading(item.id)"
            >{{ item.text }}</a>
          </li>
        </ul>
      </nav>

      <!-- Downloads: a distinct download button per Main File (PDF), directly under the TOC.
           Renders nothing when the article carries no main files. -->
      <section v-if="downloads.length" class="published-downloads" aria-label="Downloads" data-test="published-downloads">
        <p class="published-downloads-heading">Downloads</p>
        <a
          v-for="(d, i) in downloads"
          :key="`dl-${i}`"
          :href="d.href"
          :download="d.name"
          class="published-download-link"
          :data-test="`published-download-${i}`"
        >
          <UIcon name="i-lucide-download" class="published-download-icon" />
          <span class="published-download-name">{{ d.name }}</span>
        </a>
      </section>
      </aside>

      <div class="published-content">
        <div v-if="hasTags" class="published-tags">
          <span v-for="c in article.categories" :key="'c-' + c" class="published-category">{{ c }}</span>
          <span v-for="t in article.tags" :key="'t-' + t" class="published-tag">{{ t }}</span>
        </div>

        <h1 class="published-title">{{ article.title || 'Untitled article' }}</h1>

        <!-- eslint-disable-next-line vue/no-v-html -- trusted: renderInline runs markdown-it with html:false -->
        <div v-if="article.abstract" class="published-abstract" v-html="renderInline(article.abstract)" />

        <div v-if="authorLine || article.date" class="published-byline">
          <span v-if="authorLine" class="published-authors">{{ authorLine }}</span>
          <span v-if="authorLine && article.date" class="published-byline-sep">|</span>
          <span v-if="article.date">{{ article.date }}</span>
          <span class="published-byline-sep">|</span>
          <button type="button" class="published-print-btn" aria-label="Print article" title="Print" @click="printArticle">
            <UIcon name="i-lucide-printer" />
          </button>
        </div>

        <hr class="published-rule">

        <!-- eslint-disable-next-line vue/no-v-html -- trusted: renderArticleBody runs markdown-it with html:false; h2 ids are AST-derived + escaped -->
        <div class="prose-preview" v-html="rendered.html" />

        <!-- End matter (parity with the published article footer). -->
        <section v-if="authorsWithBio.length" class="published-endmatter">
          <h2 class="published-endmatter-heading">About the Authors</h2>
          <p v-for="a in authorsWithBio" :key="a.title">{{ bioLine(a) }}</p>
        </section>
        <section v-if="article.funding" class="published-endmatter">
          <h2 class="published-endmatter-heading">Funding Acknowledgment</h2>
          <p>{{ article.funding }}</p>
        </section>
        <section v-if="article.citation" class="published-endmatter">
          <h2 class="published-endmatter-heading">Suggested Citation</h2>
          <p>{{ article.citation }}</p>
        </section>
      </div>
    </div>
  </article>
</template>
