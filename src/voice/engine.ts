// The voice assistant's brain: one listening session at a time, the local
// intents, confirmation before anything is written, Claude for the rest, and
// the reply spoken aloud. UI state lives in a tiny external store (useVoice).
//
// Modes: push-to-talk (hold Smiski / Space; a quick tap listens until a pause)
// and conversation (tap once; ORBIT listens again after it has spoken).
import { useSyncExternalStore } from 'react'
import { ask, errorText } from '../lib/claude.ts'
import { dayKey } from '../lib/dates.ts'
import { translate, type TKey } from '../lib/i18n.ts'
import { go, type Route } from '../lib/router.ts'
import { getData, uid, update } from '../lib/store.ts'
import type { ChatMessage, Lang, Settings } from '../lib/types.ts'
import { agendaText, birthdaysText, dayPhrase, nextBirthdayText, nextDeadlineText, nextEventText } from './answers.ts'
import { classify, findTask } from './intent.ts'
import { listen, recognitionSupported, type Listening } from './recognition.ts'
import { clip, toSpeech } from './speechText.ts'
import { vt, type VKey } from './strings.ts'
import { cancelSpeech, speak, unlockTts } from './tts.ts'

export type Phase = 'idle' | 'listening' | 'thinking' | 'speaking'
/** ok = try the recognizer; missing = no API; denied = permission refused; error = no microphone. */
export type RecogState = 'ok' | 'missing' | 'denied' | 'error'

export interface Proposal {
  kind: 'addTask' | 'completeTask' | 'addNote'
  title: string
  due?: string
  taskId?: string
  text?: string
}

export interface VoiceState {
  open: boolean
  phase: Phase
  heard: string
  heardFinal: boolean
  reply: string
  proposal: Proposal | null
  /** Conversation mode is running (listens again after each reply). */
  conv: boolean
  holding: boolean
  recog: RecogState
  /** Persistent status line (why voice input does not work right now). */
  hint: VKey | null
  /** One-off remark ("Nichts gehört."). */
  note: VKey | null
  /** Bumped after every finished reply (the panel's linger timer). */
  turns: number
}

let st: VoiceState = {
  open: false,
  phase: 'idle',
  heard: '',
  heardFinal: false,
  reply: '',
  proposal: null,
  conv: false,
  holding: false,
  recog: recognitionSupported() ? 'ok' : 'missing',
  hint: null,
  note: null,
  turns: 0,
}
const listeners = new Set<() => void>()
function set(p: Partial<VoiceState>) {
  st = { ...st, ...p }
  for (const l of listeners) l()
}
export const getVoiceState = (): VoiceState => st
export function useVoice(): VoiceState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => st,
  )
}

const settings = (): Settings => getData().settings
const lang = (): Lang => settings().lang

// ------------------------------------------------------------------ listening

type ListenKind = 'hold' | 'tap' | 'conv'
let session: Listening | null = null
let sessionId = 0
let listenKind: ListenKind = 'hold'
let silence = 0
/** A session started successfully at least once (later not-allowed = needs a fresh tap, not "denied"). */
let everStarted = false
let turnId = 0
let claudeCtl: AbortController | null = null
let history: ChatMessage[] = []

export const voiceInputAvailable = (): boolean => recognitionSupported() && st.recog !== 'denied' && st.recog !== 'missing'

function dropSession() {
  sessionId++
  window.clearTimeout(silence)
  const s = session
  session = null
  s?.abort()
}

function abortClaude() {
  claudeCtl?.abort()
  claudeCtl = null
}

/** Stops the session after a pause: soon once something was heard, later if nothing. */
function armSilence(id: number, heardSomething: boolean) {
  window.clearTimeout(silence)
  if (id !== sessionId || !session) return
  const ms = listenKind === 'hold' ? 60_000 : heardSomething ? (listenKind === 'conv' ? 1800 : 1500) : 8000
  silence = window.setTimeout(() => {
    if (id === sessionId) session?.stop()
  }, ms)
}

function startListening(kind: ListenKind): boolean {
  if (!recognitionSupported()) {
    set({ recog: 'missing', open: true, conv: false })
    return false
  }
  if (st.recog === 'denied') {
    set({ open: true, conv: false })
    return false
  }
  // barge-in: whatever ORBIT was doing stops
  turnId++
  cancelSpeech()
  abortClaude()
  dropSession()
  const id = sessionId
  listenKind = kind
  set({ open: true, phase: 'listening', heard: '', heardFinal: false, note: null, hint: st.hint === 'hint.gesture' || st.hint === 'hint.network' ? null : st.hint })
  session = listen(
    { lang: lang() === 'de' ? 'de-DE' : 'en-US', continuous: kind !== 'conv' },
    {
      onStart: () => {
        everStarted = true
        if (st.recog !== 'ok') set({ recog: 'ok', hint: null })
      },
      onText: (text, final) => {
        if (id !== sessionId) return
        set({ heard: text, heardFinal: final })
        armSilence(id, true)
      },
      onError: (code) => {
        if (id === sessionId) recogError(code)
      },
      onEnd: (text) => {
        if (id !== sessionId) return
        session = null
        window.clearTimeout(silence)
        heard(text)
      },
    },
  )
  armSilence(id, false)
  return true
}

function recogError(code: string) {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      // after an earlier success this is WebKit refusing a start without a fresh tap
      if (everStarted) set({ hint: 'hint.gesture', conv: false })
      else set({ recog: 'denied', hint: 'hint.denied', conv: false })
      break
    case 'unsupported':
      set({ recog: 'missing', hint: 'hint.missing', conv: false })
      break
    case 'audio-capture':
      set({ recog: 'error', hint: 'hint.audio', conv: false })
      break
    case 'network':
    case 'start-failed':
      set({ hint: everStarted ? 'hint.gesture' : 'hint.network', conv: false })
      break
    case 'language-not-supported':
      set({ note: 'note.lang', conv: false })
      break
    default:
      break // no-speech / aborted: the empty transcript says enough
  }
}

function heard(text: string) {
  if (!text) {
    const wasConv = st.conv
    set({ phase: 'idle', conv: false, note: st.note ?? (st.hint ? null : wasConv ? 'note.convEnd' : 'note.nothing'), heardFinal: true })
    return
  }
  void handleUtterance(text)
}

// ------------------------------------------------------------------ controls (UI)

/**
 * Smiski pressed (push-to-talk) or Space down. Returns what happened:
 * a running tap-session is ended instead ("tap again = done").
 */
export function pressStart(): 'listening' | 'stopped' | 'unavailable' {
  unlockTts()
  if (session && listenKind !== 'hold') {
    session.stop()
    return 'stopped'
  }
  if (!voiceInputAvailable()) {
    set({ open: true, recog: recognitionSupported() ? st.recog : 'missing' })
    return 'unavailable'
  }
  set({ holding: true })
  return startListening('hold') ? 'listening' : 'unavailable'
}

/** Released. A short tap keeps listening until a pause; a hold ends now. */
export function pressEnd(tap: boolean) {
  unlockTts()
  set({ holding: false })
  if (!session || listenKind !== 'hold') return
  if (tap) {
    listenKind = 'tap'
    armSilence(sessionId, !!st.heard)
  } else session.stop()
}

/** Conversation mode tap: start, or end everything. */
export function toggleConversation(): 'listening' | 'stopped' | 'unavailable' {
  unlockTts()
  if (st.conv || st.phase !== 'idle') {
    stopAll()
    return 'stopped'
  }
  if (!voiceInputAvailable()) {
    set({ open: true, recog: recognitionSupported() ? st.recog : 'missing' })
    return 'unavailable'
  }
  set({ conv: true })
  return startListening('conv') ? 'listening' : 'unavailable'
}

/** Typed (or keyboard-dictated) text — handled exactly like speech. */
export function submitText(text: string) {
  const clean = text.trim()
  if (!clean) return
  unlockTts()
  dropSession()
  cancelSpeech()
  abortClaude()
  void handleUtterance(clean)
}

/** Tap on Ja / Nein in the confirmation card. */
export function decide(yes: boolean) {
  const p = st.proposal
  if (!p) return
  unlockTts()
  const turn = ++turnId
  dropSession()
  cancelSpeech()
  set({ proposal: null, heard: '', note: null })
  void reply(yes ? execute(p) : vt(lang(), 'say.cancelled'), turn)
}

/** Stop listening, thinking and speaking. */
export function stopAll() {
  turnId++
  dropSession()
  cancelSpeech()
  abortClaude()
  set({ phase: 'idle', conv: false, holding: false })
}

export function openPanel() {
  set({ open: true })
}

/** Hides the panel but keeps its content (linger timeout). */
export function hidePanel() {
  set({ open: false })
}

/** Closing drops a waiting proposal and the short Claude memory. */
export function closePanel() {
  stopAll()
  history = []
  set({ open: false, proposal: null, heard: '', reply: '', note: null })
}

export function setVoiceSettings(p: Partial<Pick<Settings, 'voiceMode' | 'voiceName' | 'voiceRate'>>) {
  if (p.voiceMode && p.voiceMode !== settings().voiceMode) stopAll()
  update('settings', (s) => ({ ...s, ...p }))
}

export function testVoice() {
  unlockTts()
  stopAll()
  const s = settings()
  void speak(vt(s.lang, 'voice.sample'), { lang: s.lang, voiceName: s.voiceName, rate: s.voiceRate })
}

// ------------------------------------------------------------------ one turn

function pageName(route: Route, l: Lang): string {
  return translate(l)(`nav.${route}` as TKey)
}

function noteTitle(text: string): string {
  const words = text.split(/\s+/)
  return words.length <= 7 ? text.replace(/[.!?]+$/, '') : `${words.slice(0, 6).join(' ')} …`
}

function execute(p: Proposal): string {
  const l = lang()
  if (p.kind === 'addTask') {
    update('tasks', (prev) => [...prev, { id: uid(), title: p.title, done: false, prio: 2, due: p.due, createdAt: Date.now() }])
    return vt(l, 'say.taskAdded', { title: p.title })
  }
  if (p.kind === 'completeTask') {
    const t = getData().tasks.find((x) => x.id === p.taskId && !x.done)
    if (!t) return vt(l, 'say.noTask', { q: p.title })
    update('tasks', (prev) => prev.map((x) => (x.id === t.id ? { ...x, done: true, doneAt: Date.now() } : x)))
    return vt(l, 'say.taskDone', { title: t.title })
  }
  update('notes', (prev) => [...prev, { id: uid(), title: p.title, body: p.text ?? p.title, pinned: false, updatedAt: Date.now() }])
  return vt(l, 'say.noteAdded')
}

/** Shows and speaks `text`; in conversation mode listens again afterwards. */
async function reply(text: string, turn: number, endConversation = false) {
  if (turn !== turnId) return
  set({ reply: text, phase: 'speaking' })
  const s = settings()
  await speak(text, { lang: s.lang, voiceName: s.voiceName, rate: s.voiceRate })
  if (turn !== turnId) return
  set({ phase: 'idle', turns: st.turns + 1, ...(endConversation ? { conv: false } : {}) })
  if (st.conv && !st.holding) startListening('conv')
}

export async function handleUtterance(text: string): Promise<void> {
  const turn = ++turnId
  const d = getData()
  const l = d.settings.lang
  const now = new Date()
  const today = dayKey(now)
  set({ open: true, heard: text, heardFinal: true, reply: '', note: null, phase: 'idle' })
  const it = classify(text, today)

  const pending = st.proposal
  if (pending) {
    if (it.kind === 'yes') {
      set({ proposal: null })
      return reply(execute(pending), turn)
    }
    if (it.kind === 'no' || it.kind === 'stop') {
      set({ proposal: null })
      return reply(vt(l, 'say.cancelled'), turn, it.kind === 'stop')
    }
    if (it.kind === 'none') return reply(vt(l, 'say.yesNo'), turn)
    set({ proposal: null }) // another command replaces the question
  }

  switch (it.kind) {
    case 'stop':
      stopAll()
      set({ reply: '' })
      return
    case 'yes':
    case 'no':
      return reply(vt(l, 'say.nothingPending'), turn)
    case 'navigate':
      go(it.route)
      return reply(vt(l, 'say.opened', { page: pageName(it.route, l) }), turn)
    case 'agenda':
      return reply(agendaText(d, it.day, now), turn)
    case 'nextDeadline':
      return reply(nextDeadlineText(d, now), turn)
    case 'nextEvent':
      return reply(nextEventText(d, now), turn)
    case 'birthdays':
      return reply(birthdaysText(d, it.day, now), turn)
    case 'nextBirthday':
      return reply(nextBirthdayText(d, now), turn)
    case 'addTask': {
      set({ proposal: { kind: 'addTask', title: it.title, due: it.due } })
      const due = it.due ? vt(l, 'say.addTaskDue', { day: dayPhrase(it.due, today, l) }) : ''
      return reply(vt(l, 'say.addTask', { title: it.title, due }), turn)
    }
    case 'completeTask': {
      const t = findTask(it.query, d.tasks)
      if (!t) return reply(vt(l, 'say.noTask', { q: it.query }), turn)
      set({ proposal: { kind: 'completeTask', title: t.title, taskId: t.id, due: t.due } })
      return reply(vt(l, 'say.completeTask', { title: t.title }), turn)
    }
    case 'addNote': {
      const title = noteTitle(it.text)
      set({ proposal: { kind: 'addNote', title, text: it.text } })
      return reply(vt(l, 'say.addNote', { title }), turn)
    }
    case 'none':
      return askClaude(text, turn)
  }
}

/** History for the API: the last turns, starting with a user message. */
function recent(h: ChatMessage[], n = 9): ChatMessage[] {
  const out = h.slice(-n)
  while (out.length && out[0].role !== 'user') out.shift()
  return out
}

async function askClaude(text: string, turn: number) {
  const d = getData()
  const l = d.settings.lang
  if (!d.settings.apiKey.trim()) return reply(vt(l, 'say.noKey'), turn)
  set({ phase: 'thinking' })
  const ctl = new AbortController()
  claudeCtl = ctl
  history.push({ role: 'user', content: `${text}\n\n${vt(l, 'say.brief')}`, at: Date.now() })
  let acc = ''
  try {
    const full = await ask({
      data: d,
      history: recent(history),
      withContext: d.settings.shareContext,
      signal: ctl.signal,
      onText: (delta) => {
        acc += delta
        if (turn === turnId) set({ reply: toSpeech(acc) })
      },
    })
    if (ctl.signal.aborted || turn !== turnId) return
    history.push({ role: 'assistant', content: full, at: Date.now() })
    history = history.slice(-12)
    return reply(clip(toSpeech(full)) || vt(l, 'say.empty'), turn)
  } catch (err) {
    history.pop()
    if (ctl.signal.aborted || turn !== turnId) return
    return reply(vt(l, 'say.error', { e: errorText(err, l) }), turn)
  } finally {
    if (claudeCtl === ctl) claudeCtl = null
  }
}
