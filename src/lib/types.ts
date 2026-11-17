import type { SmiskiPose } from '../smiski/poseTypes.ts'

export type Lang = 'de' | 'en'
export type ThemePref = 'system' | 'light' | 'dark'
export type Prio = 1 | 2 | 3

export interface Task {
  id: string
  title: string
  done: boolean
  /** Local `YYYY-MM-DD`. */
  due?: string
  prio: Prio
  createdAt: number
  doneAt?: number
}

export interface Note {
  id: string
  title: string
  body: string
  pinned: boolean
  updatedAt: number
}

export interface Person {
  id: string
  name: string
  pose: SmiskiPose
  note: string
  tags: string[]
  email?: string
  phone?: string
  /** `MM-DD` or `YYYY-MM-DD`. */
  birthday?: string
  updatedAt: number
}

export type SourceKind = 'lectures' | 'moodle' | 'other'

export interface CalSource {
  id: string
  name: string
  kind: SourceKind
  importedAt: number
  count: number
}

export interface CalEvent {
  /** `${sourceId}:${uid}:${start}` — stable across re-imports of the same file. */
  id: string
  sourceId: string
  title: string
  /** All-day: `YYYY-MM-DD`; timed: ISO with offset / Z. */
  start: string
  end?: string
  allDay: boolean
  location?: string
  description?: string
  url?: string
  category?: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  at: number
  error?: boolean
}

export interface Chat {
  id: string
  title: string
  messages: ChatMessage[]
  updatedAt: number
}

/** An edge in the people network (undirected; a-b == b-a). */
export interface PersonLink {
  id: string
  a: string
  b: string
  label?: string
  /** 1 = loose, 2 = normal, 3 = close. */
  strength: 1 | 2 | 3
}

export type DayMode = 'morning' | 'day' | 'evening'
export type VoiceMode = 'ptt' | 'conversation'

export type ClaudeModel = 'claude-opus-5-5' | 'claude-sonnet-5-5' | 'claude-haiku-5-5'

export interface Settings {
  lang: Lang
  theme: ThemePref
  glow: boolean
  motion: boolean
  name: string
  mePose: SmiskiPose
  apiKey: string
  model: ClaudeModel
  /** Send today's events, open tasks and pinned notes along with each question. */
  shareContext: boolean
  /** Start page: null = follow the clock, else the mode held by a tap. */
  dayModeHold: DayMode | null
  voiceMode: VoiceMode
  /** speechSynthesis voice name; '' = best available for the language. */
  voiceName: string
  voiceRate: number
}

export interface Data {
  settings: Settings
  tasks: Task[]
  notes: Note[]
  people: Person[]
  sources: CalSource[]
  events: CalEvent[]
  chats: Chat[]
  links: PersonLink[]
}

export const DEFAULT_SETTINGS: Settings = {
  lang: 'de',
  theme: 'system',
  glow: true,
  motion: true,
  name: '',
  mePose: 'typing',
  apiKey: '',
  model: 'claude-opus-5-5',
  shareContext: true,
  dayModeHold: null,
  voiceMode: 'ptt',
  voiceName: '',
  voiceRate: 1,
}
