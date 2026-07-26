import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, screen, fireEvent } from '@testing-library/svelte'
import Card from './Card.svelte'
import Solitaire from './Solitaire.svelte'
import { game } from '../stores/game.svelte'

afterEach(cleanup)

/** Put the board in "deck spent" shape: nothing in the stock, `waste` on the pile. */
function spendTheDeck(waste: number): void {
  game.newGame(1, 1)
  game.state = {
    ...game.state,
    stock: [],
    waste: Array.from({ length: waste }, (_, i) => ({
      id: `w${i}`,
      suit: 'hearts' as const,
      rank: 5 as const,
      faceUp: true
    }))
  }
}

describe('refused-move wiggle', () => {
  it('Card marks itself as shaking when told to', () => {
    render(Card, { props: { card: { id: 'x', suit: 'hearts', rank: 5, faceUp: true }, shake: true } })
    expect(screen.getByRole('button')).toHaveClass('shake')
  })

  it('Card is not shaking by default', () => {
    render(Card, { props: { card: { id: 'x', suit: 'hearts', rank: 5, faceUp: true } } })
    expect(screen.getByRole('button')).not.toHaveClass('shake')
  })
})

describe('deck hint', () => {
  it('marks the stock pile when the hint says to draw', async () => {
    game.newGame(1, 1)
    game.hintDeck = true
    render(Solitaire, { props: { onhome: () => {}, onsettings: () => {} } })
    expect(screen.getByTestId('stock')).toHaveClass('deck-hint')
  })

  it('leaves the stock pile unmarked otherwise', async () => {
    game.newGame(1, 1)
    game.hintDeck = false
    render(Solitaire, { props: { onhome: () => {}, onsettings: () => {} } })
    expect(screen.getByTestId('stock')).not.toHaveClass('deck-hint')
  })
})

describe('recycling the waste', () => {
  // A recycle is a legal, useful action, but the engine deliberately does NOT
  // count it as a move (see `draw`), so "the move counter didn't change" must
  // never be used to mean "refused" — that would scold the player for a tap
  // that worked.
  it('does not wiggle the deck when ↺ recycles a non-empty waste', async () => {
    spendTheDeck(3)
    render(Solitaire, { props: { onhome: () => {}, onsettings: () => {} } })

    await fireEvent.click(screen.getByRole('button', { name: 'Opnieuw delen' }))

    expect(screen.getByTestId('stock')).not.toHaveClass('shake')
    // …and the recycle really happened: the waste is now back in the stock.
    expect(game.state.stock).toHaveLength(3)
    expect(game.state.waste).toHaveLength(0)
  })

  it('does wiggle the deck when there is genuinely nothing left to turn', async () => {
    spendTheDeck(0)
    render(Solitaire, { props: { onhome: () => {}, onsettings: () => {} } })

    await fireEvent.click(screen.getByRole('button', { name: 'Opnieuw delen' }))

    expect(screen.getByTestId('stock')).toHaveClass('shake')
  })
})
