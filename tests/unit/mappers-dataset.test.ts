import { describe, it, expect } from 'vitest'
import { datasetFromStrapi, datasetToWrite } from '~/lib/mappers/dataset'
import { rawDataset, relApps } from '../fixtures/strapi'
import { relationsFromList } from '~/lib/strapi-rest'

describe('datasetFromStrapi / datasetToWrite', () => {
  const ds = datasetFromStrapi(rawDataset as never, { apps: relationsFromList(relApps) })
  it('maps inline datafile (with caption), timeperiod, sources, variables, notes, and relations from the relations arg', () => {
    expect(ds.datafile).toEqual({ id: 99, url: '/uploads/crime_abc.csv', name: 'crime.csv', alternativeText: null, caption: null, width: null, height: null, mime: 'text/csv' })
    expect(ds.timeperiod).toEqual({ yeartype: 'calendar', yearmin: 1982, yearmax: 2020 })
    expect(ds.sources).toEqual([{ title: 'UCR, Illinois State Police', url: 'https://isp.illinois.gov/x' }])
    expect(ds.variables[0]).toEqual({ name: 'Year', type: 'integer', definition: 'The year events occurred.' })
    expect(ds.notes).toEqual(['Counties may not add up to the state total.'])
    expect(ds.apps).toEqual([{ documentId: 'appdoc1', title: 'UCR Index Offense Explorer' }])
    expect(ds.articles).toEqual([]) // not supplied → []
  })
  it('surfaces updatedAt read-only from the CM response', () => {
    expect(ds.updatedAt).toBe('2026-06-20T14:32:00.000Z')
  })
  it('writes datafile id, keeps timeperiod, and omits relation fields (relation-write deferred)', () => {
    const w = datasetToWrite(ds)
    expect(w.datafile).toBe(99)
    expect(w.timeperiod).toEqual({ yeartype: 'calendar', yearmin: 1982, yearmax: 2020 })
    expect(w).not.toHaveProperty('apps')
    expect(w).not.toHaveProperty('articles')
    expect(w).not.toHaveProperty('updatedAt')
  })
})
