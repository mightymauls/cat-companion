// ♥ ♥ ♥ mod by mightymauls.com ♥ ♥ ♥

// The fish game's rules, with nothing of how it is drawn. Distances are in
// character cells and times in milliseconds.

export const GAME_COLUMNS = 40
export const GAME_ROWS = 12
// The rows at the top that hold the timer and score.
export const HUD_ROWS = 2
export const CAT_COLUMNS = 9
export const CAT_ROWS = 3
export const FISH_COLUMNS = 4
export const FISH_ROWS = 1.2

export const READY_MS = 3000
export const PLAY_MS = 30_000
const POUNCE_MS = 350

const START_SPEED = 9
const MAX_SPEED = 24
const SPEED_UP = 1.07
const CAT_SPEED = 14
// How far past the fish's edge a click still counts.
const REACH_COLUMNS = 0.8
const REACH_ROWS = 0.4

export type Phase = 'ready' | 'playing' | 'over'
export type Game = {
  phase: Phase
  msLeft: number
  score: number
  fish: { x: number; y: number; dx: number; dy: number }
  cat: { x: number; y: number; pounceMs: number }
}

const FLOOR = GAME_ROWS - CAT_ROWS
const MAX_X = GAME_COLUMNS - FISH_COLUMNS
const MAX_Y = GAME_ROWS - FISH_ROWS
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value))

type Random = () => number

function throwFish(score: number, random: Random): Game['fish'] {
  const speed = Math.min(MAX_SPEED, START_SPEED * SPEED_UP ** score)
  const slant = 0.25 + random() * 0.2
  return {
    x: random() * MAX_X,
    y: HUD_ROWS + random() * (MAX_Y - HUD_ROWS),
    dx: speed * (random() < 0.5 ? -1 : 1),
    dy: speed * slant * (random() < 0.5 ? -1 : 1),
  }
}

export function newGame(random: Random): Game {
  return {
    phase: 'ready',
    msLeft: READY_MS,
    score: 0,
    fish: throwFish(0, random),
    cat: { x: (GAME_COLUMNS - CAT_COLUMNS) / 2, y: FLOOR, pounceMs: 0 },
  }
}

function moveFish(fish: Game['fish'], seconds: number): Game['fish'] {
  const x = fish.x + fish.dx * seconds
  const y = fish.y + fish.dy * seconds
  return {
    x: clamp(x, 0, MAX_X),
    y: clamp(y, HUD_ROWS, MAX_Y),
    dx: x < 0 || x > MAX_X ? -fish.dx : fish.dx,
    dy: y < HUD_ROWS || y > MAX_Y ? -fish.dy : fish.dy,
  }
}

// The cat chases the fish along the floor, and drops back after a pounce.
function moveCat(cat: Game['cat'], fish: Game['fish'], ms: number): Game['cat'] {
  if (cat.pounceMs > 0) return { ...cat, pounceMs: Math.max(0, cat.pounceMs - ms) }
  const goal = clamp(fish.x + FISH_COLUMNS / 2 - CAT_COLUMNS / 2, 0, GAME_COLUMNS - CAT_COLUMNS)
  const stride = (CAT_SPEED * ms) / 1000
  return { x: cat.x + clamp(goal - cat.x, -stride, stride), y: FLOOR, pounceMs: 0 }
}

// Moves the game on. With `isStill` (reduced motion) the fish waits to be
// clicked instead of swimming, and the timer still runs.
export function step(game: Game, ms: number, isStill: boolean): Game {
  if (game.phase === 'over') return game
  const msLeft = game.msLeft - ms
  if (game.phase === 'ready') {
    return msLeft > 0 ? { ...game, msLeft } : { ...game, phase: 'playing', msLeft: PLAY_MS }
  }
  if (msLeft <= 0) return { ...game, phase: 'over', msLeft: 0, cat: { ...game.cat, y: FLOOR, pounceMs: 0 } }
  const fish = isStill ? game.fish : moveFish(game.fish, ms / 1000)
  return { ...game, msLeft, fish, cat: moveCat(game.cat, fish, ms) }
}

// A click at a point: a catch when it is on the fish or close to it.
export function click(game: Game, x: number, y: number, random: Random): Game {
  if (game.phase !== 'playing') return game
  const { fish } = game
  const isCatch =
    x >= fish.x - REACH_COLUMNS &&
    x <= fish.x + FISH_COLUMNS + REACH_COLUMNS &&
    y >= fish.y - REACH_ROWS &&
    y <= fish.y + FISH_ROWS + REACH_ROWS
  if (!isCatch) return game
  const score = game.score + 1
  return {
    ...game,
    score,
    fish: throwFish(score, random),
    cat: {
      x: clamp(fish.x + FISH_COLUMNS / 2 - CAT_COLUMNS / 2, 0, GAME_COLUMNS - CAT_COLUMNS),
      y: clamp(fish.y, HUD_ROWS, FLOOR),
      pounceMs: POUNCE_MS,
    },
  }
}

export function clockText(ms: number): string {
  const seconds = Math.ceil(ms / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}
