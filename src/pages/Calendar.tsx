import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Trash2, Upload } from 'lucide-react'
import { Card, Empty, FileButton, PageHead, Section, Segmented, toast } from '../components/ui.tsx'
import { Smiski } from '../smiski/Smiski.tsx'
import { useData } from '../lib/store.ts'
import { useT } from '../lib/i18n.ts'
import { addDays, dayKey, endMs, eventsOn, fmtDay, fmtTime, parseDay, relDay, startMs } from '../lib/dates.ts'
import { importIcs, removeSource, setSourceKind } from '../lib/calendar.ts'
import type { CalEvent, SourceKind } from '../lib/types.ts'

function weekDays(day: string): string[] {
  const d = parseDay(day)
  const monday = addDays(day, -((d.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

export function Calendar() {
  const data = useData()
  const { t, lang } = useT()
  const today = dayKey(new Date())
  const [day, setDay] = useState(today)
  const [view, setView] = useState<'day' | 'week'>(() => (window.innerWidth >= 1000 ? 'week' : 'day'))
  const kindOf = useMemo(() => new Map(data.sources.map((s) => [s.id, s.kind])), [data.sources])
  const days = view === 'week' ? weekDays(day) : [day]
  const step = view === 'week' ? 7 : 1

  const onFile = (text: string, name: string) => {
    try {
      const r = importIcs(text, name)
      toast(t('cal.imported', { n: r.count, name: r.name }))
    } catch {
      toast(t('cal.importFailed'))
    }
  }

  return (
    <div className="page">
      <PageHead
        title={t('nav.calendar')}
        sub={fmtDay(day, lang, { month: 'long', year: 'numeric' })}
        actions={
          <>
            <Segmented label={t('nav.calendar')} value={view} onChange={setView} options={[{ value: 'day', label: t('cal.day') }, { value: 'week', label: t('cal.week') }]} />
            <FileButton accept=".ics,text/calendar" multiple label={<><Upload size={16} /> {t('cal.import')}</>} onText={onFile} />
          </>
        }
      />
      <div className="cal-nav">
        <button type="button" className="icon-btn" onClick={() => setDay(addDays(day, -step))} aria-label="‹">
          <ChevronLeft size={20} />
        </button>
        <button type="button" className="btn" onClick={() => setDay(today)}>
          {t('cal.today')}
        </button>
        <button type="button" className="icon-btn" onClick={() => setDay(addDays(day, step))} aria-label="›">
          <ChevronRight size={20} />
        </button>
      </div>

      <div className={`cal-days ${view}`}>
        {days.map((dk) => {
          const list = eventsOn(data.events, dk)
          return (
            <section key={dk} className={`cal-day ${dk === today ? 'is-today' : ''}`}>
              <h3>
                <span>{relDay(dk, today, lang)}</span>
                {view === 'week' && <span className="muted small">{fmtDay(dk, lang, { day: 'numeric', month: 'numeric' })}</span>}
              </h3>
              {list.length === 0 ? <p className="muted small">{view === 'day' ? t('cal.empty') : '—'}</p> : list.map((e) => <EventItem key={e.id} e={e} kind={kindOf.get(e.sourceId) ?? 'other'} />)}
            </section>
          )
        })}
      </div>

      <Section title={t('cal.sources')} count={data.sources.length}>
        {data.sources.length === 0 ? (
          <Empty art={<Smiski pose="map" size={72} />}>{t('cal.noSources')}</Empty>
        ) : (
          <ul className="list">
            {data.sources.map((s) => (
              <li key={s.id} className="row">
                <span className="grow">
                  <strong>{s.name}</strong>
                  <span className="muted small">
                    {' '}
                    · {s.count} {t('cal.events')} · {t('cal.updated')} {new Date(s.importedAt).toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB')}
                  </span>
                </span>
                <select value={s.kind} onChange={(e) => setSourceKind(s.id, e.target.value as SourceKind)} aria-label={t('cal.sourceKind')}>
                  <option value="lectures">{t('cal.kind.lectures')}</option>
                  <option value="moodle">{t('cal.kind.moodle')}</option>
                  <option value="other">{t('cal.kind.other')}</option>
                </select>
                <button type="button" className="icon-btn danger" onClick={() => removeSource(s.id)} aria-label={t('cal.remove')}>
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="hint">{t('cal.importHint')}</p>
      </Section>
    </div>
  )
}

function EventItem({ e, kind }: { e: CalEvent; kind: SourceKind }) {
  const { t, lang } = useT()
  const [open, setOpen] = useState(false)
  const point = !e.allDay && endMs(e) === startMs(e)
  return (
    <Card className={`event kind-${kind}`} onClick={() => setOpen(!open)}>
      <span className="event-time">{e.allDay ? t('cal.allDay') : point ? fmtTime(startMs(e), lang) : `${fmtTime(startMs(e), lang)}–${fmtTime(endMs(e), lang)}`}</span>
      <span className="event-title">{e.title}</span>
      {(e.location || e.category) && <span className="muted small">{[e.location, e.category].filter(Boolean).join(' · ')}</span>}
      {open && e.description && <span className="event-desc">{e.description}</span>}
      {open && e.url && (
        <a href={e.url} target="_blank" rel="noreferrer" onClick={(ev) => ev.stopPropagation()}>
          {new URL(e.url).hostname}
        </a>
      )}
    </Card>
  )
}
