import { describe, it, expect } from 'vitest'
import {
  parseList, parseAuthors, parseSources, parseVariables, parseNotes, parseTimeperiod,
  formatAuthors, formatSources, formatVariables, formatNotes, formatTimeperiodRange,
} from '~/lib/text-import'

describe('parse helpers (text → structured)', () => {
  it('parses comma lists, trimming and dropping blanks', () => {
    expect(parseList('a, b ,, c')).toEqual(['a', 'b', 'c'])
  })
  it('parses authors as title | description rows', () => {
    expect(parseAuthors('Jane Doe | Researcher\nJohn Roe | Analyst')).toEqual([
      { title: 'Jane Doe', description: 'Researcher' },
      { title: 'John Roe', description: 'Analyst' },
    ])
  })
  it('parses sources and variables on the pipe', () => {
    expect(parseSources('UCR | https://x')).toEqual([{ title: 'UCR', url: 'https://x' }])
    expect(parseVariables('Year | integer | The year | 1982-2020')).toEqual([
      { name: 'Year', type: 'integer', definition: 'The year', values: '1982-2020' },
    ])
  })
  it('parses notes lines and a timeperiod range', () => {
    expect(parseNotes('one\n\ntwo')).toEqual(['one', 'two'])
    expect(parseTimeperiod('calendar', '1982-2020')).toEqual({ yeartype: 'calendar', yearmin: '1982', yearmax: '2020' })
  })
})

describe('format helpers (structured → text, for editing)', () => {
  it('round-trips authors and sources', () => {
    expect(formatAuthors([{ title: 'Jane', description: 'R' }])).toBe('Jane | R')
    expect(formatSources([{ title: 'UCR', url: 'https://x' }])).toBe('UCR | https://x')
  })
  it('formats variables, notes, and a timeperiod range', () => {
    expect(formatVariables([{ name: 'Year', type: 'integer', definition: 'y', values: '1-2' }])).toBe('Year | integer | y | 1-2')
    expect(formatNotes(['a', 'b'])).toBe('a\nb')
    expect(formatTimeperiodRange({ yeartype: 'calendar', yearmin: 1982, yearmax: 2020 })).toBe('1982-2020')
  })
})
