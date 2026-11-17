import { useState } from 'react'
import { ChevronLeft, Eye, Pencil, Pin, PinOff, Plus, Trash2 } from 'lucide-react'
import { Empty, PageHead } from '../components/ui.tsx'
import { Markdown } from '../components/Markdown.tsx'
import { Smiski } from '../smiski/Smiski.tsx'
import { uid, update, useData } from '../lib/store.ts'
import { useT } from '../lib/i18n.ts'
import { go, useRoute } from '../lib/router.ts'
import type { Note } from '../lib/types.ts'

const patch = (id: string, p: Partial<Note>) => update('notes', (prev) => prev.map((n) => (n.id === id ? { ...n, ...p, updatedAt: Date.now() } : n)))

export function Notes() {
  const { notes } = useData()
  const { t, lang } = useT()
  const { param } = useRoute()
  const [q, setQ] = useState('')
  // Notes with content open as rendered Markdown; tap (or the pencil) to edit.
  const [editing, setEditing] = useState<string | null>(null)
  const current = notes.find((n) => n.id === param)
  const preview = Boolean(current && current.body.trim() && editing !== current.id)
  const setPreview = (v: boolean) => setEditing(v ? null : (current?.id ?? null))
  const list = notes
    .filter((n) => !q || `${n.title}\n${n.body}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt)

  const create = () => {
    const id = uid()
    update('notes', (prev) => [...prev, { id, title: '', body: '', pinned: false, updatedAt: Date.now() }])
    setEditing(id)
    go('notes', id)
  }

  return (
    <div className={`page notes ${current ? 'has-current' : ''}`}>
      <div className="split">
        <aside className="split-list">
          <PageHead
            title={t('nav.notes')}
            actions={
              <button type="button" className="btn primary" onClick={create}>
                <Plus size={16} /> {t('notes.new')}
              </button>
            }
          />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('notes.search')} className="search" />
          {list.length === 0 ? (
            <Empty art={<Smiski pose="writing" size={72} />}>{t('notes.empty')}</Empty>
          ) : (
            <ul className="list note-list">
              {list.map((n) => (
                <li key={n.id}>
                  <button type="button" className={`note-item ${n.id === param ? 'active' : ''}`} onClick={() => go('notes', n.id)}>
                    <strong>
                      {n.pinned && <Pin size={12} />} {n.title || n.body.split('\n')[0].slice(0, 40) || '…'}
                    </strong>
                    <span className="muted small">{new Date(n.updatedAt).toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB')}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
        <section className="split-detail">
          {current ? (
            <div className="note-editor">
              <div className="toolbar">
                <button type="button" className="icon-btn back" onClick={() => go('notes')} aria-label={t('people.back')}>
                  <ChevronLeft size={20} />
                </button>
                <span className="grow" />
                <button type="button" className="icon-btn" onClick={() => setPreview(!preview)} aria-label={preview ? t('notes.edit') : t('notes.preview')}>
                  {preview ? <Pencil size={18} /> : <Eye size={18} />}
                </button>
                <button type="button" className="icon-btn" onClick={() => patch(current.id, { pinned: !current.pinned })} aria-label={current.pinned ? t('notes.unpin') : t('notes.pin')}>
                  {current.pinned ? <PinOff size={18} /> : <Pin size={18} />}
                </button>
                <button
                  type="button"
                  className="icon-btn danger"
                  onClick={() => {
                    update('notes', (prev) => prev.filter((n) => n.id !== current.id))
                    go('notes')
                  }}
                  aria-label={t('notes.delete')}
                >
                  <Trash2 size={18} />
                </button>
              </div>
              <input className="note-title" value={current.title} onChange={(e) => patch(current.id, { title: e.target.value })} placeholder={t('notes.title')} />
              {preview ? (
                <div className="note-preview" onClick={(e) => (e.target as HTMLElement).closest('a') || setPreview(false)}>
                  <Markdown text={current.body} />
                </div>
              ) : (
                <textarea className="note-body" value={current.body} onChange={(e) => patch(current.id, { body: e.target.value })} placeholder={t('notes.body')} autoFocus={editing === current.id} />
              )}
            </div>
          ) : (
            <Empty art={<Smiski pose="daydreaming" size={96} />}>{t('notes.pick')}</Empty>
          )}
        </section>
      </div>
    </div>
  )
}
