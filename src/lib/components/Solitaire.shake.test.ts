import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, screen, fireEvent } from '@testing-library/svelte'
import { tick } from 'svelte'
import Card from './Card.svelte'
import Solitaire from './Solitaire.svelte'
import { game } from '../stores/game.svelte'

afterEach(cleanup)

/** The shake class is re-applied a frame after it is dropped, to restart the animation. */
async function nextFrame(): Promise<void> {
  await new Promise<void>((r) => requestAnimationFrame(() => r()))
  await tick()
}

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

describe('foundation-pull hint', () => {
  // findHint can now point at a foundation. If the board doesn't render that
  // variant the player hears an encouraging chime and sees nothing light up —
  // worse than the old buzz, because the sound promises something.
  it('pulses the foundation card the hint points at', async () => {
    game.newGame(1, 1)
    game.state = {
      ...game.state,
      stock: [],
      waste: [],
      foundations: [
        [1, 2, 3, 4, 5].map((r) => ({
          id: `h${r}`,
          suit: 'hearts' as const,
          rank: r as 1,
          faceUp: true
        })),
        [],
        [],
        []
      ],
      tableau: [
        [{ id: 's6', suit: 'spades' as const, rank: 6 as const, faceUp: true }],
        [
          { id: 'c9', suit: 'clubs' as const, rank: 9 as const, faceUp: false },
          { id: 's4', suit: 'spades' as const, rank: 4 as const, faceUp: true }
        ],
        [],
        [],
        [],
        [],
        []
      ]
    }
    render(Solitaire, { props: { onhome: () => {}, onsettings: () => {} } })
    game.showHint()
    await tick()

    expect(game.hint).toEqual({ type: 'foundation', pile: 0 })
    expect(document.querySelectorAll('.hinted')).toHaveLength(1)
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
    await nextFrame()

    expect(screen.getByTestId('stock')).toHaveClass('shake')
  })

  // Tapping a dead deck twice must wiggle twice. A CSS animation only restarts
  // when the class actually leaves and comes back, so a plain `= true` on an
  // already-true flag is a no-op — and the second tap, the likeliest thing a
  // confused player does, would give no feedback at all.
  it('wiggles again on a second refusal instead of going silent', async () => {
    spendTheDeck(0)
    render(Solitaire, { props: { onhome: () => {}, onsettings: () => {} } })
    const stock = screen.getByTestId('stock')

    await fireEvent.click(screen.getByRole('button', { name: 'Opnieuw delen' }))
    await nextFrame()
    expect(stock).toHaveClass('shake')

    await fireEvent.click(screen.getByRole('button', { name: 'Opnieuw delen' }))
    // Dropped synchronously…
    expect(stock).not.toHaveClass('shake')
    await nextFrame()
    // …and re-applied on the next frame, which is what restarts the animation.
    expect(stock).toHaveClass('shake')
  })
})
