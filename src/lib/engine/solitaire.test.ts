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
  findHint,
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

  it('repeated nextAutoFinishMove drives an unblocked board all the way to a win', () => {
    // Each suit in its own column, face up, Ace on top (last) so it peels off
    // A, 2, 3 … K straight onto the foundation — exactly what "Afmaken" sweeps.
    let s = emptyState()
    SUITS.forEach((suit, i) => {
      s.tableau[i] = Array.from({ length: 13 }, (_, k) => card(suit, (13 - k) as Rank))
    })

    let steps = 0
    for (let m = nextAutoFinishMove(s); m; m = nextAutoFinishMove(s)) {
      s = move(s, m.src, m.dest)!
      steps++
    }

    expect(steps).toBe(52)
    expect(isWon(s)).toBe(true)
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

  it('is true when draw-3 can never surface the one playable card', () => {
    const s = emptyState(3)
    s.tableau[0] = [card('spades', 2)]
    s.tableau[1] = [card('hearts', 2)]
    // Turning three at a time, the waste tops cycle 9♣ → 9♦ → 9♣ … forever
    // (recycling preserves order), so the Ace can never be reached.
    s.stock = [
      card('diamonds', 9, false),
      card('clubs', 9, false),
      card('clubs', 1, false),
      card('diamonds', 8, false)
    ]
    expect(isStuck(s)).toBe(true)
  })

  it('is false when draw-3 CAN surface the playable card', () => {
    const s = emptyState(3)
    s.tableau[0] = [card('spades', 2)]
    s.tableau[1] = [card('hearts', 2)]
    // Same cards, Ace one place over: the very first turn of three tops it out.
    s.stock = [
      card('diamonds', 9, false),
      card('clubs', 1, false),
      card('clubs', 9, false),
      card('diamonds', 8, false)
    ]
    expect(isStuck(s)).toBe(false)
  })

  it('is false for a won game', () => {
    const s = emptyState()
    s.foundations = SUITS.map((suit) =>
      Array.from({ length: 13 }, (_, i) => card(suit, (i + 1) as Rank))
    )
    expect(isStuck(s)).toBe(false)
  })

  it('is false when a foundation card can move back to a tableau', () => {
    const s = emptyState()
    // Foundation hearts holds A..5; its top 5♥ can drop on a black 6 in the tableau.
    s.foundations[SUITS.indexOf('hearts')] = [1, 2, 3, 4, 5].map((r) => card('hearts', r as Rank))
    s.tableau[0] = [card('spades', 6)] // black 6 accepts red 5; no other move exists
    expect(isStuck(s)).toBe(false)
  })
})

describe('findHint', () => {
  it('prefers a foundation move above anything else', () => {
    const s = emptyState()
    // A lone Ace on the waste can go to its foundation.
    s.waste = [card('spades', 1)]
    // Plus a purely lateral tableau move (red 5 -> another black 6) that we must NOT prefer.
    s.tableau[0] = [card('spades', 6), card('hearts', 5)]
    s.tableau[1] = [card('clubs', 6)]
    expect(findHint(s)).toEqual({ kind: 'move', src: { type: 'waste' } })
  })

  it('hints a tableau move that uncovers a face-down card', () => {
    const s = emptyState()
    s.tableau[0] = [card('clubs', 9, false), card('hearts', 5)] // face-down under a red 5
    s.tableau[1] = [card('spades', 6)] // black 6 accepts the red 5
    expect(findHint(s)).toEqual({ kind: 'move', src: { type: 'tableau', pile: 0, index: 1 } })
  })

  it('does NOT hint a pointless lateral move (returns null)', () => {
    const s = emptyState()
    // Red 5 sits on a black 6 with nothing hidden beneath; moving it to an
    // equivalent black 6 reveals nothing and must not be suggested. The board
    // is not dead either (that lateral move is legal), so this is null, not 'stuck'.
    s.tableau[0] = [card('spades', 6), card('hearts', 5)]
    s.tableau[1] = [card('clubs', 6)]
    expect(findHint(s)).toBeNull()
  })

  it('hints a waste card that can join the tableau', () => {
    const s = emptyState()
    s.waste = [card('hearts', 5)] // red 5
    s.tableau[0] = [card('spades', 6)] // black 6 accepts it
    expect(findHint(s)).toEqual({ kind: 'move', src: { type: 'waste' } })
  })

  it("says 'draw' when only a card still in the deck can help", () => {
    const s = emptyState()
    // Two black/red 2s that cannot stack on each other — no board move at all.
    s.tableau[0] = [card('spades', 2)]
    s.tableau[1] = [card('hearts', 2)]
    // …but an Ace is still buried in the stock, and an Ace always has a home.
    s.stock = [card('clubs', 1, false)]
    expect(findHint(s)).toEqual({ kind: 'draw' })
  })

  it("says 'draw' when the deck is spent but the waste still holds a playable card", () => {
    const s = emptyState()
    s.tableau[0] = [card('spades', 2)]
    s.tableau[1] = [card('hearts', 2)]
    // Top of waste (the 9) is unplayable, but recycling brings the Ace back round.
    s.waste = [card('clubs', 1), card('diamonds', 9)]
    expect(findHint(s)).toEqual({ kind: 'draw' })
  })

  it("says 'stuck' when nothing on the board or in the deck can ever help", () => {
    const s = emptyState()
    s.tableau[0] = [card('spades', 2)]
    s.tableau[1] = [card('hearts', 2)]
    expect(findHint(s)).toEqual({ kind: 'stuck' })
  })

  it('hints a move that empties a column, even though it uncovers nothing', () => {
    const s = emptyState()
    // The lone red queen has no face-down card beneath her, so moving her onto
    // the black king "reveals" nothing — but it frees a whole column, which is
    // one of the most valuable things you can do in Klondike.
    s.tableau[0] = [card('hearts', 12)]
    s.tableau[1] = [card('spades', 13)]
    expect(findHint(s)).toEqual({ kind: 'move', src: { type: 'tableau', pile: 0, index: 0 } })
  })

  it('does NOT count shuffling a lone card into an empty column as emptying one', () => {
    const s = emptyState()
    // Column 0 empties, column 3 fills: net zero, and it would hint forever.
    // Not `stuck` either — that pointless move IS legal, so the board isn't
    // provably dead; it is the honest "I can't find anything that helps" case.
    s.tableau[0] = [card('hearts', 13)]
    expect(findHint(s)).toBeNull()
  })

  it('hints the sideways jack that lets the queen empty her column next move', () => {
    const s = emptyState()
    s.tableau[0] = [card('clubs', 13)] // black K, the queen's eventual home
    s.tableau[1] = [card('spades', 12)] // black Q, the jack's landing spot
    // Two reds stacked, so they cannot travel together as a run.
    s.tableau[5] = [card('hearts', 12), card('hearts', 11)]
    // Moving the jack flips nothing and empties nothing, so it is not productive
    // on its own — only the search two moves out sees that it strands the red
    // queen alone, after which SHE empties column 5.
    //
    // The king's four moves into empty columns are explored first, so the escape
    // sits several positions deep. That is deliberate: it also guards
    // SHUFFLE_SEARCH_CAP against being trimmed to nothing.
    expect(findHint(s)).toEqual({ kind: 'move', src: { type: 'tableau', pile: 5, index: 1 } })
  })

  it('does not bank a card the tableau is about to use', () => {
    const s = emptyState()
    // Exactly the position left behind after a foundation pull: the red 5 came
    // off the hearts foundation onto the black 6 so the black 4 could follow.
    s.foundations[SUITS.indexOf('hearts')] = [1, 2, 3, 4].map((r) => card('hearts', r as Rank))
    s.tableau[0] = [card('spades', 6), card('hearts', 5)]
    s.tableau[1] = [card('clubs', 9, false), card('spades', 4)]
    // Sending the 5 straight back to the foundation is legal and outranks
    // everything — which is precisely the ping-pong. Play the black 4 instead.
    expect(findHint(s)).toEqual({ kind: 'move', src: { type: 'tableau', pile: 1, index: 1 } })
  })

  it('still banks a card nothing is waiting for', () => {
    const s = emptyState()
    s.foundations[SUITS.indexOf('hearts')] = [1, 2, 3, 4].map((r) => card('hearts', r as Rank))
    s.tableau[0] = [card('spades', 6), card('hearts', 5)]
    // No black 4 anywhere, so the red 5 is doing no work in the tableau.
    s.tableau[1] = [card('clubs', 9, false), card('spades', 9)]
    expect(findHint(s)).toEqual({ kind: 'move', src: { type: 'tableau', pile: 0, index: 1 } })
  })

  it("does NOT say 'draw' when draw-3 can never turn up the playable card", () => {
    const s = emptyState(3)
    s.tableau[0] = [card('spades', 2)]
    s.tableau[1] = [card('hearts', 2)]
    // Three at a time, the reachable waste tops cycle 9♣ → 9♦ → 9♣ … forever.
    // Telling the player to keep drawing would be a lie: the game is over.
    s.stock = [
      card('diamonds', 9, false),
      card('clubs', 9, false),
      card('clubs', 1, false),
      card('diamonds', 8, false)
    ]
    expect(findHint(s)).toEqual({ kind: 'stuck' })
  })

  it("says 'draw' when draw-3 CAN turn up the playable card", () => {
    const s = emptyState(3)
    s.tableau[0] = [card('spades', 2)]
    s.tableau[1] = [card('hearts', 2)]
    s.stock = [
      card('diamonds', 9, false),
      card('clubs', 1, false),
      card('clubs', 9, false),
      card('diamonds', 8, false)
    ]
    expect(findHint(s)).toEqual({ kind: 'draw' })
  })

  it('suggests taking a card back off a foundation when that unblocks another card', () => {
    const s = emptyState()
    // Hearts foundation holds A..5, so its top card is the red 5.
    s.foundations[SUITS.indexOf('hearts')] = [1, 2, 3, 4, 5].map((r) => card('hearts', r as Rank))
    s.tableau[0] = [card('spades', 6)] // black 6 — the red 5 can come back here…
    s.tableau[1] = [card('clubs', 9, false), card('spades', 4)] // …freeing this black 4
    // Before the pull nothing is productive: the black 4 has no red 5 to sit on.
    expect(findHint(s)).toEqual({
      kind: 'move',
      src: { type: 'foundation', pile: SUITS.indexOf('hearts') }
    })
  })

  it('does NOT suggest a foundation pull whose only follow-up is putting the same card back', () => {
    const s = emptyState()
    s.foundations[SUITS.indexOf('hearts')] = [1, 2, 3, 4, 5].map((r) => card('hearts', r as Rank))
    s.tableau[0] = [card('spades', 6)] // the red 5 fits here, but nothing else follows
    // Pulling 5♥ onto the 6♠ only lets 5♥ go straight back — an infinite loop, not a hint.
    // The board is not dead (that pull is legal), so this is null rather than 'stuck'.
    expect(findHint(s)).toBeNull()
  })
})
