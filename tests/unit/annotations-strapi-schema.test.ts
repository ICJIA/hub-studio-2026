// Pins the Phase-2 drop-in Strapi schema to the app's enums so they can never drift
// (same guard style as security-headers.test.ts pinning deploy/headers-demo.txt).
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ANNOTATION_COLORS, ANNOTATION_CONTENT_TYPES } from '~/types/annotations'

const schemaPath = resolve(__dirname, '../../deploy/strapi/review-annotation/content-types/review-annotation/schema.json')

describe('review-annotation Strapi schema (deploy drop-in)', () => {
  const schema = JSON.parse(readFileSync(schemaPath, 'utf8'))
  it('is a collection type with Draft & Publish OFF', () => {
    expect(schema.kind).toBe('collectionType')
    expect(schema.options.draftAndPublish).toBe(false)
  })
  it('color and contentType enums match the app', () => {
    expect(schema.attributes.color.enum).toEqual([...ANNOTATION_COLORS])
    expect(schema.attributes.contentType.enum).toEqual([...ANNOTATION_CONTENT_TYPES])
  })
  it('carries the anchor + thread fields the mapper will need', () => {
    for (const f of ['targetDocumentId', 'exact', 'prefix', 'suffix', 'offsetHint', 'resolved', 'authorName', 'authorEmail', 'authorRole', 'comments']) {
      expect(schema.attributes[f], `missing attribute ${f}`).toBeDefined()
    }
    expect(schema.attributes.comments.type).toBe('json')
  })
})
