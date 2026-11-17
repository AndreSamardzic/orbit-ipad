import { useEffect, useState } from 'react'
import { ArrowRight, Cake, Pin } from 'lucide-react'
import { Smiski } from '../smiski/Smiski.tsx'
import { Card, Section } from '../components/ui.tsx'
import { useData } from '../lib/store.ts'
import { useT } from '../lib/i18n.ts'
import { go } from '../lib/router.ts'
import { dayKey, dayPart, endMs, eventsOn, fmtDay, fmtTime, relDay, startMs } from '../lib/dates.ts'
import { TaskRow } from './Tasks.tsx'
import type { SmiskiPose } from '../smiski/poseTypes.ts'

const PART_POSE: Record<string, SmiskiPose> = { morning: 'coffee', day: 'typing', evening: 'lounging' }

function useNow(ms = 30_000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms)
    return () => clearInterval(t)
  }, [ms])
  return now
}

export function Start() {
  const d = useData()
  const { t, lang } = useT()
  const now = useNow()
  const today = dayKey(now)
  const part = dayPart(now)
  const name = d.settings.name.trim()
  const [q, setQ] = useState('')

  const todays = eventsOn(d.events, today)
  const next = todays.find((e) => !e.allDay && endMs(e) > now.getTime())
  const moodle = new Set(d.sources.filter((s) => s.kind === 'moodle').map((s) => s.id))
  const deadlines = d.events
    .filter((e) => moodle.has(e.sourceId) && startMs(e) >= now.getTime())
    .sort((a, b) => startMs(a) - startMs(b))
    .slice(0, 5)
  const open = d.tasks
    .filter((x) => !x.done)
    .sort((a, b) => a.prio - b.prio || (a.due ?? '9999').localeCompare(b.due ?? '9999'))
    .slice(0, 5)
  const doneToday = d.tasks.filter((x) => x.done && x.doneAt && dayKey(x.doneAt) === today).length
  const pinned = d.notes.filter((n) => n.pinned).slice(0, 4)
  const mmdd = today.slice(5)
  const bdays = d.people.filter((p) => p.birthday && p.birthday.slice(-5) === mmdd)
  const isEmpty = !d.events.length && !d.tasks.length && !d.notes.length

  return (
    <div className="page start">
      <header className={`hero hero-${part}`}>
        <Smiski pose={part === 'day' ? d.settings.mePose : PART_POSE[part]} size={96} />
        <div>
          <p className="muted">{fmtDay(today, lang)}</p>
          <h1>
            {t(`greet.${part}`)}
            {name ? `, ${name}` : ''}
          </h1>
          {doneToday > 0 && (
            <p className="muted">
              ✓ {doneToday} {t('start.doneToday')}
            </p>
          )}
        </div>
      </header>

      <form
        className="ask-line"
        onSubmit={(e) => {
          e.preventDefault()
          if (q.trim()) {
            sessionStorage.setItem('orbit-ask-draft', q.trim())
            go('ask')
          }
        }}
      >
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('start.ask')} enterKeyHint="send" />
        <button type="submit" className="icon-btn" aria-label={t('ask.send')}>
          <ArrowRight size={18} />
        </button>
      </form>

      {isEmpty && <p className="hint">{t('start.empty')}</p>}

      <div className="start-grid">
        <Section title={t('start.next')}>
          {next ? (
            <Card className="next-card" onClick={() => go('calendar')}>
              <span className="next-time">
                {fmtTime(startMs(next), lang)}–{fmtTime(endMs(next), lang)}
              </span>
              <strong>{next.title}</strong>
              {next.location && <span className="muted">{next.location}</span>}
            </Card>
          ) : (
            <p className="muted">{t('start.nothingNext')}</p>
          )}
          {todays.length > 0 && (
            <ol className="day-strip">
              {todays.map((e) => (
                <li key={e.id} className={!e.allDay && endMs(e) <= now.getTime() ? 'past' : ''}>
                  <span className="time">{e.allDay ? t('cal.allDay') : fmtTime(startMs(e), lang)}</span>
                  <span>{e.title}</span>
                </li>
              ))}
            </ol>
          )}
        </Section>

        <Section title={t('start.tasks')} count={d.tasks.filter((x) => !x.done).length} action={<button type="button" className="link-btn" onClick={() => go('tasks')}>→</button>}>
          {open.length ? (
            <ul className="list">
              {open.map((task) => (
                <TaskRow key={task.id} task={task} compact />
              ))}
            </ul>
          ) : (
            <p className="muted">{t('start.noTasks')}</p>
          )}
        </Section>

        <Section title={t('start.deadlines')} count={deadlines.length}>
          {deadlines.length ? (
            <ul className="list">
              {deadlines.map((e) => {
                const days = Math.round((new Date(dayKey(startMs(e))).getTime() - new Date(today).getTime()) / 86_400_000)
                return (
                  <li key={e.id} className={`row deadline ${days <= 1 ? 'urgent' : days <= 7 ? 'soon' : ''}`}>
                    <span className="time">{relDay(dayKey(startMs(e)), today, lang)}</span>
                    <span className="grow">
                      {e.title}
                      {e.category && <span className="muted small"> · {e.category}</span>}
                    </span>
                    {!e.allDay && <span className="muted small">{fmtTime(startMs(e), lang)}</span>}
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="muted">{t('start.noDeadlines')}</p>
          )}
        </Section>

        {(pinned.length > 0 || bdays.length > 0) && (
          <Section title={t('start.notes')}>
            <div className="chips">
              {bdays.map((p) => (
                <button key={p.id} type="button" className="chip" onClick={() => go('people', p.id)}>
                  <Cake size={14} /> {p.name}
                </button>
              ))}
              {pinned.map((n) => (
                <button key={n.id} type="button" className="chip" onClick={() => go('notes', n.id)}>
                  <Pin size={14} /> {n.title || n.body.slice(0, 30) || '…'}
                </button>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  )
}
