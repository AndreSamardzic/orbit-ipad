// Shared body geometry. All numbers are view-box units (120 x 120). Paths are
// the *inner* edge of the silhouette: Blob draws the outline outside them.

export const f = (n: number) => Math.round(n * 100) / 100

export interface StandOpts {
  /** Half width of the hips (nominal). */
  hip?: number
  /** Half width of the gap between the legs (nominal). */
  gap?: number
  /** Top of the torso (hidden under the head). */
  top?: number
  /** Height of the crotch (top of the leg gap). */
  crotch?: number
  /** Soles. */
  foot?: number
}

/**
 * Front-view standing torso with two stubby legs and a little gap between
 * them. `dx` shifts it horizontally.
 */
export function standBody(dx = 0, { hip = 13.8, gap = 4.4, top = 46, crotch = 90, foot = 110.4 }: StandOpts = {}): string {
  const x = (n: number) => f(60 + dx + n)
  const y = (n: number) => f(n)
  const h = hip
  const g = gap
  const leg = foot - crotch
  return [
    `M${x(-h + 2.8)},${y(top)}`,
    `C${x(-h + 1.2)},${y(top + 10)} ${x(-h - 0.6)},${y(top + 22)} ${x(-h - 0.6)},${y(crotch - 8)}`,
    `C${x(-h - 0.6)},${y(crotch + leg * 0.1)} ${x(-h - 0.4)},${y(crotch + leg * 0.5)} ${x(-h - 1.1)},${y(foot - 5.8)}`,
    `C${x(-h - 1.3)},${y(foot - 1.8)} ${x(-h + 0.9)},${y(foot)} ${x(-h + 4.1)},${y(foot)}`,
    `L${x(-g - 2.2)},${y(foot)}`,
    `C${x(-g - 0.6)},${y(foot)} ${x(-g)},${y(foot - 1.2)} ${x(-g)},${y(foot - 2.8)}`,
    `L${x(-g)},${y(crotch + 4)}`,
    `C${x(-g)},${y(crotch + 1.6)} ${x(-g + 1.8)},${y(crotch)} ${x(0)},${y(crotch)}`,
    `C${x(g - 1.8)},${y(crotch)} ${x(g)},${y(crotch + 1.6)} ${x(g)},${y(crotch + 4)}`,
    `L${x(g)},${y(foot - 2.8)}`,
    `C${x(g)},${y(foot - 1.2)} ${x(g + 0.6)},${y(foot)} ${x(g + 2.2)},${y(foot)}`,
    `L${x(h - 4.1)},${y(foot)}`,
    `C${x(h - 0.9)},${y(foot)} ${x(h + 1.3)},${y(foot - 1.8)} ${x(h + 1.1)},${y(foot - 5.8)}`,
    `C${x(h + 0.4)},${y(crotch + leg * 0.5)} ${x(h + 0.6)},${y(crotch + leg * 0.1)} ${x(h + 0.6)},${y(crotch - 8)}`,
    `C${x(h + 0.6)},${y(top + 22)} ${x(h - 1.2)},${y(top + 10)} ${x(h - 2.8)},${y(top)}Z`,
  ].join(' ')
}

/** Hanging arm centre-line on the viewer's left (side = -1) or right (side = 1). */
export function hangingArm(side: -1 | 1, dx = 0, out = 0): string {
  const x = (n: number) => f(60 + dx + side * n)
  return `M${x(11.6)},52 C${x(12.4 + out * 0.3)},62 ${x(13.2 + out * 0.7)},72 ${x(13.4 + out)},82`
}

/** Inner line separating a hanging arm from the torso, plus the little hand curl. */
export function armLines(side: -1 | 1, dx = 0, out = 0): string[] {
  const x = (n: number) => f(60 + dx + side * n)
  return [
    `M${x(6.7)},59 L${x(8.1 + out * 0.6)},78`,
    `M${x(9.1 + out)},79.6 q${f(side * -1.7)},2.5 ${f(side * 0.2)},5`,
  ]
}
