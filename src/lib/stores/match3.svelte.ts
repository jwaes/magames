import { type Board, type Pos } from '../games/match3/engine/types'
import { fillBoard, resolveAll, reshuffle } from '../games/match3/engine/resolve'
import { isLegalSwap, swappedBoard, hasAnyMove } from '../games/match3/engine/match'
import { areAdjacent } from '../games/match3/engine/board'
import { mulberry32 } from '../games/match3/engine/rng'
import { play } from '../sound/sfx'

type GridSize = 6 | 7 | 8
type Movement = 'tap' | 'swipe'
const SETTINGS_KEY = 'match3.settings.v1'
const STATS_KEY = 'match3.stats.v1'

interface PersistedSettings {
  gridSize: GridSize
  movement: Movement
  sound: boolean
}

function loadSettings(): PersistedSettings {
  const fallback: PersistedSettings = { gridSize: 7, movement: 'tap', sound: true }
  if (typeof localStorage === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return fallback
    const p = JSON.parse(raw) as Partial<PersistedSettings>
    return {
      gridSize: p.gridSize === 6 || p.gridSize === 8 ? p.gridSize : 7,
      movement: p.movement === 'swipe' ? 'swipe' : 'tap',
      sound: p.sound !== false
    }
  } catch {
    return fallback
  }
}

function loadBest(): number {
  if (typeof localStorage === 'undefined') return 0
  try {
    const raw = localStorage.getItem(STATS_KEY)
    if (!raw) return 0
    const n = (JSON.parse(raw) as { best?: number }).best
    return typeof n === 'number' && n >= 0 ? n : 0
  } catch {
    return 0
  }
}

class Match3 {
  gridSize = $state<GridSize>(7)
  movement = $state<Movement>('tap')
  sound = $state(true)
  board = $state<Board>(fillBoard(7, 7, Math.random))
  score = $state(0)
  best = $state(0)
  selected = $state<Pos | null>(null)

  constructor() {
    const s = loadSettings()
    this.gridSize = s.gridSize
    this.movement = s.movement
    this.sound = s.sound
    this.best = loadBest()
    this.board = fillBoard(this.gridSize, this.gridSize, Math.random)
  }

  #persistSettings() {
    if (typeof localStorage === 'undefined') return
    try {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({ gridSize: this.gridSize, movement: this.movement, sound: this.sound })
      )
    } catch {
      /* ignore */
    }
  }
  #persistBest() {
    if (typeof localStorage === 'undefined') return
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify({ best: this.best }))
    } catch {
      /* ignore */
    }
  }

  newGame(seed?: number): void {
    const rng = seed === undefined ? Math.random : mulberry32(seed)
    this.board = fillBoard(this.gridSize, this.gridSize, rng)
    this.score = 0
    this.selected = null
    play('deal', this.sound)
  }

  trySwap(a: Pos, b: Pos): boolean {
    if (!isLegalSwap(this.board, a, b)) {
      play('invalid', this.sound)
      this.selected = null
      return false
    }
    const swapped = swappedBoard(this.board, a, b)
    const { board: resolved, score } = resolveAll(swapped, Math.random)
    let next = resolved
    if (!hasAnyMove(next)) next = reshuffle(next, Math.random)
    this.board = next
    this.score += score
    if (this.score > this.best) {
      this.best = this.score
      this.#persistBest()
    }
    this.selected = null
    play('place', this.sound)
    return true
  }

  select(p: Pos): void {
    const cur = this.selected
    if (cur === null) {
      this.selected = p
      return
    }
    if (cur.r === p.r && cur.c === p.c) {
      this.selected = null
      return
    }
    if (areAdjacent(cur, p)) {
      this.trySwap(cur, p)
      return
    }
    this.selected = p
  }

  setGridSize(n: GridSize): void {
    this.gridSize = n
    this.#persistSettings()
  }
  setMovement(m: Movement): void {
    this.movement = m
    this.#persistSettings()
  }
  toggleSound(): void {
    this.sound = !this.sound
    this.#persistSettings()
  }
}

export const match3 = new Match3()
