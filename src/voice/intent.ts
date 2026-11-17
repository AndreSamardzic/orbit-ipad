// What a short spoken (or typed) utterance means — local, instant, no Claude:
// yes / no / stop, "öffne <Seite>", "was steht heute an", "nächste Frist",
// "neue Aufgabe <text> [morgen | am Freitag | am 3. Dezember]", "hake <x> ab",
// "neue Notiz <text>", "wer hat heute Geburtstag". Everything else is `none`
// (→ Claude). German and English. Pure — test/voiceIntent.test.ts.
import type { Route } from '../lib/router.ts'
import type { Task } from '../lib/types.ts'
import { addDays, dayKey, parseDay } from '../lib/dates.ts'

export type Intent =
  | { kind: 'yes' }
  | { kind: 'no' }
  | { kind: 'stop' }
  | { kind: 'navigate'; route: Route }
  | { kind: 'agenda'; day: string }
  | { kind: 'nextDeadline' }
  | { kind: 'nextEvent' }
  | { kind: 'addTask'; title: string; due?: string }
  | { kind: 'completeTask'; query: string }
  | { kind: 'addNote'; text: string }
  | { kind: 'birthdays'; day: string }
  | { kind: 'nextBirthday' }
  | { kind: 'none'; text: string }

// ------------------------------------------------------------------ normalizing

/** Lower case, no diacritics (ä → a), ß → ss. */
export const fold = (s: string): string => s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/ß/g, 'ss')

/** Folded, punctuation → single spaces. */
export const norm = (s: string): string => fold(s).replace(/[^\p{L}\p{N}]+/gu, ' ').trim()

/** Levenshtein distance, capped (returns cap + 1 when larger). */
export function editDistance(a: string, b: string, cap = 3): number {
  if (Math.abs(a.length - b.length) > cap) return cap + 1
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    let rowMin = i
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
      cur.push(v)
      if (v < rowMin) rowMin = v
    }
    if (rowMin > cap) return cap + 1
    prev = cur
  }
  return prev[b.length]
}

/** Recognizer spelling tolerance: exact, 1 edit from 5 letters, 2 from 9. */
function near(heard: string, want: string): boolean {
  if (heard === want) return true
  const tol = want.length >= 9 ? 2 : want.length >= 5 ? 1 : 0
  return tol > 0 && editDistance(heard, want, tol) <= tol
}

// Unicode-aware word boundaries (JS \b treats ü as a boundary).
const B = '(?<![\\p{L}\\p{N}])'
const E = '(?![\\p{L}\\p{N}])'

// ------------------------------------------------------------------ dates

const MONTHS: Record<string, number> = {
  januar: 1, janner: 1, jaenner: 1, january: 1, jan: 1,
  februar: 2, february: 2, feb: 2,
  marz: 3, maerz: 3, march: 3, mar: 3,
  april: 4, apr: 4,
  mai: 5, may: 5,
  juni: 6, june: 6, jun: 6,
  juli: 7, july: 7, jul: 7,
  august: 8, aug: 8,
  september: 9, sept: 9, sep: 9,
  oktober: 10, october: 10, okt: 10, oct: 10,
  november: 11, nov: 11,
  dezember: 12, december: 12, dez: 12, dec: 12,
}
// Spelled with umlauts as the recognizer writes them; matched case-insensitively.
const MONTH_RE = '(januar|jänner|jaenner|january|februar|february|märz|maerz|marz|march|april|mai|may|juni|june|juli|july|august|september|oktober|october|november|dezember|december|jan|feb|mär|mar|apr|jun|jul|aug|sept|sep|okt|oct|nov|dez|dec)'

const WEEKDAYS: Record<string, number> = {
  sonntag: 0, sunday: 0, montag: 1, monday: 1, dienstag: 2, tuesday: 2, mittwoch: 3, wednesday: 3,
  donnerstag: 4, thursday: 4, freitag: 5, friday: 5, samstag: 6, sonnabend: 6, saturday: 6,
}
const WEEKDAY_RE = '(sonntag|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonnabend|sunday|monday|tuesday|wednesday|thursday|friday|saturday)'

/** German ordinal stems 1–31 (folded): "dritten" → 3. */
const ORD_DE: string[] = (() => {
  const u = ['', 'ein', 'zwei', 'drei', 'vier', 'funf', 'sechs', 'sieben', 'acht', 'neun']
  const base = ['', 'erst', 'zweit', 'dritt', 'viert', 'funft', 'sechst', 'siebt', 'acht', 'neunt', 'zehnt', 'elft', 'zwolft', 'dreizehnt', 'vierzehnt', 'funfzehnt', 'sechzehnt', 'siebzehnt', 'achtzehnt', 'neunzehnt', 'zwanzigst']
  for (let i = 1; i <= 9; i++) base[20 + i] = `${u[i]}undzwanzigst`
  base[30] = 'dreissigst'
  base[31] = 'einunddreissigst'
  return base
})()
const ORD_EN: Record<string, number> = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10, eleventh: 11, twelfth: 12, thirteenth: 13, fourteenth: 14, fifteenth: 15, sixteenth: 16, seventeenth: 17, eighteenth: 18, nineteenth: 19, twentieth: 20, thirtieth: 30 }
const NUM: Record<string, number> = { ein: 1, eine: 1, einen: 1, einem: 1, einer: 1, one: 1, a: 1, zwei: 2, two: 2, drei: 3, three: 3, vier: 4, four: 4, funf: 5, five: 5, sechs: 6, six: 6, sieben: 7, seven: 7, acht: 8, eight: 8, neun: 9, nine: 9, zehn: 10, ten: 10 }

/** "3", "3.", "3rd", "dritten", "third" → 3; otherwise null. */
function dayNumber(tok: string): number | null {
  const t = fold(tok).replace(/\.$/, '')
  const m = /^(\d{1,2})(?:st|nd|rd|th|ter|ten)?$/.exec(t)
  if (m) return Number(m[1])
  const de = /^(\p{L}+?)(?:e|en|er|es)?$/u.exec(t)
  if (de) {
    const i = ORD_DE.indexOf(de[1])
    if (i > 0) return i
    const j = ORD_DE.indexOf(t)
    if (j > 0) return j
  }
  if (t !== 'a' && NUM[t]) return NUM[t]
  return ORD_EN[t] ?? null
}

function ymd(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1) return null
  const dt = new Date(y, m - 1, d)
  if (dt.getMonth() !== m - 1) return null // 31. Februar
  return dayKey(dt)
}

/** A calendar date without a year means its next occurrence (today included). */
function upcoming(m: number, d: number, today: string, year?: number): string | null {
  if (year) return ymd(year, m, d)
  const y = parseDay(today).getFullYear()
  const first = ymd(y, m, d)
  if (!first) return ymd(y + 1, m, d)
  return first >= today ? first : ymd(y + 1, m, d)
}

/** Next occurrence of a weekday strictly after today (today's weekday → in a week). */
function nextWeekday(wd: number, today: string): string {
  const cur = parseDay(today).getDay()
  const diff = (wd - cur + 7) % 7 || 7
  return addDays(today, diff)
}

type DateRule = { re: RegExp; get: (m: RegExpExecArray, today: string) => string | null }

// Leading words that belong to the date phrase ("bis morgen", "am Freitag", "by Friday").
const PRE = `(?:(?:bis|für|fuer|am|an|zum|ab|spätestens|spaetestens|den|nächsten|naechsten|nächste|naechste|kommenden|kommende|diesen|diese|on|by|for|this|next|the|due|until|till|before)\\s+)*`
const rx = (core: string) => new RegExp(`${B}${PRE}${core}${E}`, 'iu')

const DATE_RULES: DateRule[] = [
  { re: rx('(?:übermorgen|uebermorgen|day after tomorrow)'), get: (_m, t) => addDays(t, 2) },
  { re: rx('(?:heute (?:morgen|früh|frueh|abend|nachmittag|mittag)|heute|today|tonight)'), get: (_m, t) => t },
  { re: rx('(?:morgen|tomorrow)(?:\\s+(?:früh|frueh|abend|nachmittag|mittag|morning|evening))?'), get: (_m, t) => addDays(t, 1) },
  { re: rx('(?:nächste woche|naechste woche|nachste woche|next week)'), get: (_m, t) => nextWeekday(1, t) },
  {
    re: rx('in\\s+(\\d{1,2}|\\p{L}+)\\s+(tag|tagen|tage|day|days|woche|wochen|week|weeks)'),
    get: (m, t) => {
      const n = /^\d+$/.test(m[1]) ? Number(m[1]) : NUM[fold(m[1])]
      if (!n) return null
      return addDays(t, /^(w)/i.test(m[2]) ? n * 7 : n)
    },
  },
  // "am 3. Dezember", "dritten Dezember 2027", "3 dec"
  {
    re: rx(`(\\d{1,2}\\.?|\\d{1,2}(?:st|nd|rd|th)|\\p{L}+)\\s+(?:of\\s+|des\\s+)?${MONTH_RE}\\.?(?:\\s+(\\d{4}))?`),
    get: (m, t) => {
      const d = dayNumber(m[1])
      const mon = MONTHS[fold(m[2])]
      return d && mon ? upcoming(mon, d, t, m[3] ? Number(m[3]) : undefined) : null
    },
  },
  // "December 3rd", "dec 3"
  {
    re: rx(`${MONTH_RE}\\.?\\s+(?:the\\s+)?(\\d{1,2})(?:st|nd|rd|th|\\.)?(?:,?\\s+(\\d{4}))?`),
    get: (m, t) => {
      const mon = MONTHS[fold(m[1])]
      return mon ? upcoming(mon, Number(m[2]), t, m[3] ? Number(m[3]) : undefined) : null
    },
  },
  // "3.12.", "03.12.2026", "3.12"
  {
    re: rx('(\\d{1,2})\\.(\\d{1,2})(?:\\.(\\d{4}|\\d{2})?)?'),
    get: (m, t) => {
      const y = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : undefined
      return upcoming(Number(m[2]), Number(m[1]), t, y)
    },
  },
  { re: rx(`${WEEKDAY_RE}`), get: (m, t) => nextWeekday(WEEKDAYS[fold(m[1])], t) },
]

/**
 * Finds a date phrase in `text` and returns it resolved (`YYYY-MM-DD`) plus the
 * text without it. `today` is the local day key the phrase is relative to.
 */
export function extractDate(text: string, today: string): { rest: string; due?: string } {
  for (const rule of DATE_RULES) {
    // first match whose content resolves (e.g. "Kapitel Dezember" is no date)
    const re = new RegExp(rule.re.source, 'giu')
    for (const m of text.matchAll(re)) {
      const due = rule.get(m as RegExpExecArray, today)
      if (!due) continue
      const idx = m.index ?? 0
      const rest = (text.slice(0, idx) + ' ' + text.slice(idx + m[0].length)).replace(/\s+/g, ' ')
      return { rest: tidy(rest), due }
    }
  }
  return { rest: tidy(text) }
}

/** Trims spaces, punctuation and dangling connectors left at the edges. */
function tidy(s: string): string {
  let t = s.replace(/\s+([,.;:!?])/g, '$1').trim()
  const edge = /^(?:[,.;:!?\-–—"„“”'»«]+|(?:und|and)(?=\s|$))\s*|\s*(?:[,;:!?\-–—"„“”'»«]+|(?<=\s)(?:und|and|bis|until|by|bitte|please))$/iu
  for (let i = 0; i < 6; i++) {
    const next = t.replace(edge, '').trim()
    if (next === t) break
    t = next
  }
  return t
}

// ------------------------------------------------------------------ yes / no / stop

const YES = new Set(['ja', 'jaa', 'jawohl', 'jawoll', 'jo', 'jap', 'jep', 'yes', 'yeah', 'yep', 'yup', 'klar', 'genau', 'okay', 'ok', 'okey', 'passt', 'richtig', 'korrekt', 'gerne', 'gern', 'sure', 'confirm', 'bestatigen', 'bestatige', 'einverstanden', 'los', 'mach', 'machs', 'mache', 'do', 'go', 'ahead', 'sicher', 'perfekt', 'super', 'gut', 'absolut', 'correct', 'right', 'fine'])
const NO = new Set(['nein', 'nee', 'ne', 'no', 'nope', 'nah', 'nicht', 'noe', 'lieber', 'falsch', 'wrong', 'dont', 'don'])
const FILLER = new Set(['bitte', 'danke', 'please', 'thanks', 'thank', 'you', 'das', 'es', 'it', 'that', 'doch', 'mal', 'schon', 'orbit', 'so', 'also', 'ah', 'oh', 'hm', 'hmm', 'aber', 'dann', 'ruhig', 't'])
const STOP = new Set([
  'stop', 'stopp', 'stoppen', 'halt', 'abbrechen', 'abbruch', 'cancel', 'ruhe', 'still', 'sei still', 'sei ruhig', 'hor auf', 'aufhoren', 'schluss', 'genug', 'es reicht',
  'quiet', 'be quiet', 'shut up', 'enough', 'never mind', 'nevermind', 'vergiss es', 'vergiss das', 'forget it', 'stop it', 'stop talking', 'ende', 'beenden', 'tschuss', 'bye',
])

function yesNo(n: string): 'yes' | 'no' | null {
  const toks = n.split(' ').filter(Boolean)
  if (!toks.length || toks.length > 6) return null
  const meaningful = toks.filter((t) => !FILLER.has(t))
  if (!meaningful.length) return toks.length === 1 && toks[0] === 'doch' ? 'yes' : null
  if (!meaningful.every((t) => YES.has(t) || NO.has(t))) return null
  return meaningful.some((t) => NO.has(t)) ? 'no' : 'yes'
}

function isStop(n: string): boolean {
  if (STOP.has(n)) return true
  const toks = n.split(' ').filter((t) => !['bitte', 'jetzt', 'mal', 'orbit', 'please', 'now', 'sofort'].includes(t))
  return toks.length > 0 && STOP.has(toks.join(' '))
}

// ------------------------------------------------------------------ pages

const PAGES: Array<[Route, string[]]> = [
  ['start', ['start', 'startseite', 'home', 'ubersicht', 'dashboard', 'anfang']],
  ['pulse', ['puls', 'pulse', 'pulsseite']],
  ['calendar', ['kalender', 'calendar', 'termine', 'stundenplan', 'vorlesungsplan', 'terminkalender']],
  ['tasks', ['aufgaben', 'aufgabe', 'todos', 'todo', 'to dos', 'to do', 'aufgabenliste', 'tasks', 'task list', 'to do liste', 'todo liste']],
  ['notes', ['notizen', 'notiz', 'notes', 'note', 'notizbuch']],
  ['people', ['personen', 'kontakte', 'leute', 'freunde', 'people', 'contacts', 'netzwerk', 'person']],
  ['ask', ['fragen', 'claude', 'chat', 'ask', 'frag claude', 'ask claude']],
  ['settings', ['einstellungen', 'settings', 'optionen', 'preferences', 'einstellung']],
]
const PAGE_NOISE = new Set(['den', 'die', 'das', 'dem', 'der', 'the', 'my', 'mein', 'meine', 'meinen', 'meinem', 'meiner', 'seite', 'page', 'ansicht', 'view', 'tab', 'bereich', 'bildschirm', 'screen', 'bitte', 'please', 'mal', 'jetzt', 'wieder', 'again', 'app', 'zur', 'zum', 'zu', 'to', 'auf', 'in', 'ins', 'an'])

/** The page a spoken name means ("die Einstellungen", "kalendar"), or null. */
export function matchPage(phrase: string): Route | null {
  const words = norm(phrase).split(' ').filter((w) => w && !PAGE_NOISE.has(w))
  if (!words.length || words.length > 3) return null
  const heard = words.join(' ')
  for (const [route, names] of PAGES) if (names.includes(heard)) return route
  const glued = words.join('')
  for (const [route, names] of PAGES) if (names.some((n) => near(glued, n.replace(/ /g, '')))) return route
  return null
}

const NAV_LEAD = /^(?:oeffne|offne|offnen|offen|oeffnen|zeig|zeige|zeigen|geh|gehe|gehen|wechsel|wechsle|wechseln|spring|springe|navigiere|bring|open|show|go|switch|take|jump)(?: (?:mir|mich|me|uns|bitte|mal|doch|please))*(?: (?:zu|zum|zur|nach|auf|in|ins|to|into|back to))?(?: (.+))?$/
const NAV_TRAIL = /^(.+?) (?:oeffnen|offnen|zeigen|anzeigen|aufmachen|aufrufen|open|show)$/

// ------------------------------------------------------------------ classify

const LEAD_FILLER = /^(?:(?:hey|hi|hallo|okay|ok|orbit|bitte|please|so|also|äh|ähm|und|and|kannst du(?: mir)?|könntest du(?: mir)?|koenntest du(?: mir)?|can you|could you|would you)[,!.:]?\s+)+/iu
const TAIL_FILLER = /(?:[,\s]+(?:bitte|please|danke|thanks|orbit))+[.!?]*$|[.!?]+$/iu

/** Classifies one utterance. `today` = local `YYYY-MM-DD`. */
export function classify(text: string, today: string): Intent {
  const raw = text.trim().replace(/\s+/g, ' ')
  const light = raw.replace(LEAD_FILLER, '').replace(TAIL_FILLER, '').trim()
  const n = norm(light)
  if (!n) return { kind: 'none', text: raw }

  if (isStop(n)) return { kind: 'stop' }
  const yn = yesNo(norm(raw))
  if (yn) return { kind: yn }

  // ---- pages
  const lead = NAV_LEAD.exec(n)
  if (lead?.[1]) {
    const route = matchPage(lead[1])
    if (route) return { kind: 'navigate', route }
  }
  const trail = NAV_TRAIL.exec(n)
  if (trail?.[1]) {
    const route = matchPage(trail[1])
    if (route) return { kind: 'navigate', route }
  }
  {
    const route = n.split(' ').length <= 2 ? matchPage(n) : null
    if (route && PAGES.some(([, names]) => names.includes(n))) return { kind: 'navigate', route }
  }

  // ---- new task
  const task =
    /^(?:(?:eine |einen )?neue[rns]? |leg(?:e)? (?:mir )?(?:eine |ein )?(?:neue[sn]? )?|erstell(?:e)? (?:mir )?(?:eine |ein )?(?:neue[sn]? )?|notier(?:e)? (?:mir )?(?:eine |als )?(?:neue )?|füg(?:e)? (?:eine )?(?:neue )?|fueg(?:e)? (?:eine )?(?:neue )?|add (?:a |an )?(?:new )?|create (?:a |an )?(?:new )?|new )(?:aufgabe|todo|to-do|to do|task)(?: (?:an|anlegen|hinzu|hinzufügen|erstellen|added))?\s*[:,\-–]?\s+(.+)$/iu.exec(light) ??
    /^(?:erinner(?:e)? mich(?: bitte)?(?: daran| dran)?,?(?: dass ich| das ich)?|remind me(?: to)?)\s+(.+)$/iu.exec(light)
  if (task) {
    let body = task[1]
    if (/^leg/i.test(light)) body = body.replace(/\s+an$/i, '')
    const { rest, due } = extractDate(body, today)
    const title = capitalize(rest.replace(/\s+(?:hinzu|an|anlegen|hinzufügen)$/i, '').trim())
    if (title) return { kind: 'addTask', title, due }
  }

  // ---- new note
  const note =
    /^(?:(?:eine )?neue |leg(?:e)? (?:mir )?(?:eine )?(?:neue )?|erstell(?:e)? (?:mir )?(?:eine )?(?:neue )?|mach(?:e)? (?:mir )?(?:eine )?|new |take (?:a )?|make (?:a )?|add (?:a )?)(?:notiz|note)(?: (?:an|anlegen|erstellen|hinzu))?\s*[:,\-–]?\s+(.+)$/iu.exec(light) ??
    /^(?:notier(?:e)?(?: dir| mir)?|schreib(?:e)? (?:dir |mir )?auf|note down|write down)[:,]?\s+(.+)$/iu.exec(light)
  if (note) {
    const body = capitalize(tidy(note[1]))
    if (body) return { kind: 'addNote', text: body }
  }

  // ---- check off a task
  const done =
    /^(?:hak(?:e)?|hake|streich(?:e)?)\s+(.+?)\s+(?:ab|durch)$/iu.exec(light) ??
    /^(?:i )?(?:finished|completed)\s+(.+)$/iu.exec(light) ??
    /^(?:erledige|markiere|check off|tick off|complete|mark)\s+(.+?)(?:\s+(?:als erledigt|als fertig|as done|as complete|as completed|done|off))?$/iu.exec(light) ??
    /^(?:ich habe|ich hab|hab|habe|i(?: have|'ve)?)\s+(.+?)\s+(?:erledigt|geschafft|fertig|abgeschlossen|done|finished|completed)$/iu.exec(light) ??
    /^(?:ich bin mit|bin mit)\s+(.+?)\s+fertig$/iu.exec(light) ??
    (/^(?:was|wie|wer|wann|wo|welche|what|how|who|when|which)\b/iu.test(light) ? null : /^(.+?)\s+(?:ist |is )?(?:erledigt|abgehakt|done|finished)$/iu.exec(light))
  if (done) {
    const query = done[1].replace(/^(?:die |the |meine |my )?(?:aufgabe|task|todo)\s+/iu, '').replace(/^(?:die|the|meine|my)\s+/iu, '').trim()
    if (query) return { kind: 'completeTask', query }
  }

  // ---- birthdays
  if (/\b(?:geburtstag|geburtstage|geburtstagskind|birthday|birthdays)\b/.test(n)) {
    if (/\b(?:nachste|nachster|nachsten|wann|next|upcoming|bald|demnachst)\b/.test(n)) return { kind: 'nextBirthday' }
    return { kind: 'birthdays', day: extractDate(light, today).due ?? today }
  }

  // ---- deadlines / next event
  if (
    /\b(?:nachste|nachster|nachsten|kommende|naechste) (?:frist|abgabe|deadline|abgabefrist)\b|\bwann (?:ist|sind|endet|kommt) (?:die |meine |der )?(?:nachste |nachsten )?(?:frist|fristen|abgabe|abgaben|deadline)\b|\bnext deadline\b|\bupcoming deadlines?\b|\bwhen is (?:my |the )?next (?:deadline|due date|submission)\b|^(?:fristen|deadlines|abgaben)$/.test(n)
  )
    return { kind: 'nextDeadline' }
  if (/\b(?:nachster|nachste|naechster) (?:termin|vorlesung|veranstaltung|kurs)\b|\bwas kommt als nachstes\b|\bnext (?:event|appointment|lecture|class|meeting)\b|\bwhat s next\b|\bwhat is next\b/.test(n))
    return { kind: 'nextEvent' }

  // ---- agenda ("was steht heute an", "what's on tomorrow")
  if (
    /\bwas (?:steht|stehen|liegt) (?:.* )?an\b|\bwas (?:steht|stehen) (?:heute|morgen|ubermorgen)\b|\bwas hab(?:e)? ich (?:heute|morgen|ubermorgen|am \p{L}+)\b|\bwas ist (?:heute|morgen|ubermorgen) (?:los|dran)\b|\bwie sieht (?:mein|der) (?:tag|heute|morgen)\b|\b(?:mein tag|meine termine|termine heute|termine morgen|tagesplan|tagesuberblick|tagesubersicht)\b|\bwhat s on\b|\bwhat is on\b|\bwhat do i have\b|\bmy (?:day|agenda|schedule)\b|^(?:agenda|heute|today)$/u.test(n)
  )
    return { kind: 'agenda', day: extractDate(light, today).due ?? today }

  return { kind: 'none', text: raw }
}

const capitalize = (s: string): string => (s ? s[0].toLocaleUpperCase('de-DE') + s.slice(1) : s)

// ------------------------------------------------------------------ task lookup

/** The open task a spoken name means ("mathe" → "Mathe lernen"), or null. */
export function findTask(query: string, tasks: readonly Task[]): Task | null {
  const q = norm(query)
  if (!q) return null
  const qt = q.split(' ').filter((w) => w.length >= 3)
  let best: { t: Task; s: number } | null = null
  for (const t of tasks) {
    if (t.done) continue
    const nt = norm(t.title)
    let s = 0
    if (nt === q) s = 100
    else if (nt.includes(q) || q.includes(nt)) s = 80 - Math.min(20, Math.abs(nt.length - q.length) / 2)
    else if (qt.length) {
      const words = nt.split(' ')
      const hits = qt.filter((w) => words.some((x) => x.startsWith(w) || near(x, w))).length
      s = (hits / qt.length) * 60
    }
    if (s > (best?.s ?? 0)) best = { t, s }
  }
  return best && best.s >= 30 ? best.t : null
}
