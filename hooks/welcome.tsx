// ♥ ♥ ♥ mod by mightymauls.com ♥ ♥ ♥

import type { ClientSurface } from 'claude-code'

import { WELCOME_COLUMNS, WELCOME_LINES, WELCOME_ROWS } from './welcome-text'

const FILL = '#ffe9f1'
const INK = '#3a1a28'
// The bubble's height; the tail takes the rest of WELCOME_ROWS.
const BUBBLE_ROWS = 5
// The tail's steps as [left, width], narrowing toward the cat.
const TAIL = [
  [12, 2],
  [12.5, 1],
] as const
const STEP_ROWS = (WELCOME_ROWS - BUBBLE_ROWS) / TAIL.length

export default function Welcome(_: null, surface: ClientSurface<boolean>) {
  if (surface.state === undefined) {
    surface.setState(true)
    // Tells register.tsx the bubble is on screen.
    surface.post('shown')
  }

  const { Box, Text } = surface.elements

  return (
    <Box width={WELCOME_COLUMNS} height={WELCOME_ROWS}>
      <Box
        position="absolute"
        top={0}
        left={0}
        width={WELCOME_COLUMNS}
        height={BUBBLE_ROWS}
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        backgroundColor={FILL}
      >
        {WELCOME_LINES.map(line => (
          <Text color={INK}>{line}</Text>
        ))}
      </Box>
      {TAIL.map(([left, width], step) => (
        <Box
          position="absolute"
          top={BUBBLE_ROWS + step * STEP_ROWS}
          bottom={WELCOME_ROWS - BUBBLE_ROWS - (step + 1) * STEP_ROWS}
          left={left}
          right={WELCOME_COLUMNS - left - width}
          backgroundColor={FILL}
        />
      ))}
    </Box>
  )
}
