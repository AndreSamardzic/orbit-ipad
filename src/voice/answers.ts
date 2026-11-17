// What ORBIT says for the local intents (agenda, deadlines, birthdays …),
// composed from the app data. Pure — test/voiceIntent.test.ts.
import { addDays, dayKey, endMs, eventsOn, fmtDay, parseDay, startMs, DAY } from '../lib/dates.ts'
import type { Data, Lang, Task } from '../lib/types.ts'
import { vt } from './strings.ts'

/** "9 Uhr" / "9:30 Uhr" — reads better than "09:00"; en: "9 AM" / "9:30 AM". */
export function spokenTime(ms: number, lang: Lang): string {
  const d = new Date(ms)
  const h = d.getHours()
  const m = d.getMinutes()
  if (lang === 'de') return m ? `${h}:${String(m).padStart(2, '0')} Uhr` : `${h} Uhr`
  const h12 = h % 12 || 12
  return `${h12}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h < 12 ? 'AM' : 'PM'}`
}

/** "heute" / "morgen" / "übermorgen" / "am Mittwoch, 18. November" (lower case, mid-sentence). */
export function dayPhrase(day: string, today: string, lang: Lang): string {
  const diff = Math.round((parseDay(day).getTime() - parseDay(today).getTime()) / DAY)
  if (diff === 0) return vt(lang, 'day.today').toLowerCase()
  if (diff === 1) return vt(lang, 'day.tomorrow').toLowerCase()
  if (diff === 2) return lang === 'de' ? 'übermorgen' : 'the day after tomorrow'
  const long = fmtDay(day, lang, { weekday: 'long', day: 'numeric', month: 'long' })
  return lang === 'de' ? `am ${long}` : `on ${long}`
}

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s)

export function listJoin(items: string[], lang: Lang): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} ${vt(lang, 'say.and')} ${items[items.length - 1]}`
}

/** Open tasks in the Start page's order (priority, then due date). */
export function topTasks(tasks: readonly Task[], n = 3): Task[] {
  return tasks
    .filter((x) => !x.done)
    .sort((a, b) => a.prio - b.prio || (a.due ?? '9999').localeCompare(b.due ?? '9999'))
    .slice(0, n)
}

/** "Heute hast du 2 Termine: 9 Uhr Statistik II, … Wichtigste Aufgaben: …" */
export function agendaText(d: Data, day: string, now: Date): string {
  const lang = d.settings.lang
  const today = dayKey(now)
  const Day = cap(dayPhrase(day, today, lang))
  const evs = eventsOn(d.events, day)
  const label = (e: (typeof evs)[number]) => (e.allDay ? vt(lang, 'say.allDay', { title: e.title }) : `${spokenTime(startMs(e), lang)} ${e.title}`)
  const parts: string[] = []
  if (!evs.length) parts.push(vt(lang, 'say.agendaNone', { Day }))
  else if (day === today) {
    const rest = evs.filter((e) => e.allDay || endMs(e) > now.getTime())
    if (rest.length === evs.length) parts.push(vt(lang, evs.length === 1 ? 'say.agendaOne' : 'say.agendaMany', { Day, n: evs.length, list: evs.map(label).join(', ') }))
    else if (rest.length) parts.push(vt(lang, 'say.agendaRest', { list: rest.map(label).join(', ') }))
    else parts.push(vt(lang, 'say.agendaDoneAll'))
  } else parts.push(vt(lang, evs.length === 1 ? 'say.agendaOne' : 'say.agendaMany', { Day, n: evs.length, list: evs.map(label).join(', ') }))
  if (day === today) {
    const top = topTasks(d.tasks)
    parts.push(
      top.length
        ? vt(lang, 'say.tasksTop', { list: top.map((t) => (t.due && t.due < today ? `${t.title} (${vt(lang, 'say.overdue')})` : t.title)).join(', ') })
        : vt(lang, 'say.tasksNone'),
    )
  }
  return parts.join(' ')
}

const when = (ms: number, allDay: boolean, today: string, lang: Lang) => {
  const day = dayPhrase(dayKey(ms), today, lang)
  return allDay ? day : `${day} ${vt(lang, 'say.at', { time: spokenTime(ms, lang) })}`
}

/** Next Moodle deadline; without any, the next due open task. */
export function nextDeadlineText(d: Data, now: Date): string {
  const lang = d.settings.lang
  const today = dayKey(now)
  const moodle = new Set(d.sources.filter((s) => s.kind === 'moodle').map((s) => s.id))
  const next = d.events.filter((e) => moodle.has(e.sourceId) && startMs(e) >= now.getTime()).sort((a, b) => startMs(a) - startMs(b))[0]
  if (next) return vt(lang, 'say.deadline', { title: next.category ? `${next.title} (${next.category})` : next.title, when: when(startMs(next), next.allDay, today, lang) })
  const task = d.tasks.filter((t) => !t.done && t.due && t.due >= today).sort((a, b) => (a.due ?? '').localeCompare(b.due ?? '') || a.prio - b.prio)[0]
  if (task?.due) return vt(lang, 'say.deadlineTask', { title: task.title, when: dayPhrase(task.due, today, lang) })
  return vt(lang, 'say.noDeadline')
}

/** The next calendar event that has not started yet (all-day ones from tomorrow). */
export function nextEventText(d: Data, now: Date): string {
  const lang = d.settings.lang
  const today = dayKey(now)
  const next = d.events
    .filter((e) => (e.allDay ? e.start > today : startMs(e) > now.getTime()))
    .sort((a, b) => startMs(a) - startMs(b))[0]
  if (!next) return vt(lang, 'say.noNextEvent')
  return vt(lang, 'say.nextEvent', { title: next.location ? `${next.title}, ${next.location}` : next.title, when: when(startMs(next), next.allDay, today, lang) })
}

export function birthdaysText(d: Data, day: string, now: Date): string {
  const lang = d.settings.lang
  const Day = cap(dayPhrase(day, dayKey(now), lang))
  const mmdd = day.slice(5)
  const names = d.people.filter((p) => p.birthday && p.birthday.slice(-5) === mmdd).map((p) => p.name)
  if (!names.length) return vt(lang, 'say.noBdays', { Day })
  return vt(lang, names.length === 1 ? 'say.bdays' : 'say.bdaysMany', { Day, list: listJoin(names, lang) })
}

export function nextBirthdayText(d: Data, now: Date): string {
  const lang = d.settings.lang
  const today = dayKey(now)
  let best: { name: string; day: string } | null = null
  for (let i = 0; i < 366 && !best; i++) {
    const day = addDays(today, i)
    const p = d.people.find((x) => x.birthday && x.birthday.slice(-5) === day.slice(5))
    if (p) best = { name: p.name, day }
  }
  if (!best) return vt(lang, 'say.noBdayKnown')
  return vt(lang, 'say.nextBday', { name: best.name, when: dayPhrase(best.day, today, lang) })
}
