// Pose catalogue, the collections (themed series of poses) and the deterministic
// person → pose assignment. Server and UI both import this file so a person
// never looks different in two places.
// Erasable TypeScript only (runs under Node's type stripping as-is).
import type { SmiskiCollection, SmiskiPose } from './poseTypes.ts'

/**
 * Every pose and the one collection it belongs to. A Record, so the typecheck
 * fails when a pose is added to `SmiskiPose` without a collection. Key order is
 * the display order (collection by collection).
 */
export const POSE_COLLECTION: Record<SmiskiPose, SmiskiCollection> = {
  // work
  typing: 'work',
  reading: 'work',
  thinking: 'work',
  writing: 'work',
  phoning: 'work',
  presenting: 'work',
  carrying: 'work',
  // break
  sleeping: 'break',
  lounging: 'break',
  sitting: 'break',
  'hugging-knees': 'break',
  coffee: 'break',
  headphones: 'break',
  daydreaming: 'break',
  // sport
  stretching: 'sport',
  yoga: 'sport',
  lifting: 'sport',
  climbing: 'sport',
  running: 'sport',
  'jump-rope': 'sport',
  ball: 'sport',
  // travel
  'looking-up': 'travel',
  suitcase: 'travel',
  backpack: 'travel',
  map: 'travel',
  camera: 'travel',
  'swim-ring': 'travel',
  // seasons (spring, summer, autumn, winter)
  flower: 'seasons',
  'ice-cream': 'seasons',
  umbrella: 'seasons',
  snowball: 'seasons',
  // together
  waving: 'together',
  cheering: 'together',
  hugging: 'together',
  peeking: 'together',
  hiding: 'together',
  gift: 'together',
  heart: 'together',
}

/** Collections in display order. */
export const COLLECTION_IDS: SmiskiCollection[] = ['work', 'break', 'sport', 'travel', 'seasons', 'together']

/** Every pose, grouped by collection. */
export const POSES = Object.keys(POSE_COLLECTION) as SmiskiPose[]

export interface PoseCollection {
  id: SmiskiCollection
  poses: SmiskiPose[]
}

/** The collections with their poses, in display order. */
export const COLLECTIONS: PoseCollection[] = COLLECTION_IDS.map((id) => ({
  id,
  poses: POSES.filter((p) => POSE_COLLECTION[p] === id),
}))

/** Type guard for values from outside (settings files, URLs, PUT bodies). */
export function isPose(v: unknown): v is SmiskiPose {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(POSE_COLLECTION, v)
}

export function collectionOf(pose: SmiskiPose): SmiskiCollection {
  return POSE_COLLECTION[pose]
}

/**
 * Pool for the default (not overridden) pose of a person. Deliberately the
 * original twelve: growing the pool would re-shuffle everyone's figure. The
 * newer poses are picked by hand (person page → "Change pose").
 */
export const PEOPLE_POSES: SmiskiPose[] = [
  'waving', 'hugging-knees', 'reading', 'peeking', 'thinking', 'sitting', 'lounging',
  'looking-up', 'yoga', 'carrying', 'cheering', 'climbing',
]

/** The user's own figure. */
export const ME_POSE: SmiskiPose = 'typing'

/** FNV-1a over the seed, mapped onto the pool. Stable across runs and machines. */
export function poseForSeed(seed: string, pool: SmiskiPose[] = PEOPLE_POSES): SmiskiPose {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  return pool[(h >>> 0) % pool.length]
}
