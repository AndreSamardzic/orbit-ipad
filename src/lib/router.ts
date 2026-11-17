import { useSyncExternalStore } from 'react'

export type Route = 'start' | 'pulse' | 'calendar' | 'tasks' | 'notes' | 'people' | 'ask' | 'settings'
export const ROUTES: Route[] = ['start', 'pulse', 'calendar', 'tasks', 'notes', 'people', 'ask', 'settings']

function read(): { route: Route; param: string } {
  const [r = '', param = ''] = location.hash.replace(/^#\/?/, '').split('/')
  return { route: (ROUTES as string[]).includes(r) ? (r as Route) : 'start', param: decodeURIComponent(param) }
}

let cur = read()
window.addEventListener('hashchange', () => {
  cur = read()
  listeners.forEach((l) => l())
})
const listeners = new Set<() => void>()

export function useRoute() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => cur,
  )
}

export const go = (route: Route, param?: string): void => {
  location.hash = `#/${route === 'start' ? '' : route}${param ? `/${encodeURIComponent(param)}` : ''}`
}
