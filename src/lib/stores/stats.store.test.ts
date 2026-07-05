import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('stats store', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  it('persists recorded wins and reloads them in a fresh instance', async () => {
    const { stats } = await import('./stats.svelte')
    stats.recordWin({ seconds: 100, moves: 70 })
    expect(stats.data.gamesWon).toBe(1)

    // Reset the module registry so a fresh singleton re-reads localStorage.
    vi.resetModules()
    const again = await import('./stats.svelte')
    expect(again.stats.data.gamesWon).toBe(1)
  })

  it('reset clears everything', async () => {
    const { stats } = await import('./stats.svelte')
    stats.recordWin({ seconds: 100, moves: 70 })
    stats.reset()
    expect(stats.data.gamesWon).toBe(0)
    expect(stats.data.currentWinStreak).toBe(0)
  })
})
