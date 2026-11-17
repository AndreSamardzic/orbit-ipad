// Puls — what matters right now, computed on the iPad from local data
// (lib/pulse.ts: heat + status per item). No Claude calls, no network.
import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronRight, Flame } from 'lucide-react'
import { Smiski } from '../smiski/Smiski.tsx'
import type { SmiskiPose } from '../smiski/poseTypes.ts'
import { Empty, toast } from '../components/ui.tsx'
import { update, useData } from '../lib/store.ts'
import { useT } from '../lib/i18n.ts'
import { go } from '../lib/router.ts'
import { DAY, dayKey, fmtDay, fmtTime, parseDay, relDay } from '../lib/dates.ts'
import { CRITICAL, PULSE_STATUSES, computePulse, type PulseItem, type PulseReason, type PulseStatus } from '../lib/pulse.ts'
import type { Lang } from '../lib/types.ts'
import '../styles/pulse.css'

const L = {
  de: {
    title: 'Puls',
    nothing: 'Nichts Kritisches.',
    burning: (n: number) => (n === 1 ? '1 Ding brennt.' : `${n} Dinge brennen.`),
    overdueOnly: (n: number) => `Nichts brennt – aber ${n === 1 ? '1 Sache ist' : `${n} Sachen sind`} überfällig.`,
    asOf: (time: string) => `Stand ${time} · berechnet auf dem iPad aus Aufgaben, Kalender, Notizen, Personen und Chats`,
    active: 'Aktiv',
    status: { new: 'Neu', heating: 'Heizt auf', blocked: 'Blockiert', stable: 'Stabil', cooling: 'Kühlt ab', resolved: 'Erledigt' },
    statusHint: {
      blocked: 'überfällig',
      heating: 'in den nächsten zwei Tagen',
      new: 'frisch angelegt oder bearbeitet',
      stable: 'steht an, ohne Druck',
      cooling: 'liegt lange unberührt',
      resolved: 'heute erledigt oder vorbei',
    },
    kind: { deadline: 'Moodle-Frist', task: 'Aufgabe', lecture: 'Vorlesung', event: 'Termin', note: 'Notiz', birthday: 'Geburtstag', person: 'Person', chat: 'Chat' },
    showAll: (n: number) => `Alle ${n} zeigen`,
    showLess: 'Weniger zeigen',
    check: 'Abhaken',
    checked: (t: string) => `Abgehakt: ${t}`,
    empty: 'Hier pulsiert noch nichts. Leg Aufgaben an, importiere den DHBW-Kalender oder schreib eine Notiz – dann zeigt der Puls, was gerade wichtig ist.',
    emptyFilter: 'Nichts in dieser Gruppe.',
    heat: 'Hitze',
    how: 'Wie entsteht die Hitze?',
    howText: [
      'Hitze = 50 % Dringlichkeit + 25 % Wichtigkeit + 10 % Frische + 15 % überfällig (0–100). Ab 70 brennt es.',
      'Dringlichkeit: überfällig oder heute = 1, morgen 0,63, in 2 Tagen 0,40, in einer Woche 0,04. Termine nach Stunden: halbiert sich alle 12 Stunden.',
      'Wichtigkeit: Moodle-Frist 1 · Aufgabe hoch/mittel/niedrig 1/0,5/0,1 · Geburtstag 0,6 · Termin 0,5 · Vorlesung 0,4 · Notiz 0,3 (angeheftet 0,6) · Chat, Person 0,3.',
      'Frische: halbiert sich alle 3 Tage seit Anlegen bzw. letzter Bearbeitung.',
    ],
    overdue: (n: number) => (n === 1 ? 'seit 1 Tag überfällig' : `seit ${n} Tagen überfällig`),
    dueToday: 'heute fällig',
    dueTomorrow: 'morgen fällig',
    dueIn: (n: number, date: string) => `in ${n} Tagen fällig · ${date}`,
    passed: (when: string) => `abgelaufen ${when}`,
    running: (end: string) => `läuft gerade · bis ${end}`,
    bdayToday: 'hat heute Geburtstag',
    bdayTomorrow: 'hat morgen Geburtstag',
    bdayIn: (n: number) => `Geburtstag in ${n} Tagen`,
    turns: (n: number) => `wird ${n}`,
    untouched: (n: number) => (n >= 14 ? `seit ${Math.floor(n / 7)} Wochen unberührt` : `seit ${n} Tagen unberührt`),
    edited: (when: string) => `bearbeitet ${when}`,
    messages: (n: number) => `${n} Nachrichten`,
    openSince: (n: number) => (n === 0 ? 'heute angelegt' : n === 1 ? 'seit gestern offen' : `seit ${n} Tagen offen`),
    doneAt: (time: string) => `erledigt um ${time}`,
    minAgo: (n: number) => (n <= 1 ? 'gerade eben' : `vor ${n} Min.`),
    hAgo: (n: number) => `vor ${n} Std.`,
  },
  en: {
    title: 'Pulse',
    nothing: 'Nothing critical.',
    burning: (n: number) => (n === 1 ? '1 thing is on fire.' : `${n} things are on fire.`),
    overdueOnly: (n: number) => `Nothing on fire – but ${n === 1 ? '1 thing is' : `${n} things are`} overdue.`,
    asOf: (time: string) => `As of ${time} · computed on this iPad from tasks, calendar, notes, people and chats`,
    active: 'Active',
    status: { new: 'New', heating: 'Heating', blocked: 'Blocked', stable: 'Stable', cooling: 'Cooling', resolved: 'Resolved' },
    statusHint: {
      blocked: 'overdue',
      heating: 'within the next two days',
      new: 'just added or edited',
      stable: 'coming up, no pressure',
      cooling: 'untouched for a long time',
      resolved: 'done today or passed',
    },
    kind: { deadline: 'Moodle deadline', task: 'Task', lecture: 'Lecture', event: 'Event', note: 'Note', birthday: 'Birthday', person: 'Person', chat: 'Chat' },
    showAll: (n: number) => `Show all ${n}`,
    showLess: 'Show less',
    check: 'Check off',
    checked: (t: string) => `Checked off: ${t}`,
    empty: 'Nothing pulsing yet. Add tasks, import your DHBW calendar or write a note – the pulse then shows what matters right now.',
    emptyFilter: 'Nothing in this group.',
    heat: 'Heat',
    how: 'How is heat computed?',
    howText: [
      'Heat = 50 % urgency + 25 % importance + 10 % freshness + 15 % overdue (0–100). From 70 on it is on fire.',
      'Urgency: overdue or today = 1, tomorrow 0.63, in 2 days 0.40, in a week 0.04. Events by hours: halves every 12 hours.',
      'Importance: Moodle deadline 1 · task high/medium/low 1/0.5/0.1 · birthday 0.6 · event 0.5 · lecture 0.4 · note 0.3 (pinned 0.6) · chat, person 0.3.',
      'Freshness: halves every 3 days since created or last edited.',
    ],
    overdue: (n: number) => (n === 1 ? '1 day overdue' : `${n} days overdue`),
    dueToday: 'due today',
    dueTomorrow: 'due tomorrow',
    dueIn: (n: number, date: string) => `due in ${n} days · ${date}`,
    passed: (when: string) => `passed ${when}`,
    running: (end: string) => `running · until ${end}`,
    bdayToday: 'birthday today',
    bdayTomorrow: 'birthday tomorrow',
    bdayIn: (n: number) => `birthday in ${n} days`,
    turns: (n: number) => `turns ${n}`,
    untouched: (n: number) => (n >= 14 ? `untouched for ${Math.floor(n / 7)} weeks` : `untouched for ${n} days`),
    edited: (when: string) => `edited ${when}`,
    messages: (n: number) => `${n} messages`,
    openSince: (n: number) => (n === 0 ? 'added today' : n === 1 ? 'open since yesterday' : `open for ${n} days`),
    doneAt: (time: string) => `done at ${time}`,
    minAgo: (n: number) => (n <= 1 ? 'just now' : `${n} min ago`),
    hAgo: (n: number) => `${n} h ago`,
  },
}

type Strings = (typeof L)['de']

function useNow(ms = 60_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(t)
  }, [ms])
  return now
}

/** relDay mid-sentence: "morgen 13:00", but weekdays/dates keep their case ("Mo., 23. Nov."). */
function rel(day: string, today: string, lang: Lang): string {
  const r = relDay(day, today, lang)
  return Math.abs(Math.round((parseDay(day).getTime() - parseDay(today).getTime()) / DAY)) <= 1 ? r.toLowerCase() : r
}

function ago(ms: number, now: number, s: Strings, lang: Lang): string {
  const min = Math.round((now - ms) / 60_000)
  if (min < 60) return s.minAgo(min)
  if (min < 12 * 60) return s.hAgo(Math.round(min / 60))
  return `${rel(dayKey(ms), dayKey(now), lang)} ${fmtTime(ms, lang)}`
}

function reasonText(r: PulseReason, now: number, s: Strings, lang: Lang): string {
  const today = dayKey(now)
  switch (r.code) {
    case 'overdue':
      return s.overdue(r.days)
    case 'due': {
      const time = r.at !== undefined ? ` · ${fmtTime(r.at, lang)}` : ''
      if (r.days === 0) return s.dueToday + time
      if (r.days === 1) return s.dueTomorrow + time
      return s.dueIn(r.days, fmtDay(dayKey(r.at ?? now + r.days * DAY), lang, { weekday: 'short', day: 'numeric', month: 'short' })) + time
    }
    case 'passed':
      return s.passed(`${rel(dayKey(r.at), today, lang)} ${fmtTime(r.at, lang)}`)
    case 'appointment':
      return r.running ? s.running(fmtTime(r.end, lang)) : `${rel(dayKey(r.at), today, lang)} ${fmtTime(r.at, lang)}–${fmtTime(r.end, lang)}`
    case 'edited':
      return s.edited(ago(r.at, now, s, lang))
    case 'birthday': {
      const base = r.days === 0 ? s.bdayToday : r.days === 1 ? s.bdayTomorrow : s.bdayIn(r.days)
      return r.age ? `${base} · ${s.turns(r.age)}` : base
    }
    case 'untouched':
      return s.untouched(r.days)
    case 'chat':
      return `${s.messages(r.count)} · ${ago(r.at, now, s, lang)}`
    case 'open':
      return s.openSince(r.days)
    case 'done':
      return s.doneAt(fmtTime(r.at, lang))
  }
}

function open(it: PulseItem) {
  if (it.kind === 'chat') {
    // the Ask page shows the first chat in the list
    update('chats', (prev) => {
      const c = prev.find((x) => x.id === it.refId)
      return c ? [c, ...prev.filter((x) => x.id !== c.id)] : prev
    })
  }
  go(it.route, it.param)
}

function checkTask(id: string, title: string, s: Strings) {
  update('tasks', (prev) => prev.map((x) => (x.id === id ? { ...x, done: true, doneAt: Date.now() } : x)))
  toast(s.checked(title))
}

type Filter = 'active' | PulseStatus
const LEFT: PulseStatus[] = ['blocked', 'heating', 'new']
const RIGHT: PulseStatus[] = ['stable', 'cooling', 'resolved']
const ROW_LIMIT = 6

export function Pulse() {
  const data = useData()
  const { lang } = useT()
  const s = L[lang]
  const now = useNow()
  const [filter, setFilter] = useState<Filter>('active')
  const pulse = useMemo(() => computePulse(data, now), [data, now])
  const poseOf = useMemo(() => new Map(data.people.map((p) => [p.id, p.pose])), [data.people])

  const blocked = pulse.counts.blocked
  const critical = pulse.critical.length
  const headline = critical > 0 ? s.burning(critical) : blocked > 0 ? s.overdueOnly(blocked) : s.nothing
  const mood: SmiskiPose = pulse.items.length === 0 ? 'sleeping' : critical > 0 ? 'lifting' : blocked > 0 ? 'peeking' : 'lounging'

  const byStatus = useMemo(() => {
    const m = new Map<PulseStatus, PulseItem[]>()
    for (const it of pulse.items) m.set(it.status, [...(m.get(it.status) ?? []), it])
    return m
  }, [pulse.items])

  const section = (st: PulseStatus) => {
    const list = byStatus.get(st) ?? []
    if (list.length === 0) return null
    return <StatusSection key={st} status={st} items={list} now={now} s={s} lang={lang} poseOf={poseOf} />
  }

  return (
    <div className="page pulse">
      <header className="pulse-hero">
        <Smiski pose={mood} size={84} busy={critical > 0} label={headline} />
        <div className="pulse-hero__text">
          <h1>{s.title}</h1>
          <p className={`pulse-headline ${critical > 0 ? 'is-critical' : blocked > 0 ? 'is-warn' : ''}`} role="status">
            {critical > 0 && <Flame size={18} strokeWidth={2} aria-hidden />}
            {headline}
          </p>
          <p className="pulse-asof">{s.asOf(fmtTime(now, lang))}</p>
        </div>
      </header>

      {pulse.items.length === 0 ? (
        <Empty art={<Smiski pose="sleeping" size={96} />}>{s.empty}</Empty>
      ) : (
        <>
          <div className="chips pulse-chips" role="group" aria-label={s.title}>
            <button type="button" className={`chip ${filter === 'active' ? 'on' : ''}`} aria-pressed={filter === 'active'} onClick={() => setFilter('active')}>
              {s.active}
              <span className="chip-count">{pulse.items.length - pulse.counts.resolved}</span>
            </button>
            {PULSE_STATUSES.filter((st) => pulse.counts[st] > 0).map((st) => (
              <button key={st} type="button" className={`chip ${filter === st ? 'on' : ''}`} aria-pressed={filter === st} onClick={() => setFilter(filter === st ? 'active' : st)}>
                <span className={`st-dot st-bg--${st}`} aria-hidden />
                {s.status[st]}
                <span className="chip-count">{pulse.counts[st]}</span>
              </button>
            ))}
          </div>

          {filter === 'active' ? (
            <div className="pulse-grid">
              <div className="pulse-col">{LEFT.map(section)}</div>
              <div className="pulse-col">{RIGHT.map(section)}</div>
            </div>
          ) : (
            <div className="pulse-col">{section(filter) ?? <p className="muted">{s.emptyFilter}</p>}</div>
          )}

          <details className="pulse-how">
            <summary>{s.how}</summary>
            {s.howText.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </details>
        </>
      )}
    </div>
  )
}

function StatusSection({ status, items, now, s, lang, poseOf }: { status: PulseStatus; items: PulseItem[]; now: number; s: Strings; lang: Lang; poseOf: Map<string, SmiskiPose> }) {
  const [all, setAll] = useState(false)
  const shown = all ? items : items.slice(0, ROW_LIMIT)
  return (
    <section className={`section pulse-sec st-sec--${status}`}>
      <header className="section-head">
        <h2 className="section-label">
          <span className="ring" aria-hidden />
          {s.status[status]}
          <span className="count">{items.length}</span>
        </h2>
        <span className="pulse-sec__hint">{s.statusHint[status]}</span>
      </header>
      <ul className="list pulse-list">
        {shown.map((it) => (
          <PulseRow key={it.id} it={it} now={now} s={s} lang={lang} pose={it.kind === 'person' || it.kind === 'birthday' ? poseOf.get(it.refId) : undefined} />
        ))}
        {items.length > ROW_LIMIT && (
          <li className="pulse-more">
            <button type="button" className="link-btn" onClick={() => setAll((v) => !v)}>
              {all ? s.showLess : s.showAll(items.length)}
            </button>
          </li>
        )}
      </ul>
    </section>
  )
}

function PulseRow({ it, now, s, lang, pose }: { it: PulseItem; now: number; s: Strings; lang: Lang; pose?: SmiskiPose }) {
  const hot = it.status !== 'resolved' && it.heat >= CRITICAL
  return (
    <li className={`pulse-li ${it.status === 'resolved' ? 'is-resolved' : ''}`}>
      <button type="button" className="pulse-row" onClick={() => open(it)}>
        <span className={`pulse-heat ${hot ? 'is-hot' : ''}`} title={`${s.heat} ${it.heat}`}>
          {hot ? <Flame size={16} strokeWidth={1.9} aria-hidden /> : <span className={`st-dot st-bg--${it.status}`} aria-hidden />}
          <span className="num">{it.heat}</span>
        </span>
        <span className="pulse-main">
          <span className="pulse-title">
            {pose && <Smiski pose={pose} variant="head" size={20} interactive={false} />}
            <span>{it.title}</span>
          </span>
          <span className="pulse-meta">
            <span className={`st st--${it.status}`}>{s.status[it.status]}</span>
            <span>{s.kind[it.kind]}</span>
            <span className={it.reason.code === 'overdue' ? 'is-overdue' : ''}>{reasonText(it.reason, now, s, lang)}</span>
            {it.detail && <span className="faint">{it.detail}</span>}
          </span>
        </span>
        {!(it.kind === 'task' && it.status !== 'resolved') && <ChevronRight size={18} className="pulse-chev" aria-hidden />}
      </button>
      {it.kind === 'task' && it.status !== 'resolved' && (
        <button type="button" className="pulse-check" onClick={() => checkTask(it.refId, it.title, s)} aria-label={`${s.check}: ${it.title}`} title={s.check}>
          <Check size={16} strokeWidth={2.2} />
        </button>
      )}
    </li>
  )
}
