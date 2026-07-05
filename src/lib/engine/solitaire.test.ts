import { describe, it, expect } from 'vitest'
import { type Card, type Suit, type Rank, SUITS } from './cards'
import {
  type GameState,
  deal,
  draw,
  move,
  canMove,
  autoDest,
  canPlaceOnFoundation,
  canPlaceOnTableau,
  isValidRun,
  isWon,
  isStuck,
  nextAutoFinishMove,
  NUM_TABLEAU
} from './solitaire'
import { mulberry32 } from './cards'

function card(suit: Suit, rank: Rank, faceUp = true): Card {
  return { id: `${suit}-${rank}`, suit, rank, faceUp }
}

/** A near-empty state we can populate per test. */
function emptyState(drawCount: 1 | 3 = 1): GameState {
  return {
    stock: [],
    waste: [],
    foundations: SUITS.map(() => []),
    tableau: Array.from({ length: NUM_TABLEAU }, () => []),
    drawCount,
    moves: 0
  }
}

describe('deal', () => {
  it('lays out 7 columns of increasing size with only the last card up', () => {
    const s = deal(1, mulberry32(123))
    for (let col = 0; col < NUM_TABLEAU; col++) {
      expect(s.tableau[col]).toHaveLength(col + 1)
      const faceUps = s.tableau[col].filter((c) => c.faceUp)
      expect(faceUps).toHaveLength(1)
      expect(s.tableau[col][col].faceUp).toBe(true)
    }
  })

  it('leaves 24 cards in the stock and empty waste/foundations', () => {
    const s = deal(1, mulberry32(1))
    expect(s.stock).toHaveLength(24)
    expect(s.waste).toHaveLength(0)
    expect(s.foundations.flat()).toHaveLength(0)
    // 28 in tableau + 24 in stock = 52
    expect(s.tableau.flat().length + s.stock.length).toBe(52)
  })
})

describe('core rules', () => {
  it('foundation starts on an Ace then builds up by suit', () => {
    expect(canPlaceOnFoundation(card('hearts', 1), [])).toBe(true)
    expect(canPlaceOnFoundation(card('hearts', 2), [])).toBe(false)
    expect(canPlaceOnFoundation(card('hearts', 2), [card('hearts', 1)])).toBe(true)
    expect(canPlaceOnFoundation(card('spades', 2), [card('hearts', 1)])).toBe(false)
  })

  it('tableau builds down in alternating colours; empty takes only a King', () => {
    expect(canPlaceOnTableau(card('hearts', 13), [])).toBe(true)
    expect(canPlaceOnTableau(card('hearts', 12), [])).toBe(false)
    // red 6 on black 7 -> ok
    expect(canPlaceOnTableau(card('hearts', 6), [card('spades', 7)])).toBe(true)
    // red 6 on red 7 -> not alternating
    expect(canPlaceOnTableau(card('hearts', 6), [card('diamonds', 7)])).toBe(false)
    // cannot stack on a face-down card
    expect(canPlaceOnTableau(card('hearts', 6), [card('spades', 7, false)])).toBe(false)
  })

  it('validates movable runs', () => {
    expect(isValidRun([card('spades', 7), card('hearts', 6), card('spades', 5)])).toBe(true)
    expect(isValidRun([card('spades', 7), card('clubs', 6)])).toBe(false) // same colour
    expect(isValidRun([card('spades', 7, false)])).toBe(false) // face down
  })
})

describe('draw', () => {
  it('moves drawCount cards from stock to waste, face up', () => {
    const s = emptyState(1)
    s.stock = [card('clubs', 3, false), card('spades', 9, false)]
    const next = draw(s)!
    expect(next.waste).toHaveLength(1)
    expect(next.waste[0].faceUp).toBe(true)
    expect(next.stock).toHaveLength(1)
  })

  it('draws three at a time in draw-3 mode', () => {
    const s = emptyState(3)
    s.stock = [1, 2, 3, 4].map((r) => card('clubs', r as Rank, false))
    const next = draw(s)!
    expect(next.waste).toHaveLength(3)
    expect(next.stock).toHaveLength(1)
  })

  it('recycles the waste back into the stock when the stock is empty', () => {
    const s = emptyState(1)
    s.waste = [card('clubs', 3), card('spades', 9)]
    const next = draw(s)!
    expect(next.stock).toHaveLength(2)
    expect(next.waste).toHaveLength(0)
    expect(next.stock.every((c) => !c.faceUp)).toBe(true)
  })

  it('returns null when there is nothing to draw or recycle', () => {
    expect(draw(emptyState())).toBeNull()
  })
})

describe('move', () => {
  it('sends a waste card to its foundation', () => {
    const s = emptyState()
    s.waste = [card('hearts', 1)]
    const dest = { type: 'foundation' as const, pile: SUITS.indexOf('hearts') }
    const next = move(s, { type: 'waste' }, dest)!
    expect(next.foundations[SUITS.indexOf('hearts')]).toHaveLength(1)
    expect(next.waste).toHaveLength(0)
    expect(next.moves).toBe(1)
  })

  it('moves a valid run between columns and flips the newly exposed card', () => {
    const s = emptyState()
    s.tableau[0] = [card('diamonds', 4, false), card('spades', 7), card('hearts', 6)]
    s.tableau[1] = [card('hearts', 8)] // red 8: a black 7 may land on it
    const next = move(s, { type: 'tableau', pile: 0, index: 1 }, { type: 'tableau', pile: 1 })!
    expect(next.tableau[1].map((c) => c.id)).toEqual(['hearts-8', 'spades-7', 'hearts-6'])
    expect(next.tableau[0]).toHaveLength(1)
    expect(next.tableau[0][0].faceUp).toBe(true) // was face-down, now revealed
  })

  it('rejects illegal moves', () => {
    const s = emptyState()
    s.waste = [card('spades', 5)]
    // 5 of spades cannot go on empty foundation
    expect(move(s, { type: 'waste' }, { type: 'foundation', pile: SUITS.indexOf('spades') })).toBeNull()
    // cannot drop a run onto the same column
    s.tableau[0] = [card('spades', 7), card('hearts', 6)]
    expect(canMove(s, { type: 'tableau', pile: 0, index: 0 }, { type: 'tableau', pile: 0 })).toBe(false)
  })

  it('does not mutate the previous state', () => {
    const s = emptyState()
    s.waste = [card('hearts', 1)]
    const before = JSON.stringify(s)
    move(s, { type: 'waste' }, { type: 'foundation', pile: SUITS.indexOf('hearts') })
    expect(JSON.stringify(s)).toBe(before)
  })
})

describe('autoDest', () => {
  it('prefers the foundation for a playable single card', () => {
    const s = emptyState()
    s.foundations[SUITS.indexOf('hearts')] = [card('hearts', 1)]
    s.waste = [card('hearts', 2)]
    const dest = autoDest(s, { type: 'waste' })
    expect(dest).toEqual({ type: 'foundation', pile: SUITS.indexOf('hearts') })
  })

  it('falls back to a tableau column', () => {
    const s = emptyState()
    s.tableau[2] = [card('spades', 7)]
    s.waste = [card('hearts', 6)]
    const dest = autoDest(s, { type: 'waste' })
    expect(dest).toEqual({ type: 'tableau', pile: 2 })
  })

  it('returns null when nothing legal exists', () => {
    const s = emptyState()
    s.waste = [card('hearts', 6)]
    expect(autoDest(s, { type: 'waste' })).toBeNull()
  })
})

describe('winning', () => {
  it('detects a completed game', () => {
    const s = emptyState()
    s.foundations = SUITS.map((suit) =>
      Array.from({ length: 13 }, (_, i) => card(suit, (i + 1) as Rank))
    )
    expect(isWon(s)).toBe(true)
  })

  it('nextAutoFinishMove sweeps an unblocked board to the foundations', () => {
    const s = emptyState()
    s.foundations[SUITS.indexOf('hearts')] = [card('hearts', 1)]
    s.tableau[0] = [card('hearts', 2)]
    const step = nextAutoFinishMove(s)
    expect(step).not.toBeNull()
    expect(step!.dest).toEqual({ type: 'foundation', pile: SUITS.indexOf('hearts') })
  })
})

describe('isStuck', () => {
  it('is false when a tableau move exists', () => {
    const s = emptyState()
    s.tableau[0] = [card('hearts', 3)] // red 3
    s.tableau[1] = [card('spades', 4)] // black 4 — red 3 can land here
    expect(isStuck(s)).toBe(false)
  })

  it('is false when a stock card could still be played', () => {
    const s = emptyState()
    s.tableau[0] = [card('spades', 2)]
    s.tableau[1] = [card('hearts', 2)]
    s.stock = [card('clubs', 1, false)] // an Ace can always go to its foundation
    expect(isStuck(s)).toBe(false)
  })

  it('is true when nothing can move and nothing is playable', () => {
    const s = emptyState()
    // Two low cards that cannot stack on each other, no aces, no empty-fillable kings,
    // empty stock/waste, empty foundations.
    s.tableau[0] = [card('spades', 2)]
    s.tableau[1] = [card('hearts', 2)]
    expect(isStuck(s)).toBe(true)
  })

  it('is false for a won game', () => {
    const s = emptyState()
    s.foundations = SUITS.map((suit) =>
      Array.from({ length: 13 }, (_, i) => card(suit, (i + 1) as Rank))
    )
    expect(isStuck(s)).toBe(false)
  })
})
