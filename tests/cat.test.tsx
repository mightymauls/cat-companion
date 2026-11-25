import { expect, mock, test } from 'claude-code/testing'

import { click, clockText, newGame, step } from '../hooks/game-rules'

const SITE = {
  plugin: 'cat-companion', component: 'BesidePrompt', requestId: 'beside', surface: 'desktop',
  props: { maxColumns: 0, floatRows: 20, floatColumns: 80, isWorking: true, view: {} },
} as const

test('the cat draws on desktop and keeps animating', async $ => {
  const ui = await $.ui.mount(SITE)
  expect(await ui.find({ type: 'Client' })).toBeDefined()
  const boxes = (await ui.findAll({ type: 'Box', in: 'cat' })).length
  expect(boxes).toBeGreaterThan(20)
  await ui.advance(6000)
  expect(await ui.find({ type: 'Client' })).toBeDefined()
  await ui.unmount()
})

const start = { cwd: '/', surface: 'desktop', isInteractive: true } as const

test('/cat-off hides it, /cat-on shows it, and off is remembered', async ($, on) => {
  mock.store(on)
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  await $.session.start(start)
  const ui = await $.ui.mount(SITE)
  const shown = async () => (await ui.findAll({ type: 'Client', key: 'cat' })).length
  expect(await shown()).toBe(1)

  const run = (command: string) => $.command.run({ command, args: '' } as never)
  await run('cat-off')
  expect(await shown()).toBe(0)

  await $.session.start(start)
  expect(await shown()).toBe(0)

  await run('cat-on')
  expect(await shown()).toBe(1)
  await ui.unmount()
})

test('/cat-color cycles, takes a name, refuses unknowns and is remembered', async ($, on) => {
  mock.store(on)
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  await $.session.start(start)
  const ui = await $.ui.mount(SITE)
  const fur = async (hex: string) =>
    (await ui.findAll({ type: 'Box', in: 'cat' })).some(b => JSON.stringify(b).includes(hex))
  const run = (args: string) => $.command.run({ command: 'cat-color', args } as never)
  expect(await fur('#e39a4f')).toBe(true)
  await run('')
  expect(await fur('#f2a7c3')).toBe(true)
  await run('Gray')
  expect(await fur('#9aa1ab')).toBe(true)
  await run('plaid')
  expect(await fur('#9aa1ab')).toBe(true)
  await $.session.start(start)
  expect(await fur('#9aa1ab')).toBe(true)
  await run('siamese')
  await run('')
  expect(await fur('#e39a4f')).toBe(true)
  await ui.unmount()
})

test('the cat acts out how full the context is, and recovers', async ($, on) => {
  on('session.measure', (_, e) => ({ changed: e.changed }) as never)
  const ui = await $.ui.mount(SITE)
  const has = async (hex: string) =>
    (await ui.findAll({ type: 'Box', in: 'cat' })).some(b => JSON.stringify(b).includes(hex))
  const at = (percent?: number) =>
    $.session.measure({ changed: ['context'], rateLimits: [], context: { window: 200000, percent } } as never)
  const Z = '#8a8f9c', RED = '#e5484d', MOUTH = '#7a2e3a'
  await at(10)
  expect((await has(Z)) || (await has(RED))).toBe(false)
  await at(55)
  let didYawn = false
  for (let i = 0; i < 16; i++) { await ui.advance(350); didYawn ||= await has(MOUTH) }
  expect(didYawn).toBe(true)
  await at(75)
  expect(await has(Z)).toBe(true)
  await at(92)
  expect(await has(RED)).toBe(true)
  await at(undefined)
  expect((await has(Z)) || (await has(RED))).toBe(false)
  await ui.unmount()
})

test('a bare /cat-color steps through every color in order', async ($, on) => {
  mock.store(on)
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  await $.session.start(start)
  for (const name of ['pink', 'black', 'gray', 'white', 'brown', 'siamese', 'orange']) {
    const out = await $.command.run({ command: 'cat-color', args: '' } as never)
    expect(JSON.stringify(out)).toContain(`now ${name}`)
  }
})

test('every pose draws with motion reduced and while working', async ($, on) => {
  on('session.measure', (_, e) => ({ changed: e.changed }) as never)
  for (const isWorking of [true, false]) {
    const ui = await $.ui.mount({ ...SITE, props: { ...SITE.props, isWorking } })
    for (const percent of [0, 49, 50, 69, 70, 89, 90, 100]) {
      await $.session.measure({ changed: ['context'], rateLimits: [], context: { window: 200000, percent } } as never)
      for (let i = 0; i < 50; i++) await ui.advance(350)
      expect((await ui.findAll({ type: 'Box', in: 'cat' })).length).toBeGreaterThan(20)
      await ui.setMotionReduced(true)
      expect((await ui.findAll({ type: 'Box', in: 'cat' })).length).toBeGreaterThan(20)
      await ui.setMotionReduced(false)
    }
    await ui.unmount()
  }
})

test('a reopened session shows its fill at once, without a response', async ($, on) => {
  mock.store(on)
  let percentage: number | undefined = 75
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.measure', (_, e) => ({ changed: e.changed }) as never)
  on('session.usage', () => {
    if (percentage === undefined) throw new Error('unavailable')
    return { value: { startedAt: 0, rateLimits: [], context: { window: 200000, breakdown: { percentage } } } } as never
  })
  const ui = await $.ui.mount(SITE)
  const has = async (hex: string) =>
    (await ui.findAll({ type: 'Box', in: 'cat' })).some(b => JSON.stringify(b).includes(hex))
  const Z = '#8a8f9c', RED = '#e5484d'
  const at = (percent?: number) =>
    $.session.measure({ changed: ['context'], rateLimits: [], context: { window: 200000, percent } } as never)

  await $.session.start(start)
  expect(await has(Z)).toBe(true)
  // A measure with no reading does not reset it, and a real one wins.
  await at()
  expect(await has(Z)).toBe(true)
  await at(95)
  expect(await has(RED)).toBe(true)
  // Compacted small.
  percentage = 8
  await at()
  expect((await has(Z)) || (await has(RED))).toBe(false)
  // No estimate to be had: perky, and the session still starts.
  percentage = undefined
  await $.session.start(start)
  expect((await has(Z)) || (await has(RED))).toBe(false)
  await ui.unmount()
})

test('hovering an idle cat pets it; busy or alarmed cats ignore it', async ($, on) => {
  on('session.measure', (_, e) => ({ changed: e.changed }) as never)
  const HEART = '#ff4d7d'
  for (const isWorking of [false, true]) {
    const ui = await $.ui.mount({ ...SITE, props: { ...SITE.props, isWorking } })
    const isHeart = async () =>
      (await ui.findAll({ type: 'Box', in: 'cat' })).some(b => JSON.stringify(b).includes(HEART))
    for (const percent of [0, 55, 75, 95]) {
      await $.session.measure({ changed: ['context'], rateLimits: [], context: { window: 200000, percent } } as never)
      expect(await isHeart()).toBe(false)
      await ui.pointer({ type: 'enter', x: 3, y: 1 })
      for (let i = 0; i < 6; i++) {
        await ui.pointer({ type: 'move', x: 3 + (i % 3), y: 1 })
        await ui.advance(350)
        expect(await isHeart()).toBe(!isWorking && percent < 90)
      }
      await ui.setMotionReduced(true)
      expect(await isHeart()).toBe(!isWorking && percent < 90)
      await ui.setMotionReduced(false)
      await ui.pointer({ type: 'leave', x: 0, y: 1 })
      expect(await isHeart()).toBe(false)
    }
    await ui.unmount()
  }
})

test('a drag that ends outside the cat stops the petting', async $ => {
  const ui = await $.ui.mount({ ...SITE, props: { ...SITE.props, isWorking: false } })
  const isHeart = async () =>
    (await ui.findAll({ type: 'Box', in: 'cat' })).some(b => JSON.stringify(b).includes('#ff4d7d'))
  await ui.pointer({ type: 'down', x: 3, y: 1, button: 'left' })
  expect(await isHeart()).toBe(true)
  await ui.pointer({ type: 'up', x: -5, y: 1, button: 'left' })
  expect(await isHeart()).toBe(false)
  await ui.unmount()
})

test('the cat says thank you once, in a speech bubble', async ($, on) => {
  mock.store(on)
  const clock = mock.clock(on)
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('ui.message', () => ({}) as never)
  const isSpeaking = async (ui: { findAll: (q: { type: string; key?: string }) => Promise<unknown[]> }) =>
    (await ui.findAll({ type: 'Client', key: 'welcome' })).length === 1
  await $.session.start(start)

  // Room for the cat but not the bubble: it waits.
  const small = await $.ui.mount({ ...SITE, props: { ...SITE.props, floatRows: 6 } })
  expect(await isSpeaking(small)).toBe(false)
  await small.unmount()

  const ui = await $.ui.mount(SITE)
  expect(await isSpeaking(ui)).toBe(true)
  expect((await ui.find({ type: 'Text', text: 'xoxo M.M', in: 'welcome' })) !== undefined).toBe(true)
  await ui.advance(100)
  await clock.advance(9000)
  expect(await isSpeaking(ui)).toBe(true)
  await clock.advance(2000)
  expect(await isSpeaking(ui)).toBe(false)
  await ui.unmount()

  await $.session.start(start)
  const again = await $.ui.mount(SITE)
  expect(await isSpeaking(again)).toBe(false)
  await again.unmount()
})

test('the fish game rules: countdown, catching, misses, time up', () => {
  let seed = 7
  const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  let game = newGame(random)
  expect(click(game, game.fish.x + 1, game.fish.y + 1, random).score).toBe(0)
  for (let i = 0; i < 30; i++) game = step(game, 100, false)
  expect(game.phase).toBe('playing')
  expect(clockText(game.msLeft)).toBe('0:30')
  expect(clockText(61_000)).toBe('1:01')
  for (let i = 0; i < 299; i++) {
    game = step(game, 100, false)
    const { x, y } = game.fish
    expect(x >= 0 && x <= 36 && y >= 2 && y <= 10.8).toBe(true)
    expect(game.cat.x >= 0 && game.cat.x <= 31 && game.cat.y >= 2 && game.cat.y <= 9).toBe(true)
    expect(click(game, x < 20 ? 39 : 0, y, random).score).toBe(game.score)
    if (i % 10 === 0) game = click(game, x + 1.5, y + 0.75, random)
  }
  expect(game.score).toBe(30)
  game = step(game, 100, false)
  expect(game.phase).toBe('over')
  expect(click(game, game.fish.x + 1, game.fish.y + 1, random).score).toBe(30)
})

test('/cat-game plays to the end with a timer, saves the best and closes', async ($, on) => {
  mock.store(on, { isWelcomed: true })
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('ui.message', () => ({}) as never)
  await $.session.start(start)
  const ui = await $.ui.mount(SITE)
  const run = (command: string) => $.command.run({ command, args: '' } as never)
  const has = async (key: string) => (await ui.findAll({ type: 'Client', key })).length === 1
  const says = async (text: string, key: string) => (await ui.findAll({ type: 'Text', text, in: key })).length > 0

  await run('cat-game')
  expect(await has('game-1')).toBe(true)
  expect(await has('cat')).toBe(false)
  expect(await says('catch the fish!', 'game-1')).toBe(true)
  const counts = async (n: string) =>
    (await ui.findAll({ type: 'Text', text: new RegExp(`^${n}$`), in: 'game-1' })).length === 1
  expect(await counts('3')).toBe(true)
  // The countdown has the top row to itself: no room for the scores beside it.
  expect(await says('best 0', 'game-1')).toBe(false)
  await ui.advance(3000)
  expect(await says('0:30', 'game-1')).toBe(true)
  expect(await says('best 0', 'game-1')).toBe(true)
  await ui.setWindowFocused(false)
  await ui.advance(5000)
  await ui.setWindowFocused(true)
  expect(await says('0:30', 'game-1')).toBe(true)
  await ui.advance(10_000)
  expect(await says('0:20', 'game-1')).toBe(true)
  for (let y = 2; y < 12; y++) for (let x = 0; x < 40; x++) await ui.pointer({ type: 'down', x, y, button: 'left' })
  expect(await says('fish 0', 'game-1')).toBe(false)
  await ui.advance(20_000)
  expect(await says('your best yet', 'game-1')).toBe(true)
  await ui.advance(7000)
  expect(await has('cat')).toBe(true)

  await run('cat-game')
  expect(await has('game-2')).toBe(true)
  await ui.advance(3000)
  expect(await says('best 0', 'game-2')).toBe(false)
  expect(await says('best ', 'game-2')).toBe(true)
  await run('cat-game')
  expect(await has('cat')).toBe(true)

  await run('cat-off')
  expect(JSON.stringify(await run('cat-game'))).toContain('hidden')
  await ui.unmount()
})

test('double-clicking the cat starts the game and the x stops it', async ($, on) => {
  mock.store(on, { isWelcomed: true })
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('ui.message', () => ({}) as never)
  await $.session.start(start)
  const ui = await $.ui.mount(SITE)
  const isGame = async () => (await ui.findAll({ type: 'Client', key: 'cat' })).length === 0
  const down = (x: number, y: number) => ui.pointer({ type: 'down', x, y, button: 'left' })
  await down(3, 1)
  await ui.advance(100)
  expect(await isGame()).toBe(false)
  await down(3, 1)
  await ui.advance(100)
  expect(await isGame()).toBe(true)
  await down(38, 0)
  await ui.advance(100)
  expect(await isGame()).toBe(false)
  await ui.unmount()
})

test('every command reply is for the person alone', async ($, on) => {
  mock.store(on, { isWelcomed: true })
  for (const command of ['cat-on', 'cat-color', 'cat-game', 'cat-game', 'cat-off', 'cat-game']) {
    const out = await $.command.run({ command, args: '' } as never)
    expect(JSON.stringify(out)).toContain('"isTextDisplayOnly":true')
  }
})

test('the hover buttons change color and start the game', async ($, on) => {
  mock.store(on, { isWelcomed: true })
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('ui.message', () => ({}) as never)
  await $.session.start(start)
  const ui = await $.ui.mount(SITE)
  const isCat = async () => (await ui.findAll({ type: 'Client', key: 'cat' })).length === 1
  const has = async (hex: string) =>
    (await ui.findAll({ type: 'Box', in: 'cat' })).some(b => JSON.stringify(b).includes(`"backgroundColor":"${hex}"`))
  const down = async (x: number, y: number) => {
    await ui.pointer({ type: 'down', x, y, button: 'left' })
    await ui.advance(50)
  }
  const FISH_COLOR = '#2f6fb5'
  // The buttons show on hover and linger a moment after it.
  expect(await has(FISH_COLOR)).toBe(false)
  await ui.pointer({ type: 'enter', x: 3, y: 2 })
  expect(await has(FISH_COLOR)).toBe(true)
  await ui.pointer({ type: 'leave', x: 3, y: 2 })
  await ui.advance(400)
  expect(await has(FISH_COLOR)).toBe(true)
  await ui.advance(200)
  expect(await has(FISH_COLOR)).toBe(false)

  await ui.pointer({ type: 'enter', x: 3, y: 2 })
  // Siamese's fur shows only once it is next: orange, pink ... brown.
  expect(await has('#ead9bf')).toBe(false)
  for (let i = 0; i < 5; i++) await down(1, 0)
  expect(await has('#8f6443')).toBe(true)
  expect(await has('#ead9bf')).toBe(true)
  // Where a third button would be: nothing happens.
  await down(7, 0)
  expect(await isCat()).toBe(true)
  await down(4, 0)
  expect(await isCat()).toBe(false)
  await ui.unmount()
})
