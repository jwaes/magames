import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, screen } from '@testing-library/svelte'
import Solitaire from './Solitaire.svelte'
import { game } from '../stores/game.svelte'

afterEach(cleanup)

describe('stuck overlay', () => {
  it('shows a "geen zetten meer" message when the game is stuck', async () => {
    game.newGame(1, 1)
    game.stuck = true
    render(Solitaire, { props: { onhome: () => {}, onsettings: () => {} } })
    expect(screen.getByText(/Geen zetten meer/i)).toBeInTheDocument()
  })
})
