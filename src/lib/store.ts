// App state: loaded once from IndexedDB, kept in memory, written back per
// collection (debounced) on every change. Components read it with useData().
import { useSyncExternalStore } from 'react'
import { dbClear, dbGet, dbSet } from './db.ts'
import { DEFAULT_SETTINGS, type Data } from './types.ts'

type Key = keyof Data
const KEYS: Key[] = ['settings', 'tasks', 'notes', 'people', 'sources', 'events', 'chats']

const empty = (): Data => ({ settings: { ...DEFAULT_SETTINGS }, tasks: [], notes: [], people: [], sources: [], events: [], chats: [] })

let state: Data = empty()
const listeners = new Set<() => void>()
const timers = new Map<Key, number>()

export async function loadData(): Promise<void> {
  const loaded = await Promise.all(KEYS.map((k) => dbGet<unknown>(k)))
  const next = empty()
  KEYS.forEach((k, i) => {
    const v = loaded[i]
    if (v === undefined) return
    if (k === 'settings') next.settings = { ...DEFAULT_SETTINGS, ...(v as Partial<Data['settings']>) }
    else if (Array.isArray(v)) (next as unknown as Record<string, unknown>)[k] = v
  })
  state = next
  emit()
}

function emit() {
  for (const l of listeners) l()
}

function persist(k: Key) {
  clearTimeout(timers.get(k))
  timers.set(
    k,
    window.setTimeout(() => {
      timers.delete(k)
      void dbSet(k, state[k])
    }, 250),
  )
}

/** Writes pending changes now (page hidden / app switched away). */
export function flush() {
  for (const [k, t] of timers) {
    clearTimeout(t)
    void dbSet(k, state[k])
  }
  timers.clear()
}

export function update<K extends Key>(k: K, fn: (prev: Data[K]) => Data[K]): void {
  state = { ...state, [k]: fn(state[k]) }
  persist(k)
  emit()
}

export const getData = (): Data => state

export function useData(): Data {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}

export const uid = (): string => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`)

// ---- backup ---------------------------------------------------------------

export const BACKUP_FORMAT = 'orbit-ipad-backup'

/** Everything except the API key — a backup file can end up anywhere. */
export function exportBackup(): string {
  const { settings, ...rest } = state
  return JSON.stringify({ format: BACKUP_FORMAT, version: 1, exportedAt: new Date().toISOString(), data: { ...rest, settings: { ...settings, apiKey: '' } } }, null, 2)
}

export function importBackup(text: string): void {
  const parsed = JSON.parse(text) as { format?: string; data?: Partial<Data> }
  if (parsed.format !== BACKUP_FORMAT || !parsed.data) throw new Error('format')
  const d = parsed.data
  const keepKey = state.settings.apiKey
  const next = empty()
  for (const k of KEYS) {
    const v = d[k]
    if (k === 'settings') next.settings = { ...DEFAULT_SETTINGS, ...(v as Partial<Data['settings']>), apiKey: keepKey }
    else if (Array.isArray(v)) (next as unknown as Record<string, unknown>)[k] = v
  }
  state = next
  for (const k of KEYS) persist(k)
  emit()
}

export async function wipeAll(): Promise<void> {
  for (const t of timers.values()) clearTimeout(t)
  timers.clear()
  await dbClear()
  state = empty()
  emit()
}
