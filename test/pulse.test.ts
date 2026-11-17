import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CRITICAL, computePulse, heatOf, nextBirthday, urgencyDays, type PulseInput } from '../src/lib/pulse.ts'

const DAY = 86_400_000
// Tue 17 Nov 2026, 09:00 local (TZ=Europe/Berlin via npm test)
const NOW = new Date(2026, 10, 17, 9, 0).getTime()
const at = (d: number, h: number, m = 0) => new Date(2026, 10, 17 + d, h, m).toISOString()

const empty = (): PulseInput => ({ tasks: [], notes: [], people: [], events: [], sources: [], chats: [] })

test('heat formula: weights sum to 100, resolved is 0', () => {
  assert.equal(heatOf({ u: 1, i: 1, r: 1, b: 1 }, 'blocked'), 100)
  assert.equal(heatOf({ u: 1, i: 1, r: 1, b: 1 }, 'resolved'), 0)
  assert.equal(heatOf({ u: 0, i: 0, r: 0, b: 0 }, 'stable'), 0)
  assert.equal(urgencyDays(-3), 1)
  assert.equal(urgencyDays(0), 1)
  assert.ok(Math.abs(urgencyDays(1.5) - 0.5) < 1e-9)
})

test('tasks: overdue = blocked, due ≤ 2 days = heating, done today = resolved', () => {
  const d = empty()
  d.tasks = [
    { id: 'od1', title: 'Overdue high', done: false, prio: 1, due: '2026-11-15', createdAt: NOW - 10 * DAY },
    { id: 'od3', title: 'Overdue low', done: false, prio: 3, due: '2026-11-16', createdAt: NOW - 10 * DAY },
    { id: 'tom', title: 'Tomorrow', done: false, prio: 2, due: '2026-11-18', createdAt: NOW - 10 * DAY },
    { id: 'far', title: 'Far', done: false, prio: 2, due: '2026-12-20', createdAt: NOW - 10 * DAY },
    { id: 'fresh', title: 'Fresh', done: false, prio: 2, createdAt: NOW - DAY },
    { id: 'old', title: 'Old', done: false, prio: 3, createdAt: NOW - 40 * DAY },
    { id: 'done', title: 'Done', done: true, prio: 2, createdAt: 1, doneAt: NOW - 3_600_000 },
    { id: 'doneOld', title: 'Done old', done: true, prio: 2, createdAt: 1, doneAt: NOW - 3 * DAY },
  ]
  const p = computePulse(d, NOW)
  const by = Object.fromEntries(p.items.map((i) => [i.refId, i]))
  assert.equal(by.od1.status, 'blocked')
  assert.deepEqual(by.od1.reason, { code: 'overdue', days: 2 })
  assert.ok(by.od1.heat >= CRITICAL)
  assert.equal(by.od3.status, 'blocked')
  assert.ok(by.od3.heat < CRITICAL, 'a low-priority overdue task does not burn')
  assert.equal(by.tom.status, 'heating')
  assert.equal(by.far.status, 'stable')
  assert.equal(by.fresh.status, 'new')
  assert.equal(by.old.status, 'cooling')
  assert.equal(by.done.status, 'resolved')
  assert.equal(by.done.heat, 0)
  assert.equal(by.doneOld, undefined)
  assert.deepEqual(p.critical.map((i) => i.refId), ['od1'])
  assert.equal(p.items[0].refId, 'od1')
  assert.equal(p.counts.blocked, 2)
})

test('moodle deadlines: today burns, passed recently = resolved, far ones dropped', () => {
  const d = empty()
  d.sources = [{ id: 'm', name: 'Moodle', kind: 'moodle', importedAt: 0, count: 4 }, { id: 'l', name: 'Plan', kind: 'lectures', importedAt: 0, count: 1 }]
  d.events = [
    { id: 'today', sourceId: 'm', title: 'Abgabe heute', start: at(0, 23, 59), allDay: false },
    { id: 'tom', sourceId: 'm', title: 'Abgabe morgen', start: at(1, 23, 59), allDay: false },
    { id: 'past', sourceId: 'm', title: 'Abgabe gestern', start: at(-1, 12), allDay: false },
    { id: 'gone', sourceId: 'm', title: 'Abgabe alt', start: at(-10, 12), allDay: false },
    { id: 'far', sourceId: 'm', title: 'Abgabe später', start: at(30, 12), allDay: false },
    { id: 'lec', sourceId: 'l', title: 'Statistik', start: at(0, 9, 30), end: at(0, 11), allDay: false },
  ]
  const p = computePulse(d, NOW)
  const by = Object.fromEntries(p.items.map((i) => [i.refId, i]))
  assert.equal(by.today.status, 'heating')
  assert.ok(by.today.heat >= CRITICAL)
  assert.equal(by.tom.status, 'heating')
  assert.ok(by.tom.heat < by.today.heat)
  assert.equal(by.past.status, 'resolved')
  assert.equal(by.gone, undefined)
  assert.equal(by.far, undefined)
  assert.equal(by.lec.kind, 'lecture')
  assert.equal(by.lec.status, 'heating', 'starts within 2 h')
  assert.equal(by.lec.param, '2026-11-17')
})

test('notes, birthdays, quiet people, chats', () => {
  const d = empty()
  d.notes = [
    { id: 'n1', title: 'Fresh', body: '', pinned: false, updatedAt: NOW - 3_600_000 },
    { id: 'n2', title: '', body: '# Heading line\nmore', pinned: false, updatedAt: NOW - 5 * DAY },
    { id: 'n3', title: 'Stale pin', body: '', pinned: true, updatedAt: NOW - 40 * DAY },
    { id: 'n4', title: 'Old', body: '', pinned: false, updatedAt: NOW - 40 * DAY },
  ]
  d.people = [
    { id: 'b', name: 'Jonas', pose: 'running', note: '', tags: [], birthday: '2000-11-18', updatedAt: NOW },
    { id: 'q', name: 'Lena', pose: 'reading', note: 'Lerngruppe', tags: [], updatedAt: NOW - 90 * DAY },
    { id: 'r', name: 'Tim', pose: 'coffee', note: '', tags: [], updatedAt: NOW - DAY },
  ]
  d.chats = [{ id: 'c', title: 'Lernplan', messages: [{ role: 'user', content: 'x', at: NOW }], updatedAt: NOW - 3_600_000 }]
  const p = computePulse(d, NOW)
  const by = Object.fromEntries(p.items.map((i) => [i.id, i]))
  assert.equal(by['note:n1'].status, 'new')
  assert.equal(by['note:n2'].status, 'stable')
  assert.equal(by['note:n2'].title, 'Heading line')
  assert.equal(by['note:n3'].status, 'cooling')
  assert.equal(by['note:n4'], undefined)
  assert.equal(by['birthday:b'].status, 'heating')
  assert.deepEqual(by['birthday:b'].reason, { code: 'birthday', days: 1, age: 26 })
  assert.equal(by['person:q'].status, 'cooling')
  assert.equal(by['person:r'], undefined)
  assert.equal(by['chat:c'].status, 'new')
  assert.equal(by['chat:c'].route, 'ask')
  assert.equal(p.critical.length, 0)
})

test('nextBirthday wraps the year and parses MM-DD', () => {
  assert.deepEqual(nextBirthday('11-17', NOW), { days: 0, age: undefined })
  assert.equal(nextBirthday('11-16', NOW)?.days, 364)
  assert.equal(nextBirthday('1990-01-02', NOW)?.age, 37)
  assert.equal(nextBirthday('garbage', NOW), null)
})
