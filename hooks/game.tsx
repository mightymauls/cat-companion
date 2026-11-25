// ♥ ♥ ♥ mod by mightymauls.com ♥ ♥ ♥

import type { ClientSurface } from 'claude-code'

import { DEFAULT_COLOR, PALETTES } from './colors'
import {
  CAT_COLUMNS,
  CAT_ROWS,
  click,
  clockText,
  FISH_COLUMNS,
  FISH_ROWS,
  GAME_COLUMNS,
  GAME_ROWS,
  newGame,
  step,
} from './game-rules'
import type { Game } from './game-rules'
import type { Mood } from './mood'
import { pixelBoxes } from './pixels'
import { drawFrame, EFFECTS, FISH } from './sprites'

// Where the x that stops the game is, in character cells.
const STOP_COLUMN = GAME_COLUMNS - 3
const FRAME_MS = 100
const RESULT_MS = 6000
const HURRY_MS = 5000
const ROOM = '#6f9c8c'
const TAG = '#ffe9f1'
const INK = '#3a1a28'
const HURRY = '#c2262e'

type State = { game: Game; tick: number }
type Props = { color: string; mood: Mood; best: number }

function start(surface: ClientSurface<State>) {
  let state: State = { game: newGame(Math.random), tick: 0 }
  let resultMs = 0
  const set = (next: State) => surface.setState((state = next))

  set(state)
  const stop = surface.every(FRAME_MS, () => {
    // The game waits while the window is in the background.
    if (!surface.isWindowFocused) return
    if (state.game.phase === 'over') {
      resultMs += FRAME_MS
      if (resultMs >= RESULT_MS) {
        stop()
        surface.post('close')
      }
      return
    }
    const game = step(state.game, FRAME_MS, surface.isMotionReduced)
    set({ game, tick: state.tick + 1 })
    if (game.phase === 'over') surface.post({ score: game.score })
  })
  surface.onPointer(e => {
    if (e.type !== 'down') return
    if (e.y === 0 && e.x >= STOP_COLUMN) {
      surface.post('close')
      return
    }
    const game = click(state.game, e.fine?.x ?? e.x + 0.5, e.fine?.y ?? e.y + 0.5, Math.random)
    if (game !== state.game) set({ ...state, game })
  })
}

function headline({ phase, msLeft, score }: Game, best: number): string {
  if (phase === 'ready') return 'catch the fish!'
  if (phase === 'playing') return clockText(msLeft)
  const isBest = score > 0 && score >= best
  return `time! ${score} caught, ${isBest ? 'your best yet' : `best ${best}`}`
}

export default function FishGame({ color, mood, best }: Props, surface: ClientSurface<State>) {
  if (surface.state === undefined) start(surface)

  const { Box, Text } = surface.elements
  const state = surface.state
  if (state === undefined) return <Box width={GAME_COLUMNS} height={GAME_ROWS} backgroundColor={ROOM} />

  const { game, tick } = state
  const palette: Record<string, string> = { ...EFFECTS, ...(PALETTES[color] ?? PALETTES[DEFAULT_COLOR]) }
  const isPlaying = game.phase === 'playing'
  const isOver = game.phase === 'over'
  const isStill = surface.isMotionReduced
  const isHurry = isPlaying && game.msLeft <= HURRY_MS
  // A full context still gets its alarm.
  const cat = drawFrame({
    tick: isStill ? 0 : Math.floor(tick / 2),
    mood: mood === 'alarmed' ? 'alarmed' : 'perky',
    isWorking: isPlaying && !isStill,
    isPetted: game.cat.pounceMs > 0,
  })

  const fish = game.fish.dx > 0 ? FISH.map(row => [...row].reverse()) : FISH

  return (
    <Box width={GAME_COLUMNS} height={GAME_ROWS} backgroundColor={ROOM}>
      {isPlaying && (
        <Box position="absolute" left={1} top={0.25} height={1}>
          <Text color={INK}>fish {game.score}</Text>
        </Box>
      )}
      <Box position="absolute" left={0} right={0} top={0.25} height={1} justifyContent="center">
        <Box backgroundColor={isHurry ? HURRY : TAG} paddingX={1}>
          <Text bold color={isHurry ? TAG : INK}>
            {headline(game, best)}
          </Text>
        </Box>
      </Box>
      {isPlaying && (
        <Box position="absolute" right={4} top={0.25} height={1}>
          <Text color={INK}>best {best}</Text>
        </Box>
      )}
      <Box position="absolute" left={STOP_COLUMN} top={0} width={3} height={1} justifyContent="center" backgroundColor={TAG}>
        <Text bold color={INK}>x</Text>
      </Box>
      <Box position="absolute" left={game.cat.x} top={game.cat.y} width={CAT_COLUMNS} height={CAT_ROWS}>
        {pixelBoxes({ Box }, cat, palette, CAT_COLUMNS, CAT_ROWS)}
      </Box>
      {!isOver && (
        <Box
          position="absolute"
          left={game.fish.x}
          top={game.fish.y}
          width={FISH_COLUMNS}
          height={FISH_ROWS}
        >
          {pixelBoxes({ Box }, fish, EFFECTS, FISH_COLUMNS, FISH_ROWS)}
        </Box>
      )}
      {game.phase === 'ready' && (
        <Box position="absolute" left={0} right={0} top={2} height={1} justifyContent="center">
          <Box backgroundColor={TAG} paddingX={1}>
            <Text bold color={INK}>
              {Math.ceil(game.msLeft / 1000)}
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  )
}
