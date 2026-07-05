// The multi-game shell: add new games here and they appear on the home screen.
// Solitaire and Match-3 are playable; the rest are placeholders for the future.

export interface GameEntry {
  id: string
  name: string
  subtitle: string
  icon: string
  available: boolean
}

export const GAMES: GameEntry[] = [
  { id: 'solitaire', name: 'Patience', subtitle: 'Klassiek kaartspel', icon: '🂡', available: true },
  { id: 'match3', name: 'Drie op een rij', subtitle: 'Kleuren matchen', icon: '🍬', available: true },
  { id: 'freecell', name: 'FreeCell', subtitle: 'Denkspel', icon: '🃏', available: false }
]
