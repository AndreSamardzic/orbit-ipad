// speechSynthesis for ORBIT's replies. iOS rules: the first speak() must happen
// inside a user gesture (unlockTts() on the Smiski tap), voices load
// asynchronously (voiceschanged), long utterances get cut off (→ chunks), and
// `end` events can go missing (→ watchdog). speak() resolves when done or
// cancelled — never hangs.
import { useEffect, useState } from 'react'
import type { Lang } from '../lib/types.ts'
import { chunks } from './speechText.ts'
import { pickVoice } from './voicePick.ts'

export const ttsSupported = (): boolean => typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'

let voices: SpeechSynthesisVoice[] = []
const voiceListeners = new Set<() => void>()

function refreshVoices() {
  if (!ttsSupported()) return
  const next = speechSynthesis.getVoices()
  if (next.length === voices.length && next.every((v, i) => v === voices[i])) return
  voices = next
  for (const l of voiceListeners) l()
}

if (ttsSupported()) {
  refreshVoices()
  speechSynthesis.addEventListener?.('voiceschanged', refreshVoices)
}

export function getVoices(): SpeechSynthesisVoice[] {
  if (!voices.length) refreshVoices()
  return voices
}

/** All voices, live (for the picker). */
export function useVoices(): SpeechSynthesisVoice[] {
  const [list, setList] = useState(getVoices)
  useEffect(() => {
    const on = () => setList(getVoices())
    voiceListeners.add(on)
    on()
    // WebKit sometimes never fires voiceschanged: poll briefly
    const t = window.setInterval(refreshVoices, 700)
    const stop = window.setTimeout(() => window.clearInterval(t), 6000)
    return () => {
      voiceListeners.delete(on)
      window.clearInterval(t)
      window.clearTimeout(stop)
    }
  }, [])
  return list
}

const localeFor = (lang: Lang) => (lang === 'de' ? 'de-DE' : 'en-US')

// ------------------------------------------------------------------ unlock

let unlocked = false

/**
 * Call synchronously inside a tap/click/keydown handler. iOS only lets a page
 * speak after it has spoken once from a user gesture; a silent utterance does it.
 */
export function unlockTts(): void {
  if (unlocked || !ttsSupported()) return
  try {
    const u = new SpeechSynthesisUtterance(' ')
    u.volume = 0
    u.onstart = () => {
      unlocked = true
    }
    u.onend = () => {
      unlocked = true
    }
    keep.add(u)
    u.addEventListener?.('end', () => keep.delete(u))
    speechSynthesis.speak(u)
  } catch {
    /* ignore */
  }
}

// ------------------------------------------------------------------ speaking

/** Utterances must stay referenced, or Chrome/WebKit may drop their end events. */
const keep = new Set<SpeechSynthesisUtterance>()
let gen = 0
let cancelledAt = 0
let speaking = false
const stateListeners = new Set<(on: boolean) => void>()

export const isSpeaking = (): boolean => speaking
export function onSpeakingChange(fn: (on: boolean) => void): () => void {
  stateListeners.add(fn)
  return () => stateListeners.delete(fn)
}
function setSpeaking(on: boolean) {
  if (speaking === on) return
  speaking = on
  for (const l of stateListeners) l(on)
}

export interface SpeakOptions {
  lang: Lang
  voiceName?: string
  rate?: number
}

function speakOne(text: string, opts: SpeakOptions, g: number): Promise<void> {
  return new Promise((resolve) => {
    if (g !== gen) return resolve()
    const u = new SpeechSynthesisUtterance(text)
    const v = pickVoice(getVoices(), opts.lang, opts.voiceName ?? '')
    try {
      if (v) u.voice = v
    } catch {
      /* foreign voice object */
    }
    u.lang = v?.lang ?? localeFor(opts.lang)
    u.rate = Math.min(1.6, Math.max(0.6, opts.rate ?? 1))
    let started = false
    let done = false
    const timers: number[] = []
    const finish = () => {
      if (done) return
      done = true
      timers.forEach((t) => window.clearTimeout(t))
      keep.delete(u)
      resolve()
    }
    u.onstart = () => {
      started = true
      unlocked = true
    }
    u.onend = finish
    u.onerror = finish
    keep.add(u)
    // nothing started and nothing playing: this engine cannot speak (no voice, blocked) — move on
    timers.push(window.setTimeout(() => !started && !speechSynthesis.speaking && finish(), 1800))
    // lost `end` events: generous upper bound per chunk
    timers.push(window.setTimeout(finish, 4000 + (text.length * 95) / (u.rate || 1)))
    const go = () => {
      if (g !== gen) return finish()
      try {
        speechSynthesis.speak(u)
      } catch {
        finish()
      }
    }
    // WebKit/Chromium can ignore a speak() right after cancel()
    const wait = Math.max(0, 120 - (Date.now() - cancelledAt))
    if (wait) timers.push(window.setTimeout(go, wait))
    else go()
  })
}

/** Speaks `text` (plain, not Markdown). Resolves when finished or cancelled. */
export async function speak(text: string, opts: SpeakOptions): Promise<void> {
  const clean = text.trim()
  if (!clean || !ttsSupported()) return
  const g = gen
  setSpeaking(true)
  try {
    for (const c of chunks(clean)) {
      if (g !== gen) break
      await speakOne(c, opts, g)
    }
  } finally {
    if (g === gen) setSpeaking(false)
  }
}

/** Stops speaking and drops the queue (barge-in). */
export function cancelSpeech(): void {
  gen++
  setSpeaking(false)
  if (!ttsSupported()) return
  cancelledAt = Date.now()
  try {
    speechSynthesis.cancel()
  } catch {
    /* ignore */
  }
}
