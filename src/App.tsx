import { useEffect } from 'react'
import { Shell } from './components/Shell.tsx'
import { Toaster } from './components/ui.tsx'
import { useData } from './lib/store.ts'
import { useRoute } from './lib/router.ts'
import { Start } from './pages/Start.tsx'
import { Calendar } from './pages/Calendar.tsx'
import { Tasks } from './pages/Tasks.tsx'
import { Notes } from './pages/Notes.tsx'
import { People } from './pages/People.tsx'
import { Ask } from './pages/Ask.tsx'
import { Settings } from './pages/Settings.tsx'

function useRootAttributes() {
  const { theme, glow, motion, lang } = useData().settings
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const reduce = matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => {
      const root = document.documentElement
      const dark = theme === 'dark' || (theme === 'system' && mq.matches)
      root.dataset.theme = dark ? 'dark' : 'light'
      root.dataset.glow = glow ? 'on' : 'off'
      root.dataset.motion = motion && !reduce.matches ? 'on' : 'off'
      root.lang = lang
      document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', dark ? '#0e1110' : '#f5f5f2'))
    }
    apply()
    mq.addEventListener('change', apply)
    reduce.addEventListener('change', apply)
    return () => {
      mq.removeEventListener('change', apply)
      reduce.removeEventListener('change', apply)
    }
  }, [theme, glow, motion, lang])
}

export function App() {
  useRootAttributes()
  const { route } = useRoute()
  const page = { start: <Start />, calendar: <Calendar />, tasks: <Tasks />, notes: <Notes />, people: <People />, ask: <Ask />, settings: <Settings /> }[route]
  return (
    <>
      <Shell>{page}</Shell>
      <Toaster />
    </>
  )
}
