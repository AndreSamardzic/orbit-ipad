import { useState } from 'react'
import { Check, Trash2 } from 'lucide-react'
import { Empty, PageHead, Section } from '../components/ui.tsx'
import { Smiski } from '../smiski/Smiski.tsx'
import { uid, update, useData } from '../lib/store.ts'
import { useT } from '../lib/i18n.ts'
import { dayKey, relDay } from '../lib/dates.ts'
import type { Prio, Task } from '../lib/types.ts'

export const toggleTask = (id: string) =>
  update('tasks', (prev) => prev.map((x) => (x.id === id ? { ...x, done: !x.done, doneAt: !x.done ? Date.now() : undefined } : x)))

const patchTask = (id: string, patch: Partial<Task>) => update('tasks', (prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)))

export function TaskRow({ task, compact = false }: { task: Task; compact?: boolean }) {
  const { t, lang } = useT()
  const today = dayKey(new Date())
  const overdue = !task.done && task.due && task.due < today
  return (
    <li className={`row task ${task.done ? 'done' : ''} prio-${task.prio}`}>
      <button type="button" className="check" role="checkbox" aria-checked={task.done} aria-label={task.title} onClick={() => toggleTask(task.id)}>
        {task.done && <Check size={14} strokeWidth={3} />}
      </button>
      {compact ? (
        <span className="grow task-title">{task.title}</span>
      ) : (
        <input className="grow task-title inline-edit" value={task.title} onChange={(e) => patchTask(task.id, { title: e.target.value })} aria-label={task.title} />
      )}
      {task.due && compact && <span className={`small ${overdue ? 'danger-text' : 'muted'}`}>{relDay(task.due, today, lang)}</span>}
      {!compact && (
        <>
          <select value={task.prio} onChange={(e) => patchTask(task.id, { prio: Number(e.target.value) as Prio })} aria-label={t('tasks.prio')} className="prio-select">
            <option value={1}>{t('tasks.prio1')}</option>
            <option value={2}>{t('tasks.prio2')}</option>
            <option value={3}>{t('tasks.prio3')}</option>
          </select>
          <input type="date" value={task.due ?? ''} onChange={(e) => patchTask(task.id, { due: e.target.value || undefined })} aria-label={t('tasks.due')} className={overdue ? 'overdue' : ''} />
          <button type="button" className="icon-btn danger" onClick={() => update('tasks', (prev) => prev.filter((x) => x.id !== task.id))} aria-label={t('tasks.delete')}>
            <Trash2 size={16} />
          </button>
        </>
      )}
    </li>
  )
}

export function Tasks() {
  const { tasks } = useData()
  const { t } = useT()
  const [title, setTitle] = useState('')
  const [prio, setPrio] = useState<Prio>(2)
  const [due, setDue] = useState('')
  const today = dayKey(new Date())
  const open = tasks.filter((x) => !x.done).sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999') || a.prio - b.prio || a.createdAt - b.createdAt)
  const overdue = open.filter((x) => x.due && x.due < today)
  const rest = open.filter((x) => !(x.due && x.due < today))
  const done = tasks.filter((x) => x.done).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0))

  const add = () => {
    const v = title.trim()
    if (!v) return
    update('tasks', (prev) => [...prev, { id: uid(), title: v, done: false, prio, due: due || undefined, createdAt: Date.now() }])
    setTitle('')
    setDue('')
  }

  return (
    <div className="page">
      <PageHead title={t('nav.tasks')} />
      <form
        className="add-row"
        onSubmit={(e) => {
          e.preventDefault()
          add()
        }}
      >
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('tasks.add')} enterKeyHint="done" className="grow" />
        <select value={prio} onChange={(e) => setPrio(Number(e.target.value) as Prio)} aria-label={t('tasks.prio')}>
          <option value={1}>{t('tasks.prio1')}</option>
          <option value={2}>{t('tasks.prio2')}</option>
          <option value={3}>{t('tasks.prio3')}</option>
        </select>
        <input type="date" value={due} onChange={(e) => setDue(e.target.value)} aria-label={t('tasks.due')} />
        <button type="submit" className="btn primary">
          +
        </button>
      </form>

      {open.length === 0 && <Empty art={<Smiski pose="cheering" size={84} />}>{t('tasks.none')}</Empty>}
      {overdue.length > 0 && (
        <Section title={t('tasks.overdue')} count={overdue.length}>
          <ul className="list">{overdue.map((x) => <TaskRow key={x.id} task={x} />)}</ul>
        </Section>
      )}
      {rest.length > 0 && (
        <Section title={t('tasks.open')} count={rest.length}>
          <ul className="list">{rest.map((x) => <TaskRow key={x.id} task={x} />)}</ul>
        </Section>
      )}
      {done.length > 0 && (
        <Section
          title={t('tasks.done')}
          count={done.length}
          action={
            <button type="button" className="link-btn" onClick={() => update('tasks', (prev) => prev.filter((x) => !x.done))}>
              {t('tasks.clearDone')}
            </button>
          }
        >
          <ul className="list">{done.slice(0, 30).map((x) => <TaskRow key={x.id} task={x} />)}</ul>
        </Section>
      )}
    </div>
  )
}
