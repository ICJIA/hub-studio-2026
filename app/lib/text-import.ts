// Optional "paste delimited text → structured rows" import convenience (design spec §10).
// Semantics ported from v1 src/utils/parseItem.js and prepareItem.js. Storage is always JSON.
import type { Author, Source, Variable, TimePeriod } from '~/types/content'

const rows = (s: string) => s.split(/[\r\n]+/).map((r) => r.trim()).filter(Boolean)
const cols = (s: string, sep = '|') => s.split(sep).map((c) => c.trim())

export function parseList(str: string, sep = ','): string[] {
  return str.split(sep).map((s) => s.trim()).filter(Boolean)
}

export function parseAuthors(authorString: string): Author[] {
  return rows(authorString).map((row) => {
    const [title, description] = cols(row)
    return { title, description }
  })
}

export function parseSources(sourceString: string): Source[] {
  return rows(sourceString).map((row) => {
    const [title, url] = cols(row)
    return { title, url }
  })
}

export function parseVariables(variableString: string): Variable[] {
  return rows(variableString).map((row) => {
    const [name, type, definition, values] = cols(row)
    return { name, type, definition, values }
  })
}

export function parseNotes(noteString: string): string[] {
  return rows(noteString)
}

export function parseTimeperiod(yeartype: string, range: string): TimePeriod {
  const [yearmin, yearmax] = range.split('-').map((s) => s.trim())
  return { yeartype, yearmin, yearmax }
}

export function formatAuthors(authors: Author[]): string {
  return authors.map((a) => `${a.title} | ${a.description ?? ''}`.trim()).join('\n')
}

export function formatSources(sources: Source[]): string {
  return sources.map((s) => `${s.title} | ${s.url}`).join('\n')
}

export function formatVariables(variables: Variable[]): string {
  return variables.map((v) => `${v.name} | ${v.type} | ${v.definition} | ${v.values ?? ''}`.trim()).join('\n')
}

export function formatNotes(notes: string[]): string {
  return notes.join('\n')
}

export function formatTimeperiodRange(tp: TimePeriod): string {
  return `${tp.yearmin}-${tp.yearmax}`
}
