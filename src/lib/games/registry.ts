// The multi-game shell: add new games here and they appear on the home screen.
// Only Solitaire is playable today; the rest are placeholders for the future.

export interface GameEntry {
  id: string
  name: string
  subtitle: string
  icon: string
  available: boolean
}

export const GAMES: GameEntry[] = [
  { id: 'solitaire', name: 'Patience', subtitle: 'Klassiek kaartspel', icon: '🂡', available: true },
  { id: 'spider', name: 'Spider', subtitle: 'Twee kleuren', icon: '🕷️', available: false },
  { id: 'freecell', name: 'FreeCell', subtitle: 'Denkspel', icon: '🃏', available: false }
]
