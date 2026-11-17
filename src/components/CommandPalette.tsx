// Search palette (⌘K / Ctrl+K, the sidebar search button, the floating search
// button in portrait). Fuzzy search over pages, tasks, notes, people, events and
// chats plus the command registry (lib/commands.ts); free text offers "Neue
// Aufgabe: …", "Neue Notiz: …" and ends with "Claude fragen: …". Everything is
// local — no network.
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react'
import { createPortal, flushSync } from 'react-dom'
import {
  Activity,
  CalendarDays,
  CalendarPlus,
  Check,
  CheckSquare,
  CornerDownLeft,
  GraduationCap,
  Home,
  Languages,
  MessageCircle,
  NotebookPen,
  RotateCcw,
  Search,
  Settings as Cog,
  Sparkles,
  SquarePen,
  SunMoon,
  Users,
} from 'lucide-react'
import { Smiski } from '../smiski/Smiski.tsx'
import { toast } from './ui.tsx'
import { update, useData } from '../lib/store.ts'
import { useT } from '../lib/i18n.ts'
import { go } from '../lib/router.ts'
import { dayKey, fmtTime, relDay, startMs } from '../lib/dates.ts'
import { containsScore, fold, fuzzyScore } from '../lib/fuzzy.ts'
import { COMMANDS, commandLabel, type Command } from '../lib/commands.ts'
import type { Lang, Task } from '../lib/types.ts'
import '../styles/palette.css'

// ------------------------------------------------------------------ open state

let isOpen = false
let inputEl: HTMLInputElement | null = null
const listeners = new Set<() => void>()
const setOpen = (v: boolean) => {
  if (isOpen === v) return
  isOpen = v
  listeners.forEach((l) => l())
}
const usePaletteOpen = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => isOpen,
  )

/**
 * Opens the palette and focuses its input in the same call stack: iOS only
 * shows the keyboard for a focus() inside the tap/keypress that caused it, so
 * the render is flushed synchronously first.
 */
export function openPalette(): void {
  if (!isOpen) flushSync(() => setOpen(true))
  inputEl?.focus()
  inputEl?.select()
}

export function closePalette(): void {
  setOpen(false)
}

// ------------------------------------------------------------------ strings

const L = {
  de: {
    label: 'Suche',
    placeholder: 'Suchen oder Befehl …',
    cancel: 'Abbrechen',
    empty: 'Nichts gefunden.',
    navigate: 'auswählen',
    open: 'öffnen',
    close: 'schließen',
    check: 'Abhaken',
    reopen: 'Wieder öffnen',
    checked: 'Abgehakt: {t}',
    reopened: 'Wieder offen: {t}',
    taskAdded: 'Aufgabe angelegt: {t}',
    untitled: 'Ohne Titel',
    overdue: 'überfällig',
    done: 'erledigt',
    prio: { 1: 'Priorität hoch', 2: 'Priorität mittel', 3: 'Priorität niedrig' },
    messages: '{n} Nachrichten',
    group: { pages: 'Seiten', tasks: 'Aufgaben', notes: 'Notizen', people: 'Personen', events: 'Termine', chats: 'Chats', actions: 'Aktionen', ask: 'Claude' },
  },
  en: {
    label: 'Search',
    placeholder: 'Search or run a command …',
    cancel: 'Cancel',
    empty: 'Nothing found.',
    navigate: 'select',
    open: 'open',
    close: 'close',
    check: 'Check off',
    reopen: 'Reopen',
    checked: 'Checked off: {t}',
    reopened: 'Reopened: {t}',
    taskAdded: 'Task added: {t}',
    untitled: 'Untitled',
    overdue: 'overdue',
    done: 'done',
    prio: { 1: 'High priority', 2: 'Medium priority', 3: 'Low priority' },
    messages: '{n} messages',
    group: { pages: 'Pages', tasks: 'Tasks', notes: 'Notes', people: 'People', events: 'Events', chats: 'Chats', actions: 'Actions', ask: 'Claude' },
  },
} as const

// ------------------------------------------------------------------ items

type Group = 'pages' | 'tasks' | 'notes' | 'people' | 'events' | 'chats' | 'actions' | 'ask'
const LIMIT: Record<Group, number> = { pages: 4, tasks: 5, notes: 5, people: 5, events: 5, chats: 3, actions: 5, ask: 1 }

interface PItem {
  id: string
  group: Group
  title: string
  subtitle?: string
  icon: ReactNode
  run(): void
  /** Searched as substring (de + en words, tags, e-mail …). */
  keywords?: string
  /** Long text searched as substring from 3 characters on (note body). */
  body?: string
  /** Multiplier on the match score (done tasks sink). */
  weight?: number
  score?: number
  side?: { label: string; icon: ReactNode; run(): void }
}

const ic = { size: 18, strokeWidth: 1.8 } as const
const CMD_ICON: Record<string, ReactNode> = {
  'page:start': <Home {...ic} />,
  'page:pulse': <Activity {...ic} />,
  'page:calendar': <CalendarDays {...ic} />,
  'page:tasks': <CheckSquare {...ic} />,
  'page:notes': <NotebookPen {...ic} />,
  'page:people': <Users {...ic} />,
  'page:ask': <MessageCircle {...ic} />,
  'page:settings': <Cog {...ic} />,
  'task.new': <CheckSquare {...ic} />,
  'note.new': <SquarePen {...ic} />,
  'ask.claude': <Sparkles {...ic} />,
  'theme.toggle': <SunMoon {...ic} />,
  'lang.toggle': <Languages {...ic} />,
  'ics.import': <CalendarPlus {...ic} />,
}

const fill = (s: string, t: string) => s.replace('{t}', t)

/** "neue aufgabe: Bahnticket" → the rest after a command's own name, or null. */
function textAfterPrefix(cmd: Command, term: string): string | null {
  const f = fold(term)
  const names = [...cmd.spoken, cmd.label.de, cmd.label.en].map(fold).sort((a, b) => b.length - a.length)
  for (const n of names) {
    if (f === n) return ''
    if (f.startsWith(n) && /[\s:]/.test(f[n.length])) return term.slice(n.length).replace(/^[\s:]+/, '')
  }
  return null
}

function toggleTask(task: Task, lang: Lang) {
  update('tasks', (prev) => prev.map((x) => (x.id === task.id ? { ...x, done: !x.done, doneAt: !x.done ? Date.now() : undefined } : x)))
  toast(fill(task.done ? L[lang].reopened : L[lang].checked, task.title))
}

function runCommand(cmd: Command, text: string, lang: Lang) {
  cmd.run(text)
  if (cmd.id === 'task.new' && text.trim()) toast(fill(L[lang].taskAdded, text.trim()))
}

// ------------------------------------------------------------------ component

export function CommandPalette() {
  const open = usePaletteOpen()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (isOpen) closePalette()
        else openPalette()
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault()
        closePalette()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return open ? <PaletteInner /> : null
}

/** Height of the part of the screen the on-screen keyboard leaves free. */
function useVisibleHeight(): number {
  const [h, setH] = useState(() => window.visualViewport?.height ?? window.innerHeight)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const on = () => setH(vv.height)
    vv.addEventListener('resize', on)
    return () => vv.removeEventListener('resize', on)
  }, [])
  return h
}

function PaletteInner() {
  const data = useData()
  const { lang } = useT()
  const s = L[lang]
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const vh = useVisibleHeight()

  const commandItems = useMemo<PItem[]>(
    () =>
      COMMANDS.map((c) => ({
        id: `cmd:${c.id}`,
        group: c.group,
        title: commandLabel(c, lang),
        icon: CMD_ICON[c.id] ?? <Sparkles {...ic} />,
        keywords: c.keywords,
        run: () => runCommand(c, '', lang),
      })),
    [lang],
  )

  const dataItems = useMemo<PItem[]>(() => {
    const now = Date.now()
    const today = dayKey(now)
    const out: PItem[] = []
    for (const task of data.tasks) {
      const due = task.due ? `${relDay(task.due, today, lang)}${!task.done && task.due < today ? ` · ${s.overdue}` : ''}` : ''
      out.push({
        id: `task:${task.id}`,
        group: 'tasks',
        title: task.title,
        subtitle: [task.done ? s.done : due, task.done ? '' : s.prio[task.prio]].filter(Boolean).join(' · '),
        icon: task.done ? <Check {...ic} /> : <span className={`pal-check prio-${task.prio}`} aria-hidden />,
        weight: task.done ? 0.5 : 1,
        run: () => go('tasks'),
        side: { label: task.done ? s.reopen : s.check, icon: task.done ? <RotateCcw size={16} /> : <Check size={16} />, run: () => toggleTask(task, lang) },
      })
    }
    for (const n of data.notes) {
      const title = n.title.trim() || n.body.trim().split('\n')[0].replace(/^#+\s*/, '').slice(0, 80) || s.untitled
      out.push({
        id: `note:${n.id}`,
        group: 'notes',
        title,
        subtitle: relDay(dayKey(n.updatedAt), today, lang),
        icon: <NotebookPen {...ic} />,
        body: n.body,
        run: () => go('notes', n.id),
      })
    }
    for (const p of data.people) {
      out.push({
        id: `person:${p.id}`,
        group: 'people',
        title: p.name,
        subtitle: [p.tags.join(', '), p.note.split('\n')[0]].filter(Boolean).join(' · ') || undefined,
        icon: <Smiski pose={p.pose} variant="head" size={22} interactive={false} />,
        keywords: [p.tags.join(' '), p.email ?? '', p.phone ?? ''].join(' '),
        body: p.note,
        run: () => go('people', p.id),
      })
    }
    // a semester plan repeats every lecture; one row per title (next occurrence, else the latest)
    const kindOf = new Map(data.sources.map((x) => [x.id, x.kind]))
    const byTitle = new Map<string, { e: (typeof data.events)[number]; ms: number }>()
    for (const e of data.events) {
      const ms = startMs(e)
      const key = fold(e.title)
      const cur = byTitle.get(key)
      const better = !cur || (ms >= now ? cur.ms < now || ms < cur.ms : cur.ms < now && ms > cur.ms)
      if (better) byTitle.set(key, { e, ms })
    }
    for (const { e, ms } of byTitle.values()) {
      const day = e.allDay ? e.start.slice(0, 10) : dayKey(ms)
      out.push({
        id: `event:${e.id}`,
        group: 'events',
        title: e.title,
        subtitle: [relDay(day, today, lang), e.allDay ? '' : fmtTime(ms, lang), e.location ?? e.category ?? ''].filter(Boolean).join(' · '),
        icon: kindOf.get(e.sourceId) === 'moodle' ? <GraduationCap {...ic} /> : <CalendarDays {...ic} />,
        keywords: [e.location, e.category].filter(Boolean).join(' '),
        weight: ms < now - 86_400_000 ? 0.7 : 1,
        run: () => go('calendar', day),
      })
    }
    for (const c of data.chats) {
      out.push({
        id: `chat:${c.id}`,
        group: 'chats',
        title: c.title,
        subtitle: s.messages.replace('{n}', String(c.messages.length)),
        icon: <MessageCircle {...ic} />,
        body: c.messages.map((m) => m.content).join('\n').slice(0, 4000),
        // the Ask page opens the first chat in the list
        run: () => {
          update('chats', (prev) => [c, ...prev.filter((x) => x.id !== c.id)])
          go('ask', c.id)
        },
      })
    }
    return out
  }, [data.tasks, data.notes, data.people, data.events, data.sources, data.chats, lang, s])

  const items = useMemo<PItem[]>(() => {
    const term = q.trim()
    if (!term) {
      const featured = new Set(COMMANDS.filter((c) => c.featured).map((c) => `cmd:${c.id}`))
      return commandItems.filter((i) => featured.has(i.id))
    }
    const textCmds = COMMANDS.filter((c) => c.takesText)
    const scored: PItem[] = []
    for (const it of [...commandItems.filter((i) => !textCmds.some((c) => `cmd:${c.id}` === i.id)), ...dataItems]) {
      const sc = Math.max(
        fuzzyScore(term, it.title),
        it.subtitle && term.length >= 3 ? containsScore(term, it.subtitle) * 0.3 : 0,
        it.keywords ? containsScore(term, it.keywords) * 0.6 : 0,
        it.body && term.length >= 3 ? containsScore(term, it.body) * 0.3 : 0,
      )
      if (sc > 0) scored.push({ ...it, score: sc * (it.weight ?? 1) })
    }
    // free-text commands: "neue aufgabe Bahnticket" puts that command on top, otherwise they follow the matches
    let ask: PItem | null = null
    for (const c of textCmds) {
      const rest = textAfterPrefix(c, term)
      const text = rest ?? term
      const it: PItem = {
        id: `cmd:${c.id}:text`,
        group: c.id === 'ask.claude' ? 'ask' : 'actions',
        title: commandLabel(c, lang, text),
        icon: CMD_ICON[c.id] ?? <Sparkles {...ic} />,
        run: () => runCommand(c, text, lang),
        score: rest !== null ? 5000 : 40,
      }
      if (c.id === 'ask.claude' && rest === null) ask = it
      else scored.push(it)
    }
    const byGroup = new Map<Group, PItem[]>()
    for (const it of scored) byGroup.set(it.group, [...(byGroup.get(it.group) ?? []), it])
    const groups = Array.from(byGroup.entries())
      .map(([g, list]) => {
        list.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        return list.slice(0, LIMIT[g])
      })
      .sort((a, b) => (b[0]?.score ?? 0) - (a[0]?.score ?? 0))
    const flat = groups.flat()
    if (ask) flat.push(ask)
    return flat
  }, [q, commandItems, dataItems, lang])

  useEffect(() => setActive(0), [q])
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const run = (it: PItem) => {
    closePalette()
    it.run()
  }

  const onKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => (items.length ? (i + 1) % items.length : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (items.length ? (i - 1 + items.length) % items.length : 0))
    } else if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault()
      const it = items[active]
      if (!it) return
      if ((e.metaKey || e.ctrlKey) && it.side) it.side.run()
      else run(it)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      closePalette()
    }
  }

  let lastGroup: Group | null = null
  return createPortal(
    <div className="palette-root" style={{ ['--pal-vh' as string]: `${vh}px` }}>
      <div className="palette-backdrop" onClick={closePalette} aria-hidden />
      <div className="palette" role="dialog" aria-modal="true" aria-label={s.label}>
        <div className="palette-input">
          <Search size={18} aria-hidden />
          <input
            ref={(el) => {
              inputEl = el
            }}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder={s.placeholder}
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={items[active] ? `pi-${active}` : undefined}
            aria-autocomplete="list"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="go"
          />
          <button type="button" className="palette-cancel" onClick={closePalette}>
            {s.cancel}
          </button>
        </div>
        <div className="palette-list" id="palette-list" role="listbox" ref={listRef}>
          {items.length === 0 && <div className="palette-empty">{s.empty}</div>}
          {items.map((it, i) => {
            const header = it.group !== lastGroup ? s.group[it.group] : null
            lastGroup = it.group
            return (
              <div key={it.id} role="presentation">
                {header && <div className="palette-group">{header}</div>}
                <div className={`palette-row ${i === active ? 'is-active' : ''} ${it.group === 'ask' ? 'is-ask' : ''}`} onPointerMove={(e) => e.pointerType === 'mouse' && i !== active && setActive(i)}>
                  <button type="button" id={`pi-${i}`} data-idx={i} role="option" aria-selected={i === active} className="palette-item" tabIndex={-1} onClick={() => run(it)}>
                    <span className="palette-icon">{it.icon}</span>
                    <span className="palette-text">
                      <span className="palette-title">{it.title}</span>
                      {it.subtitle && <span className="palette-sub">{it.subtitle}</span>}
                    </span>
                    {i === active && <CornerDownLeft size={14} className="palette-enter" aria-hidden />}
                  </button>
                  {it.side && (
                    <button type="button" className="palette-side" tabIndex={-1} onClick={it.side.run} aria-label={`${it.side.label}: ${it.title}`} title={it.side.label}>
                      {it.side.icon}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <div className="palette-foot" aria-hidden>
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> {s.navigate}
          </span>
          <span>
            <kbd>↵</kbd> {s.open}
          </span>
          <span>
            <kbd>⌘</kbd>
            <kbd>↵</kbd> {s.check}
          </span>
          <span>
            <kbd>Esc</kbd> {s.close}
          </span>
        </div>
      </div>
    </div>,
    document.body,
  )
}
