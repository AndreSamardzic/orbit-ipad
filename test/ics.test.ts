import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseIcs } from '../src/lib/ics.ts'
import { parseVCards } from '../src/lib/vcard.ts'

const wrap = (body: string) => `BEGIN:VCALENDAR\r\nVERSION:2.0\r\n${body}\r\nEND:VCALENDAR\r\n`

test('UTC, all-day, folding and escapes', () => {
  const ev = parseIcs(
    wrap(
      [
        'BEGIN:VEVENT', 'UID:a1', 'SUMMARY:Abgabe\\, Teil 1', 'DTSTART:20261120T225900Z', 'DTEND:20261120T225900Z',
        'DESCRIPTION:Zeile eins\\nZeile', '  zwei', 'CATEGORIES:WI24 Mathe', 'END:VEVENT',
        'BEGIN:VEVENT', 'UID:a2', 'SUMMARY:Ferien', 'DTSTART;VALUE=DATE:20261221', 'DTEND;VALUE=DATE:20261224', 'END:VEVENT',
      ].join('\r\n'),
    ),
  )
  assert.equal(ev.length, 2)
  assert.equal(ev[0].title, 'Abgabe, Teil 1')
  assert.equal(ev[0].start, '2026-11-20T22:59:00.000Z')
  assert.equal(ev[0].end, undefined)
  assert.equal(ev[0].description, 'Zeile eins\nZeile zwei')
  assert.equal(ev[0].category, 'WI24 Mathe')
  assert.deepEqual([ev[1].allDay, ev[1].start, ev[1].end], [true, '2026-12-21', '2026-12-24'])
})

test('TZID Europe/Berlin in winter and summer', () => {
  const ev = parseIcs(
    wrap(
      [
        'BEGIN:VEVENT', 'UID:w', 'SUMMARY:W', 'DTSTART;TZID=Europe/Berlin:20261117T090000', 'DTEND;TZID=Europe/Berlin:20261117T113000', 'END:VEVENT',
        'BEGIN:VEVENT', 'UID:s', 'SUMMARY:S', 'DTSTART;TZID="Europe/Berlin":20260701T090000', 'END:VEVENT',
      ].join('\r\n'),
    ),
  )
  assert.equal(ev[0].start, '2026-11-17T08:00:00.000Z')
  assert.equal(ev[0].end, '2026-11-17T10:30:00.000Z')
  assert.equal(ev[1].start, '2026-07-01T07:00:00.000Z')
})

test('weekly recurrence with COUNT, BYDAY and EXDATE; cancelled skipped', () => {
  const ev = parseIcs(
    wrap(
      [
        'BEGIN:VEVENT', 'UID:r', 'SUMMARY:Vorlesung', 'DTSTART;VALUE=DATE:20261102', 'RRULE:FREQ=WEEKLY;COUNT=4;BYDAY=MO,WE',
        'EXDATE;VALUE=DATE:20261104', 'END:VEVENT',
        'BEGIN:VEVENT', 'UID:c', 'SUMMARY:Weg', 'STATUS:CANCELLED', 'DTSTART:20261102T080000Z', 'END:VEVENT',
      ].join('\r\n'),
    ),
  )
  assert.deepEqual(ev.map((e) => e.start), ['2026-11-02', '2026-11-09', '2026-11-11'])
})

test('nested VALARM does not leak properties', () => {
  const ev = parseIcs(wrap(['BEGIN:VEVENT', 'UID:x', 'SUMMARY:Echt', 'DTSTART:20261102T080000Z', 'BEGIN:VALARM', 'SUMMARY:Alarm', 'END:VALARM', 'END:VEVENT'].join('\n')))
  assert.equal(ev[0].title, 'Echt')
})

test('vCard: FN, N fallback, birthday without year', () => {
  const p = parseVCards(
    'BEGIN:VCARD\r\nVERSION:3.0\r\nN:Muster;Erika;;;\r\nitem1.EMAIL;type=INTERNET:erika@example.org\r\nTEL;type=CELL:+49 1\r\nBDAY:--05-17\r\nEND:VCARD\r\nBEGIN:VCARD\r\nFN:Max\r\nBDAY:1999-01-02\r\nEND:VCARD\r\n',
  )
  assert.deepEqual(p[0], { name: 'Erika Muster', email: 'erika@example.org', phone: '+49 1', birthday: '05-17' })
  assert.equal(p[1].birthday, '1999-01-02')
})
