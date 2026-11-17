import { test } from 'node:test'
import assert from 'node:assert/strict'
import { classify, extractDate, findTask, matchPage } from '../src/voice/intent.ts'
import { chunks, clip, toSpeech } from '../src/voice/speechText.ts'
import { pickVoice, rankVoices } from '../src/voice/voicePick.ts'
import { agendaText, birthdaysText, nextDeadlineText, spokenTime } from '../src/voice/answers.ts'
import { DEFAULT_SETTINGS, type Data, type Task } from '../src/lib/types.ts'

// Tuesday, 17 November 2026
const T = '2026-11-17'

test('German and English relative dates', () => {
  assert.deepEqual(extractDate('Mathe lernen morgen', T), { rest: 'Mathe lernen', due: '2026-11-18' })
  assert.deepEqual(extractDate('Mathe lernen übermorgen', T), { rest: 'Mathe lernen', due: '2026-11-19' })
  assert.deepEqual(extractDate('Folien fertig machen am Freitag', T), { rest: 'Folien fertig machen', due: '2026-11-20' })
  assert.equal(extractDate('Sport am Dienstag', T).due, '2026-11-24', 'same weekday = next week')
  assert.equal(extractDate('bis nächsten Montag Hausarbeit', T).due, '2026-11-23')
  assert.equal(extractDate('heute Abend Wäsche', T).due, T)
  assert.equal(extractDate('in 3 Tagen', T).due, '2026-11-20')
  assert.equal(extractDate('in zwei Wochen', T).due, '2026-12-01')
  assert.equal(extractDate('nächste Woche', T).due, '2026-11-23')
  assert.equal(extractDate('study tomorrow', T).due, '2026-11-18')
  assert.equal(extractDate('essay by Friday', T).due, '2026-11-20')
  assert.equal(extractDate('the day after tomorrow', T).due, '2026-11-19')
})

test('calendar dates, past dates roll into next year', () => {
  assert.deepEqual(extractDate('Präsentation am 3. Dezember', T), { rest: 'Präsentation', due: '2026-12-03' })
  assert.equal(extractDate('Abgabe am dritten Dezember', T).due, '2026-12-03')
  assert.equal(extractDate('Abgabe am 3 Dezember', T).due, '2026-12-03')
  assert.equal(extractDate('Klausur am 12. Januar', T).due, '2027-01-12')
  assert.equal(extractDate('Klausur am 12. Januar 2028', T).due, '2028-01-12')
  assert.equal(extractDate('Steuer bis 5.3.', T).due, '2027-03-05')
  assert.equal(extractDate('Termin 24.12.2026', T).due, '2026-12-24')
  assert.equal(extractDate('essay due December 3rd', T).due, '2026-12-03')
  assert.equal(extractDate('essay on the 3rd of December', T).due, '2026-12-03')
  assert.equal(extractDate('31. Februar', T).due, undefined)
  assert.deepEqual(extractDate('Kapitel Dezember lesen', T), { rest: 'Kapitel Dezember lesen' })
  assert.deepEqual(extractDate('Mathe lernen', T), { rest: 'Mathe lernen' })
  assert.equal(extractDate('Morgenroutine planen', T).due, undefined, 'no match inside a word')
})

test('new task intents', () => {
  assert.deepEqual(classify('neue Aufgabe Mathe lernen morgen', T), { kind: 'addTask', title: 'Mathe lernen', due: '2026-11-18' })
  assert.deepEqual(classify('Neue Aufgabe: Bahnticket buchen.', T), { kind: 'addTask', title: 'Bahnticket buchen', due: undefined })
  assert.deepEqual(classify('Leg eine Aufgabe an Folien machen bis Freitag', T), { kind: 'addTask', title: 'Folien machen', due: '2026-11-20' })
  assert.deepEqual(classify('erinnere mich daran, die Miete zu überweisen am 1. Dezember', T), { kind: 'addTask', title: 'Die Miete zu überweisen', due: '2026-12-01' })
  assert.deepEqual(classify('Orbit, neue Aufgabe zum Arzt gehen bitte', T), { kind: 'addTask', title: 'Zum Arzt gehen', due: undefined })
  assert.deepEqual(classify('new task study maths tomorrow', T), { kind: 'addTask', title: 'Study maths', due: '2026-11-18' })
  assert.deepEqual(classify('remind me to call mum on Friday', T), { kind: 'addTask', title: 'Call mum', due: '2026-11-20' })
  assert.equal(classify('Aufgabe 3 vom Übungsblatt erklären', T).kind, 'none', 'needs a "neue"/"leg an" verb')
})

test('notes, checking off, navigation', () => {
  assert.deepEqual(classify('neue Notiz Idee für die Bachelorarbeit', T), { kind: 'addNote', text: 'Idee für die Bachelorarbeit' })
  assert.deepEqual(classify('notiere: Milch kaufen', T), { kind: 'addNote', text: 'Milch kaufen' })
  assert.deepEqual(classify('take a note buy milk', T), { kind: 'addNote', text: 'Buy milk' })
  assert.deepEqual(classify('hake Mathe lernen ab', T), { kind: 'completeTask', query: 'Mathe lernen' })
  assert.deepEqual(classify('Hak die Aufgabe Bahnticket ab', T), { kind: 'completeTask', query: 'Bahnticket' })
  assert.deepEqual(classify('Bahnticket buchen ist erledigt', T), { kind: 'completeTask', query: 'Bahnticket buchen' })
  assert.deepEqual(classify('ich habe Karteikarten erledigt', T), { kind: 'completeTask', query: 'Karteikarten' })
  assert.deepEqual(classify('mark essay as done', T), { kind: 'completeTask', query: 'essay' })
  assert.deepEqual(classify('öffne Kalender', T), { kind: 'navigate', route: 'calendar' })
  assert.deepEqual(classify('Öffne bitte die Einstellungen.', T), { kind: 'navigate', route: 'settings' })
  assert.deepEqual(classify('zeig mir meine Aufgaben', T), { kind: 'navigate', route: 'tasks' })
  assert.deepEqual(classify('geh zur Startseite', T), { kind: 'navigate', route: 'start' })
  assert.deepEqual(classify('Notizen öffnen', T), { kind: 'navigate', route: 'notes' })
  assert.deepEqual(classify('open people', T), { kind: 'navigate', route: 'people' })
  assert.deepEqual(classify('oeffne kalendar', T), { kind: 'navigate', route: 'calendar' }, 'one typo is fine')
  assert.equal(matchPage('die Seite Personen'), 'people')
  assert.equal(matchPage('Bananen'), null)
})

test('questions, yes/no/stop, fallthrough to Claude', () => {
  assert.deepEqual(classify('Was steht heute an?', T), { kind: 'agenda', day: T })
  assert.deepEqual(classify('was steht morgen an', T), { kind: 'agenda', day: '2026-11-18' })
  assert.deepEqual(classify('Was habe ich heute?', T), { kind: 'agenda', day: T })
  assert.deepEqual(classify("what's on today", T), { kind: 'agenda', day: T })
  assert.deepEqual(classify('nächste Frist', T), { kind: 'nextDeadline' })
  assert.deepEqual(classify('Wann ist die nächste Abgabe?', T), { kind: 'nextDeadline' })
  assert.deepEqual(classify('was ist mein nächster Termin', T), { kind: 'nextEvent' })
  assert.deepEqual(classify('Wer hat heute Geburtstag?', T), { kind: 'birthdays', day: T })
  assert.deepEqual(classify('wer hat morgen Geburtstag', T), { kind: 'birthdays', day: '2026-11-18' })
  assert.deepEqual(classify('wann ist der nächste Geburtstag', T), { kind: 'nextBirthday' })
  for (const y of ['Ja', 'ja bitte', 'Ja, mach das.', 'okay', 'yes please', 'genau']) assert.deepEqual(classify(y, T), { kind: 'yes' }, y)
  for (const n of ['Nein', 'nein danke', 'lieber nicht', 'no']) assert.deepEqual(classify(n, T), { kind: 'no' }, n)
  for (const s of ['Stopp', 'abbrechen', 'hör auf', 'sei still', 'stop please', 'vergiss es']) assert.deepEqual(classify(s, T), { kind: 'stop' }, s)
  assert.equal(classify('Erklär mir die Normalverteilung', T).kind, 'none')
  assert.equal(classify('Wie wird das Wetter?', T).kind, 'none')
  assert.equal(classify('', T).kind, 'none')
})

const task = (id: string, title: string, extra: Partial<Task> = {}): Task => ({ id, title, done: false, prio: 2, createdAt: 1, ...extra })

test('finding the task to check off', () => {
  const tasks = [task('a', 'Mathe lernen'), task('b', 'Hausarbeit Kapitel 3 gliedern'), task('c', 'Bahnticket buchen'), task('d', 'Mathe Übungsblatt', { done: true })]
  assert.equal(findTask('Mathe lernen', tasks)?.id, 'a')
  assert.equal(findTask('mathe', tasks)?.id, 'a', 'done tasks are skipped')
  assert.equal(findTask('Kapitel drei Hausarbeit', tasks)?.id, 'b')
  assert.equal(findTask('Bahn Ticket', tasks)?.id, 'c')
  assert.equal(findTask('Steuererklärung', tasks), null)
})

test('markdown to speech, chunking', () => {
  assert.equal(toSpeech('## Plan\n- **Kapitel 1** lesen\n- [Folien](https://x.y) ansehen\n\n```js\nx()\n```\n| a | b |\n|---|---|\nFertig! 🎉', '(Code)'), 'Plan. Kapitel 1 lesen. Folien ansehen. (Code) Fertig!')
  const long = 'Satz eins ist kurz. ' + 'Wort '.repeat(80) + 'Ende.'
  const c = chunks(long, 120)
  assert.ok(c.every((x) => x.length <= 121), JSON.stringify(c.map((x) => x.length)))
  assert.equal(c.join(' ').replace(/\s+/g, ' '), long.trim().replace(/\s+/g, ' '))
  assert.equal(clip('Eins. Zwei. Drei.', 12), 'Eins. Zwei.')
})

test('voice ranking prefers premium/enhanced, avoids novelty voices', () => {
  const voices = [
    { name: 'Grandma', lang: 'de-DE', voiceURI: 'com.apple.eloquence.de-DE.Grandma' },
    { name: 'Bubbles', lang: 'en-US', voiceURI: 'com.apple.speech.synthesis.voice.Bubbles' },
    { name: 'Anna', lang: 'de-DE', voiceURI: 'com.apple.voice.compact.de-DE.Anna', default: true },
    { name: 'Anna (Erweitert)', lang: 'de-DE', voiceURI: 'com.apple.voice.enhanced.de-DE.Anna' },
    { name: 'Helena', lang: 'de-DE', voiceURI: 'com.apple.voice.premium.de-DE.Helena' },
    { name: 'Samantha', lang: 'en-US', voiceURI: 'com.apple.voice.compact.en-US.Samantha' },
  ]
  assert.deepEqual(rankVoices(voices, 'de').map((v) => v.name), ['Helena', 'Anna (Erweitert)', 'Anna', 'Grandma'])
  assert.equal(pickVoice(voices, 'en')?.name, 'Samantha')
  assert.equal(pickVoice(voices, 'de', 'Anna')?.name, 'Anna', 'explicit choice wins')
  assert.equal(pickVoice(voices, 'de', 'Samantha')?.name, 'Helena', 'a choice in another language is ignored')
  assert.equal(pickVoice([], 'de'), null)
})

test('spoken answers', () => {
  const now = new Date(2026, 10, 17, 10, 0)
  const at = (h: number, m: number, plus = 0) => new Date(2026, 10, 17 + plus, h, m).toISOString()
  const d: Data = {
    settings: { ...DEFAULT_SETTINGS, lang: 'de' },
    tasks: [task('a', 'Hausarbeit gliedern', { prio: 1 }), task('b', 'Bahnticket buchen', { due: '2026-11-16' }), task('c', 'Karteikarten', { prio: 3 })],
    notes: [],
    people: [{ id: 'p', name: 'Jonas', pose: 'running', note: '', tags: [], updatedAt: 1, birthday: '2000-11-17' }],
    sources: [{ id: 'm', name: 'Moodle', kind: 'moodle', importedAt: 1, count: 1 }, { id: 'l', name: 'Plan', kind: 'lectures', importedAt: 1, count: 2 }],
    events: [
      { id: '1', sourceId: 'l', title: 'Statistik', start: at(8, 0), end: at(9, 30), allDay: false },
      { id: '2', sourceId: 'l', title: 'Programmieren', start: at(13, 15), end: at(15, 0), allDay: false },
      { id: '3', sourceId: 'm', title: 'Abgabe Blatt 4', start: at(23, 59, 1), allDay: false },
    ],
    chats: [],
    links: [],
  }
  assert.equal(spokenTime(new Date(2026, 0, 1, 9, 0).getTime(), 'de'), '9 Uhr')
  assert.equal(spokenTime(new Date(2026, 0, 1, 13, 15).getTime(), 'en'), '1:15 PM')
  assert.equal(agendaText(d, T, now), 'Heute noch: 13:15 Uhr Programmieren. Wichtigste Aufgaben: Hausarbeit gliedern, Bahnticket buchen (überfällig), Karteikarten.')
  assert.equal(agendaText(d, '2026-11-19', now), 'Übermorgen stehen keine Termine im Kalender.')
  assert.equal(nextDeadlineText(d, now), 'Nächste Frist: Abgabe Blatt 4, morgen um 23:59 Uhr.')
  assert.equal(birthdaysText(d, T, now), 'Heute hat Geburtstag: Jonas.')
})
