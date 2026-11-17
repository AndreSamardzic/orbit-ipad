import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  agendaOf,
  bandRange,
  birthdays,
  clockAngle,
  daysAhead,
  firstOn,
  hm,
  isNight,
  isoWeek,
  kindsOf,
  lanes,
  laterAfterToday,
  modeOf,
  nextUp,
  planetsOf,
  spreadOffset,
  restOfWeek,
  weekEnd,
  topThree,
  upcomingDeadlines,
} from '../src/lib/start.ts'
import type { CalEvent, CalSource, Person, Task } from '../src/lib/types.ts'

// Tue 17 Nov 2026, Europe/Berlin (TZ set by `npm test`).
const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m).getTime()
const iso = (d: number, h: number, m = 0) => new Date(at(d, h, m)).toISOString()
const sources: CalSource[] = [
  { id: 'lec', name: 'Vorlesungen', kind: 'lectures', importedAt: 0, count: 0 },
  { id: 'moo', name: 'Moodle', kind: 'moodle', importedAt: 0, count: 0 },
  { id: 'oth', name: 'Privat', kind: 'other', importedAt: 0, count: 0 },
]
const kinds = kindsOf(sources)
const ev = (id: string, sourceId: string, start: string, end?: string, allDay = false): CalEvent => ({ id, sourceId, title: id, start, end, allDay })
const events: CalEvent[] = [
  ev('stats', 'lec', iso(17, 9), iso(17, 11, 30)),
  ev('wi', 'lec', iso(17, 13), iso(17, 15, 15)),
  ev('sport', 'oth', iso(17, 14), iso(17, 15)),
  ev('blatt4', 'moo', iso(17, 23, 59)),
  ev('feiertag', 'oth', '2026-11-17', '2026-11-18', true),
  ev('prog', 'lec', iso(18, 9), iso(18, 12, 15)),
  ev('quiz', 'moo', '2026-11-18', undefined, true),
  ev('pm', 'lec', iso(19, 10), iso(19, 12)),
  ev('alt', 'moo', iso(10, 12)),
]
const task = (id: string, prio: 1 | 2 | 3, due?: string, done = false): Task => ({ id, title: id, prio, due, done, createdAt: 0 })

test('day mode, night and ISO week by the clock', () => {
  assert.equal(modeOf(at(17, 4, 59)), 'evening')
  assert.equal(modeOf(at(17, 5)), 'morning')
  assert.equal(modeOf(at(17, 10, 59)), 'morning')
  assert.equal(modeOf(at(17, 11)), 'day')
  assert.equal(modeOf(at(17, 17, 29)), 'day')
  assert.equal(modeOf(at(17, 17, 30)), 'evening')
  assert.equal(isNight(at(17, 23)), true)
  assert.equal(isNight(at(17, 5)), false)
  assert.equal(isoWeek(at(17, 12)), 47)
  assert.equal(isoWeek(new Date(2027, 0, 1).getTime()), 53) // Fri 1 Jan 2027 belongs to 2026-W53
})

test('agenda: kinds by source, deadlines due at their time, all-day first', () => {
  const a = agendaOf(events, kinds, at(17, 12))
  assert.deepEqual(
    a.map((x) => [x.id, x.kind]),
    [['feiertag', 'event'], ['stats', 'lecture'], ['wi', 'lecture'], ['sport', 'event'], ['blatt4', 'deadline']],
  )
  const dl = a.find((x) => x.id === 'blatt4')!
  assert.equal(dl.start, dl.end)
  const quiz = agendaOf(events, kinds, at(18, 8)).find((x) => x.id === 'quiz')!
  assert.equal(quiz.start, at(18, 23, 59), 'all-day deadline is due at 23:59')
})

test('next up: running, next, after', () => {
  const a = agendaOf(events, kinds, at(17, 10))
  const n = nextUp(a, at(17, 10))
  assert.equal(n.current?.id, 'stats')
  assert.equal(n.next?.id, 'wi')
  assert.equal(n.after?.id, 'sport')
  const late = nextUp(a, at(17, 16))
  assert.equal(late.current, null)
  assert.equal(late.next?.id, 'blatt4')
})

test('later days, first tomorrow, upcoming deadlines', () => {
  assert.equal(laterAfterToday(events, kinds, at(17, 20))?.id, 'prog')
  assert.equal(firstOn(events, kinds, '2026-11-18')?.id, 'prog')
  assert.equal(firstOn(events, kinds, '2026-11-20'), null)
  assert.deepEqual(upcomingDeadlines(events, kinds, at(17, 12)).map((x) => x.id), ['blatt4', 'quiz'])
})

test('days ahead counts per kind', () => {
  const days = daysAhead(events, kinds, '2026-11-18', 3)
  assert.deepEqual(days.map((d) => [d.day, d.events, d.lectures, d.deadlines, d.first]), [
    ['2026-11-18', 0, 1, 1, 'prog'],
    ['2026-11-19', 0, 1, 0, 'pm'],
    ['2026-11-20', 0, 0, 0, null],
  ])
})

test('top three: near deadlines and tasks by severity', () => {
  const tasks = [task('low', 3), task('late', 2, '2026-11-15'), task('high', 1), task('done', 1, '2026-11-01', true), task('today', 2, '2026-11-17')]
  const top = topThree(tasks, upcomingDeadlines(events, kinds, at(17, 12)), at(17, 12))
  // both critical (overdue task, deadline within 24 h): earlier due first
  assert.deepEqual(top.map((x) => x.id), ['task:late', 'dl:blatt4', 'task:today'])
  assert.equal(top[1].severity, 3)
  const top5 = topThree(tasks, upcomingDeadlines(events, kinds, at(17, 12)), at(17, 12), 9)
  assert.deepEqual(top5.map((x) => x.id), ['task:late', 'dl:blatt4', 'task:today', 'dl:quiz', 'task:high', 'task:low'])
})

test('birthdays: next occurrence, age, 29 Feb', () => {
  const p = (id: string, birthday?: string): Person => ({ id, name: id, pose: 'reading', note: '', tags: [], birthday, updatedAt: 0 })
  const b = birthdays([p('heute', '11-17'), p('jahr', '2000-11-20'), p('vorbei', '11-01'), p('leap', '2004-02-29'), p('kaputt', '13-40'), p('ohne')], '2026-11-17')
  assert.deepEqual(b.map((x) => [x.person.id, x.day, x.inDays, x.age]), [
    ['heute', '2026-11-17', 0, null],
    ['jahr', '2026-11-20', 3, 26],
    ['leap', '2027-02-28', 103, 23],
    ['vorbei', '2027-11-01', 349, null],
  ])
})

test('orbit planets: clock positions, rings, trimming', () => {
  const now = at(17, 12, 30)
  const agenda = agendaOf(events, kinds, now)
  const tasks = [task('late', 2, '2026-11-15'), task('high', 1), task('low', 3)]
  const p: Person = { id: 'jo', name: 'Jonas Beck', pose: 'running', note: '', tags: [], birthday: '11-17', updatedAt: 0 }
  const [planets, hidden] = planetsOf(agenda, { tasks, deadlines: upcomingDeadlines(events, kinds, now), birthdays: birthdays([p], '2026-11-17') }, now)
  const by = new Map(planets.map((x) => [x.id, x]))
  assert.equal(hidden, 0)
  assert.equal(by.has('feiertag'), false, 'all-day events stay off the face')
  assert.deepEqual([by.get('stats')!.ring, by.get('stats')!.past, by.get('stats')!.angle], [1, true, 270])
  assert.deepEqual([by.get('wi')!.ring, by.get('wi')!.angle], [0, 30]) // 13:00 within 2 h
  assert.equal(by.get('sport')!.ring, 0)
  assert.equal(by.get('blatt4')!.ring, 1)
  assert.equal(by.get('t:late')!.ring, 0)
  assert.equal(by.get('t:high')!.ring, 1)
  assert.equal(by.get('t:low')!.ring, 2)
  assert.equal(by.get('d:quiz')!.ring, 1, 'deadline tomorrow on the middle ring')
  assert.deepEqual([by.get('b:jo')!.ring, by.get('b:jo')!.initials], [0, 'JB'])
  const [few, rest] = planetsOf(agenda, { tasks, deadlines: [], birthdays: [] }, now, 5)
  assert.equal(few.length, 5)
  assert.equal(rest, 2)
  assert.ok(few.some((x) => x.id === 't:late'), 'the most urgent untimed planet stays')
})

test('clock angle, lanes, band range, durations', () => {
  assert.equal(clockAngle(at(17, 15)), 90)
  assert.equal(clockAngle(at(17, 0)), 0)
  const a = agendaOf(events, kinds, at(17, 12)).filter((x) => !x.allDay && x.kind !== 'deadline')
  const l = lanes(a)
  assert.deepEqual([l.get('stats'), l.get('wi'), l.get('sport')], [0, 0, 1])
  assert.deepEqual(bandRange(a, at(17, 12)), { from: 8, to: 19 })
  assert.deepEqual(bandRange(agendaOf(events, kinds, at(17, 12)).filter((x) => !x.allDay), at(17, 12)), { from: 8, to: 24 })
  assert.deepEqual(hm(25 * 60_000), { h: 0, m: 25 })
  assert.deepEqual(hm(65 * 60_000), { h: 1, m: 5 })
  assert.deepEqual(hm(1), { h: 0, m: 1 })
})

test('untimed planets keep clear of timed ones on their ring', () => {
  assert.equal(spreadOffset(1, [], 42), 42)
  const o = spreadOffset(1, [30], 31)
  assert.ok(Math.abs(o - 210) <= 3, `opposite the fixed planet, got ${o}`)
  const two = spreadOffset(2, [0, 180], 5)
  assert.ok(Math.abs((two % 180) - 90) <= 3, `between the fixed ones, got ${two}`)
})

test('rest of the week runs to Sunday night', () => {
  assert.equal(weekEnd(at(17, 12)), at(23, 0))
  assert.equal(weekEnd(at(22, 23)), at(23, 0)) // Sunday
  assert.equal(weekEnd(at(23, 0)), at(30, 0)) // Monday starts a new week
  assert.deepEqual(restOfWeek(events, kinds, at(17, 12)), { events: 1, lectures: 3, deadlines: 2 })
})
