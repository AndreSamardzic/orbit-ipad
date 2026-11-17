import { useEffect, useState } from 'react'
import { Download, Trash2, Upload } from 'lucide-react'
import { downloadText, FileButton, PageHead, Section, Segmented, Toggle, toast } from '../components/ui.tsx'
import { Smiski } from '../smiski/Smiski.tsx'
import { PEOPLE_POSES, POSES } from '../smiski/catalog.ts'
import { exportBackup, importBackup, update, useData, wipeAll } from '../lib/store.ts'
import { requestPersist } from '../lib/db.ts'
import { useT } from '../lib/i18n.ts'
import { MODELS } from '../lib/claude.ts'
import { dayKey } from '../lib/dates.ts'
import type { ClaudeModel, Lang, Settings as S, ThemePref } from '../lib/types.ts'

const set = (p: Partial<S>) => update('settings', (s) => ({ ...s, ...p }))

export function Settings() {
  const d = useData()
  const s = d.settings
  const { t } = useT()
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const [showKey, setShowKey] = useState(false)
  useEffect(() => {
    void navigator.storage?.persisted?.().then(setPersisted)
  }, [])

  return (
    <div className="page settings">
      <PageHead title={t('nav.settings')} />

      <Section title={t('set.profile')}>
        <div className="form-grid">
          <label>
            {t('set.name')}
            <input value={s.name} onChange={(e) => set({ name: e.target.value })} autoComplete="given-name" />
          </label>
        </div>
        <h3 className="sub-label">{t('set.mePose')}</h3>
        <div className="pose-grid">
          {[...new Set([...PEOPLE_POSES, ...POSES])].slice(0, 24).map((pose) => (
            <button key={pose} type="button" className={`pose-btn ${s.mePose === pose ? 'on' : ''}`} onClick={() => set({ mePose: pose })} aria-label={pose}>
              <Smiski pose={pose} size={52} interactive={false} />
            </button>
          ))}
        </div>
      </Section>

      <Section title={t('set.look')}>
        <div className="setting-row">
          <span>{t('set.theme')}</span>
          <Segmented<ThemePref>
            label={t('set.theme')}
            value={s.theme}
            onChange={(theme) => set({ theme })}
            options={[
              { value: 'system', label: t('set.theme.system') },
              { value: 'light', label: t('set.theme.light') },
              { value: 'dark', label: t('set.theme.dark') },
            ]}
          />
        </div>
        <div className="setting-row">
          <span>{t('set.lang')}</span>
          <Segmented<Lang> label={t('set.lang')} value={s.lang} onChange={(lang) => set({ lang })} options={[{ value: 'de', label: 'Deutsch' }, { value: 'en', label: 'English' }]} />
        </div>
        <Toggle label={t('set.glow')} checked={s.glow} onChange={(glow) => set({ glow })} />
        <Toggle label={t('set.motion')} checked={s.motion} onChange={(motion) => set({ motion })} />
      </Section>

      <Section title={t('set.claude')}>
        <div className="form-grid">
          <label>
            {t('set.apiKey')}
            <span className="key-row">
              <input type={showKey ? 'text' : 'password'} value={s.apiKey} onChange={(e) => set({ apiKey: e.target.value.trim() })} placeholder="sk-ant-…" autoComplete="off" spellCheck={false} />
              <button type="button" className="btn" onClick={() => setShowKey(!showKey)}>
                {showKey ? '🙈' : '👁'}
              </button>
            </span>
          </label>
          <label>
            {t('set.model')}
            <select value={s.model} onChange={(e) => set({ model: e.target.value as ClaudeModel })}>
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="hint">{t('set.apiKeyHint')}</p>
        <Toggle label={t('set.shareContext')} checked={s.shareContext} onChange={(shareContext) => set({ shareContext })} />
      </Section>

      <Section title={t('set.data')}>
        <p className="muted">{t('set.counts', { t: d.tasks.length, n: d.notes.length, p: d.people.length, e: d.events.length })}</p>
        <div className="btn-row">
          <button type="button" className="btn" onClick={() => downloadText(`orbit-ipad-backup-${dayKey(new Date())}.json`, exportBackup())}>
            <Download size={16} /> {t('set.export')}
          </button>
          <FileButton
            accept=".json,application/json"
            label={<><Upload size={16} /> {t('set.importBackup')}</>}
            onText={(text) => {
              if (!confirm(t('set.importConfirm'))) return
              try {
                importBackup(text)
                toast(t('set.imported'))
              } catch {
                toast(t('set.importFailed'))
              }
            }}
          />
          <button
            type="button"
            className="btn danger"
            onClick={() => {
              if (confirm(t('set.wipeConfirm'))) void wipeAll()
            }}
          >
            <Trash2 size={16} /> {t('set.wipe')}
          </button>
        </div>
        {persisted === false && (
          <p className="hint">
            {t('set.persistNo')}{' '}
            <button type="button" className="link-btn" onClick={() => void requestPersist().then(setPersisted)}>
              ↻
            </button>
          </p>
        )}
        {persisted && <p className="muted small">✓ {t('set.persist')}</p>}
      </Section>

      <Section title={t('set.about')}>
        <p>{t('set.aboutText')}</p>
        <p className="hint">{t('set.install')}</p>
      </Section>
    </div>
  )
}
