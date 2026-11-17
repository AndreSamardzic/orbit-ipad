// Puls: "what matters right now", derived from the data on this iPad. Desktop
// ORBIT scores vault topics from scanned signals; here every candidate (Moodle
// deadline, task, lecture/appointment, note, birthday, person, chat) is scored
// directly. Pure — no DOM, no React, no clock: pass `now`. test/pulse.test.ts.
//
// Heat (0–100), in the spirit of the desktop's weighted mean:
//   heat = round(100 · (0.50·u + 0.25·i + 0.10·r + 0.15·b)),  resolved → 0
//   u  urgency     due/overdue: overdue → 1, else 0.5^(calendar days until / 1.5)
//                  (today 1, tomorrow 0.63, in 2 days 0.40, in a week 0.04);
//                  appointments: running → 1, else 0.5^(hours until / 12)
//   i  importance  Moodle deadline 1 · task prio 1/2/3 → 1/0.5/0.1 · birthday 0.6 ·
//                  appointment 0.5 · lecture 0.4 · note 0.3 (pinned 0.6) ·
//                  chat 0.3 · person 0.3
//   r  recency     0.5^(days since created/edited / 3)   (tasks, notes, chats)
//   b  blocked     1 when overdue
// An item "burns" at heat ≥ 70 (CRITICAL): overdue tasks of priority 1–2,
// deadlines and priority-1 tasks due today.
//
// Status, mapped honestly onto the desktop's six:
//   blocked   task overdue
//   heating   due within 2 days (deadline, task, birthday); appointment running
//             or starting within 2 h
//   new       task created ≤ 2 days ago, note edited ≤ 2 days ago, chat ≤ 2 days
//   stable    everything else that is coming up or open
//   cooling   pinned note untouched > 21 d, task without date open > 30 d,
//             person not edited for > 60 d
//   resolved  task done today, Moodle deadline passed ≤ 3 days ago
import { DAY, dayKey, endMs, parseDay, startMs } from './dates.ts'
import type { CalEvent, Chat, Data, Note, Person, Task } from './types.ts'

export type PulseStatus = 'new' | 'heating' | 'blocked' | 'stable' | 'cooling' | 'resolved'
/** Display order (most pressing first). */
export const PULSE_STATUSES: PulseStatus[] = ['blocked', 'heating', 'new', 'stable', 'cooling', 'resolved']

export type PulseKind = 'deadline' | 'task' | 'lecture' | 'event' | 'note' | 'birthday' | 'person' | 'chat'

export type PulseReason =
  | { code: 'overdue'; days: number }
  /** days: calendar days until (0 = today); at: exact time for timed items. */
  | { code: 'due'; days: number; at?: number }
  | { code: 'passed'; at: number }
  | { code: 'appointment'; at: number; end: number; running: boolean; location?: string }
  | { code: 'edited'; at: number }
  | { code: 'birthday'; days: number; age?: number }
  | { code: 'untouched'; days: number }
  | { code: 'chat'; at: number; count: number }
  /** Open task without a date, created `days` ago. */
  | { code: 'open'; days: number }
  | { code: 'done'; at: number }

export interface HeatFactors {
  u: number
  i: number
  r: number
  b: number
}

export interface PulseItem {
  /** `${kind}:${refId}` */
  id: string
  kind: PulseKind
  /** id of the task / note / person / chat / event. */
  refId: string
  title: string
  /** Course, category or location. */
  detail?: string
  status: PulseStatus
  heat: number
  factors: HeatFactors
  reason: PulseReason
  /** Where a tap goes. */
  route: 'calendar' | 'tasks' | 'notes' | 'people' | 'ask'
  param?: string
  /** Moment the item is about (due / start / edit), for ordering ties. */
  at: number
}

export interface PulseResult {
  /** Hottest first. */
  items: PulseItem[]
  /** Not resolved and heat ≥ CRITICAL. */
  critical: PulseItem[]
  counts: Record<PulseStatus, number>
}

export type PulseInput = Pick<Data, 'tasks' | 'notes' | 'people' | 'events' | 'sources' | 'chats'>

export const WEIGHTS = { urgency: 0.5, importance: 0.25, recency: 0.1, blocked: 0.15 } as const
export const CRITICAL = 70

const PRIO_IMPORTANCE = { 1: 1, 2: 0.5, 3: 0.1 } as const
const LIMIT = { cooling: 5, chats: 3, deadlineHorizonDays: 14, birthdayHorizonDays: 14 } as const

export function heatOf(f: HeatFactors, status: PulseStatus): number {
  if (status === 'resolved') return 0
  const x = WEIGHTS.urgency * f.u + WEIGHTS.importance * f.i + WEIGHTS.recency * f.r + WEIGHTS.blocked * f.b
  return Math.max(0, Math.min(100, Math.round(100 * x)))
}

/** Local calendar days from `now`'s day to `day` (`YYYY-MM-DD`); negative = past. */
export function daysUntil(day: string, now: number): number {
  return Math.round((parseDay(day).getTime() - parseDay(dayKey(now)).getTime()) / DAY)
}

export const urgencyDays = (days: number): number => (days < 0 ? 1 : Math.pow(0.5, days / 1.5))
export const urgencyHours = (hours: number): number => (hours <= 0 ? 1 : Math.pow(0.5, hours / 12))
export const recency = (ageDays: number): number => Math.pow(0.5, Math.max(0, ageDays) / 3)

const ageDays = (ms: number, now: number) => (now - ms) / DAY

function item(p: Omit<PulseItem, 'id' | 'heat'>): PulseItem {
  return { ...p, id: `${p.kind}:${p.refId}`, heat: heatOf(p.factors, p.status) }
}

// ------------------------------------------------------------------ sources

function deadlines(events: readonly CalEvent[], moodle: ReadonlySet<string>, now: number): PulseItem[] {
  const out: PulseItem[] = []
  for (const e of events) {
    if (!moodle.has(e.sourceId)) continue
    const at = startMs(e)
    const day = e.allDay ? e.start.slice(0, 10) : dayKey(at)
    const days = daysUntil(day, now)
    const passed = e.allDay ? days < 0 : at < now
    const base = { kind: 'deadline' as const, refId: e.id, title: e.title, detail: e.category, route: 'calendar' as const, param: day, at }
    if (passed) {
      if (now - (e.allDay ? parseDay(day).getTime() + DAY : at) <= 3 * DAY) out.push(item({ ...base, status: 'resolved', factors: { u: 0, i: 1, r: 0, b: 0 }, reason: { code: 'passed', at } }))
      continue
    }
    if (days > LIMIT.deadlineHorizonDays) continue
    out.push(
      item({
        ...base,
        status: days <= 2 ? 'heating' : 'stable',
        factors: { u: urgencyDays(days), i: 1, r: 0, b: 0 },
        reason: { code: 'due', days, at: e.allDay ? undefined : at },
      }),
    )
  }
  return out
}

function appointments(events: readonly CalEvent[], kindOf: ReadonlyMap<string, string>, now: number): PulseItem[] {
  const out: PulseItem[] = []
  for (const e of events) {
    const k = kindOf.get(e.sourceId)
    if (e.allDay || (k !== 'lectures' && k !== 'other')) continue
    const s = startMs(e)
    const en = Math.max(endMs(e), s)
    if (en <= now || daysUntil(dayKey(s), now) > 1) continue
    const running = s <= now
    const hours = (s - now) / 3_600_000
    out.push(
      item({
        kind: k === 'lectures' ? 'lecture' : 'event',
        refId: e.id,
        title: e.title,
        detail: e.location,
        status: running || hours <= 2 ? 'heating' : 'stable',
        factors: { u: urgencyHours(hours), i: k === 'lectures' ? 0.4 : 0.5, r: 0, b: 0 },
        reason: { code: 'appointment', at: s, end: en, running, location: e.location },
        route: 'calendar',
        param: dayKey(s),
        at: s,
      }),
    )
  }
  return out
}

function tasks(list: readonly Task[], now: number): PulseItem[] {
  const today = dayKey(now)
  const out: PulseItem[] = []
  for (const t of list) {
    const base = { kind: 'task' as const, refId: t.id, title: t.title, route: 'tasks' as const }
    const i = PRIO_IMPORTANCE[t.prio] ?? 0.5
    const age = ageDays(t.createdAt, now)
    const r = recency(age)
    if (t.done) {
      if (t.doneAt && dayKey(t.doneAt) === today) out.push(item({ ...base, status: 'resolved', factors: { u: 0, i, r: 0, b: 0 }, reason: { code: 'done', at: t.doneAt }, at: t.doneAt }))
      continue
    }
    if (t.due) {
      const days = daysUntil(t.due, now)
      const at = parseDay(t.due).getTime()
      if (days < 0) {
        out.push(item({ ...base, status: 'blocked', factors: { u: 1, i, r, b: 1 }, reason: { code: 'overdue', days: -days }, at }))
      } else {
        out.push(item({ ...base, status: days <= 2 ? 'heating' : age <= 2 ? 'new' : 'stable', factors: { u: urgencyDays(days), i, r, b: 0 }, reason: { code: 'due', days }, at }))
      }
      continue
    }
    const days = Math.max(0, Math.floor(age))
    out.push(item({ ...base, status: age <= 2 ? 'new' : age > 30 ? 'cooling' : 'stable', factors: { u: 0, i, r, b: 0 }, reason: { code: 'open', days }, at: t.createdAt }))
  }
  return out
}

function notes(list: readonly Note[], now: number): PulseItem[] {
  const out: PulseItem[] = []
  for (const n of list) {
    const age = ageDays(n.updatedAt, now)
    const status: PulseStatus | null = age <= 2 ? 'new' : age <= 7 ? 'stable' : n.pinned && age > 21 ? 'cooling' : null
    if (!status) continue
    const title = n.title.trim() || n.body.trim().split('\n')[0].replace(/^#+\s*/, '').slice(0, 80)
    out.push(
      item({
        kind: 'note',
        refId: n.id,
        title,
        status,
        factors: { u: 0, i: n.pinned ? 0.6 : 0.3, r: status === 'cooling' ? 0 : recency(age), b: 0 },
        reason: status === 'cooling' ? { code: 'untouched', days: Math.floor(age) } : { code: 'edited', at: n.updatedAt },
        route: 'notes',
        param: n.id,
        at: n.updatedAt,
      }),
    )
  }
  return out
}

/** Next birthday as calendar days from today (0..365) and the age then, if the year is known. */
export function nextBirthday(birthday: string, now: number): { days: number; age?: number } | null {
  const m = /^(?:(\d{4})-)?(\d{2})-(\d{2})$/.exec(birthday.trim())
  if (!m) return null
  const today = parseDay(dayKey(now))
  const month = Number(m[2]) - 1
  const date = Number(m[3])
  let year = today.getFullYear()
  let next = new Date(year, month, date)
  if (next < today) next = new Date(++year, month, date)
  const days = Math.round((next.getTime() - today.getTime()) / DAY)
  return { days, age: m[1] ? year - Number(m[1]) : undefined }
}

function people(list: readonly Person[], now: number): PulseItem[] {
  const out: PulseItem[] = []
  const quiet: Array<{ p: Person; age: number }> = []
  for (const p of list) {
    const b = p.birthday ? nextBirthday(p.birthday, now) : null
    if (b && b.days <= LIMIT.birthdayHorizonDays) {
      out.push(
        item({
          kind: 'birthday',
          refId: p.id,
          title: p.name,
          status: b.days <= 2 ? 'heating' : 'stable',
          factors: { u: urgencyDays(b.days), i: 0.6, r: 0, b: 0 },
          reason: { code: 'birthday', days: b.days, age: b.age },
          route: 'people',
          param: p.id,
          at: now + b.days * DAY,
        }),
      )
      continue
    }
    const age = ageDays(p.updatedAt, now)
    if (p.updatedAt > 0 && age > 60) quiet.push({ p, age })
  }
  // curated people (a note or tags) before bare imported contacts, then the longest silence
  const curated = (p: Person) => (p.note.trim() || p.tags.length ? 1 : 0)
  quiet.sort((a, b) => curated(b.p) - curated(a.p) || b.age - a.age)
  for (const { p, age } of quiet.slice(0, LIMIT.cooling)) {
    out.push(
      item({
        kind: 'person',
        refId: p.id,
        title: p.name,
        detail: p.tags.join(', ') || undefined,
        status: 'cooling',
        factors: { u: 0, i: 0.3, r: 0, b: 0 },
        reason: { code: 'untouched', days: Math.floor(age) },
        route: 'people',
        param: p.id,
        at: p.updatedAt,
      }),
    )
  }
  return out
}

function chats(list: readonly Chat[], now: number): PulseItem[] {
  return list
    .filter((c) => c.messages.length > 0 && ageDays(c.updatedAt, now) <= 2)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, LIMIT.chats)
    .map((c) =>
      item({
        kind: 'chat',
        refId: c.id,
        title: c.title,
        status: 'new',
        factors: { u: 0, i: 0.3, r: recency(ageDays(c.updatedAt, now)), b: 0 },
        reason: { code: 'chat', at: c.updatedAt, count: c.messages.length },
        route: 'ask',
        param: c.id,
        at: c.updatedAt,
      }),
    )
}

// ------------------------------------------------------------------ all

export function computePulse(d: PulseInput, now: number): PulseResult {
  const moodle = new Set(d.sources.filter((s) => s.kind === 'moodle').map((s) => s.id))
  const kindOf = new Map(d.sources.map((s) => [s.id, s.kind]))
  const items = [
    ...deadlines(d.events, moodle, now),
    ...appointments(d.events, kindOf, now),
    ...tasks(d.tasks, now),
    ...notes(d.notes, now),
    ...people(d.people, now),
    ...chats(d.chats, now),
  ].sort((a, b) => b.heat - a.heat || Math.abs(a.at - now) - Math.abs(b.at - now) || a.title.localeCompare(b.title))
  const counts: Record<PulseStatus, number> = { new: 0, heating: 0, blocked: 0, stable: 0, cooling: 0, resolved: 0 }
  for (const it of items) counts[it.status] += 1
  return { items, critical: items.filter((it) => it.status !== 'resolved' && it.heat >= CRITICAL), counts }
}
