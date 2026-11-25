// ♥ ♥ ♥ mod by mightymauls.com ♥ ♥ ♥

// o fur, d markings and tail, w muzzle and paws, k eyes, p nose
export const PALETTES: Record<string, Record<string, string>> = {
  orange: { o: '#e39a4f', d: '#b9702f', w: '#f7e9d7', k: '#1d1612', p: '#ee8f95' },
  pink: { o: '#f2a7c3', d: '#d5779d', w: '#ffe9f1', k: '#3a1a28', p: '#d9527f' },
  black: { o: '#45424f', d: '#646072', w: '#787488', k: '#f2cf4a', p: '#c98a94' },
  gray: { o: '#9aa1ab', d: '#6d747f', w: '#e8ebef', k: '#1b2024', p: '#ee9ba2' },
  white: { o: '#dbd5cd', d: '#b0a79c', w: '#ffffff', k: '#3b7fc4', p: '#f0a0a8' },
  brown: { o: '#8f6443', d: '#62422b', w: '#e6d3bd', k: '#1a120c', p: '#d98b86' },
  siamese: { o: '#ead9bf', d: '#6b4f40', w: '#8a6753', k: '#2f74b8', p: '#4a352b' },
}
export const DEFAULT_COLOR = 'orange'
export const COLOR_NAMES = Object.keys(PALETTES)

export function nextColor(name: string): string {
  return COLOR_NAMES[(COLOR_NAMES.indexOf(name) + 1) % COLOR_NAMES.length]!
}
