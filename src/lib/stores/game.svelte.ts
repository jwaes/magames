// Stateful wrapper around the pure Solitaire engine: adds undo history,
// a timer, win detection and sound. This is what the UI talks to.

import {
  deal,
  draw,
  move,
  autoDest,
  isWon,
  nextAutoFinishMove,
  type GameState,
  type Source,
  type Dest,
  type DrawCount
} from '../engine/solitaire'
import { settings } from './settings.svelte'
import { mulberry32 } from '../engine/cards'
import { play } from '../sound/sfx'

class SolitaireGame {
  state = $state<GameState>(deal(1))
  won = $state(false)
  seconds = $state(0)
  /** A card the "Hint" button is currently suggesting, for a visual pulse. */
  hint = $state<Source | null>(null)

  #history: GameState[] = $state([])
  #timer: ReturnType<typeof setInterval> | null = null
  #running = false

  get moves(): number {
    return this.state.moves
  }
  get canUndo(): boolean {
    return this.#history.length > 0
  }

  /** `seed` gives a reproducible deal (used by tests); omit for a random game. */
  newGame(drawCount: DrawCount = settings.drawCount, seed?: number): void {
    this.state = deal(drawCount, seed === undefined ? Math.random : mulberry32(seed))
    this.#history = []
    this.won = false
    this.seconds = 0
    this.#stopTimer()
    this.#running = false
    play('deal', settings.sound)
  }

  /** Apply a produced next-state, recording history and checking for a win. */
  #commit(next: GameState, sound: Parameters<typeof play>[0] = 'place'): void {
    this.#history.push(this.state)
    this.state = next
    this.hint = null
    this.#startTimer()
    play(sound, settings.sound)
    if (isWon(next)) this.#onWin()
  }

  drawStock(): void {
    const next = draw(this.state)
    if (next) this.#commit(next, 'flip')
    else play('invalid', settings.sound)
  }

  /** Tap-to-move: send a card to its best automatic destination. Forgiving UX. */
  tap(src: Source): void {
    const dest = autoDest(this.state, src)
    if (!dest) {
      play('invalid', settings.sound)
      return
    }
    const next = move(this.state, src, dest)
    if (next) this.#commit(next)
  }

  /** Explicit move (used by drag-and-drop). Returns whether it succeeded. */
  moveTo(src: Source, dest: Dest): boolean {
    const next = move(this.state, src, dest)
    if (next) {
      this.#commit(next)
      return true
    }
    play('invalid', settings.sound)
    return false
  }

  undo(): void {
    const prev = this.#history.pop()
    if (!prev) return
    this.state = prev
    this.won = false
    this.hint = null
    play('flip', settings.sound)
  }

  /** Suggest a sensible move by pulsing a card. */
  showHint(): void {
    const found = this.#findHint()
    this.hint = found
    play(found ? 'flip' : 'invalid', settings.sound)
  }

  #findHint(): Source | null {
    // Prefer a card that can advance a foundation.
    const sources = this.#allSources()
    for (const src of sources) {
      const dest = autoDest(this.state, src)
      if (dest?.type === 'foundation') return src
    }
    for (const src of sources) {
      if (autoDest(this.state, src)) return src
    }
    return null
  }

  #allSources(): Source[] {
    const out: Source[] = []
    if (this.state.waste.length) out.push({ type: 'waste' })
    this.state.tableau.forEach((col, pile) => {
      col.forEach((c, index) => {
        if (c.faceUp) out.push({ type: 'tableau', pile, index })
      })
    })
    return out
  }

  /** Sweep an unblocked board to the foundations, one animated step at a time. */
  autoFinish(): void {
    const step = () => {
      const m = nextAutoFinishMove(this.state)
      if (!m) return
      const next = move(this.state, m.src, m.dest)
      if (!next) return
      this.#commit(next)
      setTimeout(step, 120)
    }
    step()
  }

  get canAutoFinish(): boolean {
    return !this.won && nextAutoFinishMove(this.state) !== null
  }

  #onWin(): void {
    this.won = true
    this.#stopTimer()
    play('win', settings.sound)
  }

  #startTimer(): void {
    if (this.#running) return
    this.#running = true
    this.#timer = setInterval(() => {
      if (!this.won) this.seconds++
    }, 1000)
  }

  #stopTimer(): void {
    if (this.#timer) clearInterval(this.#timer)
    this.#timer = null
    this.#running = false
  }
}

export const game = new SolitaireGame()
