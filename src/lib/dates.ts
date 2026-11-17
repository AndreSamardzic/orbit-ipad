import type { CalEvent, Lang } from './types.ts'

export const DAY = 86_400_000
const pad = (n: number) => String(n).padStart(2, '0')

export const dayKey = (d: Date | number): string => {
  const x = new Date(d)
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`
}

export function parseDay(day: string): Date {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(day: string, n: number): string {
  const d = parseDay(day)
  d.setDate(d.getDate() + n)
  return dayKey(d)
}

export const startMs = (e: Pick<CalEvent, 'start' | 'allDay'>): number => (e.allDay ? parseDay(e.start).getTime() : Date.parse(e.start))

export function endMs(e: Pick<CalEvent, 'start' | 'end' | 'allDay'>): number {
  if (e.end) return e.allDay ? parseDay(e.end).getTime() : Date.parse(e.end)
  return e.allDay ? startMs(e) + DAY : startMs(e)
}

/** Events touching the local day, sorted (all-day first, then by time). */
export function eventsOn(events: readonly CalEvent[], day: string): CalEvent[] {
  const from = parseDay(day).getTime()
  const to = from + DAY
  return events
    .filter((e) => {
      const s = startMs(e)
      const en = endMs(e)
      return en > s ? s < to && en > from : s >= from && s < to
    })
    .sort((a, b) => Number(b.allDay) - Number(a.allDay) || startMs(a) - startMs(b) || a.title.localeCompare(b.title))
}

const locale = (lang: Lang) => (lang === 'de' ? 'de-DE' : 'en-GB')

export const fmtTime = (ms: number, lang: Lang): string => new Date(ms).toLocaleTimeString(locale(lang), { hour: '2-digit', minute: '2-digit' })

export const fmtDay = (day: string, lang: Lang, opts: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' }): string =>
  parseDay(day).toLocaleDateString(locale(lang), opts)

export function relDay(day: string, today: string, lang: Lang): string {
  const diff = Math.round((parseDay(day).getTime() - parseDay(today).getTime()) / DAY)
  const words = lang === 'de' ? { '-1': 'Gestern', '0': 'Heute', '1': 'Morgen' } : { '-1': 'Yesterday', '0': 'Today', '1': 'Tomorrow' }
  return (words as Record<string, string>)[String(diff)] ?? fmtDay(day, lang, { weekday: 'short', day: 'numeric', month: 'short' })
}

export type DayPart = 'morning' | 'day' | 'evening'
export function dayPart(now: Date): DayPart {
  const h = now.getHours()
  return h < 11 ? 'morning' : h < 18 ? 'day' : 'evening'
}
