// The command registry: every page and every app action ORBIT can run without a
// specific item, as plain data plus a run function. The search palette lists
// them (groups "Seiten" / "Aktionen"); the voice assistant can match the same
// list (`label`, `keywords`, `spoken`) and call `runCommand()`.
//
// API (kept deliberately small):
//   COMMANDS                      — all commands, in palette order
//   commandLabel(cmd, lang, text) — display label (uses `labelWithText` when text is given)
//   findCommand(id)               — lookup by id
//   runCommand(id, text?)         — run by id; returns false for an unknown id
//
// `text` is the free text the user typed or said ("Neue Aufgabe: Bahnticket
// buchen"); commands with `takesText` use it, the others ignore it.
import { getData, uid, update } from './store.ts'
import { go, type Route } from './router.ts'
import type { Lang } from './types.ts'

export type Label = Record<Lang, string>

export interface Command {
  /** Stable id: `page:<route>` for pages, otherwise a verb (`task.new`, `theme.toggle` …). */
  id: string
  group: 'pages' | 'actions'
  label: Label
  /** Label once free text is known; `{text}` is replaced. Only for `takesText` commands. */
  labelWithText?: Label
  /** Extra search words, de + en, lower case. */
  keywords: string
  /** What may be said after "öffne / zeig / mach …" (lower case, de + en). */
  spoken: string[]
  /** The command uses the typed/spoken text (task title, note title, question). */
  takesText?: boolean
  /** Shown on an empty palette query. */
  featured?: boolean
  run(text?: string): void
}

/** Session key the Ask page reads once on mount (see pages/Ask.tsx). */
export const ASK_DRAFT_KEY = 'orbit-ask-draft'

/** Creates an open task (priority medium, no date) and returns its id. */
export function addTask(title: string): string {
  const id = uid()
  update('tasks', (prev) => [...prev, { id, title: title.trim(), done: false, prio: 2, createdAt: Date.now() }])
  return id
}

/** Creates a note and returns its id. */
export function addNote(title = ''): string {
  const id = uid()
  update('notes', (prev) => [...prev, { id, title: title.trim(), body: '', pinned: false, updatedAt: Date.now() }])
  return id
}

export function askClaude(question: string): void {
  if (question.trim()) sessionStorage.setItem(ASK_DRAFT_KEY, question.trim())
  go('ask')
}

/** Flips between light and dark, starting from what is shown right now (also when the setting is "system"). */
export function toggleTheme(): void {
  const dark = document.documentElement.dataset.theme === 'dark'
  update('settings', (s) => ({ ...s, theme: dark ? 'light' : 'dark' }))
}

export function toggleLang(): void {
  update('settings', (s) => ({ ...s, lang: s.lang === 'de' ? 'en' : 'de' }))
}

const page = (route: Route, label: Label, keywords: string, spoken: string[]): Command => ({
  id: `page:${route}`,
  group: 'pages',
  label,
  keywords,
  spoken,
  featured: true,
  run: () => go(route),
})

export const COMMANDS: Command[] = [
  page('start', { de: 'Start', en: 'Start' }, 'start home übersicht overview heute today', ['start', 'startseite', 'home', 'übersicht']),
  page('pulse', { de: 'Puls', en: 'Pulse' }, 'puls pulse radar wichtig important brennt heat', ['puls', 'pulse', 'radar']),
  page('calendar', { de: 'Kalender', en: 'Calendar' }, 'kalender calendar termine events vorlesungen lectures moodle fristen deadlines woche week', ['kalender', 'calendar', 'termine', 'vorlesungsplan']),
  page('tasks', { de: 'Aufgaben', en: 'Tasks' }, 'aufgaben tasks todos to-dos erledigen', ['aufgaben', 'tasks', 'todos', 'to-dos']),
  page('notes', { de: 'Notizen', en: 'Notes' }, 'notizen notes markdown', ['notizen', 'notes']),
  page('people', { de: 'Personen', en: 'People' }, 'personen people kontakte contacts leute smiski netzwerk network', ['personen', 'people', 'kontakte', 'leute']),
  page('ask', { de: 'Fragen', en: 'Ask' }, 'fragen ask claude chat', ['fragen', 'ask', 'claude', 'chat']),
  page('settings', { de: 'Einstellungen', en: 'Settings' }, 'einstellungen settings preferences backup api key', ['einstellungen', 'settings']),
  {
    id: 'task.new',
    group: 'actions',
    label: { de: 'Neue Aufgabe', en: 'New task' },
    labelWithText: { de: 'Neue Aufgabe: „{text}“', en: 'New task: “{text}”' },
    keywords: 'neue aufgabe new task todo anlegen add erstellen create',
    spoken: ['neue aufgabe', 'aufgabe anlegen', 'new task', 'add task'],
    takesText: true,
    featured: true,
    run: (text) => {
      if (text?.trim()) addTask(text)
      go('tasks')
    },
  },
  {
    id: 'note.new',
    group: 'actions',
    label: { de: 'Neue Notiz', en: 'New note' },
    labelWithText: { de: 'Neue Notiz: „{text}“', en: 'New note: “{text}”' },
    keywords: 'neue notiz new note anlegen add erstellen create schreiben write',
    spoken: ['neue notiz', 'notiz anlegen', 'new note'],
    takesText: true,
    featured: true,
    run: (text) => go('notes', addNote(text)),
  },
  {
    id: 'ask.claude',
    group: 'actions',
    label: { de: 'Claude fragen', en: 'Ask Claude' },
    labelWithText: { de: 'Claude fragen: „{text}“', en: 'Ask Claude: “{text}”' },
    keywords: 'claude fragen ask frage question ki ai chat',
    spoken: ['claude fragen', 'frag claude', 'ask claude'],
    takesText: true,
    run: (text) => askClaude(text ?? ''),
  },
  {
    id: 'theme.toggle',
    group: 'actions',
    label: { de: 'Hell/Dunkel umschalten', en: 'Toggle light/dark' },
    keywords: 'design theme dunkel dark hell light modus mode nacht night',
    spoken: ['dunkelmodus', 'hellmodus', 'dark mode', 'light mode'],
    featured: true,
    run: toggleTheme,
  },
  {
    id: 'lang.toggle',
    group: 'actions',
    label: { de: 'Switch to English', en: 'Auf Deutsch umschalten' },
    keywords: 'sprache language deutsch german englisch english',
    spoken: ['sprache', 'language', 'englisch', 'english', 'deutsch', 'german'],
    featured: true,
    run: toggleLang,
  },
  {
    id: 'ics.import',
    group: 'actions',
    label: { de: 'Kalender (.ics) importieren', en: 'Import calendar (.ics)' },
    keywords: 'ics import importieren kalender calendar moodle vorlesungsplan datei file',
    spoken: ['kalender importieren', 'import calendar'],
    run: () => go('calendar'),
  },
]

export function commandLabel(cmd: Command, lang: Lang, text?: string): string {
  const t = text?.trim()
  return t && cmd.labelWithText ? cmd.labelWithText[lang].replace('{text}', t) : cmd.label[lang]
}

export const findCommand = (id: string): Command | undefined => COMMANDS.find((c) => c.id === id)

export function runCommand(id: string, text?: string): boolean {
  const cmd = findCommand(id)
  if (!cmd) return false
  cmd.run(text)
  return true
}

/** Current UI language, for callers outside React (the voice agent). */
export const currentLang = (): Lang => getData().settings.lang
