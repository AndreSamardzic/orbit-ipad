// The Start page's model, ported from desktop ORBIT (web/src/lib/start.ts) onto the iPad's
// local data: day mode, today's agenda (events, lectures, Moodle deadlines), what is next,
// the next days, the top three, birthdays and the planets of the orbit view.
// Pure — no React, no DOM, no fetches — so it runs under `node --test`.
import { DAY, addDays, dayKey, endMs, eventsOn, parseDay, startMs } from './dates.ts'
import type { CalEvent, CalSource, DayMode, Lang, Person, SourceKind, Task } from './types.ts'

export type StartMode = DayMode

const MIN = 60_000
const HOUR = 60 * MIN

/** Morning 5–11, day until 17:30, evening after that (the night counts as evening). */
export function modeOf(ts: number): StartMode {
  const d = new Date(ts)
  const m = d.getHours() * 60 + d.getMinutes()
  if (m >= 5 * 60 && m < 11 * 60) return 'morning'
  if (m >= 11 * 60 && m < 17 * 60 + 30) return 'day'
  return 'evening'
}

/** 23–5: the greeting asks "still up?" and the Smiski sleeps. */
export function isNight(ts: number): boolean {
  const h = new Date(ts).getHours()
  return h >= 23 || h < 5
}

/** ISO 8601 week number: weeks start on Monday, week 1 holds the year's first Thursday. */
export function isoWeek(ts: number): number {
  const d = new Date(ts)
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const jan4 = new Date(d.getFullYear(), 0, 4, 12)
  const thu1 = new Date(jan4)
  thu1.setDate(jan4.getDate() + 3 - ((jan4.getDay() + 6) % 7))
  return 1 + Math.round((d.getTime() - thu1.getTime()) / (7 * DAY))
}

// ------------------------------------------------------------------ agenda

/** `event` = anything from an "other" calendar (the desktop's meetings). */
export type AgendaKind = 'event' | 'lecture' | 'deadline'

export interface AgendaItem {
  id: string
  kind: AgendaKind
  title: string
  /** Deadlines: the due time (all-day ones are due 23:59), start = end. */
  start: number
  end: number
  allDay: boolean
  location: string | null
  url: string | null
  category: string | null
  event: CalEvent
}

export type Kinds = ReadonlyMap<string, SourceKind>

export const kindsOf = (sources: readonly CalSource[]): Kinds => new Map(sources.map((s) => [s.id, s.kind]))

/** All-day deadlines are due at the end of their day. */
export function dueAt(e: Pick<CalEvent, 'start' | 'allDay'>): number {
  return e.allDay ? parseDay(e.start).getTime() + DAY - MIN : startMs(e)
}

export function toItem(e: CalEvent, kinds: Kinds): AgendaItem {
  const k = kinds.get(e.sourceId)
  const kind: AgendaKind = k === 'moodle' ? 'deadline' : k === 'lectures' ? 'lecture' : 'event'
  const base = { id: e.id, kind, title: e.title, allDay: e.allDay, location: e.location ?? null, url: e.url ?? null, category: e.category ?? null, event: e }
  if (kind === 'deadline') {
    const due = dueAt(e)
    return { ...base, start: due, end: due }
  }
  return { ...base, start: startMs(e), end: Math.max(startMs(e), endMs(e)) }
}

const byStart = (a: AgendaItem, b: AgendaItem) => Number(b.allDay) - Number(a.allDay) || a.start - b.start || a.title.localeCompare(b.title)

/** Everything touching the local day `day` (default: the day `now` falls on). All-day first, then by start. */
export function agendaOf(events: readonly CalEvent[], kinds: Kinds, now: number, day = dayKey(now)): AgendaItem[] {
  return eventsOn(events, day)
    .map((e) => toItem(e, kinds))
    .sort(byStart)
}

/** Has a clock time on the band / face. All-day deadlines count as timed (due 23:59) only in the orbit. */
export const isTimed = (a: AgendaItem): boolean => !a.allDay

export const isPast = (a: AgendaItem, now: number): boolean => (a.kind === 'deadline' ? a.start < now : a.end <= now)

export interface NextUp {
  /** Running right now (timed, not a deadline). */
  current: AgendaItem | null
  /** The next timed item that has not started (deadlines included). */
  next: AgendaItem | null
  /** The one after `next`. */
  after: AgendaItem | null
}

export function nextUp(agenda: readonly AgendaItem[], now: number): NextUp {
  const timed = agenda.filter(isTimed)
  const current = timed.find((a) => a.kind !== 'deadline' && a.start <= now && now < a.end) ?? null
  const upcoming = timed.filter((a) => a.start > now)
  return { current, next: upcoming[0] ?? null, after: upcoming[1] ?? null }
}

/** The first timed appointment or lecture after `now` on a later day (within `days`), for "nothing more today". */
export function laterAfterToday(events: readonly CalEvent[], kinds: Kinds, now: number, days = 14): AgendaItem | null {
  const tomorrow = parseDay(addDays(dayKey(now), 1)).getTime()
  const limit = tomorrow + days * DAY
  let best: AgendaItem | null = null
  for (const e of events) {
    if (e.allDay) continue
    const it = toItem(e, kinds)
    if (it.kind === 'deadline' || it.start < tomorrow || it.start >= limit) continue
    if (!best || it.start < best.start) best = it
  }
  return best
}

/** The first timed appointment or lecture on `day`. */
export function firstOn(events: readonly CalEvent[], kinds: Kinds, day: string): AgendaItem | null {
  return agendaOf(events, kinds, parseDay(day).getTime(), day).find((a) => isTimed(a) && a.kind !== 'deadline' && dayKey(a.start) === day) ?? null
}

/** Open Moodle deadlines from `now` on, soonest first. */
export function upcomingDeadlines(events: readonly CalEvent[], kinds: Kinds, now: number): AgendaItem[] {
  return events
    .filter((e) => kinds.get(e.sourceId) === 'moodle')
    .map((e) => toItem(e, kinds))
    .filter((a) => a.start >= now)
    .sort((a, b) => a.start - b.start || a.title.localeCompare(b.title))
}

/** Whole local days from `today` to the day of `ts` (negative = before). */
export function daysUntil(ts: number, today: string): number {
  return Math.round((parseDay(dayKey(ts)).getTime() - parseDay(today).getTime()) / DAY)
}

// ------------------------------------------------------------------ days ahead

export interface AheadDay {
  /** YYYY-MM-DD, local. */
  day: string
  events: number
  lectures: number
  deadlines: number
  /** First title of the day by start (touch has no tooltips). */
  first: string | null
}

/** The `n` days from `fromDay` on: timed appointments, lectures and deadlines per day (all-day appointments left out). */
export function daysAhead(events: readonly CalEvent[], kinds: Kinds, fromDay: string, n = 5): AheadDay[] {
  return Array.from({ length: n }, (_, i) => {
    const day = addDays(fromDay, i)
    const items = agendaOf(events, kinds, parseDay(day).getTime(), day).filter((a) => dayKey(a.start) === day && (a.kind === 'deadline' || !a.allDay))
    items.sort((a, b) => a.start - b.start)
    return {
      day,
      events: items.filter((a) => a.kind === 'event').length,
      lectures: items.filter((a) => a.kind === 'lecture').length,
      deadlines: items.filter((a) => a.kind === 'deadline').length,
      first: items[0]?.title ?? null,
    }
  })
}

/** Local midnight after this week's Sunday (weeks start on Monday). */
export function weekEnd(now: number): number {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 7 - ((d.getDay() + 6) % 7))
  return d.getTime()
}

/** What is still ahead this week (from `now` to Sunday night): timed appointments, lectures, deadlines. */
export function restOfWeek(events: readonly CalEvent[], kinds: Kinds, now: number): { events: number; lectures: number; deadlines: number } {
  const end = weekEnd(now)
  const out = { events: 0, lectures: 0, deadlines: 0 }
  for (const e of events) {
    const it = toItem(e, kinds)
    if (it.start < now || it.start >= end) continue
    if (it.kind === 'deadline') out.deadlines++
    else if (it.allDay) continue
    else if (it.kind === 'lecture') out.lectures++
    else out.events++
  }
  return out
}

// ------------------------------------------------------------------ tasks & top three

export const isOverdue = (t: Task, today: string): boolean => !t.done && !!t.due && t.due < today

/** 3 = overdue, 2 = due today or high priority, 1 = the rest. */
export function taskSeverity(t: Task, today: string): 1 | 2 | 3 {
  if (isOverdue(t, today)) return 3
  if ((t.due && t.due <= today) || t.prio === 1) return 2
  return 1
}

export function doneOn(tasks: readonly Task[], day: string): Task[] {
  return tasks.filter((t) => t.done && t.doneAt && dayKey(t.doneAt) === day).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0))
}

export interface TopItem {
  id: string
  kind: 'deadline' | 'task'
  title: string
  /** Second line: the deadline's course. */
  why: string | null
  severity: 1 | 2 | 3
  /** Epoch ms (tasks: local midnight of the due day). */
  due: number | null
  task?: Task
  deadline?: AgendaItem
}

/** Deadlines closer than this count as "needs you" for the top three. */
export const DEADLINE_WINDOW_H = 72

/**
 * The three things that matter most — the iPad's stand-in for the desktop's needs-you →
 * focus → waited-on: Moodle deadlines in the next three days (within 24 h = critical) and
 * open tasks (overdue = critical, due today / high priority = important), by severity,
 * then due, then priority.
 */
export function topThree(tasks: readonly Task[], deadlines: readonly AgendaItem[], now: number, n = 3): TopItem[] {
  const today = dayKey(now)
  const out: TopItem[] = []
  for (const d of deadlines) {
    if (d.start < now || d.start - now > DEADLINE_WINDOW_H * HOUR) continue
    out.push({ id: `dl:${d.id}`, kind: 'deadline', title: d.title, why: d.category, severity: d.start - now <= 24 * HOUR ? 3 : 2, due: d.start, deadline: d })
  }
  for (const t of tasks) {
    if (t.done) continue
    out.push({ id: `task:${t.id}`, kind: 'task', title: t.title, why: null, severity: taskSeverity(t, today), due: t.due ? parseDay(t.due).getTime() : null, task: t })
  }
  const prio = (x: TopItem) => x.task?.prio ?? 0
  out.sort((a, b) => b.severity - a.severity || (a.due ?? Infinity) - (b.due ?? Infinity) || prio(a) - prio(b) || (a.task?.createdAt ?? 0) - (b.task?.createdAt ?? 0))
  return out.slice(0, n)
}

// ------------------------------------------------------------------ birthdays

export interface Birthday {
  person: Person
  /** Next occurrence, YYYY-MM-DD (today counts). */
  day: string
  inDays: number
  /** Age on that day, when the year is known. */
  age: number | null
}

const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0

/** Next birthday from `today` for everyone with a valid `MM-DD` / `YYYY-MM-DD`; 29 Feb falls on 28 Feb in other years. */
export function birthdays(people: readonly Person[], today: string, within = 366): Birthday[] {
  const y = Number(today.slice(0, 4))
  const out: Birthday[] = []
  for (const p of people) {
    const m = /^(?:(\d{4})-)?(\d{2})-(\d{2})$/.exec(p.birthday?.trim() ?? '')
    if (!m) continue
    const mo = Number(m[2])
    const da = Number(m[3])
    if (mo < 1 || mo > 12 || da < 1 || da > 31) continue
    const on = (year: number) => `${year}-${m[2]}-${mo === 2 && da === 29 && !isLeap(year) ? '28' : m[3]}`
    let year = y
    if (on(year) < today) year++
    const day = on(year)
    const inDays = Math.round((parseDay(day).getTime() - parseDay(today).getTime()) / DAY)
    if (inDays > within) continue
    out.push({ person: p, day, inDays, age: m[1] ? year - Number(m[1]) : null })
  }
  return out.sort((a, b) => a.inDays - b.inDays || a.person.name.localeCompare(b.person.name))
}

// ------------------------------------------------------------------ orbit

export type PlanetKind = AgendaKind | 'task' | 'person'

export interface Planet {
  id: string
  kind: PlanetKind
  label: string
  /** 0 = now / urgent (inner), 1 = today, 2 = later or someday (outer). */
  ring: 0 | 1 | 2
  /** Degrees clockwise from 12 o'clock. Timed planets sit at their clock time (12-hour face). */
  angle: number
  /** Has a clock position (does not drift). */
  timed: boolean
  /** Already over today. */
  past: boolean
  severity: 1 | 2 | 3
  /** Person planets show initials. */
  initials?: string
  ref: { agenda?: AgendaItem; task?: Task; birthday?: Birthday }
}

/** Angle of a time of day on a 12-hour clock face. */
export function clockAngle(ts: number): number {
  const d = new Date(ts)
  return (((d.getHours() % 12) * 60 + d.getMinutes()) / 720) * 360
}

/** Stable pseudo-random 0..1 from a string (FNV-1a). */
export function hash01(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0) / 0xffffffff
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

export const MAX_PLANETS = 18
/** Deadlines and birthdays this many days ahead still circle you (outer rings). */
export const ORBIT_DEADLINE_DAYS = 7
export const ORBIT_BIRTHDAY_DAYS = 14

/**
 * The orbit: today's agenda at its clock time — inner ring when running or within two
 * hours, middle ring later today, past ones faded on the middle ring (all-day appointments
 * stay off the face). Untimed planets by urgency: open tasks (overdue inner, due today /
 * high priority middle, rest outer), deadlines of the next days (tomorrow middle, later
 * outer) and birthdays (today inner, the next two weeks outer, as initials).
 * Untimed planets share their ring evenly from a stable offset; when trimming to `max`,
 * the most urgent stay. Returns `[planets, hiddenCount]`.
 */
export function planetsOf(
  agenda: readonly AgendaItem[],
  extra: { tasks: readonly Task[]; deadlines: readonly AgendaItem[]; birthdays: readonly Birthday[] },
  now: number,
  max = MAX_PLANETS,
): [Planet[], number] {
  const today = dayKey(now)
  const timed: Planet[] = []
  const todayIds = new Set<string>()
  for (const a of agenda) {
    todayIds.add(a.id)
    if (a.allDay && a.kind !== 'deadline') continue
    const past = isPast(a, now)
    const running = a.start <= now && now < a.end
    const soon = a.start > now && a.start - now <= 2 * HOUR
    timed.push({ id: a.id, kind: a.kind, label: a.title, ring: !past && (running || soon) ? 0 : 1, angle: clockAngle(a.start), timed: true, past, severity: a.kind === 'deadline' ? 3 : 2, ref: { agenda: a } })
  }
  const untimed: Planet[] = []
  for (const t of extra.tasks) {
    if (t.done) continue
    const severity = taskSeverity(t, today)
    untimed.push({ id: `t:${t.id}`, kind: 'task', label: t.title, ring: severity === 3 ? 0 : severity === 2 ? 1 : 2, angle: 0, timed: false, past: false, severity, ref: { task: t } })
  }
  for (const d of extra.deadlines) {
    if (todayIds.has(d.id)) continue
    const n = daysUntil(d.start, today)
    if (n < 1 || n > ORBIT_DEADLINE_DAYS) continue
    untimed.push({ id: `d:${d.id}`, kind: 'deadline', label: d.title, ring: n <= 1 ? 1 : 2, angle: 0, timed: false, past: false, severity: n <= 1 ? 2 : 1, ref: { agenda: d } })
  }
  for (const b of extra.birthdays) {
    if (b.inDays > ORBIT_BIRTHDAY_DAYS) continue
    untimed.push({ id: `b:${b.person.id}`, kind: 'person', label: b.person.name, ring: b.inDays === 0 ? 0 : 2, angle: 0, timed: false, past: false, severity: 1, initials: initialsOf(b.person.name), ref: { birthday: b } })
  }
  untimed.sort((a, b) => a.ring - b.ring || b.severity - a.severity)
  const keptTimed = timed.slice(0, max)
  const room = Math.max(0, max - keptTimed.length)
  const kept = untimed.slice(0, room)
  for (const ring of [0, 1, 2] as const) {
    const on = kept.filter((p) => p.ring === ring)
    if (!on.length) continue
    const offset = spreadOffset(
      on.length,
      keptTimed.filter((p) => p.ring === ring).map((p) => p.angle),
      hash01(on.map((p) => p.id).join('|')) * 360,
    )
    on.forEach((p, i) => {
      p.angle = (offset + (i * 360) / on.length) % 360
    })
  }
  return [[...keptTimed, ...kept], timed.length - keptTimed.length + untimed.length - kept.length]
}

const angDist = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

/**
 * Offset for `n` evenly spread planets that keeps them clear of the fixed (timed) angles
 * on the same ring: the candidate (3° steps from the stable `seed`) with the largest
 * smallest gap wins; ties keep the one closest to the seed.
 */
export function spreadOffset(n: number, fixed: readonly number[], seed: number): number {
  if (!fixed.length || n <= 0) return seed % 360
  let best = seed % 360
  let bestGap = -1
  for (let j = 0; j < 120; j++) {
    const o = (seed + j * 3) % 360
    let gap = Infinity
    for (let i = 0; i < n; i++) for (const f of fixed) gap = Math.min(gap, angDist(o + (i * 360) / n, f))
    if (gap > bestGap + 1e-9) {
      best = o
      bestGap = gap
    }
  }
  return best
}

// ------------------------------------------------------------------ day band

/** Lanes so overlapping blocks sit below each other (greedy, at most 3). */
export function lanes(items: readonly AgendaItem[]): Map<string, number> {
  const ends: number[] = []
  const out = new Map<string, number>()
  for (const a of [...items].sort((x, y) => x.start - y.start)) {
    let lane = ends.findIndex((e) => e <= a.start)
    if (lane === -1) lane = Math.min(ends.length, 2)
    ends[lane] = Math.max(ends[lane] ?? 0, a.end)
    out.set(a.id, lane)
  }
  return out
}

/** The band's hour range: 08–19, wider when today's items need it. */
export function bandRange(timed: readonly AgendaItem[], now: number): { from: number; to: number } {
  const d0 = new Date(now)
  d0.setHours(0, 0, 0, 0)
  const base = d0.getTime()
  const hourOf = (ts: number) => (ts - base) / HOUR
  const from = Math.max(0, Math.min(8, ...timed.map((a) => Math.floor(hourOf(a.start)))))
  const to = Math.min(24, Math.max(19, ...timed.map((a) => Math.ceil(hourOf(a.end)))))
  return { from, to }
}

// ------------------------------------------------------------------ strings

/** `{h, m}` of a positive duration, at least one minute. */
export function hm(ms: number): { h: number; m: number } {
  const total = Math.max(1, Math.round(ms / MIN))
  return { h: Math.floor(total / 60), m: total % 60 }
}

const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`))
const plural = (n: number, one: string, many: string) => fill(n === 1 ? one : many, { n })

const de = {
  hello: { morning: 'Guten Morgen', day: 'Hallo', evening: 'Guten Abend', night: 'Noch wach' },
  week: 'KW {n}',
  modeLabel: 'Tagesmodus',
  mode: { morning: 'Morgen', day: 'Tag', evening: 'Abend' },
  auto: 'auto',
  autoHint: 'Folgt der Uhr',
  heldHint: 'Gehalten – tipp auf den Modus mit „auto“, um wieder der Uhr zu folgen',
  kind: { event: 'Termin', lecture: 'Vorlesung', deadline: 'Frist', task: 'Aufgabe', person: 'Geburtstag' },
  morningTitle: 'Dein Tag',
  brief: 'Brief mich',
  morningFree: 'Heute ist nichts eingetragen – freie Bahn.',
  first: 'Als Erstes',
  startWith: 'Fang an mit',
  events: (n: number) => plural(n, '1 Termin', '{n} Termine'),
  lectures: (n: number) => plural(n, '1 Vorlesung', '{n} Vorlesungen'),
  deadlines: (n: number) => plural(n, '1 Frist', '{n} Fristen'),
  dueTasks: (n: number) => plural(n, '1 Aufgabe fällig', '{n} Aufgaben fällig'),
  dayTitle: 'Als Nächstes',
  now: 'Jetzt',
  in: 'in {d}',
  left: 'noch {d}',
  dueAtTime: 'fällig um {time}',
  nothingMore: 'Für heute steht nichts mehr an.',
  later: 'Später',
  after: 'Danach',
  focus: 'Fokus jetzt',
  earlier: 'Heute bisher',
  prep: 'Vorbereiten',
  openLink: 'Öffnen',
  cd: (h: number, m: number) => (h === 0 ? `${m} Min.` : m === 0 ? `${h} Std.` : `${h} Std. ${m} Min.`),
  eveningTitle: 'Heute geschafft',
  wrap: 'Feierabend mit Claude',
  doneTasks: (n: number) => plural(n, '1 Aufgabe erledigt', '{n} Aufgaben erledigt'),
  behind: (n: number) => plural(n, '1 Termin hinter dir', '{n} Termine hinter dir'),
  eveningNothing: 'Heute nichts abgehakt – auch okay.',
  tomorrow: 'Morgen zuerst',
  tomorrowFree: 'Morgen ist noch nichts eingetragen.',
  tomorrowDeadlines: (n: number) => plural(n, '1 Frist morgen', '{n} Fristen morgen'),
  ahead: 'Nächste Tage',
  free: 'frei',
  band: 'Tagesband',
  bandAllDay: 'Ganztägig: {list}',
  bandEmpty: 'Heute keine Termine mit Uhrzeit.',
  toCalendar: 'Kalender',
  top: 'Top 3 heute',
  topMore: 'Alle Aufgaben',
  topEmpty: 'Nichts Dringendes. Schön.',
  tiles: 'Auf einen Blick',
  tileDeadline: 'Nächste Frist',
  noDeadline: 'keine offen',
  tileTasks: 'Offene Aufgaben',
  overdue: (n: number) => `${n} überfällig`,
  dueToday: (n: number) => `${n} heute fällig`,
  allClear: 'nichts überfällig',
  tileBirthday: 'Geburtstag',
  noBirthday: 'keiner in Sicht',
  turns: (name: string, age: number) => `${name} wird ${age}`,
  tilePinned: 'Angeheftet',
  noPinned: 'nichts angeheftet',
  tileWeek: 'Rest der Woche',
  weekSub: (l: number, d: number) => [l === 1 ? '1 Vorlesung' : `${l} Vorlesungen`, d === 1 ? '1 Frist' : `${d} Fristen`].join(' · '),
  tileChats: 'Fragen an Claude',
  noChats: 'noch kein Chat',
  orbitLabel: 'Dein Orbit',
  orbitCaption: 'Je näher, desto dringender · Termine stehen auf ihrer Uhrzeit',
  orbitEmpty: 'Gerade kreist nichts um dich.',
  orbitMore: (n: number) => `+${n} weitere`,
  orbitHint: 'Tipp auf einen Planeten',
  open: 'Öffnen',
  today: 'heute',
  tomorrowRel: 'morgen',
  inDays: (n: number) => (n === 1 ? 'morgen' : `in ${n} Tagen`),
  daysAgo: (n: number) => (n === 1 ? 'gestern' : `vor ${n} Tagen`),
  ask: 'Frag Claude …',
  send: 'Senden',
  promptMorning: 'Brief mich für heute: Was steht an, worauf sollte ich achten und womit fange ich am besten an?',
  promptEvening: 'Hilf mir beim Tagesabschluss: Was habe ich heute geschafft, was ist noch offen und was steht morgen zuerst an?',
  promptPrep: 'Hilf mir, mich auf „{title}“ um {time} vorzubereiten.',
}

export type StartStrings = typeof de

const en: StartStrings = {
  hello: { morning: 'Good morning', day: 'Hello', evening: 'Good evening', night: 'Still up' },
  week: 'Week {n}',
  modeLabel: 'Day mode',
  mode: { morning: 'Morning', day: 'Day', evening: 'Evening' },
  auto: 'auto',
  autoHint: 'Follows the clock',
  heldHint: 'Held — tap the mode marked "auto" to follow the clock again',
  kind: { event: 'Event', lecture: 'Lecture', deadline: 'Deadline', task: 'Task', person: 'Birthday' },
  morningTitle: 'Your day',
  brief: 'Brief me',
  morningFree: 'Nothing on today — clear runway.',
  first: 'First up',
  startWith: 'Start with',
  events: (n) => plural(n, '1 event', '{n} events'),
  lectures: (n) => plural(n, '1 lecture', '{n} lectures'),
  deadlines: (n) => plural(n, '1 deadline', '{n} deadlines'),
  dueTasks: (n) => plural(n, '1 task due', '{n} tasks due'),
  dayTitle: 'Up next',
  now: 'Now',
  in: 'in {d}',
  left: '{d} left',
  dueAtTime: 'due at {time}',
  nothingMore: 'Nothing else today.',
  later: 'Later',
  after: 'After that',
  focus: 'Focus now',
  earlier: 'Earlier today',
  prep: 'Prepare',
  openLink: 'Open',
  cd: (h, m) => (h === 0 ? `${m} min` : m === 0 ? `${h} h` : `${h} h ${m} min`),
  eveningTitle: 'Done today',
  wrap: 'Wrap up with Claude',
  doneTasks: (n) => plural(n, '1 task done', '{n} tasks done'),
  behind: (n) => plural(n, '1 event behind you', '{n} events behind you'),
  eveningNothing: 'Nothing ticked off today — that is fine too.',
  tomorrow: 'First tomorrow',
  tomorrowFree: 'Nothing on tomorrow yet.',
  tomorrowDeadlines: (n) => plural(n, '1 deadline tomorrow', '{n} deadlines tomorrow'),
  ahead: 'Next days',
  free: 'free',
  band: 'Day band',
  bandAllDay: 'All day: {list}',
  bandEmpty: 'No timed events today.',
  toCalendar: 'Calendar',
  top: 'Top 3 today',
  topMore: 'All tasks',
  topEmpty: 'Nothing urgent. Nice.',
  tiles: 'At a glance',
  tileDeadline: 'Next deadline',
  noDeadline: 'none open',
  tileTasks: 'Open tasks',
  overdue: (n) => `${n} overdue`,
  dueToday: (n) => `${n} due today`,
  allClear: 'nothing overdue',
  tileBirthday: 'Birthday',
  noBirthday: 'none coming up',
  turns: (name, age) => `${name} turns ${age}`,
  tilePinned: 'Pinned',
  noPinned: 'nothing pinned',
  tileWeek: 'Rest of the week',
  weekSub: (l, d) => [l === 1 ? '1 lecture' : `${l} lectures`, d === 1 ? '1 deadline' : `${d} deadlines`].join(' · '),
  tileChats: 'Asked Claude',
  noChats: 'no chats yet',
  orbitLabel: 'Your orbit',
  orbitCaption: 'The closer, the more urgent · events sit at their clock time',
  orbitEmpty: 'Nothing is circling you right now.',
  orbitMore: (n) => `+${n} more`,
  orbitHint: 'Tap a planet',
  open: 'Open',
  today: 'today',
  tomorrowRel: 'tomorrow',
  inDays: (n) => (n === 1 ? 'tomorrow' : `in ${n} days`),
  daysAgo: (n) => (n === 1 ? 'yesterday' : `${n} days ago`),
  ask: 'Ask Claude …',
  send: 'Send',
  promptMorning: 'Brief me for today: what is on, what should I watch out for, and what should I start with?',
  promptEvening: 'Help me wrap up the day: what did I get done today, what is still open, and what comes first tomorrow?',
  promptPrep: 'Help me prepare for "{title}" at {time}.',
}

export const startStrings = (lang: Lang): StartStrings => (lang === 'de' ? de : en)
export { fill }

/** "heute" / "morgen" / "in 3 Tagen" / "vor 2 Tagen". */
export function relDays(n: number, L: StartStrings): string {
  if (n === 0) return L.today
  return n > 0 ? L.inDays(n) : L.daysAgo(-n)
}
