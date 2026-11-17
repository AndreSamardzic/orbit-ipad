import { memo, type ElementType } from 'react'
import type { SmiskiPose } from '../types.ts'
import type { PoseDef } from './types.ts'
import { carrying } from './carrying.tsx'
import { cheering } from './cheering.tsx'
import { climbing } from './climbing.tsx'
import { hiding } from './hiding.tsx'
import { hugging } from './hugging.tsx'
import { huggingKnees } from './huggingKnees.tsx'
import { lifting } from './lifting.tsx'
import { lookingUp } from './lookingUp.tsx'
import { lounging } from './lounging.tsx'
import { peeking } from './peeking.tsx'
import { reading } from './reading.tsx'
import { sitting } from './sitting.tsx'
import { sleeping } from './sleeping.tsx'
import { stretching } from './stretching.tsx'
import { thinking } from './thinking.tsx'
import { typing } from './typing.tsx'
import { waving } from './waving.tsx'
import { yoga } from './yoga.tsx'
import { phoning } from './phoning.tsx'
import { presenting } from './presenting.tsx'
import { writing } from './writing.tsx'
import { coffee } from './coffee.tsx'
import { headphones } from './headphones.tsx'
import { daydreaming } from './daydreaming.tsx'
import { running } from './running.tsx'
import { jumpRope } from './jumpRope.tsx'
import { ball } from './ball.tsx'
import { suitcase } from './suitcase.tsx'
import { map } from './map.tsx'
import { backpack } from './backpack.tsx'
import { camera } from './camera.tsx'
import { swimRing } from './swimRing.tsx'
import { flower } from './flower.tsx'
import { iceCream } from './iceCream.tsx'
import { umbrella } from './umbrella.tsx'
import { snowball } from './snowball.tsx'
import { gift } from './gift.tsx'
import { heart } from './heart.tsx'

const raw: Record<SmiskiPose, PoseDef> = {
  sleeping,
  'hugging-knees': huggingKnees,
  peeking,
  thinking,
  typing,
  carrying,
  reading,
  climbing,
  yoga,
  cheering,
  hiding,
  hugging,
  waving,
  lifting,
  stretching,
  sitting,
  lounging,
  'looking-up': lookingUp,
  phoning,
  presenting,
  writing,
  coffee,
  headphones,
  daydreaming,
  running,
  'jump-rope': jumpRope,
  ball,
  suitcase,
  map,
  backpack,
  camera,
  'swim-ring': swimRing,
  flower,
  'ice-cream': iceCream,
  umbrella,
  snowball,
  gift,
  heart,
}

export type PoseEntry = Omit<PoseDef, 'Draw'> & { Draw: ElementType }

// The drawings take no props: memo() keeps hover/state re-renders from
// re-diffing the static artwork.
const entries = (Object.keys(raw) as SmiskiPose[]).map((k): [SmiskiPose, PoseEntry] => [
  k,
  { ...raw[k], Draw: memo(raw[k].Draw) },
])
export const POSE_DEFS = Object.fromEntries(entries) as Record<SmiskiPose, PoseEntry>
