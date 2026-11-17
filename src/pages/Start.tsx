// Start — the iPad port of desktop ORBIT's start page. Top to bottom: greeting with date ·
// week · clock and the Morgen | Tag | Abend switch (follows the clock; a tap holds a mode,
// tapping the "auto" one lets go), the hero card for the mode with "Nächste Tage" below it,
// the orbit view, the day band, Top 3 next to the tiles, and the line to Claude.
// Everything comes from this iPad's own data. Claude is never called from here on its
// own: the brief / wrap-up / prepare buttons and the ask line only hand a question to the
// Ask page when tapped.
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { ArrowRight, CalendarDays, CalendarRange, Cake, Check, CheckSquare, ExternalLink, MessageCircle, Moon, Pin, Send, Sparkles, Sun, Sunrise } from 'lucide-react'
import type { SmiskiPose } from '../smiski/poseTypes.ts'
import { OrbitView } from '../components/OrbitView.tsx'
import { Section } from '../components/ui.tsx'
import { update, useData } from '../lib/store.ts'
import { useT } from '../lib/i18n.ts'
import { go } from '../lib/router.ts'
import { addDays, dayKey, fmtDay, fmtTime, parseDay } from '../lib/dates.ts'
import {
  agendaOf,
  bandRange,
  birthdays,
  daysAhead,
  daysUntil,
  doneOn,
  fill,
  firstOn,
  hm,
  isNight,
  isOverdue,
  isPast,
  isoWeek,
  kindsOf,
  lanes,
  laterAfterToday,
  modeOf,
  nextUp,
  planetsOf,
  relDays,
  restOfWeek,
  startStrings,
  topThree,
  upcomingDeadlines,
  type AgendaItem,
  type Planet,
  type StartMode,
  type StartStrings,
  type TopItem,
} from '../lib/start.ts'
import type { Lang } from '../lib/types.ts'
import { toggleTask } from './Tasks.tsx'
import '../styles/start.css'

const HOUR = 3_600_000

function useNow(ms = 30_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const tick = () => setNow(Date.now())
    const t = setInterval(tick, ms)
    const vis = () => document.visibilityState === 'visible' && tick()
    document.addEventListener('visibilitychange', vis)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', vis)
    }
  }, [ms])
  return now
}

/** Hands a question to the Ask page, which sends it right away. Only ever on a tap. */
function ask(text: string) {
  const v = text.trim()
  if (!v) return
  sessionStorage.setItem('orbit-ask-draft', v)
  go('ask')
}

const openUrl = (url: string) => window.open(url, '_blank', 'noopener')

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ')

interface Ctx {
  L: StartStrings
  lang: Lang
  now: number
  today: string
}

export function Start() {
  const d = useData()
  const { t, lang } = useT()
  const L = startStrings(lang)
  const now = useNow()
  const today = dayKey(now)
  const autoMode = modeOf(now)
  const hold = d.settings.dayModeHold
  const mode: StartMode = hold ?? autoMode
  const night = isNight(now)
  const name = d.settings.name.trim()
  const ctx: Ctx = { L, lang, now, today }

  const kinds = useMemo(() => kindsOf(d.sources), [d.sources])
  const agenda = useMemo(() => agendaOf(d.events, kinds, now), [d.events, kinds, now])
  const deadlines = useMemo(() => upcomingDeadlines(d.events, kinds, now), [d.events, kinds, now])
  const bdays = useMemo(() => birthdays(d.people, today), [d.people, today])
  const top = useMemo(() => topThree(d.tasks, deadlines, now), [d.tasks, deadlines, now])
  const [planets, hidden] = useMemo(() => planetsOf(agenda, { tasks: d.tasks, deadlines, birthdays: bdays }, now), [agenda, d.tasks, deadlines, bdays, now])

  const pose: SmiskiPose = night ? 'sleeping' : mode === 'morning' ? 'stretching' : mode === 'evening' ? 'lounging' : d.settings.mePose
  const hello = night ? L.hello.night : L.hello[autoMode]

  const pick = (m: StartMode) => update('settings', (s) => ({ ...s, dayModeHold: m === autoMode ? null : m }))

  const describe = (p: Planet): string => {
    const a = p.ref.agenda
    if (a) {
      const n = daysUntil(a.start, today)
      if (a.kind === 'deadline') return `${relDays(n, L)}${a.allDay ? '' : ` ${fmtTime(a.start, lang)}`}${a.category ? ` · ${a.category}` : ''}`
      return `${fmtTime(a.start, lang)}–${fmtTime(a.end, lang)}${a.location ? ` · ${a.location}` : ''}`
    }
    if (p.ref.task) {
      const x = p.ref.task
      return x.due ? relDays(daysUntil(parseDay(x.due).getTime(), today), L) : t(`tasks.prio${x.prio}`)
    }
    const b = p.ref.birthday
    if (b) return `${relDays(b.inDays, L)}${b.age !== null ? ` · ${b.age}` : ''}`
    return ''
  }
  const openPlanet = (p: Planet) => {
    if (p.ref.birthday) go('people', p.ref.birthday.person.id)
    else if (p.ref.task) go('tasks')
    else go('calendar')
  }

  return (
    <div className="page start" data-mode={mode}>
      <header className="start-head">
        <div className="start-head__text">
          <h1 className="start-head__hello">
            {hello}
            {name ? `, ${name}` : ''}
            {night ? '?' : ''}
          </h1>
          <p className="start-head__date">
            {fmtDay(today, lang)} · {fill(L.week, { n: isoWeek(now) })} · <span className="num">{fmtTime(now, lang)}</span>
          </p>
        </div>
        <ModeSwitch mode={mode} autoMode={autoMode} held={hold !== null} L={L} onPick={pick} />
      </header>

      <div className="start-grid">
        <div className="start-hero card">
          {mode === 'morning' && <MorningHero ctx={ctx} agenda={agenda} top={top} dueTasks={d.tasks.filter((x) => !x.done && !!x.due && x.due <= today).length} />}
          {mode === 'day' && <DayHero ctx={ctx} agenda={agenda} top={top} />}
          {mode === 'evening' && <EveningHero ctx={ctx} agenda={agenda} />}
          <DaysAhead ctx={ctx} />
        </div>
        <div className="start-orbit">
          <OrbitView planets={planets} hidden={hidden} now={now} pose={pose} L={L} describe={describe} onOpen={openPlanet} />
        </div>
      </div>

      <DayBand ctx={ctx} agenda={agenda} />

      <div className="start-lower">
        <Section title={L.top} count={top.length} action={<button type="button" className="link-btn start-more" onClick={() => go('tasks')}>{L.topMore} <ArrowRight size={14} /></button>}>
          {top.length === 0 ? <p className="muted">{L.topEmpty}</p> : <TopList ctx={ctx} items={top} />}
        </Section>
        <Section title={L.tiles}>
          <Tiles ctx={ctx} deadlines={deadlines} bdays={bdays} />
        </Section>
      </div>

      <AskLine L={L} />
    </div>
  )
}

// ------------------------------------------------------------------ header

function ModeSwitch({ mode, autoMode, held, L, onPick }: { mode: StartMode; autoMode: StartMode; held: boolean; L: StartStrings; onPick: (m: StartMode) => void }) {
  const items: Array<{ m: StartMode; icon: ReactNode }> = [
    { m: 'morning', icon: <Sunrise size={17} strokeWidth={1.75} /> },
    { m: 'day', icon: <Sun size={17} strokeWidth={1.75} /> },
    { m: 'evening', icon: <Moon size={17} strokeWidth={1.75} /> },
  ]
  return (
    <div className="start-mode" role="radiogroup" aria-label={L.modeLabel} title={held ? L.heldHint : L.autoHint}>
      {items.map(({ m, icon }) => (
        <button key={m} type="button" role="radio" aria-checked={mode === m} className={cx('start-mode__btn', mode === m && 'is-active')} onClick={() => onPick(m)}>
          {icon}
          <span>{L.mode[m]}</span>
          {m === autoMode && <span className={cx('start-mode__auto', held && 'is-held')}>{L.auto}</span>}
        </button>
      ))}
    </div>
  )
}

// ------------------------------------------------------------------ heroes

function HeroHead({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="hero-head">
      <span className="hero-head__icon">{icon}</span>
      <h2 className="hero-head__title">{title}</h2>
      <span className="grow" />
      {children}
    </div>
  )
}

function AgendaLine({ ctx, a, strong }: { ctx: Ctx; a: AgendaItem; strong?: boolean }) {
  const { L, lang, now } = ctx
  const time = a.allDay ? '—' : a.kind === 'deadline' ? fmtTime(a.start, lang) : `${fmtTime(a.start, lang)}–${fmtTime(a.end, lang)}`
  return (
    <button type="button" className={cx('agenda-line', `is-${a.kind}`, strong && 'is-strong', isPast(a, now) && a.kind !== 'deadline' && 'is-past')} onClick={() => go('calendar')}>
      <span className="agenda-line__time num">{time}</span>
      <span className="agenda-line__dot" aria-hidden />
      <span className="agenda-line__title ellipsis">{a.title}</span>
      <span className="agenda-line__kind">{L.kind[a.kind]}</span>
    </button>
  )
}

function ClaudeBtn({ label, prompt }: { label: string; prompt: string }) {
  return (
    <button type="button" className="btn hero-claude" onClick={() => ask(prompt)}>
      <Sparkles size={16} strokeWidth={1.75} /> {label}
    </button>
  )
}

function MorningHero({ ctx, agenda, top, dueTasks }: { ctx: Ctx; agenda: AgendaItem[]; top: TopItem[]; dueTasks: number }) {
  const { L, now } = ctx
  const events = agenda.filter((a) => a.kind === 'event' && !a.allDay).length
  const lectures = agenda.filter((a) => a.kind === 'lecture').length
  const deadlines = agenda.filter((a) => a.kind === 'deadline').length
  const parts = [events && L.events(events), lectures && L.lectures(lectures), deadlines && L.deadlines(deadlines), dueTasks && L.dueTasks(dueTasks)].filter(Boolean) as string[]
  const upcoming = agenda.filter((a) => !a.allDay && !isPast(a, now))
  return (
    <>
      <HeroHead icon={<Sunrise size={18} strokeWidth={1.75} />} title={L.morningTitle}>
        <ClaudeBtn label={L.brief} prompt={L.promptMorning} />
      </HeroHead>
      <p className="hero-summary">{parts.length ? parts.join(' · ') : L.morningFree}</p>
      {upcoming.length > 0 && (
        <div className="hero-block">
          <div className="hero-block__label">{L.first}</div>
          <div className="agenda-list">
            {upcoming.slice(0, 4).map((a, i) => (
              <AgendaLine key={a.id} ctx={ctx} a={a} strong={i === 0} />
            ))}
          </div>
        </div>
      )}
      {top[0] && <StartWith ctx={ctx} item={top[0]} label={L.startWith} />}
    </>
  )
}

function topWhy(x: TopItem, ctx: Ctx): string | null {
  if (x.kind === 'deadline' && x.due !== null) return [fmtTime(x.due, ctx.lang), x.why].filter(Boolean).join(' · ')
  return x.why
}

function StartWith({ ctx, item, label }: { ctx: Ctx; item: TopItem; label: string }) {
  const why = topWhy(item, ctx)
  return (
    <div className="hero-block">
      <div className="hero-block__label">{label}</div>
      <button type="button" className={cx('hero-start', `is-sev-${item.severity}`)} onClick={() => go(item.kind === 'task' ? 'tasks' : 'calendar')}>
        <span className="hero-start__title">{item.title}</span>
        {(why || item.due !== null) && <span className="hero-start__why">{why ?? relDays(daysUntil(item.due!, ctx.today), ctx.L)}</span>}
        <ArrowRight size={16} strokeWidth={1.75} className="hero-start__go" aria-hidden />
      </button>
    </div>
  )
}

function DayHero({ ctx, agenda, top }: { ctx: Ctx; agenda: AgendaItem[]; top: TopItem[] }) {
  const { L, lang, now, today } = ctx
  const d = useData()
  const kinds = useMemo(() => kindsOf(d.sources), [d.sources])
  const { current, next, after } = nextUp(agenda, now)
  const focus = current ?? next
  const then = current ? next : after
  const earlier = agenda.filter((a) => !a.allDay && isPast(a, now)).slice(-3)
  const later = useMemo(() => (focus ? null : laterAfterToday(d.events, kinds, now)), [focus, d.events, kinds, now])

  return (
    <>
      <HeroHead icon={<Sun size={18} strokeWidth={1.75} />} title={L.dayTitle} />
      {!focus ? (
        <div className="hero-block">
          <p className="hero-summary">{L.nothingMore}</p>
          {later && (
            <button type="button" className="hero-later" onClick={() => go('calendar')}>
              <span className="muted">{L.later}:</span> {later.title} · {relDays(daysUntil(later.start, today), L)} <span className="num">{fmtTime(later.start, lang)}</span>
            </button>
          )}
        </div>
      ) : (
        <NextCard ctx={ctx} a={focus} running={focus === current} />
      )}
      {focus && then && (
        <div className="hero-block">
          <div className="hero-block__label">{L.after}</div>
          <div className="agenda-list">
            <AgendaLine ctx={ctx} a={then} />
          </div>
        </div>
      )}
      {top[0] && <StartWith ctx={ctx} item={top[0]} label={L.focus} />}
      {earlier.length > 0 && (
        <div className="hero-block">
          <div className="hero-block__label">{L.earlier}</div>
          <div className="agenda-list">
            {earlier.map((a) => (
              <AgendaLine key={a.id} ctx={ctx} a={a} />
            ))}
          </div>
        </div>
      )}
    </>
  )
}

function NextCard({ ctx, a, running }: { ctx: Ctx; a: AgendaItem; running: boolean }) {
  const { L, lang, now } = ctx
  const cd = (ms: number) => {
    const { h, m } = hm(ms)
    return L.cd(h, m)
  }
  const soon = !running && a.start - now <= 15 * 60_000
  return (
    <div className={cx('next-card', `is-${a.kind}`, running && 'is-running', soon && 'is-soon')}>
      <div className="next-card__count">
        <span className="next-card__badge">{running ? L.now : L.kind[a.kind]}</span>
        <span className="next-card__big num">{running ? fill(L.left, { d: cd(a.end - now) }) : fill(L.in, { d: cd(a.start - now) })}</span>
      </div>
      <button type="button" className="next-card__title" onClick={() => go('calendar')}>
        {a.title}
      </button>
      <div className="next-card__meta">
        <span className="num">{a.kind === 'deadline' ? fill(L.dueAtTime, { time: fmtTime(a.start, lang) }) : `${fmtTime(a.start, lang)}–${fmtTime(a.end, lang)}`}</span>
        {a.location && <span> · {a.location}</span>}
        {a.category && <span> · {a.category}</span>}
      </div>
      <div className="next-card__foot">
        <span className="grow" />
        {a.url && (
          <button type="button" className="btn ghost" onClick={() => openUrl(a.url!)}>
            <ExternalLink size={16} strokeWidth={1.75} /> {L.openLink}
          </button>
        )}
        {a.kind !== 'deadline' && <ClaudeBtn label={L.prep} prompt={fill(L.promptPrep, { title: a.title, time: fmtTime(a.start, lang) })} />}
      </div>
    </div>
  )
}

function EveningHero({ ctx, agenda }: { ctx: Ctx; agenda: AgendaItem[] }) {
  const { L, lang, now, today } = ctx
  const d = useData()
  const kinds = useMemo(() => kindsOf(d.sources), [d.sources])
  const tomorrow = addDays(today, 1)
  const done = useMemo(() => doneOn(d.tasks, today), [d.tasks, today])
  const behind = agenda.filter((a) => a.kind !== 'deadline' && !a.allDay && a.end <= now).length
  const first = useMemo(() => firstOn(d.events, kinds, tomorrow), [d.events, kinds, tomorrow])
  const dlTomorrow = useMemo(() => agendaOf(d.events, kinds, parseDay(tomorrow).getTime(), tomorrow).filter((a) => a.kind === 'deadline').length, [d.events, kinds, tomorrow])

  return (
    <>
      <HeroHead icon={<Moon size={18} strokeWidth={1.75} />} title={L.eveningTitle}>
        <ClaudeBtn label={L.wrap} prompt={L.promptEvening} />
      </HeroHead>
      {(done.length > 0 || behind > 0) && (
        <div className="done-stats">
          {done.length > 0 && <span className="done-stat">{L.doneTasks(done.length)}</span>}
          {behind > 0 && <span className="done-stat">{L.behind(behind)}</span>}
        </div>
      )}
      {done.length === 0 && behind === 0 && <p className="hero-summary">{L.eveningNothing}</p>}
      {done.length > 0 && (
        <ul className="done-list">
          {done.slice(0, 5).map((x) => (
            <li key={x.id} className="done-list__item">
              <span className="done-list__check" aria-hidden>
                <Check size={14} strokeWidth={3} />
              </span>
              {x.title}
            </li>
          ))}
        </ul>
      )}
      <div className="hero-block">
        <div className="hero-block__label">{L.tomorrow}</div>
        {first ? (
          <button type="button" className="hero-later" onClick={() => go('calendar')}>
            <span className="num">{fmtTime(first.start, lang)}</span> {first.title}
            {first.location && <span className="muted"> · {first.location}</span>}
          </button>
        ) : (
          <p className="muted">{L.tomorrowFree}</p>
        )}
        {dlTomorrow > 0 && <p className="hero-warn">{L.tomorrowDeadlines(dlTomorrow)}</p>}
      </div>
    </>
  )
}

// ------------------------------------------------------------------ days ahead

function DaysAhead({ ctx }: { ctx: Ctx }) {
  const { L, lang, today } = ctx
  const d = useData()
  const kinds = useMemo(() => kindsOf(d.sources), [d.sources])
  const from = addDays(today, 1)
  const days = useMemo(() => daysAhead(d.events, kinds, from, 5), [d.events, kinds, from])
  if (d.events.length === 0) return null
  return (
    <div className="hero-block days-ahead">
      <div className="hero-block__label">{L.ahead}</div>
      <div className="days-ahead__row">
        {days.map((x) => {
          const wd = parseDay(x.day).getDay()
          const empty = x.events + x.lectures + x.deadlines === 0
          return (
            <button key={x.day} type="button" className={cx('ahead-day', (wd === 0 || wd === 6) && 'is-weekend', empty && 'is-empty')} onClick={() => go('calendar')}>
              <span className="ahead-day__name">
                {fmtDay(x.day, lang, { weekday: 'short' })} <span className="num muted">{Number(x.day.slice(8))}.</span>
              </span>
              <span className="ahead-day__marks">
                {x.events > 0 && <span className="ahead-mark is-event num">{x.events}</span>}
                {x.lectures > 0 && <span className="ahead-mark is-lecture num">{x.lectures}</span>}
                {x.deadlines > 0 && <span className="ahead-mark is-deadline num">{x.deadlines}</span>}
                {empty && <span className="muted">{L.free}</span>}
              </span>
              {x.first && <span className="ahead-day__first">{x.first}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ day band

function DayBand({ ctx, agenda }: { ctx: Ctx; agenda: AgendaItem[] }) {
  const { L, lang, now } = ctx
  const timed = agenda.filter((a) => !a.allDay)
  const allDay = agenda.filter((a) => a.allDay)
  const blocks = timed.filter((a) => a.kind !== 'deadline')
  const marks = timed.filter((a) => a.kind === 'deadline')
  const d0 = new Date(now)
  d0.setHours(0, 0, 0, 0)
  const base = d0.getTime()
  const hourOf = (ts: number) => (ts - base) / HOUR
  const { from, to } = bandRange(timed, now)
  const pct = (ts: number) => ((Math.min(Math.max(hourOf(ts), from), to) - from) / (to - from)) * 100
  const lane = lanes(blocks)
  const nLanes = Math.max(1, ...[...lane.values()].map((l) => l + 1))
  const nowPct = hourOf(now) >= from && hourOf(now) <= to ? pct(now) : null
  const hours = Array.from({ length: to - from + 1 }, (_, i) => from + i).filter((h) => (h - from) % 2 === 0)
  const allDayText = allDay.map((a) => (a.kind === 'deadline' ? `${L.kind.deadline}: ${a.title}` : a.title)).join(', ')

  return (
    <Section
      title={L.band}
      count={timed.length}
      action={
        <button type="button" className="link-btn start-more" onClick={() => go('calendar')}>
          {L.toCalendar} <ArrowRight size={14} />
        </button>
      }
    >
      {allDay.length > 0 && <p className="day-band__allday muted">{fill(L.bandAllDay, { list: allDayText })}</p>}
      <div className="day-band card" style={{ ['--lanes' as string]: String(nLanes) }}>
        <div className="day-band__track">
          {hours.map((h) => (
            <span key={h} className={cx('day-band__hour num', nowPct !== null && Math.abs(h - hourOf(now)) < 0.6 && 'is-hidden')} style={{ left: `${((h - from) / (to - from)) * 100}%` }}>
              {String(h).padStart(2, '0')}
            </span>
          ))}
          {blocks.map((a) => {
            const left = pct(a.start)
            const width = Math.max(1.5, pct(a.end) - left)
            const label = `${fmtTime(a.start, lang)}–${fmtTime(a.end, lang)} · ${a.title}${a.location ? ` · ${a.location}` : ''}`
            return (
              <button
                key={a.id}
                type="button"
                className={cx('day-band__block', `is-${a.kind}`, a.end <= now && 'is-past', a.start <= now && now < a.end && 'is-now')}
                style={{ left: `${left}%`, width: `${width}%`, top: `calc(24px + ${lane.get(a.id) ?? 0} * var(--lane-h))` }}
                aria-label={label}
                onClick={() => go('calendar')}
              >
                <span className="ellipsis">{a.title}</span>
              </button>
            )
          })}
          {marks.map((a) => (
            <button
              key={a.id}
              type="button"
              className={cx('day-band__mark', a.start < now && 'is-past')}
              style={{ left: `${pct(a.start)}%` }}
              aria-label={`${L.kind.deadline} ${fmtTime(a.start, lang)}: ${a.title}`}
              onClick={() => (a.url ? openUrl(a.url) : go('calendar'))}
            />
          ))}
          {nowPct !== null && <span className="day-band__now" style={{ left: `${nowPct}%` }} data-label={fmtTime(now, lang)} />}
          {timed.length === 0 && <span className="day-band__empty muted">{L.bandEmpty}</span>}
        </div>
      </div>
    </Section>
  )
}

// ------------------------------------------------------------------ top three + tiles

function TopList({ ctx, items }: { ctx: Ctx; items: TopItem[] }) {
  const { L, now, today } = ctx
  return (
    <ol className="top-list card">
      {items.map((x, i) => {
        const why = topWhy(x, ctx)
        const late = x.due !== null && (x.task ? isOverdue(x.task, today) : x.due < now)
        return (
          <li key={x.id} className={cx('top-item', `is-sev-${x.severity}`)}>
            <span className="top-item__rank num">{i + 1}</span>
            {x.task ? (
              <button type="button" className="check" role="checkbox" aria-checked={false} aria-label={x.title} onClick={() => toggleTask(x.task!.id)} />
            ) : (
              <span className="top-item__sev" aria-hidden />
            )}
            <button type="button" className="top-item__main" onClick={() => go(x.task ? 'tasks' : 'calendar')}>
              <span className="top-item__title">{x.title}</span>
              {why && <span className="top-item__why ellipsis">{why}</span>}
            </button>
            {x.due !== null && <span className={cx('tag', late && 'is-danger')}>{relDays(daysUntil(x.due, today), L)}</span>}
          </li>
        )
      })}
    </ol>
  )
}

function Tile({ icon, label, value, sub, onClick, tone }: { icon: ReactNode; label: string; value: ReactNode; sub?: ReactNode; onClick: () => void; tone?: 'warn' }) {
  return (
    <button type="button" className={cx('start-tile card', tone && `is-${tone}`)} onClick={onClick}>
      <span className="start-tile__label">
        {icon}
        {label}
      </span>
      <span className="start-tile__value num">{value}</span>
      {sub && <span className="start-tile__sub ellipsis">{sub}</span>}
    </button>
  )
}

function Tiles({ ctx, deadlines, bdays }: { ctx: Ctx; deadlines: AgendaItem[]; bdays: ReturnType<typeof birthdays> }) {
  const { L, today } = ctx
  const d = useData()
  const ic = { size: 15, strokeWidth: 1.75 }
  const next = deadlines[0] ?? null
  const nextIn = next ? daysUntil(next.start, today) : null
  const open = d.tasks.filter((x) => !x.done)
  const overdue = open.filter((x) => isOverdue(x, today)).length
  const dueToday = open.filter((x) => x.due === today).length
  const bday = bdays[0] ?? null
  const pinned = d.notes.filter((n) => n.pinned).sort((a, b) => b.updatedAt - a.updatedAt)
  const chats = [...d.chats].sort((a, b) => b.updatedAt - a.updatedAt)
  const hasMoodle = d.sources.some((s) => s.kind === 'moodle')
  const kinds = useMemo(() => kindsOf(d.sources), [d.sources])
  const week = useMemo(() => restOfWeek(d.events, kinds, ctx.now), [d.events, kinds, ctx.now])

  return (
    <div className="start-tiles">
      {hasMoodle && (
        <Tile
          icon={<CalendarDays {...ic} />}
          label={L.tileDeadline}
          value={nextIn === null ? '–' : relDays(nextIn, L)}
          sub={next ? next.title : L.noDeadline}
          tone={nextIn !== null && nextIn <= 1 ? 'warn' : undefined}
          onClick={() => go('calendar')}
        />
      )}
      <Tile
        icon={<CheckSquare {...ic} />}
        label={L.tileTasks}
        value={open.length}
        sub={overdue ? L.overdue(overdue) : dueToday ? L.dueToday(dueToday) : L.allClear}
        tone={overdue ? 'warn' : undefined}
        onClick={() => go('tasks')}
      />
      {d.people.some((p) => p.birthday) && (
        <Tile
          icon={<Cake {...ic} />}
          label={L.tileBirthday}
          value={bday ? relDays(bday.inDays, L) : '–'}
          sub={bday ? (bday.age !== null ? L.turns(bday.person.name, bday.age) : bday.person.name) : L.noBirthday}
          tone={bday && bday.inDays === 0 ? 'warn' : undefined}
          onClick={() => (bday ? go('people', bday.person.id) : go('people'))}
        />
      )}
      <Tile
        icon={<Pin {...ic} />}
        label={L.tilePinned}
        value={pinned.length}
        sub={pinned[0] ? pinned[0].title || pinned[0].body.slice(0, 40) || '…' : L.noPinned}
        onClick={() => (pinned.length === 1 ? go('notes', pinned[0].id) : go('notes'))}
      />
      {d.events.length > 0 && (
        <Tile icon={<CalendarRange {...ic} />} label={L.tileWeek} value={week.events + week.lectures} sub={L.weekSub(week.lectures, week.deadlines)} onClick={() => go('calendar')} />
      )}
      <Tile icon={<MessageCircle {...ic} />} label={L.tileChats} value={chats.length} sub={chats[0]?.title || L.noChats} onClick={() => go('ask')} />
    </div>
  )
}

// ------------------------------------------------------------------ ask

function AskLine({ L }: { L: StartStrings }) {
  const [text, setText] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    ask(text)
    setText('')
  }
  return (
    <form className="start-ask card" onSubmit={submit}>
      <Sparkles size={18} strokeWidth={1.75} className="start-ask__icon" aria-hidden />
      <input className="start-ask__input" value={text} onChange={(e) => setText(e.target.value)} placeholder={L.ask} aria-label={L.ask} enterKeyHint="send" />
      <button type="submit" className="btn primary start-ask__send" disabled={!text.trim()}>
        <Send size={16} strokeWidth={1.75} /> {L.send}
      </button>
    </form>
  )
}
