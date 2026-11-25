// ♥ ♥ ♥ mod by mightymauls.com ♥ ♥ ♥

import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionContextUsage } from 'claude-code'

import { COLOR_NAMES, DEFAULT_COLOR, nextColor } from './colors'
import { CAT_COLUMNS, GAME_COLUMNS, GAME_ROWS } from './game-rules'
import { moodOf } from './mood'
import { WELCOME_COLUMNS, WELCOME_ROWS } from './welcome-text'

const isOn = atom({ plugin: 'cat-companion', key: 'isOn' } as const, true)
const color = atom({ plugin: 'cat-companion', key: 'color' } as const, DEFAULT_COLOR)
const fill = atom({ plugin: 'cat-companion', key: 'fill' } as const, 0)
const isWelcoming = atom({ plugin: 'cat-companion', key: 'isWelcoming' } as const, false)
// Which game is on, counting up so each starts fresh; 0 is none.
const gameId = atom({ plugin: 'cat-companion', key: 'gameId' } as const, 0)
const best = atom({ plugin: 'cat-companion', key: 'best' } as const, 0)

// Keys in $.store, kept across sessions. Unset means on, in the default color.
const ON_KEY = 'isOn'
const COLOR_KEY = 'color'
const WELCOMED_KEY = 'isWelcomed'
const BEST_KEY = 'best'

const WELCOME_MS = 10_000

// The least floating room, in character cells, the cat is drawn in.
const MIN_ROWS = 4
const MIN_COLUMNS = 30

// Where the cat and its speech bubble stand, in character cells.
const CAT_RIGHT = 14
const BUBBLE_RIGHT = 6
const GAME_RIGHT = 4
const BUBBLE_BOTTOM = 3
const BUBBLE_MIN_ROWS = BUBBLE_BOTTOM + WELCOME_ROWS
const GAME_MIN_COLUMNS = GAME_RIGHT + GAME_COLUMNS + 10
const BUBBLE_MIN_COLUMNS = BUBBLE_RIGHT + WELCOME_COLUMNS + 10

// The last response's figure; before there is one (a reopened or just compacted
// session), a local estimate of what the context holds.
async function measure($: EngineInterface, context: SessionContextUsage) {
  let percent = context.percent
  if (percent === undefined) {
    try {
      const usage = await $.session.usage({ breakdown: 'summary' })
      percent = usage.context.percent ?? usage.context.breakdown?.percentage
    } catch {
      // No estimate: the cat stays perky until a real reading.
    }
  }
  await update($, fill, () => percent ?? 0)
}

let games = 0

async function startGame($: EngineInterface) {
  games += 1
  await update($, gameId, () => games)
}

async function setColor($: EngineInterface, name: string) {
  await $.store.set(COLOR_KEY, name)
  await update($, color, () => name)
}

// A command's reply, shown to the person and left out of what Claude reads.
const reply = (text: string) => ({ text, isTextDisplayOnly: true }) as const

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const savedOn = (await $.store.get(ON_KEY)) !== false
    await update($, isOn, () => savedOn)
    const isNew = (await $.store.get(WELCOMED_KEY)) !== true
    await update($, isWelcoming, () => isNew)
    const savedBest = await $.store.get(BEST_KEY)
    await update($, best, () => (typeof savedBest === 'number' ? savedBest : 0))
    await update($, gameId, () => 0)
    const savedColor = await $.store.get(COLOR_KEY)
    if (typeof savedColor === 'string' && COLOR_NAMES.includes(savedColor)) {
      await update($, color, () => savedColor)
    }
    await $.command.register({
      name: 'cat-color',
      description: `Change the cat's color: next one, or name one (${COLOR_NAMES.join(', ')})`,
    })
    await $.command.register({ name: 'cat-game', description: 'Play catch the fish with the cat, or stop playing' })
    await $.command.register({ name: 'cat-on', description: 'Show the cat on the message box' })
    await $.command.register({ name: 'cat-off', description: 'Hide the cat on the message box' })

    try {
      await measure($, (await $.session.usage()).context)
    } catch {
      // No reading yet: session.measure brings the first one.
    }

    return next(e)
  })

  // Watches only: the reading goes on unchanged.
  on('session.measure', async ($, e, next) => {
    if (e.changed.includes('context')) await measure($, e.context)
    return next(e)
  })

  // The speech bubble shows once ever. Saved as soon as it is on screen, so
  // sessions opened later don't repeat it.
  on('ui.message', { element: 'welcome' }, async ($, e, next) => {
    if (e.data === 'shown') {
      const isRepeat = (await $.store.get(WELCOMED_KEY)) === true
      await $.store.set(WELCOMED_KEY, true)
      const hide = () => update($, isWelcoming, () => false)
      if (isRepeat) await hide()
      else $.clock.after(WELCOME_MS, hide)
    }
    return next(e)
  })

  on('command.run', { command: 'cat-game' }, async $ => {
    if ((await read($, gameId)) > 0) {
      await update($, gameId, () => 0)
      return reply('Game stopped.')
    }
    if (!(await read($, isOn))) return reply('The cat is hidden. Use /cat-on, then /cat-game.')
    await startGame($)
    return reply('Click the fish before time runs out. If no game appears, make the window bigger. /cat-game again stops it.')
  })

  on('ui.message', { element: 'cat' }, async ($, e, next) => {
    if (e.data === 'play' && (await read($, gameId)) === 0) await startGame($)
    if (e.data === 'color') await setColor($, nextColor(await read($, color)))
    return next(e)
  })

  on('ui.message', { element: /^game-/ }, async ($, e, next) => {
    // A message from a game since stopped or replaced is not this one's.
    if (e.element !== `game-${await read($, gameId)}`) return next(e)
    const { data } = e
    if (data === 'close') await update($, gameId, () => 0)
    if (typeof data === 'object' && data !== null && 'score' in data && typeof data.score === 'number') {
      const { score } = data
      // Read again from the store, as another session may have done better.
      const saved = await $.store.get(BEST_KEY)
      const top = Math.max(score, typeof saved === 'number' ? saved : 0)
      await $.store.set(BEST_KEY, top)
      await update($, best, () => top)
    }
    return next(e)
  })

  on('command.run', { command: 'cat-on' }, async $ => {
    await $.store.set(ON_KEY, true)
    await update($, isOn, () => true)
    return reply('Cat is on.')
  })

  on('command.run', { command: 'cat-off' }, async $ => {
    await $.store.set(ON_KEY, false)
    await update($, isOn, () => false)
    await update($, gameId, () => 0)
    return reply('Cat is off. Use /cat-on to bring it back.')
  })

  on('command.run', { command: 'cat-color' }, async ($, e) => {
    const asked = e.args.trim().toLowerCase()
    if (asked !== '' && !COLOR_NAMES.includes(asked)) {
      return reply(`No ${asked} cat. Colors: ${COLOR_NAMES.join(', ')}.`)
    }
    const picked = asked || nextColor(await read($, color))
    await setColor($, picked)
    const isShown = await read($, isOn)
    return reply(isShown ? `Cat is now ${picked}.` : `Cat is now ${picked}, but hidden. Use /cat-on to show it.`)
  })

  on('ui.render', { component: 'BesidePrompt' }, async ($, e, next) => {
    // Draw nothing off the desktop, without room, or when turned off.
    const hasRoom = e.props.floatRows >= MIN_ROWS && e.props.floatColumns >= MIN_COLUMNS
    if (e.surface !== 'desktop' || !hasRoom || !(await read($, isOn))) {
      return next(e)
    }

    const props = {
      isWorking: e.props.isWorking,
      color: await read($, color),
      mood: moodOf(await read($, fill)),
    }
    const hasBubbleRoom = e.props.floatRows >= BUBBLE_MIN_ROWS && e.props.floatColumns >= BUBBLE_MIN_COLUMNS
    const isSpeaking = hasBubbleRoom && (await read($, isWelcoming))
    const { Box, Client } = $.ui.resolve(e)

    const game = await read($, gameId)
    const hasGameRoom = e.props.floatRows >= GAME_ROWS && e.props.floatColumns >= GAME_MIN_COLUMNS
    if (game > 0 && hasGameRoom) {
      return (
        <Box mono width={0} height={1}>
          <Box
            position="absolute"
            anchor="above"
            bottom={0}
            right={GAME_RIGHT}
            width={GAME_COLUMNS}
            height={GAME_ROWS}
          >
            <Client
              key={`game-${game}`}
              module="./game.tsx"
              width={GAME_COLUMNS}
              height={GAME_ROWS}
              props={{ color: props.color, mood: props.mood, best: await read($, best) }}
            />
          </Box>
        </Box>
      )
    }

    return (
      <Box mono width={0} height={1}>
        <Box position="absolute" anchor="above" bottom={0} right={CAT_RIGHT} width={CAT_COLUMNS} height={MIN_ROWS}>
          <Client key="cat" module="./cat.tsx" width={CAT_COLUMNS} height={MIN_ROWS} props={props} />
        </Box>
        {isSpeaking && (
          <Box
            position="absolute"
            anchor="above"
            bottom={BUBBLE_BOTTOM}
            right={BUBBLE_RIGHT}
            width={WELCOME_COLUMNS}
            height={WELCOME_ROWS}
          >
            <Client
              key="welcome"
              module="./welcome.tsx"
              width={WELCOME_COLUMNS}
              height={WELCOME_ROWS}
              props={null}
            />
          </Box>
        )}
      </Box>
    )
  })
}
