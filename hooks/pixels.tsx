// ♥ ♥ ♥ mod by mightymauls.com ♥ ♥ ♥

import type { ClientElements } from 'claude-code'

// A sprite as boxes, one for each run of same-colored pixels in a row. The
// sprite fills a region of the given size in character cells.
export function pixelBoxes(
  { Box }: Pick<ClientElements, 'Box'>,
  grid: readonly (readonly string[])[],
  colors: Readonly<Record<string, string>>,
  columns: number,
  rows: number,
) {
  return grid.flatMap((row, y) => {
    const runs = []
    for (let x = 0; x < row.length; ) {
      const pixel = row[x]!
      let end = x + 1
      while (end < row.length && row[end] === pixel) end += 1
      if (pixel !== '.') {
        const right = end - (pixel === 'h' ? 0.5 : 0)
        runs.push(
          <Box
            position="absolute"
            left={(x / row.length) * columns}
            right={((row.length - right) / row.length) * columns}
            top={(y / grid.length) * rows}
            bottom={((grid.length - y - 1) / grid.length) * rows}
            backgroundColor={colors[pixel]!}
          />,
        )
      }
      x = end
    }
    return runs
  })
}
