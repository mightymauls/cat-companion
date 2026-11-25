// ♥ ♥ ♥ mod by mightymauls.com ♥ ♥ ♥

import type { Mood } from './mood'

// Sprites are drawn one character per pixel. '.' is empty; letters are fur
// colors (see colors.ts) or effect colors (EFFECTS). 'E' is an eye, open or shut.

export const WIDTH = 18
export const HEIGHT = 13

const BODY = [
  '..o...o...........',
  '..oo.oo...........',
  '.ooooooo..........',
  '.oEoooEo..........',
  '.owwpwwo..........',
  '.oowwwoooooooo....',
  '..ooooodoodoodo...',
  '...oooooooooooo...',
  '...owwwoooooooo...',
]

// Two steps of a walk; the first is also the standing pose.
const LEGS = [
  ['...oo.oo...oo.oo..', '...ww.ww...ww.ww..'],
  ['....ooo.....ooo...', '....www.....www...'],
]

// Curled up, with the tail wrapped round.
const LOAF = [
  '..o...o...........',
  '..oo.oo...........',
  '.ooooooo..........',
  '.odooodo..........',
  '.owwpwwo.oooo.....',
  '.oowwwooooooooo...',
  '..ooooodoodoodoo..',
  '..oooooooooooooo..',
  '.owwowwooooodddd..',
]

// Tail pixels as [x, y] from the top of BODY, in two swishes.
const TAILS = [
  [[15, 6], [16, 5], [16, 4], [16, 3], [15, 2]],
  [[15, 6], [16, 6], [17, 5], [17, 4], [17, 3]],
]

const MOUTH = ['mmm', 'mmm']
const Z = ['zzzz', '..z.', '.z..', 'zzzz']
const HEART = ['v.v', 'vvv', '.v.']
// 'h' is a half-width pixel, so the '!' is one and a half pixels wide.
const BANG = ['rh', 'rh', '..', 'rh']

// Swims to the left; flipped for the right.
export const FISH = [
  '..yyyy..y.',
  '.yeyYYy.yy',
  'yyyyYYyyyy',
  '.yyyyYy.yy',
  '..yyyy..y.',
].map(line => line.split(''))

// The cat's face, for the color button.
export const FACE = BODY.slice(0, 5).map(line => line.slice(1, 8).replace(/E/g, 'k').split(''))

export const EFFECTS: Record<string, string> = {
  z: '#8a8f9c',
  r: '#e5484d',
  h: '#e5484d',
  m: '#7a2e3a',
  v: '#ff4d7d',
  y: '#2f6fb5',
  Y: '#8cc4f0',
  e: '#10202f',
}

// The tick a yawn starts on, within its cycle.
export const YAWN_START = 82
const YAWN_CYCLE = 86
const BLINK_CYCLE = 14

type Grid = string[][]

export type Pose = { tick: number; mood: Mood; isWorking: boolean; isPetted: boolean }

function stamp(grid: Grid, art: readonly string[], left: number, top: number) {
  art.forEach((line, dy) => {
    line.split('').forEach((pixel, dx) => {
      if (pixel !== '.') grid[top + dy]![left + dx] = pixel
    })
  })
}

function drawNap(grid: Grid, { tick, isPetted }: Pose) {
  stamp(grid, LOAF, 0, HEIGHT - LOAF.length)
  if (isPetted) {
    stamp(grid, HEART, 11, 4 - (tick % 4))
    return
  }
  const drift = Math.floor(tick / 3) % 3
  stamp(grid, Z, 9 + drift * 2, 4 - drift * 2)
}

function tailPace(mood: Mood, isActive: boolean) {
  if (isActive) return 1
  return mood === 'yawning' ? 6 : 3
}

function drawStanding(grid: Grid, { tick, mood, isWorking, isPetted }: Pose) {
  const isAlarmed = mood === 'alarmed'
  const isWalking = isWorking || isAlarmed
  const isYawning = mood === 'yawning' && !isPetted && tick % YAWN_CYCLE >= YAWN_START
  const isEyeShut = isPetted || isYawning || tick % BLINK_CYCLE === BLINK_CYCLE - 1
  // An alarmed cat hops on every other tick.
  const top = isAlarmed && tick % 2 === 1 ? 0 : 2

  const legs = LEGS[isWalking ? tick % 2 : 0]!
  stamp(grid, [...BODY, ...legs].map(line => line.replace(/E/g, isEyeShut ? 'd' : 'k')), 0, top)

  const swish = Math.floor(tick / tailPace(mood, isWalking || isPetted)) % 2
  for (const [x, y] of TAILS[swish]!) grid[y! + top]![x!] = 'd'

  if (isYawning) stamp(grid, MOUTH, 3, top + 5)
  if (isPetted) stamp(grid, HEART, 10, 3 - (tick % 4))
  if (isAlarmed) stamp(grid, BANG, 11, 0)
}

export function drawFrame(pose: Pose): Grid {
  const grid = Array.from({ length: HEIGHT }, () => Array<string>(WIDTH).fill('.'))
  if (pose.mood === 'napping') drawNap(grid, pose)
  else drawStanding(grid, pose)
  return grid
}
