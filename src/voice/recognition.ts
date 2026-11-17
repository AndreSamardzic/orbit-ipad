// Speech recognition through the Web Speech API (`webkitSpeechRecognition` in
// Safari). Whether a home-screen web app on iPadOS gets it is not guaranteed —
// recognitionSupported() feature-detects, the caller falls back to typing.
// Safari's recognizer hands the audio to Apple's speech service; ORBIT itself
// stores none of it.

/** The part of the Web Speech API ORBIT uses (lib.dom typings vary by TS version). */
interface RecognitionResultLike {
  readonly isFinal: boolean
  readonly length: number
  [i: number]: { transcript: string }
}
interface RecognitionEventLike {
  readonly resultIndex?: number
  readonly results: { readonly length: number; [i: number]: RecognitionResultLike }
}
interface RecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onstart: (() => void) | null
  onresult: ((e: RecognitionEventLike) => void) | null
  onerror: ((e: { error: string; message?: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}
type RecognitionCtor = new () => RecognitionLike

function ctor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export const recognitionSupported = (): boolean => ctor() !== null

export interface ListenHandlers {
  onStart?: () => void
  /** Everything heard so far in this session (final + provisional). */
  onText?: (text: string, final: boolean) => void
  /** Always called once at the very end, with the best transcript ('' = nothing). */
  onEnd: (text: string) => void
  /** Error code: not-allowed, service-not-allowed, no-speech, audio-capture, network, language-not-supported, aborted, start-failed … */
  onError?: (code: string) => void
}

export interface Listening {
  /** Stop listening and deliver what was heard. */
  stop(): void
  /** Stop listening and drop it. */
  abort(): void
}

/** Starts one recognition session. */
export function listen(opts: { lang: string; continuous: boolean }, h: ListenHandlers): Listening {
  const C = ctor()
  let ended = false
  let aborted = false
  let finalText = ''
  let interim = ''
  const end = () => {
    if (ended) return
    ended = true
    h.onEnd(aborted ? '' : `${finalText} ${interim}`.replace(/\s+/g, ' ').trim())
  }
  if (!C) {
    queueMicrotask(() => {
      h.onError?.('unsupported')
      end()
    })
    return { stop() {}, abort() {} }
  }
  const r = new C()
  r.lang = opts.lang
  r.continuous = opts.continuous
  r.interimResults = true
  r.maxAlternatives = 1
  r.onstart = () => h.onStart?.()
  r.onresult = (e) => {
    let fin = ''
    let tmp = ''
    for (let i = 0; i < e.results.length; i++) {
      const res = e.results[i]
      const t = res[0]?.transcript ?? ''
      if (res.isFinal) fin += `${t} `
      else tmp += `${t} `
    }
    finalText = fin.replace(/\s+/g, ' ').trim()
    interim = tmp.replace(/\s+/g, ' ').trim()
    h.onText?.(`${finalText} ${interim}`.replace(/\s+/g, ' ').trim(), !interim)
  }
  r.onerror = (e) => {
    if (e.error !== 'aborted' || !aborted) h.onError?.(e.error)
  }
  // Safari sometimes ends without `isFinal` on stop(): the provisional text counts.
  r.onend = end
  try {
    r.start()
  } catch {
    queueMicrotask(() => {
      h.onError?.('start-failed')
      end()
    })
  }
  // safety net: an engine that never fires `end` after stop()
  let watchdog = 0
  const arm = () => {
    window.clearTimeout(watchdog)
    watchdog = window.setTimeout(end, 2500)
  }
  return {
    stop() {
      if (ended) return
      try {
        r.stop()
      } catch {
        /* ignore */
      }
      arm()
    },
    abort() {
      if (ended) return
      aborted = true
      try {
        r.abort()
      } catch {
        /* ignore */
      }
      arm()
    },
  }
}
