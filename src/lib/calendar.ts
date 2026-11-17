import { parseIcs } from './ics.ts'
import { getData, uid, update } from './store.ts'
import type { CalEvent, SourceKind } from './types.ts'

/** Moodle exports carry `moodle` in UIDs/URLs; anything with mostly zero-length events looks like deadlines. */
export function guessKind(name: string, text: string): SourceKind {
  const n = name.toLowerCase()
  if (n.includes('moodle') || /moodle\./i.test(text)) return 'moodle'
  if (/vorlesung|rapla|lecture|stundenplan|dhbw/i.test(n)) return 'lectures'
  return 'other'
}

/** Imports one .ics file. Same source name again = replace that source's events. */
export function importIcs(text: string, fileName: string, kindOverride?: SourceKind): { name: string; count: number } {
  const parsed = parseIcs(text)
  if (parsed.length === 0) throw new Error('empty')
  const name = fileName.replace(/\.ics$/i, '').trim() || 'Kalender'
  const existing = getData().sources.find((s) => s.name === name)
  const id = existing?.id ?? uid()
  const kind = kindOverride ?? existing?.kind ?? guessKind(fileName, text)
  const seen = new Set<string>()
  const events: CalEvent[] = []
  for (const e of parsed) {
    const key = `${id}:${e.uid}:${e.start}`
    if (seen.has(key)) continue
    seen.add(key)
    events.push({ id: key, sourceId: id, title: e.title, start: e.start, end: e.end, allDay: e.allDay, location: e.location, description: e.description, url: e.url, category: e.category })
  }
  update('events', (prev) => [...prev.filter((e) => e.sourceId !== id), ...events])
  update('sources', (prev) => [...prev.filter((s) => s.id !== id), { id, name, kind, importedAt: Date.now(), count: events.length }])
  return { name, count: events.length }
}

export function removeSource(id: string) {
  update('events', (prev) => prev.filter((e) => e.sourceId !== id))
  update('sources', (prev) => prev.filter((s) => s.id !== id))
}

export function setSourceKind(id: string, kind: SourceKind) {
  update('sources', (prev) => prev.map((s) => (s.id === id ? { ...s, kind } : s)))
}
