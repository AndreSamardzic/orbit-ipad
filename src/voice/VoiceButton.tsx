// The floating Smiski (bottom right, above the tab bar in portrait). Push-to-
// talk: press and hold, let go when done — a quick tap listens until a pause;
// on a hardware keyboard hold Space (when no field is focused). Conversation
// mode: tap once, ORBIT listens again after it has spoken; tap again to stop.
// Without speech recognition a tap opens the panel with the text field focused.
import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { flushSync } from 'react-dom'
import { Mic, MicOff } from 'lucide-react'
import { Smiski } from '../smiski/Smiski.tsx'
import type { SmiskiPose } from '../smiski/poseTypes.ts'
import { useRoute } from '../lib/router.ts'
import { useData } from '../lib/store.ts'
import { hidePanel, openPanel, pressEnd, pressStart, toggleConversation, useVoice, voiceInputAvailable, type VoiceState } from './engine.ts'
import { vt } from './strings.ts'
import { VoiceOverlay } from './VoiceOverlay.tsx'
import '../styles/voice.css'

const TAP_MS = 350
const LINGER_MS = 10_000

function figure(v: VoiceState, inputOk: boolean): { pose: SmiskiPose; busy: boolean; mood: 'auto' | 'awake' | 'asleep' } {
  if (v.phase === 'listening') return { pose: 'headphones', busy: false, mood: 'awake' }
  if (v.phase === 'thinking') return { pose: 'thinking', busy: true, mood: 'awake' }
  if (v.phase === 'speaking') return { pose: 'presenting', busy: false, mood: 'awake' }
  if (v.proposal) return { pose: 'looking-up', busy: false, mood: 'awake' }
  if (!inputOk) return { pose: 'writing', busy: false, mood: 'awake' }
  return { pose: 'sitting', busy: false, mood: 'auto' }
}

const editable = (el: Element | null): boolean =>
  !!el && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement || (el as HTMLElement).isContentEditable)

export function VoiceButton() {
  const v = useVoice()
  const { voiceMode, lang } = useData().settings
  const { route } = useRoute()
  const inputRef = useRef<HTMLInputElement>(null)
  const press = useRef<{ t0: number; active: boolean; result: string; refocus: boolean }>({ t0: 0, active: false, result: '', refocus: false })
  const [pinned, setPinned] = useState(false)
  const inputOk = voiceInputAvailable()

  /** Opens the panel and focuses the text field in the same gesture (iOS shows the keyboard only then). */
  const focusInput = () => {
    flushSync(() => openPanel())
    inputRef.current?.focus()
    setPinned(true)
  }

  // hardware keyboard: hold Space
  useEffect(() => {
    let down = false
    const isSpace = (e: KeyboardEvent) => e.code === 'Space' || e.key === ' '
    const kd = (e: KeyboardEvent) => {
      if (!isSpace(e) || e.metaKey || e.ctrlKey || e.altKey) return
      if (editable(document.activeElement) || document.querySelector('dialog[open]')) return
      e.preventDefault()
      if (e.repeat || down) return
      down = true
      if (voiceMode === 'conversation') {
        if (toggleConversation() === 'unavailable') focusInput()
      } else if (pressStart() === 'unavailable') {
        down = false
        focusInput()
      }
    }
    const ku = (e: KeyboardEvent) => {
      if (!isSpace(e) || !down) return
      e.preventDefault()
      down = false
      if (voiceMode === 'ptt') pressEnd(false)
    }
    const blur = () => {
      if (down && voiceMode === 'ptt') pressEnd(false)
      down = false
    }
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', kd)
      window.removeEventListener('keyup', ku)
      window.removeEventListener('blur', blur)
    }
  }, [voiceMode])

  // the panel lingers a while after a reply, then gets out of the way
  useEffect(() => {
    if (!v.open) {
      setPinned(false)
      return
    }
    if (pinned || v.phase !== 'idle' || v.proposal || v.conv || v.turns === 0) return
    const id = window.setTimeout(hidePanel, LINGER_MS)
    return () => window.clearTimeout(id)
  }, [v.open, v.phase, v.proposal, v.conv, v.turns, pinned])

  const onDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    press.current = { t0: performance.now(), active: true, result: '', refocus: false }
    if (voiceMode === 'ptt') press.current.result = pressStart()
  }
  const onUp = () => {
    if (!press.current.active) return
    press.current.active = false
    const tap = performance.now() - press.current.t0 < TAP_MS
    if (voiceMode === 'conversation') {
      if (toggleConversation() === 'unavailable') fallback()
      return
    }
    if (press.current.result === 'listening') pressEnd(tap)
    else if (press.current.result === 'unavailable') fallback()
  }
  /** Text fallback: focus now, and again on the click that follows (its mousedown moves focus to the button). */
  const fallback = () => {
    focusInput()
    press.current.refocus = true
  }
  const onCancel = () => {
    if (press.current.active && voiceMode === 'ptt' && press.current.result === 'listening') pressEnd(false)
    press.current.active = false
  }

  const fig = figure(v, inputOk)
  const listening = v.phase === 'listening'
  const hint = vt(lang, voiceMode === 'ptt' ? 'fab.hintPtt' : 'fab.hintConv')

  return (
    <div className={`voice is-${v.phase} ${route === 'ask' ? 'raised' : ''} ${v.conv ? 'conv' : ''}`} data-phase={v.phase}>
      {v.open && <VoiceOverlay inputRef={inputRef} onPin={() => setPinned(true)} />}
      <button
        type="button"
        className={`voice-fab ${listening ? 'live' : ''} ${inputOk ? '' : 'no-mic'}`}
        aria-label={`${vt(lang, 'fab.label')} – ${hint}`}
        aria-pressed={listening}
        aria-expanded={v.open}
        title={hint}
        onPointerDown={onDown}
        onPointerUp={onUp}
        onPointerCancel={onCancel}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return
          e.preventDefault()
          if (voiceMode === 'conversation') {
            if (toggleConversation() === 'unavailable') focusInput()
          } else {
            const r = pressStart()
            if (r === 'listening') pressEnd(true)
            else if (r === 'unavailable') focusInput()
          }
        }}
        onClick={() => {
          if (!press.current.refocus) return
          press.current.refocus = false
          inputRef.current?.focus()
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <span className="voice-ring" aria-hidden />
        <Smiski pose={fig.pose} busy={fig.busy} mood={fig.mood} size={44} interactive={false} />
        {listening ? (
          <span className="voice-badge live" aria-hidden>
            <Mic size={11} strokeWidth={2.4} />
          </span>
        ) : !inputOk ? (
          <span className="voice-badge off" aria-hidden>
            <MicOff size={11} strokeWidth={2.4} />
          </span>
        ) : null}
      </button>
    </div>
  )
}
