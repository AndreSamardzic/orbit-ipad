import { useEffect, useRef, useState, type ReactNode } from 'react'

export function Section({ title, count, action, children }: { title: string; count?: number; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="section">
      <header className="section-head">
        <h2 className="section-label">
          <span className="ring" aria-hidden />
          {title}
          {count !== undefined && <span className="count">{count}</span>}
        </h2>
        {action}
      </header>
      {children}
    </section>
  )
}

export function Card({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return onClick ? (
    <button type="button" className={`card card-btn ${className}`} onClick={onClick}>
      {children}
    </button>
  ) : (
    <div className={`card ${className}`}>{children}</div>
  )
}

export function PageHead({ title, sub, actions }: { title: string; sub?: string; actions?: ReactNode }) {
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        {sub && <p className="muted">{sub}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  )
}

export function Empty({ children, art }: { children: ReactNode; art?: ReactNode }) {
  return (
    <div className="empty">
      {art}
      <p>{children}</p>
    </div>
  )
}

/** Bottom sheet on narrow screens, centred dialog on wide ones. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog ref={ref} className="sheet" onClose={onClose} onClick={(e) => e.target === ref.current && onClose()} aria-label={title}>
      <div className="sheet-body">
        <header className="sheet-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="×">
            ×
          </button>
        </header>
        {open && children}
      </div>
    </dialog>
  )
}

let toastSet: ((s: string | null) => void) | null = null
export const toast = (s: string): void => toastSet?.(s)

export function Toaster() {
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => {
    toastSet = setMsg
    return () => {
      toastSet = null
    }
  }, [])
  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(null), 3200)
    return () => clearTimeout(t)
  }, [msg])
  return (
    <div className={`toast ${msg ? 'show' : ''}`} role="status" aria-live="polite">
      {msg}
    </div>
  )
}

/** Hidden file input behind a button; reads the picked file as text. */
export function FileButton({ accept, label, onText, className = 'btn', multiple = false }: { accept: string; label: ReactNode; onText: (text: string, name: string) => void; className?: string; multiple?: boolean }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <>
      <button type="button" className={className} onClick={() => ref.current?.click()}>
        {label}
      </button>
      <input
        ref={ref}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? [])
          e.target.value = ''
          for (const f of files) onText(await f.text(), f.name)
        }}
      />
    </>
  )
}

export function Segmented<V extends string>({ value, options, onChange, label }: { value: V; options: { value: V; label: string }[]; onChange: (v: V) => void; label: string }) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="toggle-row">
      <span>{label}</span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch" aria-hidden />
    </label>
  )
}

export function downloadText(name: string, text: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}
