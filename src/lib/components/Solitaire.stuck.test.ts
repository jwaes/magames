import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, screen, within } from '@testing-library/svelte'
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

describe('nothing-helps overlay', () => {
  it('says so, and offers both carrying on and a new game', async () => {
    game.newGame(1, 1)
    game.exhausted = true
    render(Solitaire, { props: { onhome: () => {}, onsettings: () => {} } })
    expect(screen.getByText(/geen zet meer die helpt/i)).toBeInTheDocument()
    // Scope to the dialog: the toolbar's 🔄 also carries aria-label "Nieuw spel".
    const dialog = within(screen.getByRole('dialog', { name: 'Geen nuttige zetten meer' }))
    expect(dialog.getByRole('button', { name: 'Verder spelen' })).toBeInTheDocument()
    expect(dialog.getByRole('button', { name: 'Nieuw spel' })).toBeInTheDocument()
  })

  // The two messages must never both be on screen, and the dead-game one wins:
  // it is the stronger, provable claim.
  it('defers to the dead-game message rather than stacking with it', async () => {
    game.newGame(1, 1)
    game.exhausted = true
    game.stuck = true
    render(Solitaire, { props: { onhome: () => {}, onsettings: () => {} } })
    expect(screen.getByText(/Geen zetten meer mogelijk/i)).toBeInTheDocument()
    expect(screen.queryByText(/geen zet meer die helpt/i)).not.toBeInTheDocument()
  })
})
