import { useState } from 'react'
import { ChevronLeft, Link2, Mail, Phone, Plus, Trash2, Upload } from 'lucide-react'
import { Empty, FileButton, PageHead, Segmented, toast } from '../components/ui.tsx'
import { PeopleNetwork, useNetL } from '../components/PeopleNetwork.tsx'
import { Smiski } from '../smiski/Smiski.tsx'
import { COLLECTIONS, poseForSeed } from '../smiski/catalog.ts'
import { uid, update, useData } from '../lib/store.ts'
import { useT } from '../lib/i18n.ts'
import { go, useRoute } from '../lib/router.ts'
import { parseVCards } from '../lib/vcard.ts'
import { ME, linkLabels, linksWithout, otherEnd, touches, upsertLink, type Strength } from '../lib/network.ts'
import type { Person, PersonLink } from '../lib/types.ts'

const COLLECTION_NAMES = {
  de: { work: 'Arbeit', break: 'Pause', sport: 'Sport', travel: 'Reise', seasons: 'Jahreszeiten', together: 'Miteinander' },
  en: { work: 'Work', break: 'Break', sport: 'Sport', travel: 'Travel', seasons: 'Seasons', together: 'Together' },
} as const

/** Grid or network; kept for the session so a trip to a person and back stays in the same view. */
let lastView: 'grid' | 'network' = 'grid'

const patch = (id: string, p: Partial<Person>) => update('people', (prev) => prev.map((x) => (x.id === id ? { ...x, ...p, updatedAt: Date.now() } : x)))

export function People() {
  const { people } = useData()
  const { t } = useT()
  const { param } = useRoute()
  const [q, setQ] = useState('')
  const [tag, setTag] = useState<string | null>(null)
  const [view, setViewState] = useState(lastView)
  const setView = (v: 'grid' | 'network') => setViewState((lastView = v))
  const L = useNetL()
  const current = people.find((p) => p.id === param)
  const tags = [...new Set(people.flatMap((p) => p.tags))].sort()
  const list = people
    .filter((p) => (!tag || p.tags.includes(tag)) && (!q || `${p.name} ${p.tags.join(' ')} ${p.note}`.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => a.name.localeCompare(b.name))

  const add = () => {
    const id = uid()
    update('people', (prev) => [...prev, { id, name: '', pose: poseForSeed(id), note: '', tags: [], updatedAt: Date.now() }])
    go('people', id)
  }

  const onVcf = (text: string) => {
    const cards = parseVCards(text)
    const known = new Set(people.map((p) => p.name.toLowerCase()))
    const fresh = cards.filter((c) => !known.has(c.name.toLowerCase()))
    update('people', (prev) => [
      ...prev,
      ...fresh.map((c) => {
        const id = uid()
        return { id, name: c.name, pose: poseForSeed(c.name), note: c.note ?? '', tags: [], email: c.email, phone: c.phone, birthday: c.birthday, updatedAt: Date.now() }
      }),
    ])
    toast(t('people.imported', { n: fresh.length }))
  }

  if (current) return <PersonDetail key={current.id} p={current} />

  return (
    <div className="page">
      <PageHead
        title={t('nav.people')}
        actions={
          <>
            <FileButton accept=".vcf,text/vcard,text/x-vcard" label={<><Upload size={16} /> {t('people.import')}</>} onText={onVcf} />
            <button type="button" className="btn primary" onClick={add}>
              <Plus size={16} /> {t('people.add')}
            </button>
          </>
        }
      />
      {people.length > 0 && (
        <div className="filter-row">
          <div className="people-view-row">
            <Segmented
              label={L.view}
              value={view}
              onChange={setView}
              options={[
                { value: 'grid', label: L.grid },
                { value: 'network', label: L.network },
              ]}
            />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('people.search')} className="search" />
          </div>
          {tags.length > 0 && (
            <div className="chips">
              <button type="button" className={`chip ${tag === null ? 'on' : ''}`} onClick={() => setTag(null)}>
                {t('people.all')}
              </button>
              {tags.map((x) => (
                <button key={x} type="button" className={`chip ${tag === x ? 'on' : ''}`} onClick={() => setTag(tag === x ? null : x)}>
                  {x}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {people.length === 0 ? (
        <Empty art={<Smiski pose="waving" size={96} />}>{t('people.empty')}</Empty>
      ) : view === 'network' ? (
        <PeopleNetwork people={people} focus={q || tag ? new Set(list.map((p) => p.id)) : null} />
      ) : (
        <div className="people-grid">
          {list.map((p) => (
            <button key={p.id} type="button" className="person-tile" onClick={() => go('people', p.id)}>
              <Smiski pose={p.pose} size={84} interactive={false} />
              <strong>{p.name || '…'}</strong>
              {p.tags.length > 0 && <span className="muted small">{p.tags.slice(0, 3).join(' · ')}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function PersonDetail({ p }: { p: Person }) {
  const { t, lang } = useT()
  const [collection, setCollection] = useState(COLLECTIONS[0].id)
  const [tagText, setTagText] = useState(p.tags.join(', '))
  return (
    <div className="page person">
      <div className="toolbar">
        <button type="button" className="btn" onClick={() => go('people')}>
          <ChevronLeft size={18} /> {t('people.back')}
        </button>
        <span className="grow" />
        <button
          type="button"
          className="icon-btn danger"
          aria-label={t('people.delete')}
          onClick={() => {
            update('people', (prev) => prev.filter((x) => x.id !== p.id))
            update('links', (prev) => linksWithout(prev, p.id))
            go('people')
          }}
        >
          <Trash2 size={18} />
        </button>
      </div>
      <div className="person-head">
        <Smiski pose={p.pose} size={140} />
        <div className="grow">
          <input className="person-name" value={p.name} onChange={(e) => patch(p.id, { name: e.target.value })} placeholder={t('people.name')} autoFocus={!p.name} />
          <div className="contact-row">
            {p.email && (
              <a className="chip" href={`mailto:${p.email}`}>
                <Mail size={14} /> {p.email}
              </a>
            )}
            {p.phone && (
              <a className="chip" href={`tel:${p.phone.replace(/\s/g, '')}`}>
                <Phone size={14} /> {p.phone}
              </a>
            )}
          </div>
        </div>
      </div>
      <div className="form-grid">
        <label>
          {t('people.email')}
          <input type="email" value={p.email ?? ''} onChange={(e) => patch(p.id, { email: e.target.value || undefined })} />
        </label>
        <label>
          {t('people.phone')}
          <input type="tel" value={p.phone ?? ''} onChange={(e) => patch(p.id, { phone: e.target.value || undefined })} />
        </label>
        <label>
          {t('people.birthday')}
          <input type="date" value={p.birthday && p.birthday.length === 10 ? p.birthday : ''} onChange={(e) => patch(p.id, { birthday: e.target.value || undefined })} />
        </label>
        <label>
          {t('people.tags')}
          <input
            value={tagText}
            onChange={(e) => setTagText(e.target.value)}
            onBlur={() => patch(p.id, { tags: [...new Set(tagText.split(',').map((x) => x.trim()).filter(Boolean))] })}
          />
        </label>
      </div>
      <label className="block-label">
        {t('people.note')}
        <textarea value={p.note} onChange={(e) => patch(p.id, { note: e.target.value })} rows={6} />
      </label>
      <Connections key={p.id} p={p} />
      <div className="pose-picker">
        <h3 className="section-label">{t('people.pose')}</h3>
        <div className="chips">
          {COLLECTIONS.map((c) => (
            <button key={c.id} type="button" className={`chip ${collection === c.id ? 'on' : ''}`} onClick={() => setCollection(c.id)}>
              {COLLECTION_NAMES[lang][c.id]}
            </button>
          ))}
        </div>
        <div className="pose-grid">
          {COLLECTIONS.find((c) => c.id === collection)?.poses.map((pose) => (
            <button key={pose} type="button" className={`pose-btn ${p.pose === pose ? 'on' : ''}`} onClick={() => patch(p.id, { pose })} aria-label={pose}>
              <Smiski pose={pose} size={56} interactive={false} />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Verbindungen: the person's links (to people or to me), editable. */
function Connections({ p }: { p: Person }) {
  const { people, links, settings } = useData()
  const L = useNetL()
  const [other, setOther] = useState('')
  const [label, setLabel] = useState('')
  const [strength, setStrength] = useState<Strength>(2)
  const meName = settings.name.trim() || L.me
  const byId = new Map(people.map((x) => [x.id, x]))
  const mine = links.filter((l) => touches(l, p.id) && (otherEnd(l, p.id) === ME || byId.has(otherEnd(l, p.id))))
  const linked = new Set(mine.map((l) => otherEnd(l, p.id)))
  const candidates = people.filter((x) => x.id !== p.id && !linked.has(x.id)).sort((a, b) => a.name.localeCompare(b.name))
  const labels = linkLabels(links)
  const strengths: { value: `${Strength}`; label: string }[] = [
    { value: '1', label: L.s1 },
    { value: '2', label: L.s2 },
    { value: '3', label: L.s3 },
  ]
  const editLink = (id: string, patchL: Partial<PersonLink>) => update('links', (prev) => prev.map((l) => (l.id === id ? { ...l, ...patchL } : l)))
  const add = () => {
    if (!other) return
    update('links', (prev) => upsertLink(prev, other === ME ? ME : p.id, other === ME ? p.id : other, strength, label, uid))
    setOther('')
    setLabel('')
    setStrength(2)
  }
  const sorted = [...mine].sort((a, b) => {
    const x = otherEnd(a, p.id)
    const y = otherEnd(b, p.id)
    return Number(y === ME) - Number(x === ME) || b.strength - a.strength || (byId.get(x)?.name ?? '').localeCompare(byId.get(y)?.name ?? '')
  })
  return (
    <section className="links-section">
      <h3 className="section-label">
        <Link2 size={14} aria-hidden /> {L.connections}
        {mine.length > 0 && <span className="count">{mine.length}</span>}
      </h3>
      {sorted.length === 0 ? (
        <p className="muted">{L.none}</p>
      ) : (
        <ul className="list">
          {sorted.map((l) => {
            const id = otherEnd(l, p.id)
            const o = id === ME ? null : byId.get(id)
            return (
              <li key={l.id} className="link-row">
                <button type="button" className="link-who" disabled={!o} onClick={() => o && go('people', o.id)}>
                  <Smiski pose={o ? o.pose : settings.mePose} size={36} variant="head" interactive={false} />
                  <span>{o ? o.name || '…' : `${meName} (${L.you})`}</span>
                </button>
                <input
                  className="link-label"
                  aria-label={L.label}
                  placeholder={L.labelPh}
                  list="orbit-link-labels"
                  defaultValue={l.label ?? ''}
                  onBlur={(e) => {
                    const v = e.target.value.trim() || undefined
                    if (v !== l.label) editLink(l.id, { label: v })
                  }}
                />
                <span className="strength">
                  <Segmented label={L.strength} value={`${l.strength}` as `${Strength}`} options={strengths} onChange={(v) => editLink(l.id, { strength: Number(v) as Strength })} />
                </span>
                <button type="button" className="icon-btn danger" aria-label={L.remove} onClick={() => update('links', (prev) => prev.filter((x) => x.id !== l.id))}>
                  <Trash2 size={18} />
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <div className="link-add">
        <select value={other} onChange={(e) => setOther(e.target.value)} aria-label={L.pick}>
          <option value="">{candidates.length === 0 && linked.has(ME) ? L.allLinked : L.pick}</option>
          {!linked.has(ME) && <option value={ME}>{L.meOption.replace('{name}', meName)}</option>}
          {candidates.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name || '…'}
            </option>
          ))}
        </select>
        <input aria-label={L.label} placeholder={L.labelPh} list="orbit-link-labels" value={label} onChange={(e) => setLabel(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <span className="strength">
          <Segmented label={L.strength} value={`${strength}` as `${Strength}`} options={strengths} onChange={(v) => setStrength(Number(v) as Strength)} />
        </span>
        <button type="button" className="btn primary" disabled={!other} onClick={add}>
          <Plus size={16} /> {L.connect}
        </button>
      </div>
      <datalist id="orbit-link-labels">
        {labels.map((x) => (
          <option key={x} value={x} />
        ))}
      </datalist>
    </section>
  )
}
