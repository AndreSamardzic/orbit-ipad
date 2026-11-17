import { useData } from './store.ts'
import type { Lang } from './types.ts'

const de = {
  'nav.start': 'Start', 'nav.calendar': 'Kalender', 'nav.tasks': 'Aufgaben', 'nav.notes': 'Notizen', 'nav.people': 'Personen', 'nav.ask': 'Fragen', 'nav.settings': 'Einstellungen',
  'greet.morning': 'Guten Morgen', 'greet.day': 'Hallo', 'greet.evening': 'Guten Abend',
  'start.next': 'Als Nächstes', 'start.nothingNext': 'Heute steht nichts mehr an.', 'start.today': 'Heute', 'start.deadlines': 'Fristen', 'start.noDeadlines': 'Keine offenen Fristen.',
  'start.tasks': 'Wichtigste Aufgaben', 'start.noTasks': 'Keine offenen Aufgaben.', 'start.notes': 'Angeheftet', 'start.birthdays': 'Geburtstage', 'start.ask': 'Frag Claude …',
  'start.empty': 'Noch leer hier. Leg Aufgaben an oder importiere deinen DHBW-Kalender unter Kalender.',
  'start.doneToday': 'heute erledigt',
  'cal.import': '.ics importieren', 'cal.importHint': 'In Safari den Kalender als .ics herunterladen (Moodle: Kalender → Exportieren; Vorlesungsplan: iCal-Export) und hier aus „Dateien“ wählen. Erneuter Import derselben Quelle ersetzt deren Termine.',
  'cal.sources': 'Quellen', 'cal.noSources': 'Noch keine Kalender importiert.', 'cal.kind.lectures': 'Vorlesungen', 'cal.kind.moodle': 'Moodle-Fristen', 'cal.kind.other': 'Sonstiges',
  'cal.remove': 'Entfernen', 'cal.events': 'Termine', 'cal.allDay': 'ganztägig', 'cal.empty': 'Keine Termine an diesem Tag.', 'cal.today': 'Heute', 'cal.imported': '{n} Termine aus „{name}“ importiert.',
  'cal.importFailed': 'Die Datei enthält keine lesbaren Termine.', 'cal.sourceName': 'Name der Quelle', 'cal.sourceKind': 'Art', 'cal.week': 'Woche', 'cal.day': 'Tag', 'cal.updated': 'Stand',
  'tasks.add': 'Neue Aufgabe …', 'tasks.open': 'Offen', 'tasks.done': 'Erledigt', 'tasks.none': 'Nichts offen. 🎉', 'tasks.due': 'Fällig', 'tasks.noDue': 'Ohne Datum', 'tasks.overdue': 'Überfällig',
  'tasks.prio': 'Priorität', 'tasks.prio1': 'Hoch', 'tasks.prio2': 'Mittel', 'tasks.prio3': 'Niedrig', 'tasks.clearDone': 'Erledigte löschen', 'tasks.delete': 'Löschen',
  'notes.new': 'Neue Notiz', 'notes.empty': 'Noch keine Notizen.', 'notes.title': 'Titel', 'notes.body': 'Schreib los … (Markdown geht)', 'notes.pin': 'Anheften', 'notes.unpin': 'Lösen', 'notes.delete': 'Notiz löschen',
  'notes.pick': 'Wähl links eine Notiz oder leg eine neue an.', 'notes.edit': 'Bearbeiten', 'notes.preview': 'Vorschau', 'notes.search': 'Notizen durchsuchen',
  'people.add': 'Person anlegen', 'people.import': 'Kontakte (.vcf) importieren', 'people.empty': 'Noch niemand hier. Leg Personen an oder teile Kontakte aus der Kontakte-App als .vcf.',
  'people.name': 'Name', 'people.note': 'Notizen', 'people.tags': 'Tags (mit Komma trennen)', 'people.email': 'E-Mail', 'people.phone': 'Telefon', 'people.birthday': 'Geburtstag', 'people.pose': 'Pose',
  'people.delete': 'Person löschen', 'people.imported': '{n} Personen importiert.', 'people.search': 'Suchen', 'people.back': 'Zurück', 'people.all': 'Alle',
  'ask.placeholder': 'Frag Claude …', 'ask.send': 'Senden', 'ask.stop': 'Stopp', 'ask.newChat': 'Neuer Chat', 'ask.noKey': 'Für Fragen direkt in ORBIT brauchst du einen API-Key aus deinem privaten Anthropic-Konto (console.anthropic.com). Trag ihn unter Einstellungen ein.',
  'ask.openClaude': 'In Claude öffnen', 'ask.openClaudeHint': 'Öffnet die Frage samt Kontext in der Claude-App bzw. claude.ai – mit deinem privaten Claude-Konto, ohne API-Key.',
  'ask.context': 'Kontext mitsenden', 'ask.hello': 'Hallo{name}! Was möchtest du wissen?', 'ask.deleteChat': 'Chat löschen', 'ask.chats': 'Chats', 'ask.error': 'Fehler', 'ask.copy': 'Kopieren',
  'ask.s1': 'Was steht heute an?', 'ask.s2': 'Mach mir einen Lernplan bis zur nächsten Frist', 'ask.s3': 'Fass meine offenen Aufgaben zusammen', 'ask.s4': 'Woran sollte ich zuerst arbeiten?',
  'set.profile': 'Profil', 'set.name': 'Dein Vorname', 'set.mePose': 'Deine Pose', 'set.look': 'Darstellung', 'set.theme': 'Design', 'set.theme.system': 'System', 'set.theme.light': 'Hell', 'set.theme.dark': 'Dunkel',
  'set.lang': 'Sprache', 'set.glow': 'Smiskis leuchten im Dunkeln', 'set.motion': 'Animationen', 'set.claude': 'Claude (privates Konto)', 'set.apiKey': 'API-Key', 'set.apiKeyHint': 'Bleibt nur auf diesem iPad (nicht im Backup). Geht direkt an api.anthropic.com. Kosten laufen über dein privates Konto.',
  'set.model': 'Modell', 'set.shareContext': 'Heutige Termine, offene Aufgaben und angeheftete Notizen mitsenden', 'set.data': 'Daten', 'set.export': 'Backup exportieren', 'set.importBackup': 'Backup importieren',
  'set.wipe': 'Alles löschen', 'set.wipeConfirm': 'Wirklich alle Daten auf diesem iPad löschen? Das lässt sich nicht rückgängig machen.', 'set.importConfirm': 'Backup einspielen? Die aktuellen Daten werden ersetzt (der API-Key bleibt).',
  'set.imported': 'Backup eingespielt.', 'set.importFailed': 'Das ist keine ORBIT-iPad-Sicherung.', 'set.persist': 'Speicher dauerhaft', 'set.persistNo': 'Safari darf den Speicher bei Platzmangel leeren – exportiere ab und zu ein Backup.',
  'set.about': 'Über', 'set.aboutText': 'ORBIT fürs iPad läuft komplett auf diesem Gerät. Keine Arbeitsdaten, kein Server – nur Claude-Anfragen verlassen das iPad, und nur wenn du fragst.',
  'set.install': 'Auf den Home-Bildschirm: In Safari „Teilen“ → „Zum Home-Bildschirm“.', 'set.counts': '{t} Aufgaben · {n} Notizen · {p} Personen · {e} Termine',
  'common.save': 'Speichern', 'common.cancel': 'Abbrechen', 'common.delete': 'Löschen', 'common.close': 'Schließen', 'common.edit': 'Bearbeiten', 'common.offline': 'Offline',
} as const

type Key = keyof typeof de

const en: Record<Key, string> = {
  'nav.start': 'Start', 'nav.calendar': 'Calendar', 'nav.tasks': 'Tasks', 'nav.notes': 'Notes', 'nav.people': 'People', 'nav.ask': 'Ask', 'nav.settings': 'Settings',
  'greet.morning': 'Good morning', 'greet.day': 'Hello', 'greet.evening': 'Good evening',
  'start.next': 'Up next', 'start.nothingNext': 'Nothing else today.', 'start.today': 'Today', 'start.deadlines': 'Deadlines', 'start.noDeadlines': 'No open deadlines.',
  'start.tasks': 'Top tasks', 'start.noTasks': 'No open tasks.', 'start.notes': 'Pinned', 'start.birthdays': 'Birthdays', 'start.ask': 'Ask Claude …',
  'start.empty': 'Still empty. Add tasks or import your DHBW calendar under Calendar.',
  'start.doneToday': 'done today',
  'cal.import': 'Import .ics', 'cal.importHint': 'Download the calendar as .ics in Safari (Moodle: Calendar → Export; lecture plan: iCal export) and pick it here from Files. Re-importing the same source replaces its events.',
  'cal.sources': 'Sources', 'cal.noSources': 'No calendars imported yet.', 'cal.kind.lectures': 'Lectures', 'cal.kind.moodle': 'Moodle deadlines', 'cal.kind.other': 'Other',
  'cal.remove': 'Remove', 'cal.events': 'events', 'cal.allDay': 'all day', 'cal.empty': 'Nothing on this day.', 'cal.today': 'Today', 'cal.imported': 'Imported {n} events from "{name}".',
  'cal.importFailed': 'The file has no readable events.', 'cal.sourceName': 'Source name', 'cal.sourceKind': 'Kind', 'cal.week': 'Week', 'cal.day': 'Day', 'cal.updated': 'as of',
  'tasks.add': 'New task …', 'tasks.open': 'Open', 'tasks.done': 'Done', 'tasks.none': 'All clear. 🎉', 'tasks.due': 'Due', 'tasks.noDue': 'No date', 'tasks.overdue': 'Overdue',
  'tasks.prio': 'Priority', 'tasks.prio1': 'High', 'tasks.prio2': 'Medium', 'tasks.prio3': 'Low', 'tasks.clearDone': 'Clear done', 'tasks.delete': 'Delete',
  'notes.new': 'New note', 'notes.empty': 'No notes yet.', 'notes.title': 'Title', 'notes.body': 'Start writing … (Markdown works)', 'notes.pin': 'Pin', 'notes.unpin': 'Unpin', 'notes.delete': 'Delete note',
  'notes.pick': 'Pick a note on the left or create one.', 'notes.edit': 'Edit', 'notes.preview': 'Preview', 'notes.search': 'Search notes',
  'people.add': 'Add person', 'people.import': 'Import contacts (.vcf)', 'people.empty': 'Nobody here yet. Add people or share contacts from the Contacts app as .vcf.',
  'people.name': 'Name', 'people.note': 'Notes', 'people.tags': 'Tags (comma separated)', 'people.email': 'Email', 'people.phone': 'Phone', 'people.birthday': 'Birthday', 'people.pose': 'Pose',
  'people.delete': 'Delete person', 'people.imported': 'Imported {n} people.', 'people.search': 'Search', 'people.back': 'Back', 'people.all': 'All',
  'ask.placeholder': 'Ask Claude …', 'ask.send': 'Send', 'ask.stop': 'Stop', 'ask.newChat': 'New chat', 'ask.noKey': 'To ask inside ORBIT you need an API key from your private Anthropic account (console.anthropic.com). Add it in Settings.',
  'ask.openClaude': 'Open in Claude', 'ask.openClaudeHint': 'Opens the question with its context in the Claude app / claude.ai — with your private Claude account, no API key.',
  'ask.context': 'Send context', 'ask.hello': 'Hi{name}! What would you like to know?', 'ask.deleteChat': 'Delete chat', 'ask.chats': 'Chats', 'ask.error': 'Error', 'ask.copy': 'Copy',
  'ask.s1': "What's on today?", 'ask.s2': 'Make me a study plan up to the next deadline', 'ask.s3': 'Summarise my open tasks', 'ask.s4': 'What should I work on first?',
  'set.profile': 'Profile', 'set.name': 'Your first name', 'set.mePose': 'Your pose', 'set.look': 'Appearance', 'set.theme': 'Theme', 'set.theme.system': 'System', 'set.theme.light': 'Light', 'set.theme.dark': 'Dark',
  'set.lang': 'Language', 'set.glow': 'Smiskis glow in the dark', 'set.motion': 'Animations', 'set.claude': 'Claude (private account)', 'set.apiKey': 'API key', 'set.apiKeyHint': 'Stays on this iPad only (not in backups). Sent straight to api.anthropic.com. Billed to your private account.',
  'set.model': 'Model', 'set.shareContext': "Send today's events, open tasks and pinned notes along", 'set.data': 'Data', 'set.export': 'Export backup', 'set.importBackup': 'Import backup',
  'set.wipe': 'Delete everything', 'set.wipeConfirm': 'Really delete all data on this iPad? This cannot be undone.', 'set.importConfirm': 'Restore backup? Current data is replaced (the API key stays).',
  'set.imported': 'Backup restored.', 'set.importFailed': 'This is not an ORBIT iPad backup.', 'set.persist': 'Storage is persistent', 'set.persistNo': 'Safari may clear storage when space runs low — export a backup now and then.',
  'set.about': 'About', 'set.aboutText': 'ORBIT for iPad runs entirely on this device. No work data, no server — only Claude requests leave the iPad, and only when you ask.',
  'set.install': 'Home screen: in Safari tap Share → Add to Home Screen.', 'set.counts': '{t} tasks · {n} notes · {p} people · {e} events',
  'common.save': 'Save', 'common.cancel': 'Cancel', 'common.delete': 'Delete', 'common.close': 'Close', 'common.edit': 'Edit', 'common.offline': 'Offline',
}

export type TKey = Key
export type T = (k: Key, vars?: Record<string, string | number>) => string

export function translate(lang: Lang): T {
  const dict = lang === 'de' ? de : en
  return (k, vars) => {
    let s: string = dict[k] ?? k
    if (vars) for (const [n, v] of Object.entries(vars)) s = s.split(`{${n}}`).join(String(v))
    return s
  }
}

export function useT(): { t: T; lang: Lang } {
  const lang = useData().settings.lang
  return { t: translate(lang), lang }
}
