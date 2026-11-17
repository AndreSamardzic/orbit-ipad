import type { SmiskiCollection, SmiskiPose } from './poseTypes.ts'

export type { SmiskiCollection, SmiskiPose }

export interface SmiskiProps {
  pose: SmiskiPose
  /** Rendered width and height in px. Default 64. */
  size?: number
  /** 'head' renders only the head — use it below ~32px (logo, status bar, graph nodes). */
  variant?: 'full' | 'head'
  /**
   * 'auto'  : the pose's natural state (sleeping/lounging/yoga start asleep);
   *           hovering wakes it, leaving lets it doze off again.
   * 'asleep'/'awake': forced, hover still reacts but does not change it.
   * Asleep figures keep still apart from breathing and floating z's;
   * awake-only details (thought dots, confetti, sparkle) fade out.
   */
  mood?: 'auto' | 'asleep' | 'awake'
  /** Hover reactions and click "boop". Default true. */
  interactive?: boolean
  /** Small animated "…" bubble — used while Claude works. Replaces the z's while shown. */
  busy?: boolean
  /** Accessible name. Without it the figure is decorative (aria-hidden); clickable figures should always get one. */
  label?: string
  /** Added to the root <span>. */
  className?: string
  /**
   * Makes the figure a keyboard-focusable button (role="button", Enter/Space,
   * focus ring). Still called with interactive={false}; only the boop is skipped.
   */
  onClick?: () => void
}
