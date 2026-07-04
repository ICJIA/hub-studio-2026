// tests/nuxt/annotation-rail.test.ts
// @vitest-environment nuxt
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AnnotationRail from '~/components/annotations/AnnotationRail.vue'
import { useAuthStore } from '~/stores/auth'
import { makeDevAdminSession } from '~/lib/dev-auth'
import type { ReviewAnnotation } from '~/types/annotations'

const ann = (id: string, over: Partial<ReviewAnnotation> = {}): ReviewAnnotation => ({
  id, contentType: 'article', documentId: 'd1',
  anchor: { exact: `quote ${id}`, prefix: '', suffix: '', offset: 0 },
  color: 'yellow', resolved: false, createdAt: '2026-07-04T00:00:00.000Z',
  createdBy: { name: 'Dev Author', email: 'dev-author@localhost', roleLabel: 'Author · demo' },
  comments: [{ id: `c-${id}`, body: `Note on ${id}`, authorName: 'Dev Author', authorEmail: 'dev-author@localhost', createdAt: '2026-07-04T00:00:00.000Z' }],
  ...over,
})

beforeEach(() => { useAuthStore().setSession(makeDevAdminSession('editor')) })
afterEach(() => { vi.restoreAllMocks() })

describe('AnnotationRail', () => {
  it('sorts by document position with orphans last and flags them', async () => {
    const wrapper = await mountSuspended(AnnotationRail, { props: {
      threads: [
        { annotation: ann('late'), orphan: false, start: 500 },
        { annotation: ann('lost'), orphan: true, start: null },
        { annotation: ann('early'), orphan: false, start: 10 },
      ],
      filter: 'all', activeId: null,
    } })
    const cards = wrapper.findAll('[data-test="ann-card"]')
    expect(cards.map((c) => c.attributes('id'))).toEqual(['ann-card-early', 'ann-card-late', 'ann-card-lost'])
    expect(cards[2]!.text()).toContain('text changed')
  })
  it('filters open vs resolved', async () => {
    const wrapper = await mountSuspended(AnnotationRail, { props: {
      threads: [
        { annotation: ann('open1'), orphan: false, start: 1 },
        { annotation: ann('done1', { resolved: true }), orphan: false, start: 2 },
      ],
      filter: 'open', activeId: null,
    } })
    expect(wrapper.text()).toContain('Note on open1')
    expect(wrapper.text()).not.toContain('Note on done1')
  })
  it('emits reply with the typed body', async () => {
    const wrapper = await mountSuspended(AnnotationRail, { props: {
      threads: [{ annotation: ann('a1'), orphan: false, start: 1 }], filter: 'all', activeId: null,
    } })
    await wrapper.find('[data-test="ann-reply-input"]').setValue('Fixed in draft')
    await wrapper.find('[data-test="ann-reply-send"]').trigger('click')
    expect(wrapper.emitted('reply')![0]).toEqual(['a1', 'Fixed in draft'])
  })
  it('emits resolve and jump; shows delete for permitted users (editor session)', async () => {
    const wrapper = await mountSuspended(AnnotationRail, { props: {
      threads: [{ annotation: ann('a1'), orphan: false, start: 1 }], filter: 'all', activeId: null,
    } })
    await wrapper.find('[data-test="ann-resolve"]').trigger('click')
    expect(wrapper.emitted('resolve')![0]).toEqual(['a1', true])
    await wrapper.find('[data-test="ann-quote"]').trigger('click')
    expect(wrapper.emitted('jump')![0]).toEqual(['a1'])
    expect(wrapper.find('[data-test="ann-delete"]').exists()).toBe(true)
  })
  it('emits remove when delete is clicked (editor session)', async () => {
    const wrapper = await mountSuspended(AnnotationRail, { props: {
      threads: [{ annotation: ann('a1'), orphan: false, start: 1 }], filter: 'all', activeId: null,
    } })
    await wrapper.find('[data-test="ann-delete"]').trigger('click')
    expect(wrapper.emitted('remove')![0]).toEqual(['a1'])
  })
  it('scrolls the active card into view when mounted with an activeId', async () => {
    const scrollSpy = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => {})
    await mountSuspended(AnnotationRail, {
      // The scroll handler looks the card up via document.getElementById, so the rail must
      // actually be IN the document (as at runtime) — VTU mounts detached by default.
      attachTo: document.body,
      props: {
        threads: [{ annotation: ann('a1'), orphan: false, start: 1 }],
        filter: 'all', activeId: 'a1',
      },
    })
    await nextTick()
    expect(scrollSpy).toHaveBeenCalled()
  })
  it('hides delete when not permitted (author session, someone else’s thread)', async () => {
    useAuthStore().setSession(makeDevAdminSession('author'))
    const other = ann('a1')
    other.createdBy = { name: 'Someone', email: 'someone@icjia.gov', roleLabel: 'Author' }
    const wrapper = await mountSuspended(AnnotationRail, { props: {
      threads: [{ annotation: other, orphan: false, start: 1 }], filter: 'all', activeId: null,
    } })
    expect(wrapper.find('[data-test="ann-delete"]').exists()).toBe(false)
  })
  it('shows delete for the creator (author session, own thread — creator match, not canPublish)', async () => {
    useAuthStore().setSession(makeDevAdminSession('author')) // email dev-author@localhost, canPublish false
    const wrapper = await mountSuspended(AnnotationRail, { props: {
      // factory default createdBy.email IS dev-author@localhost → gate passes via creator match only
      threads: [{ annotation: ann('a1'), orphan: false, start: 1 }], filter: 'all', activeId: null,
    } })
    expect(wrapper.find('[data-test="ann-delete"]').exists()).toBe(true)
  })
})
