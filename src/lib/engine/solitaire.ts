// Klondike Solitaire ("Patience") rules engine.
// Pure and immutable: every move returns a NEW state (or null if illegal),
// which makes undo trivial (keep a stack of states) and the rules easy to test.

import { type Card, type Suit, SUITS, colorOf, createDeck, shuffle } from './cards'

export type DrawCount = 1 | 3

export interface GameState {
  stock: Card[]
  waste: Card[]
  /** 4 foundation piles, one per suit, in SUITS order. */
  foundations: Card[][]
  /** 7 tableau columns. */
  tableau: Card[][]
  drawCount: DrawCount
  /** Number of successful moves the player has made. */
  moves: number
}

/** Where a card (or run of cards) is being picked up from. */
export type Source =
  | { type: 'waste' }
  | { type: 'foundation'; pile: number }
  | { type: 'tableau'; pile: number; index: number }

/** Where a card (or run) is being dropped. */
export type Dest = { type: 'foundation'; pile: number } | { type: 'tableau'; pile: number }

export const NUM_TABLEAU = 7

// ── The two core rules ────────────────────────────────────────────────
// This is the heart of the whole game. Everything else is bookkeeping.

/** A card may go on a foundation if it starts with an Ace, then builds up by suit. */
export function canPlaceOnFoundation(card: Card, foundation: Card[]): boolean {
  if (foundation.length === 0) return card.rank === 1 // must start with an Ace
  const top = foundation[foundation.length - 1]
  return card.suit === top.suit && card.rank === top.rank + 1
}

/** A card may go on a tableau column if it builds DOWN in ALTERNATING colours. */
export function canPlaceOnTableau(card: Card, column: Card[]): boolean {
  if (column.length === 0) return card.rank === 13 // only a King starts an empty column
  const top = column[column.length - 1]
  if (!top.faceUp) return false
  return colorOf(card.suit) !== colorOf(top.suit) && card.rank === top.rank - 1
}

// ──────────────────────────────────────────────────────────────────────

/** Is the given slice a valid movable run (descending, alternating colours)? */
export function isValidRun(cards: Card[]): boolean {
  for (let i = 0; i < cards.length; i++) {
    if (!cards[i].faceUp) return false
    if (i > 0) {
      const prev = cards[i - 1]
      const cur = cards[i]
      if (colorOf(cur.suit) === colorOf(prev.suit) || cur.rank !== prev.rank - 1) return false
    }
  }
  return true
}

function foundationIndexForSuit(suit: Suit): number {
  return SUITS.indexOf(suit)
}

/** Deal a fresh game. Pass a seeded `rng` for reproducible deals in tests. */
export function deal(drawCount: DrawCount = 1, rng: () => number = Math.random): GameState {
  const deck = shuffle(createDeck(), rng)
  const tableau: Card[][] = Array.from({ length: NUM_TABLEAU }, () => [])

  let d = 0
  for (let col = 0; col < NUM_TABLEAU; col++) {
    for (let row = 0; row <= col; row++) {
      const card = deck[d++]
      card.faceUp = row === col // only the last card in each column starts face up
      tableau[col].push(card)
    }
  }

  const stock = deck.slice(d).map((c) => ({ ...c, faceUp: false }))

  return {
    stock,
    waste: [],
    foundations: SUITS.map(() => []),
    tableau,
    drawCount,
    moves: 0
  }
}

function cloneState(s: GameState): GameState {
  return {
    stock: s.stock.map((c) => ({ ...c })),
    waste: s.waste.map((c) => ({ ...c })),
    foundations: s.foundations.map((p) => p.map((c) => ({ ...c }))),
    tableau: s.tableau.map((p) => p.map((c) => ({ ...c }))),
    drawCount: s.drawCount,
    moves: s.moves
  }
}

/**
 * Turn cards from the stock onto the waste. When the stock is empty, recycle
 * the waste back into the stock (unlimited redeals — the gentle rule).
 * Returns a new state, or null if there is nothing to do.
 */
export function draw(state: GameState): GameState | null {
  if (state.stock.length === 0 && state.waste.length === 0) return null
  const s = cloneState(state)

  if (s.stock.length === 0) {
    // Recycle: flip the whole waste back to stock, face down, order reset.
    s.stock = s.waste.reverse().map((c) => ({ ...c, faceUp: false }))
    s.waste = []
    return s
  }

  const n = Math.min(s.drawCount, s.stock.length)
  for (let i = 0; i < n; i++) {
    const card = s.stock.pop()!
    card.faceUp = true
    s.waste.push(card)
  }
  s.moves++
  return s
}

/** The cards that a Source refers to (the moving run). Empty if invalid. */
function pickup(state: GameState, src: Source): Card[] {
  switch (src.type) {
    case 'waste':
      return state.waste.length ? [state.waste[state.waste.length - 1]] : []
    case 'foundation': {
      const pile = state.foundations[src.pile]
      return pile.length ? [pile[pile.length - 1]] : []
    }
    case 'tableau': {
      const col = state.tableau[src.pile]
      if (src.index < 0 || src.index >= col.length) return []
      return col.slice(src.index)
    }
  }
}

function destPile(s: GameState, dest: Dest): Card[] {
  return dest.type === 'foundation' ? s.foundations[dest.pile] : s.tableau[dest.pile]
}

/** Whether `src` → `dest` is a legal move, without mutating anything. */
export function canMove(state: GameState, src: Source, dest: Dest): boolean {
  const run = pickup(state, src)
  if (run.length === 0) return false

  if (dest.type === 'foundation') {
    // Foundations take exactly one card at a time.
    if (run.length !== 1) return false
    const foundation = state.foundations[dest.pile]
    // The pile index must match the card's suit.
    if (dest.pile !== foundationIndexForSuit(run[0].suit)) return false
    return canPlaceOnFoundation(run[0], foundation)
  }

  // dest is a tableau column
  if (!isValidRun(run)) return false
  // Can't drop a run back onto the same column it came from.
  if (src.type === 'tableau' && src.pile === dest.pile) return false
  return canPlaceOnTableau(run[0], state.tableau[dest.pile])
}

/** Perform a move if legal; returns a new state, else null. */
export function move(state: GameState, src: Source, dest: Dest): GameState | null {
  if (!canMove(state, src, dest)) return null
  const s = cloneState(state)

  // Remove the run from its source.
  let run: Card[]
  switch (src.type) {
    case 'waste':
      run = [s.waste.pop()!]
      break
    case 'foundation':
      run = [s.foundations[src.pile].pop()!]
      break
    case 'tableau':
      run = s.tableau[src.pile].splice(src.index)
      // Reveal the card now exposed underneath, if any.
      flipTopIfHidden(s.tableau[src.pile])
      break
  }

  destPile(s, dest).push(...run)
  s.moves++
  return s
}

function flipTopIfHidden(column: Card[]): void {
  const top = column[column.length - 1]
  if (top && !top.faceUp) top.faceUp = true
}

/**
 * Find the best automatic destination for tapping a card: prefer a foundation
 * (progress!), otherwise a tableau column. Returns null if it can't move.
 * This powers the forgiving "just tap the card" interaction.
 */
export function autoDest(state: GameState, src: Source): Dest | null {
  const run = pickup(state, src)
  if (run.length === 0) return null

  // 1) Try the matching foundation (only single cards qualify).
  if (run.length === 1) {
    const fIdx = foundationIndexForSuit(run[0].suit)
    const fDest: Dest = { type: 'foundation', pile: fIdx }
    if (canMove(state, src, fDest)) return fDest
  }

  // 2) Try tableau columns. Prefer a non-empty column over an empty one so we
  //    don't needlessly break up Kings onto bare columns.
  const empties: number[] = []
  for (let p = 0; p < NUM_TABLEAU; p++) {
    const dest: Dest = { type: 'tableau', pile: p }
    if (!canMove(state, src, dest)) continue
    if (state.tableau[p].length === 0) empties.push(p)
    else return dest
  }
  if (empties.length) return { type: 'tableau', pile: empties[0] }

  return null
}

/** The game is won when all four foundations are complete (13 cards each). */
export function isWon(state: GameState): boolean {
  return state.foundations.every((f) => f.length === 13)
}

/** True if any card can still be sent to a foundation (used for auto-finish). */
export function hasAutoFinish(state: GameState): boolean {
  return nextAutoFinishMove(state) !== null
}

/**
 * When the board is fully unblocked, offer to sweep everything to the
 * foundations one move at a time. Returns the next such move, or null.
 */
export function nextAutoFinishMove(state: GameState): { src: Source; dest: Dest } | null {
  // Only safe to auto-finish once the stock/waste are clear and nothing is hidden.
  const nothingHidden = state.tableau.every((col) => col.every((c) => c.faceUp))
  if (!nothingHidden || state.stock.length > 0 || state.waste.length > 0) return null

  for (let p = 0; p < NUM_TABLEAU; p++) {
    const col = state.tableau[p]
    if (col.length === 0) continue
    const src: Source = { type: 'tableau', pile: p, index: col.length - 1 }
    const dest = autoDest({ ...state }, src)
    if (dest && dest.type === 'foundation') return { src, dest }
  }
  return null
}

/** True when moving the run at this tableau source would flip a face-down card. */
function uncoversCard(state: GameState, src: Source): boolean {
  if (src.type !== 'tableau') return false
  const below = state.tableau[src.pile][src.index - 1]
  return src.index > 0 && below !== undefined && !below.faceUp
}

/** Every card the player could pick up right now (waste top + each face-up tableau card). */
function allSources(state: GameState): Source[] {
  const out: Source[] = []
  if (state.waste.length) out.push({ type: 'waste' })
  state.tableau.forEach((col, pile) => {
    col.forEach((c, index) => {
      if (c.faceUp) out.push({ type: 'tableau', pile, index })
    })
  })
  return out
}

/**
 * Suggest a genuinely *useful* move, or null if only pointless shuffles remain.
 * A move earns a hint only if it makes progress, in priority order:
 *   1. onto a foundation,
 *   2. a waste card onto the tableau (uses a drawn card),
 *   3. a tableau move that uncovers a face-down card.
 * Lateral moves — e.g. shifting a red 5 from one black 6 to an equivalent black
 * 6, revealing nothing — are deliberately never hinted.
 */
export function findHint(state: GameState): Source | null {
  const sources = allSources(state)

  for (const src of sources) {
    if (autoDest(state, src)?.type === 'foundation') return src
  }
  for (const src of sources) {
    if (src.type === 'waste' && autoDest(state, src)) return src
  }
  for (const src of sources) {
    if (src.type === 'tableau' && uncoversCard(state, src) && autoDest(state, src)) return src
  }
  return null
}

/** Can this single card be placed anywhere right now (foundation or tableau)? */
function placeableAnywhere(state: GameState, card: Card): boolean {
  const fIdx = SUITS.indexOf(card.suit)
  if (canPlaceOnFoundation(card, state.foundations[fIdx])) return true
  for (let q = 0; q < NUM_TABLEAU; q++) {
    if (canPlaceOnTableau(card, state.tableau[q])) return true
  }
  return false
}

/**
 * True only when the game is genuinely dead: no legal board move exists AND no
 * card still in the stock/waste could be played (the board can never change, so
 * drawing can never help). Never a false positive — if any legal move exists
 * (even a pointless one) this returns false.
 */
export function isStuck(state: GameState): boolean {
  if (isWon(state)) return false

  const wasteTop = state.waste[state.waste.length - 1]
  if (wasteTop && placeableAnywhere(state, wasteTop)) return false

  for (let p = 0; p < NUM_TABLEAU; p++) {
    const col = state.tableau[p]
    for (let i = 0; i < col.length; i++) {
      if (!col[i].faceUp) continue
      const src: Source = { type: 'tableau', pile: p, index: i }
      if (i === col.length - 1) {
        const fIdx = SUITS.indexOf(col[i].suit)
        if (canMove(state, src, { type: 'foundation', pile: fIdx })) return false
      }
      for (let q = 0; q < NUM_TABLEAU; q++) {
        if (q !== p && canMove(state, src, { type: 'tableau', pile: q })) return false
      }
    }
  }

  for (const c of [...state.stock, ...state.waste]) {
    if (placeableAnywhere(state, c)) return false
  }

  for (let f = 0; f < state.foundations.length; f++) {
    if (state.foundations[f].length === 0) continue
    const src: Source = { type: 'foundation', pile: f }
    for (let q = 0; q < NUM_TABLEAU; q++) {
      if (canMove(state, src, { type: 'tableau', pile: q })) return false
    }
  }

  return true
}
