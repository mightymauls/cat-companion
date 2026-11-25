// ♥ ♥ ♥ mod by mightymauls.com ♥ ♥ ♥

export type Mood = 'perky' | 'yawning' | 'napping' | 'alarmed'

// `fill` is the percent of the context window in use.
export function moodOf(fill: number): Mood {
  if (fill >= 90) return 'alarmed'
  if (fill >= 70) return 'napping'
  if (fill >= 50) return 'yawning'
  return 'perky'
}
