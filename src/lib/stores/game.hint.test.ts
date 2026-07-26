import { describe, it, expect, beforeEach } from 'vitest'
import { game } from './game.svelte'
import { SUITS, type Card, type Suit, type Rank } from '../engine/cards'
import { NUM_TABLEAU, type GameState } from '../engine/solitaire'

function card(suit: Suit, rank: Rank, faceUp = true): Card {
  return { id: `${suit}-${rank}`, suit, rank, faceUp }
}

function emptyState(): GameState {
  return {
    stock: [],
    waste: [],
    foundations: SUITS.map(() => []),
    tableau: Array.from({ length: NUM_TABLEAU }, () => []),
    drawCount: 1,
    moves: 0
  }
}

/** A board with no move at all, so each test only varies what is in the deck. */
function deadBoard(): GameState {
  const s = emptyState()
  s.tableau[0] = [card('spades', 2)]
  s.tableau[1] = [card('hearts', 2)]
  return s
}

beforeEach(() => {
  game.newGame(1, 1)
})

describe('showHint', () => {
  it('pulses a card when a useful move exists', () => {
    const s = emptyState()
    s.waste = [card('hearts', 5)]
    s.tableau[0] = [card('spades', 6)]
    game.state = s
    game.showHint()
    expect(game.hint).toEqual({ type: 'waste' })
    expect(game.hintDeck).toBe(false)
    expect(game.stuck).toBe(false)
  })

  it('pulses the deck when the player should draw', () => {
    const s = deadBoard()
    s.stock = [card('clubs', 1, false)]
    game.state = s
    game.showHint()
    expect(game.hintDeck).toBe(true)
    expect(game.hint).toBeNull()
    expect(game.stuck).toBe(false)
  })

  it('declares the game stuck when nothing can ever help', () => {
    game.state = deadBoard()
    game.showHint()
    expect(game.stuck).toBe(true)
    expect(game.hint).toBeNull()
    expect(game.hintDeck).toBe(false)
  })

  it('clears a deck pulse once the player draws', () => {
    const s = deadBoard()
    s.stock = [card('clubs', 1, false)]
    game.state = s
    game.showHint()
    expect(game.hintDeck).toBe(true)
    game.drawStock()
    expect(game.hintDeck).toBe(false)
  })

  // The silent case: no useful move, but a legal shuffle exists so the board
  // isn't provably dead. Saying nothing at all is what made this confusing —
  // "I have no suggestion" looked exactly like "the game is over".
  it('says it has nothing left when only pointless shuffles remain', () => {
    const s = emptyState()
    // A lone King with empty columns: it can slide about forever, achieving
    // nothing. `isStuck` says false (a legal move exists), so this is the
    // softer message, not the dead-game one.
    s.tableau[0] = [card('hearts', 13)]
    game.state = s
    game.showHint()
    expect(game.exhausted).toBe(true)
    expect(game.stuck).toBe(false)
    expect(game.hint).toBeNull()
    expect(game.hintDeck).toBe(false)
  })

  it('lets the player wave the message away and keep playing', () => {
    const s = emptyState()
    s.tableau[0] = [card('hearts', 13)]
    game.state = s
    game.showHint()
    game.dismissExhausted()
    expect(game.exhausted).toBe(false)
  })

  it('does not claim to be out of moves when a useful one exists', () => {
    const s = emptyState()
    s.waste = [card('hearts', 5)]
    s.tableau[0] = [card('spades', 6)]
    game.state = s
    game.showHint()
    expect(game.exhausted).toBe(false)
  })

  it('clears a deck pulse on undo', () => {
    const s = deadBoard()
    s.stock = [card('clubs', 1, false)]
    game.state = s
    game.drawStock() // so there is history to undo
    game.showHint()
    game.undo()
    expect(game.hintDeck).toBe(false)
  })

  // Both pulses must die with the deal that produced them. A hint left over
  // from the previous game points at a card that is no longer there — on the
  // new deal it lights up an unrelated card as "play me", usually one that
  // cannot move at all.
  it('clears both pulses on a new game', () => {
    const s = deadBoard()
    s.stock = [card('clubs', 1, false)]
    game.state = s
    game.showHint()
    expect(game.hintDeck).toBe(true)
    game.newGame(1, 1)
    expect(game.hintDeck).toBe(false)

    const alive = emptyState()
    alive.waste = [card('hearts', 5)]
    alive.tableau[0] = [card('spades', 6)]
    game.state = alive
    game.showHint()
    expect(game.hint).not.toBeNull()
    game.newGame(1, 1)
    expect(game.hint).toBeNull()
  })
})
