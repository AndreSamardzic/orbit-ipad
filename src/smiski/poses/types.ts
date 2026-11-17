import type { ReactElement } from 'react'

/** Hover reaction family (see Smiski.tsx). */
export type ReactKind = 'poke' | 'wave' | 'type' | 'confetti' | 'peek' | 'blanket'

export interface PoseDef {
  /** Natural state for mood="auto": true = starts asleep, hover wakes it. */
  sleepy?: boolean
  /** Whether z's float while asleep. Default true. */
  zzz?: boolean
  /** Hover reaction. Default 'poke' (blink + bounce). */
  react?: ReactKind
  /** Ground point in view-box units: origin of boop, hop and breathing. */
  ground: [number, number]
  /** Lower-left corner of the first (small) z. */
  z: [number, number]
  /** Bottom of the "!" that pops up when the sleeper wakes. */
  bang: [number, number]
  /** Tip of the busy bubble's tail. */
  bubble: [number, number]
  /** Mirror the bubble so its tail points down-right (bubble left of the head). */
  bubbleFlip?: boolean
  /** viewBox origin, to centre a composition without moving its geometry. Default [0, 0]. */
  view?: [number, number]
  /** The static drawing. Character parts go inside <Fig>. */
  Draw: () => ReactElement
}
