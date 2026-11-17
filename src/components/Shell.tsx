import { Activity, CalendarDays, CheckSquare, Home, MessageCircle, NotebookPen, Search, Settings as Cog, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { Smiski } from '../smiski/Smiski.tsx'
import { go, useRoute, type Route } from '../lib/router.ts'
import { useT, type TKey } from '../lib/i18n.ts'
import { useData } from '../lib/store.ts'
import { CommandPalette, openPalette } from './CommandPalette.tsx'
import { VoiceButton } from '../voice/VoiceButton.tsx'

const NAV: { route: Route; icon: typeof Home; key: TKey }[] = [
  { route: 'start', icon: Home, key: 'nav.start' },
  { route: 'pulse', icon: Activity, key: 'nav.pulse' },
  { route: 'calendar', icon: CalendarDays, key: 'nav.calendar' },
  { route: 'tasks', icon: CheckSquare, key: 'nav.tasks' },
  { route: 'notes', icon: NotebookPen, key: 'nav.notes' },
  { route: 'people', icon: Users, key: 'nav.people' },
  { route: 'ask', icon: MessageCircle, key: 'nav.ask' },
  { route: 'settings', icon: Cog, key: 'nav.settings' },
]

export function Shell({ children }: { children: ReactNode }) {
  const { route } = useRoute()
  const { t } = useT()
  const open = useData().tasks.filter((x) => !x.done).length
  return (
    <div className="shell">
      <nav className="sidebar" aria-label="ORBIT">
        <button type="button" className="logo" onClick={() => go('start')} aria-label="ORBIT">
          <Smiski pose="sleeping" variant="head" size={24} />
          <span className="wordmark">ORBIT</span>
        </button>
        <button type="button" className="search-trigger" onClick={openPalette}>
          <Search size={16} />
          <span>{t('search.open')}</span>
          <kbd>⌘K</kbd>
        </button>
        {NAV.map(({ route: r, icon: Icon, key }) => (
          <button key={r} type="button" className={`nav-item ${route === r ? 'active' : ''}`} aria-current={route === r ? 'page' : undefined} onClick={() => go(r)}>
            <Icon size={18} strokeWidth={1.8} />
            <span>{t(key)}</span>
            {r === 'tasks' && open > 0 && <span className="badge">{open}</span>}
          </button>
        ))}
      </nav>
      <main className="content" id="main">
        {children}
      </main>
      <button type="button" className="search-fab" onClick={openPalette} aria-label={t('search.open')}>
        <Search size={20} />
      </button>
      <CommandPalette />
      <VoiceButton />
      <nav className="tabbar" aria-label="ORBIT">
        {NAV.map(({ route: r, icon: Icon, key }) => (
          <button key={r} type="button" className={route === r ? 'active' : ''} aria-current={route === r ? 'page' : undefined} onClick={() => go(r)}>
            <Icon size={22} strokeWidth={1.8} />
            <span>{t(key)}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
