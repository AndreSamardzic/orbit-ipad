// The voice panel above the Smiski button: live transcript, ORBIT's reply,
// the Ja/Nein card for anything that writes, a text field (always there —
// the fallback when Safari offers no speech recognition; the keyboard's
// dictation mic works in it), status hints and a small voice/mode section.
import { useState, type RefObject } from 'react'
import { ArrowUp, Check, Settings2, Square, TriangleAlert, Volume2, X } from 'lucide-react'
import { fmtDay } from '../lib/dates.ts'
import { useData } from '../lib/store.ts'
import type { VoiceMode } from '../lib/types.ts'
import { closePanel, decide, setVoiceSettings, stopAll, submitText, testVoice, useVoice, voiceInputAvailable } from './engine.ts'
import { vt, type VKey } from './strings.ts'
import { ttsSupported, useVoices } from './tts.ts'
import { quality, rankVoices } from './voicePick.ts'

export function VoiceOverlay({ inputRef, onPin }: { inputRef: RefObject<HTMLInputElement | null>; onPin: () => void }) {
  const v = useVoice()
  const s = useData().settings
  const lang = s.lang
  const t = (k: VKey, vars?: Record<string, string | number>) => vt(lang, k, vars)
  const [showSettings, setShowSettings] = useState(false)
  const [text, setText] = useState('')
  const inputOk = voiceInputAvailable()

  const phase: VKey = v.proposal && v.phase === 'idle' ? 'phase.confirm' : (`phase.${v.phase}` as VKey)
  const empty = !v.heard && !v.reply && !v.proposal && v.phase === 'idle'
  const status: { text: string; warn: boolean } | null = v.hint
    ? { text: t(v.hint), warn: v.hint !== 'hint.gesture' }
    : !inputOk
      ? { text: t(v.recog === 'denied' ? 'hint.denied' : v.recog === 'error' ? 'hint.audio' : 'hint.missing'), warn: true }
      : !ttsSupported()
        ? { text: t('hint.noTts'), warn: true }
        : null

  const send = (q: string) => {
    if (!q.trim()) return
    submitText(q)
    setText('')
  }

  return (
    <section className="voice-panel" role="dialog" aria-label={t('panel.label')} onPointerDown={onPin} onFocus={onPin}>
      <header className="voice-head">
        <span className={`voice-dot ${v.phase === 'listening' ? 'live' : ''}`} aria-hidden />
        <span className="voice-phase" aria-live="polite">
          {showSettings ? t('settings') : t(phase)}
        </span>
        <span className="grow" />
        {(v.phase === 'speaking' || v.phase === 'thinking' || v.phase === 'listening') && (
          <button type="button" className="icon-btn" onClick={stopAll} aria-label={t('stop')} title={t('stop')}>
            <Square size={16} />
          </button>
        )}
        <button type="button" className={`icon-btn ${showSettings ? 'on' : ''}`} onClick={() => setShowSettings((x) => !x)} aria-label={t('settings')} aria-pressed={showSettings} title={t('settings')}>
          <Settings2 size={18} />
        </button>
        <button type="button" className="icon-btn" onClick={closePanel} aria-label={t('close')} title={t('close')}>
          <X size={18} />
        </button>
      </header>

      {showSettings ? (
        <VoiceSettings />
      ) : (
        <div className="voice-body" aria-live="polite">
          {empty && (
            <div className="voice-empty">
              <p>{t(!inputOk ? 'empty.text' : s.voiceMode === 'ptt' ? 'empty.ptt' : 'empty.conv')}</p>
              <div className="voice-examples">
                {(['ex.1', 'ex.2', 'ex.3', 'ex.4'] as VKey[]).map((k) => (
                  <button key={k} type="button" className="chip" onClick={() => send(t(k))}>
                    {t(k)}
                  </button>
                ))}
              </div>
            </div>
          )}
          {(v.heard || v.phase === 'listening') && (
            <div className="voice-line you">
              <span className="who">{t('you')}</span>
              <span className={`said ${v.heardFinal ? '' : 'provisional'}`}>{v.heard || '…'}</span>
            </div>
          )}
          {(v.reply || v.phase === 'thinking') && (
            <div className="voice-line orbit">
              <span className="who">ORBIT</span>
              <span className="said">{v.reply || '…'}</span>
            </div>
          )}
          {v.note && <p className="voice-note">{t(v.note)}</p>}
          {v.proposal && <ConfirmCard />}
        </div>
      )}

      <form
        className="voice-type"
        onSubmit={(e) => {
          e.preventDefault()
          send(text)
        }}
      >
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('type.placeholder')}
          aria-label={t('type.placeholder')}
          enterKeyHint="send"
          autoComplete="off"
          maxLength={2000}
        />
        <button type="submit" className="voice-send" disabled={!text.trim()} aria-label={t('type.send')}>
          <ArrowUp size={18} />
        </button>
      </form>

      <p className={`voice-status ${status?.warn ? 'warn' : ''}`}>
        {status?.warn && <TriangleAlert size={14} aria-hidden />}
        <span>{status ? status.text : t('hint.apple')}</span>
      </p>
    </section>
  )
}

function ConfirmCard() {
  const p = useVoice().proposal
  const lang = useData().settings.lang
  if (!p) return null
  const t = (k: VKey) => vt(lang, k)
  const title = t(p.kind === 'addTask' ? 'card.addTask' : p.kind === 'completeTask' ? 'card.completeTask' : 'card.addNote')
  return (
    <div className="voice-card" role="group" aria-label={title}>
      <span className="voice-card-kind">{title}</span>
      <strong className="voice-card-title">{p.kind === 'addNote' ? (p.text ?? p.title) : p.title}</strong>
      {p.kind !== 'addNote' && (
        <span className="voice-card-meta">
          {t('card.due')}: {p.due ? fmtDay(p.due, lang) : t('card.noDue')}
        </span>
      )}
      <div className="voice-card-actions">
        <button type="button" className="btn primary" onClick={() => decide(true)}>
          <Check size={16} /> {t('yes')}
        </button>
        <button type="button" className="btn" onClick={() => decide(false)}>
          {t('no')}
        </button>
        <span className="voice-card-hint">{t('card.hint')}</span>
      </div>
    </div>
  )
}

function VoiceSettings() {
  const s = useData().settings
  const lang = s.lang
  const t = (k: VKey) => vt(lang, k)
  const all = useVoices()
  const ranked = rankVoices(all, lang)
  const label = (q: ReturnType<typeof quality>) => (q === 'premium' ? ' · Premium' : q === 'enhanced' ? (lang === 'de' ? ' · Erweitert' : ' · Enhanced') : q === 'natural' ? ' · Natural' : '')
  return (
    <div className="voice-settings">
      <div className="voice-field">
        <span>{t('mode.label')}</span>
        <div className="segmented" role="radiogroup" aria-label={t('mode.label')}>
          {(['ptt', 'conversation'] as VoiceMode[]).map((m) => (
            <button key={m} type="button" role="radio" aria-checked={s.voiceMode === m} className={s.voiceMode === m ? 'on' : ''} onClick={() => setVoiceSettings({ voiceMode: m })}>
              {t(m === 'ptt' ? 'mode.ptt' : 'mode.conversation')}
            </button>
          ))}
        </div>
      </div>
      <label className="voice-field">
        <span>{t('voice.label')}</span>
        <select value={ranked.some((x) => x.name === s.voiceName) ? s.voiceName : ''} onChange={(e) => setVoiceSettings({ voiceName: e.target.value })} disabled={!ttsSupported()}>
          <option value="">{ranked.length ? `${t('voice.auto')} – ${ranked[0].name}` : t('voice.none')}</option>
          {ranked.map((x) => (
            <option key={x.voiceURI || x.name} value={x.name}>
              {x.name}
              {label(quality(x))} ({x.lang})
            </option>
          ))}
        </select>
      </label>
      <label className="voice-field">
        <span>
          {t('voice.rate')} <span className="muted">{s.voiceRate.toFixed(2).replace(/0$/, '')}×</span>
        </span>
        <input type="range" min={0.7} max={1.4} step={0.05} value={s.voiceRate} onChange={(e) => setVoiceSettings({ voiceRate: Number(e.target.value) })} />
      </label>
      <button type="button" className="btn" onClick={testVoice} disabled={!ttsSupported()}>
        <Volume2 size={16} /> {t('voice.test')}
      </button>
      <p className="voice-tip">{t('voice.tip')}</p>
    </div>
  )
}
