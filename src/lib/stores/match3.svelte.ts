import { type Board, type Pos } from '../games/match3/engine/types'
import { fillBoard, resolveSteps, reshuffle } from '../games/match3/engine/resolve'
import { isLegalSwap, swappedBoard, hasAnyMove } from '../games/match3/engine/match'
import { areAdjacent } from '../games/match3/engine/board'
import { mulberry32 } from '../games/match3/engine/rng'
import { play, playPop } from '../sound/sfx'

type GridSize = 6 | 7 | 8
type Movement = 'tap' | 'swipe'
export type Speed = 'rustig' | 'normaal' | 'snel'

// Base animation timing (ms) for the "explode → fall" feel, scaled by the
// chosen speed. `rustig` is the gentle default (slower, easy to follow).
const SWAP_MS = 130 // slide two tiles past each other
const EXPLODE_MS = 200 // matched tiles burst in place, leaving gaps
const FALL_MS = 240 // tiles above fall into the gaps + new tiles drop in
export const SPEED_MULT: Record<Speed, number> = { rustig: 1.9, normaal: 1, snel: 0.55 }
const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
const prefersReducedMotion = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

const SETTINGS_KEY = 'match3.settings.v1'
const STATS_KEY = 'match3.stats.v1'

interface PersistedSettings {
  gridSize: GridSize
  movement: Movement
  sound: boolean
  speed: Speed
}

function loadSettings(): PersistedSettings {
  const fallback: PersistedSettings = { gridSize: 7, movement: 'tap', sound: true, speed: 'rustig' }
  if (typeof localStorage === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return fallback
    const p = JSON.parse(raw) as Partial<PersistedSettings>
    return {
      gridSize: p.gridSize === 6 || p.gridSize === 8 ? p.gridSize : 7,
      movement: p.movement === 'swipe' ? 'swipe' : 'tap',
      sound: p.sound !== false,
      speed: p.speed === 'normaal' || p.speed === 'snel' ? p.speed : 'rustig'
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
  speed = $state<Speed>('rustig')
  board = $state<Board>(fillBoard(7, 7, Math.random))
  score = $state(0)
  best = $state(0)
  selected = $state<Pos | null>(null)
  /** Positions currently bursting (drives the explode animation). */
  exploding = $state<Pos[]>([])
  /** Longest run in the current cascade (>=4 flashes a bigger effect); 0 = none. */
  bigEffect = $state(0)
  #animating = false

  /** How much every animation duration is scaled by the current speed. */
  get animMult(): number {
    return SPEED_MULT[this.speed]
  }

  constructor() {
    const s = loadSettings()
    this.gridSize = s.gridSize
    this.movement = s.movement
    this.sound = s.sound
    this.speed = s.speed
    this.best = loadBest()
    this.board = fillBoard(this.gridSize, this.gridSize, Math.random)
  }

  #persistSettings() {
    if (typeof localStorage === 'undefined') return
    try {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({ gridSize: this.gridSize, movement: this.movement, sound: this.sound, speed: this.speed })
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
    this.exploding = []
    this.bigEffect = 0
    this.#animating = false
    play('deal', this.sound)
  }

  /**
   * Animate a swap: slide the tiles, then for each cascade explode the matched
   * tiles in place (leaving gaps) and let the tiles above fall. An illegal swap
   * slides out and back. Taps are ignored while an animation is running.
   */
  async #animatedSwap(a: Pos, b: Pos): Promise<void> {
    if (this.#animating) return
    this.#animating = true
    this.selected = null
    const reduce = prefersReducedMotion()
    const m = this.animMult
    const swapped = swappedBoard(this.board, a, b)

    if (!isLegalSwap(this.board, a, b)) {
      play('invalid', this.sound)
      if (!reduce) {
        const original = this.board
        this.board = swapped // slide there…
        await delay(SWAP_MS * m + 40)
        this.board = original // …and back
        await delay(SWAP_MS * m)
      }
      this.#animating = false
      return
    }

    play('place', this.sound)
    this.board = swapped
    if (!reduce) await delay(SWAP_MS * m)

    const { steps, score } = resolveSteps(this.board, Math.random)
    let cascade = 0
    for (const step of steps) {
      cascade++
      // A pop on EVERY cascade; the sound differs by run length (3/4/5) and
      // rises with cascade depth so chains feel satisfying.
      playPop(step.runMax, cascade, this.sound)
      if (reduce) {
        this.board = step.boardAfter
        continue
      }
      this.exploding = step.cleared // burst in place → gaps appear
      this.bigEffect = step.runMax >= 4 ? step.runMax : 0
      await delay(EXPLODE_MS * m)
      this.exploding = []
      this.board = step.boardAfter // tiles above fall into the gaps
      await delay(FALL_MS * m)
      this.bigEffect = 0
    }
    this.exploding = []
    this.bigEffect = 0

    if (!hasAnyMove(this.board)) this.board = reshuffle(this.board, Math.random)
    this.score += score
    if (this.score > this.best) {
      this.best = this.score
      this.#persistBest()
    }
    this.#animating = false
  }

  select(p: Pos): void {
    if (this.#animating) return
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
      void this.#animatedSwap(cur, p)
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
  setSpeed(s: Speed): void {
    this.speed = s
    this.#persistSettings()
  }
}

export const match3 = new Match3()
