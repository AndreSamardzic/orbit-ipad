import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App.tsx'
import { flush, loadData } from './lib/store.ts'
import { requestPersist } from './lib/db.ts'
import './styles/tokens.css'
import './styles/app.css'

// Safari may kill a backgrounded home-screen app without warning: write now.
document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush())
window.addEventListener('pagehide', flush)

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => void navigator.serviceWorker.register('./sw.js'))
}

const root = createRoot(document.getElementById('root')!)
loadData().then(
  () => {
    void requestPersist()
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  },
  (err: unknown) => {
    // Never start with an empty state here: the first edit would overwrite the stored data.
    console.error('ORBIT: could not load data', err)
    root.render(
      <div className="fatal">
        <h1>ORBIT</h1>
        <p>Der Speicher dieses iPads konnte nicht gelesen werden. Bitte App schließen und neu öffnen. / Could not read this iPad's storage — close and reopen the app.</p>
        <pre>{String(err)}</pre>
      </div>,
    )
  },
)
