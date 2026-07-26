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

  it('clears a deck pulse on undo and on a new game', () => {
    const s = deadBoard()
    s.stock = [card('clubs', 1, false)]
    game.state = s
    game.drawStock() // so there is history to undo
    game.showHint()
    game.hintDeck = true
    game.undo()
    expect(game.hintDeck).toBe(false)

    game.hintDeck = true
    game.newGame(1, 1)
    expect(game.hintDeck).toBe(false)
  })
})
