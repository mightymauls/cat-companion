// ♥ ♥ ♥ mod by mightymauls.com ♥ ♥ ♥

import type { ClientPointerEvent, ClientSurface } from 'claude-code'

import { DEFAULT_COLOR, nextColor, PALETTES } from './colors'
import type { Mood } from './mood'
import { pixelBoxes } from './pixels'
import { drawFrame, EFFECTS, FACE, FISH, YAWN_START } from './sprites'

// The cat's size in character cells, and the row of buttons above it.
const COLUMNS = 9
const CAT_ROWS = 3
const TOOLBAR_ROWS = 1
const ROWS = TOOLBAR_ROWS + CAT_ROWS
// The buttons, left to right, as the message each posts.
const BUTTONS = ['color', 'play'] as const
const BUTTON_COLUMNS = 3
// The buttons stay this long after the pointer leaves.
const LINGER_MS = 500
const BUTTON_FILL = '#6f9c8c'
const TICK_MS = 350
const DOUBLE_CLICK_MS = 500

type State = { tick: number; isHovered: boolean; isToolbarOpen: boolean }
type Props = { isWorking: boolean; color: string; mood: Mood }

// A drag that began on the cat keeps reporting once it is outside.
function isOverCat(e: ClientPointerEvent) {
  if (e.type === 'enter') return true
  if (e.type === 'leave') return false
  return e.x >= 0 && e.x < COLUMNS && e.y >= 0 && e.y < ROWS
}

function start(surface: ClientSurface<State>) {
  let current: State = { tick: 0, isHovered: false, isToolbarOpen: false }
  const set = (change: Partial<State>) => {
    current = { ...current, ...change }
    surface.setState(current)
  }

  set({})
  surface.every(TICK_MS, () => {
    if (surface.isWindowFocused && !surface.isMotionReduced) set({ tick: current.tick + 1 })
  })
  let lastDown = -Infinity
  let closing: (() => void) | undefined
  surface.onPointer(e => {
    const isOnToolbar = current.isToolbarOpen && e.y >= 0 && e.y < TOOLBAR_ROWS
    if (e.type === 'down' && isOnToolbar) {
      const button = BUTTONS[Math.floor(e.x / BUTTON_COLUMNS)]
      if (button !== undefined) surface.post(button)
      return
    }
    if (e.type === 'down' && e.button === 'left') {
      const now = Date.now()
      if (now - lastDown <= DOUBLE_CLICK_MS) surface.post('play')
      lastDown = now
    }
    const isHovered = isOverCat(e)
    if (isHovered === current.isHovered) return
    closing?.()
    closing = undefined
    if (isHovered) {
      set({ isHovered, isToolbarOpen: true })
      return
    }
    set({ isHovered })
    closing = surface.every(LINGER_MS, () => {
      closing?.()
      closing = undefined
      set({ isToolbarOpen: false })
    })
  })
}

export default function Cat({ color, isWorking, mood }: Props, surface: ClientSurface<State>) {
  if (surface.state === undefined) start(surface)

  const { Box } = surface.elements
  const { tick, isHovered, isToolbarOpen } = surface.state ?? { tick: 0, isHovered: false, isToolbarOpen: false }
  const isStill = surface.isMotionReduced
  // Under reduced motion each mood holds one pose that still tells it apart.
  const stillTick = mood === 'yawning' ? YAWN_START : 0
  const colors: Record<string, string> = { ...EFFECTS, ...(PALETTES[color] ?? PALETTES[DEFAULT_COLOR]) }

  const grid = drawFrame({
    tick: isStill ? stillTick : tick,
    mood,
    isWorking: isWorking && !isStill,
    // Only an idle cat can be petted, and never over the alarm.
    isPetted: isHovered && !isWorking && mood !== 'alarmed',
  })

  return (
    <Box width={COLUMNS} height={ROWS}>
      {isToolbarOpen &&
        BUTTONS.map((button, i) => (
          <Box
            position="absolute"
            left={i * BUTTON_COLUMNS + 0.2}
            top={0}
            width={BUTTON_COLUMNS - 0.4}
            height={TOOLBAR_ROWS}
            justifyContent="center"
            backgroundColor={BUTTON_FILL}
          >
            {button === 'color' && (
              <Box position="absolute" left={0.5} top={0.1} width={1.6} height={0.8}>
                {pixelBoxes({ Box }, FACE, PALETTES[nextColor(color)]!, 1.6, 0.8)}
              </Box>
            )}
            {button === 'play' && (
              <Box position="absolute" left={0.2} top={0.18} width={2.2} height={0.64}>
                {pixelBoxes({ Box }, FISH, EFFECTS, 2.2, 0.64)}
              </Box>
            )}
          </Box>
        ))}
      <Box position="absolute" left={0} top={TOOLBAR_ROWS} width={COLUMNS} height={CAT_ROWS}>
        {pixelBoxes({ Box }, grid, colors, COLUMNS, CAT_ROWS)}
      </Box>
    </Box>
  )
}
