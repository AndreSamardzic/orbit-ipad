// Minimal iCalendar (RFC 5545) reader for the files the iPad imports: the Moodle
// export, the DHBW lecture plan and anything else saved as .ics. Handles line
// folding, escaped text, all-day / UTC / TZID / floating times and simple
// DAILY/WEEKLY recurrences with EXDATE. Pure — no DOM, testable in node.

export interface IcsEvent {
  uid: string
  title: string
  start: string
  end?: string
  allDay: boolean
  location?: string
  description?: string
  url?: string
  category?: string
}

interface Prop {
  name: string
  params: Record<string, string>
  value: string
}

const MAX_OCCURRENCES = 500
const DAY = 86_400_000

export function unfold(text: string): string[] {
  return text.replace(/\r\n|\r/g, '\n').replace(/\n[ \t]/g, '').split('\n').filter((l) => l.length > 0)
}

export function parseProp(line: string): Prop | null {
  let inQuote = false
  let colon = -1
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') inQuote = !inQuote
    else if (c === ':' && !inQuote) {
      colon = i
      break
    }
  }
  if (colon < 0) return null
  const head = line.slice(0, colon).split(';')
  const params: Record<string, string> = {}
  for (const p of head.slice(1)) {
    const eq = p.indexOf('=')
    if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1).replace(/^"|"$/g, '')
  }
  return { name: head[0].toUpperCase(), params, value: line.slice(colon + 1) }
}

export const unescapeText = (s: string): string => s.replace(/\\([\;,nN])/g, (_, c: string) => (c === 'n' || c === 'N' ? '\n' : c))

const pad = (n: number) => String(n).padStart(2, '0')

/** Offset (ms) of `tz` at the given instant: local wall time minus UTC. */
function tzOffset(ms: number, tz: string): number {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const p = Object.fromEntries(f.formatToParts(new Date(ms)).map((x) => [x.type, x.value]))
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - ms
}

/** Wall-clock time in `tz` → epoch ms. Unknown zones fall back to device-local. */
export function wallToInstant(y: number, mo: number, d: number, h: number, mi: number, s: number, tz?: string): number {
  if (!tz) return new Date(y, mo - 1, d, h, mi, s).getTime()
  const guess = Date.UTC(y, mo - 1, d, h, mi, s)
  try {
    const first = guess - tzOffset(guess, tz)
    return guess - tzOffset(first, tz)
  } catch {
    return new Date(y, mo - 1, d, h, mi, s).getTime()
  }
}

/** Parsed DTSTART/DTEND: all-day `YYYY-MM-DD`, else epoch ms. */
type Stamp = { allDay: true; day: string } | { allDay: false; ms: number }

export function parseStamp(p: Prop): Stamp | null {
  const v = p.value.trim()
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(v)
  if (!m) return null
  const [, y, mo, d, h, mi, s, z] = m
  if (h === undefined || p.params.VALUE === 'DATE') return { allDay: true, day: `${y}-${mo}-${d}` }
  if (z) return { allDay: false, ms: Date.UTC(+y, +mo - 1, +d, +h, +mi, +(s ?? 0)) }
  return { allDay: false, ms: wallToInstant(+y, +mo, +d, +h, +mi, +(s ?? 0), p.params.TZID) }
}

const stampToString = (s: Stamp): string => (s.allDay ? s.day : new Date(s.ms).toISOString())

function dayToDate(day: string): Date {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const dateToDay = (dt: Date): string => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`

const BYDAY: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 }

/** Expands DAILY / WEEKLY rules (INTERVAL, COUNT, UNTIL, BYDAY) in device-local wall time. */
export function expand(start: Stamp, rrule: string, exdates: Set<string>, horizon: number): Stamp[] {
  const r = Object.fromEntries(rrule.split(';').map((kv) => kv.split('=') as [string, string]))
  const freq = r.FREQ
  if (freq !== 'DAILY' && freq !== 'WEEKLY') return [start]
  const interval = Math.max(1, Number(r.INTERVAL) || 1)
  const count = r.COUNT ? Number(r.COUNT) : Infinity
  let until = horizon
  if (r.UNTIL) {
    const u = parseStamp({ name: 'UNTIL', params: {}, value: r.UNTIL })
    if (u) until = Math.min(horizon, u.allDay ? dayToDate(u.day).getTime() + DAY - 1 : u.ms)
  }
  const base = start.allDay ? dayToDate(start.day) : new Date(start.ms)
  const days = freq === 'WEEKLY' && r.BYDAY ? r.BYDAY.split(',').map((x) => BYDAY[x.slice(-2)]).filter((n) => n !== undefined) : [base.getDay()]
  const out: Stamp[] = []
  let generated = 0 // COUNT includes occurrences that EXDATE removes (RFC 5545 §3.8.5.1)
  const weekStart = new Date(base)
  weekStart.setDate(base.getDate() - base.getDay())
  for (let step = 0; generated < count && out.length < MAX_OCCURRENCES; step++) {
    const block = new Date(freq === 'DAILY' ? base : weekStart)
    block.setDate(block.getDate() + step * interval * (freq === 'DAILY' ? 1 : 7))
    if (block.getTime() > until) break
    const candidates = freq === 'DAILY' ? [block] : days.map((wd) => {
      const c = new Date(block)
      c.setDate(block.getDate() + wd)
      return c
    })
    for (const c of candidates.sort((a, b) => a.getTime() - b.getTime())) {
      if (c.getTime() < base.getTime() || c.getTime() > until || generated >= count) continue
      generated++
      const s: Stamp = start.allDay ? { allDay: true, day: dateToDay(c) } : { allDay: false, ms: c.getTime() }
      const key = stampToString(s)
      if (!exdates.has(key)) out.push(s)
    }
  }
  return out
}

export function parseIcs(text: string, now = Date.now()): IcsEvent[] {
  const lines = unfold(text)
  const events: IcsEvent[] = []
  let cur: Prop[] | null = null
  let depth = 0
  for (const line of lines) {
    const upper = line.toUpperCase()
    if (upper === 'BEGIN:VEVENT') {
      cur = []
      depth = 0
      continue
    }
    if (!cur) continue
    if (upper.startsWith('BEGIN:')) depth++
    else if (upper.startsWith('END:') && upper !== 'END:VEVENT') depth--
    else if (upper === 'END:VEVENT') {
      events.push(...toEvents(cur, now))
      cur = null
    } else if (depth === 0) {
      const p = parseProp(line)
      if (p) cur.push(p)
    }
  }
  return events
}

function toEvents(props: Prop[], now: number): IcsEvent[] {
  const get = (n: string) => props.find((p) => p.name === n)
  const dtstart = get('DTSTART')
  const start = dtstart && parseStamp(dtstart)
  if (!start) return []
  if (get('STATUS')?.value.toUpperCase() === 'CANCELLED') return []
  const dtend = get('DTEND')
  const end = dtend ? parseStamp(dtend) : null
  const dur = end ? (end.allDay ? dayToDate(end.day).getTime() : end.ms) - (start.allDay ? dayToDate(start.day).getTime() : start.ms) : 0
  const text = (n: string) => {
    const v = get(n)?.value
    return v ? unescapeText(v).trim() || undefined : undefined
  }
  const base = {
    uid: get('UID')?.value ?? `${text('SUMMARY') ?? ''}-${dtstart.value}`,
    title: text('SUMMARY') ?? '—',
    location: text('LOCATION'),
    description: text('DESCRIPTION'),
    url: get('URL')?.value,
    category: text('CATEGORIES')?.split(',')[0],
  }
  const exdates = new Set<string>()
  for (const p of props.filter((x) => x.name === 'EXDATE')) {
    for (const v of p.value.split(',')) {
      const s = parseStamp({ ...p, value: v })
      if (s) exdates.add(stampToString(s))
    }
  }
  const rrule = get('RRULE')?.value
  const stamps = rrule ? expand(start, rrule, exdates, now + 400 * DAY) : [start]
  return stamps.map((s) => {
    const sMs = s.allDay ? dayToDate(s.day).getTime() : s.ms
    let endStr: string | undefined
    if (dur > 0) endStr = s.allDay ? dateToDay(new Date(sMs + dur)) : new Date(sMs + dur).toISOString()
    return { ...base, start: stampToString(s), end: endStr, allDay: s.allDay }
  })
}
