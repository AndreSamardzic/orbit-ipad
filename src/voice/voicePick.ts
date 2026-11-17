// Which speechSynthesis voice ORBIT speaks with: the one picked in the voice
// panel, else the best one for the UI language. On iPadOS that means a
// downloaded "Premium"/"Enhanced" (Erweitert) voice or a Siri voice before the
// compact default; the robotic Eloquence and novelty voices (Eddy, Flo, Oma,
// Bubbles, Zarvox …) come last. Edge/Chrome neural voices score high too, so the
// desktop dev browser sounds sensible. Pure — tested.
import type { Lang } from '../lib/types.ts'

export interface VoiceLike {
  name: string
  lang: string
  voiceURI?: string
  localService?: boolean
  default?: boolean
}

const FAVORITES: Record<Lang, string[]> = {
  de: ['anna', 'helena', 'petra', 'markus', 'yannick', 'martin', 'viktor', 'seraphina', 'katja', 'conrad', 'florian'],
  en: ['ava', 'samantha', 'zoe', 'evan', 'nathan', 'tom', 'allison', 'susan', 'serena', 'daniel', 'kate', 'jenny', 'aria', 'andrew', 'emma'],
}

const NOVELTY = new Set(['albert', 'bad news', 'bahh', 'bells', 'boing', 'bubbles', 'cellos', 'good news', 'jester', 'organ', 'superstar', 'trinoids', 'whisper', 'wobble', 'zarvox', 'junior', 'ralph', 'fred', 'kathy', 'hysterical', 'deranged', 'pipe organ'])
const ELOQUENCE = new Set(['eddy', 'flo', 'grandma', 'grandpa', 'oma', 'opa', 'reed', 'rocko', 'sandy', 'shelley'])

const langOf = (v: VoiceLike) => v.lang.toLowerCase().replace('_', '-')
const firstName = (v: VoiceLike) => v.name.toLowerCase().replace(/\s*\(.*$/, '').trim()

export const quality = (v: VoiceLike): 'premium' | 'enhanced' | 'natural' | 'basic' | 'robotic' => {
  const id = `${v.name} ${v.voiceURI ?? ''}`.toLowerCase()
  if (id.includes('eloquence') || ELOQUENCE.has(firstName(v)) || NOVELTY.has(firstName(v)) || id.includes('speech.synthesis.voice')) return 'robotic'
  if (id.includes('premium')) return 'premium'
  if (id.includes('enhanced') || id.includes('erweitert') || id.includes('siri')) return 'enhanced'
  if (/\(natural\)|neural|online/.test(id) || id.startsWith('google ')) return 'natural'
  return 'basic'
}

/** A voice's score for the language; < 0 = not usable for it. */
export function voiceScore(v: VoiceLike, lang: Lang): number {
  const l = langOf(v)
  if (!l.startsWith(lang)) return -1
  let s = 20
  const q = quality(v)
  s += { premium: 70, enhanced: 55, natural: 50, basic: 0, robotic: -15 }[q]
  if (NOVELTY.has(firstName(v))) s -= 60
  if (l === 'de-de' || l === 'en-us') s += 6
  else if (l === 'en-gb') s += 4
  else if (l === 'de-at' || l === 'de-ch') s += 2
  const fav = FAVORITES[lang].findIndex((f) => firstName(v).startsWith(f) || v.name.toLowerCase().includes(` ${f}`))
  if (fav !== -1) s += 10 - Math.min(fav, 9)
  if (v.default) s += 1
  return s
}

/** Usable voices for the language, best first. */
export function rankVoices<V extends VoiceLike>(voices: readonly V[], lang: Lang): V[] {
  return voices
    .map((v) => ({ v, s: voiceScore(v, lang) }))
    .filter((x) => x.s >= 0)
    .sort((a, b) => b.s - a.s || a.v.name.localeCompare(b.v.name))
    .map((x) => x.v)
}

/** The named voice if it exists (and speaks the language), else the best ranked. */
export function pickVoice<V extends VoiceLike>(voices: readonly V[], lang: Lang, preferred = ''): V | null {
  if (preferred) {
    const hit = voices.find((v) => v.name === preferred && langOf(v).startsWith(lang))
    if (hit) return hit
  }
  return rankVoices(voices, lang)[0] ?? null
}
