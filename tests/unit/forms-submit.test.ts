import { describe, it, expect, vi } from 'vitest'
import { submitForm, prepareForCreate } from '~/lib/forms/submit'
import type { FieldError } from '~/lib/validators/article'

interface Model { title: string; slug: string; bad?: boolean }
const noErrors = (): FieldError[] => []
const oneError = (m: Model): FieldError[] => (m.bad ? [{ field: 'title', message: 'x' }] : [])

describe('submitForm (the save-gate)', () => {
  it('does NOT call persist when validation fails', async () => {
    const persist = vi.fn().mockResolvedValue({})
    const res = await submitForm({ title: '', slug: '', bad: true }, oneError, persist)
    expect(res.ok).toBe(false)
    expect(res.errors).toHaveLength(1)
    expect(persist).not.toHaveBeenCalled()
  })

  it('calls persist and returns the saved model when validation passes', async () => {
    const saved = { title: 'T', slug: 't' }
    const persist = vi.fn().mockResolvedValue(saved)
    const res = await submitForm({ title: 'T', slug: 't' }, noErrors, persist)
    expect(res.ok).toBe(true)
    expect(persist).toHaveBeenCalledOnce()
    expect(res.saved).toEqual(saved)
  })
})

describe('prepareForCreate', () => {
  it('derives the slug from the title (create-only)', () => {
    expect(prepareForCreate({ title: 'Crime In Illinois', slug: '' }).slug).toBe('crime-in-illinois')
  })
})
