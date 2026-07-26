import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, screen } from '@testing-library/svelte'
import Card from './Card.svelte'
import Solitaire from './Solitaire.svelte'
import { game } from '../stores/game.svelte'

afterEach(cleanup)

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
