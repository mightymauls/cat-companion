declare module 'claude-code' {
  interface PluginState {
    'cat-companion': {
      /** Whether the cat is shown. */
      isOn: boolean
      /** A name from COLOR_NAMES. */
      color: string
      /** Percent of the context window in use. */
      fill: number
      /** Whether the one-time speech bubble is due. */
      isWelcoming: boolean
      /** Which fish game is on; 0 for none. */
      gameId: number
      /** The most fish caught in one game. */
      best: number
    }
  }
}

export type CatCompanionFill = number
