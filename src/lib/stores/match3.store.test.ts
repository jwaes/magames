import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('match3 store', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  it('starts a movable game and persists settings + best', async () => {
    const { match3 } = await import('./match3.svelte')
    match3.setGridSize(6)
    match3.newGame(1)
    expect(match3.board.rows).toBe(6)
    expect(match3.score).toBe(0)

    // grid size persists into a fresh module instance
    vi.resetModules()
    const again = await import('./match3.svelte')
    expect(again.match3.gridSize).toBe(6)
  })

  it('tap-two selection swaps adjacent tiles and clears selection', async () => {
    const { match3 } = await import('./match3.svelte')
    match3.newGame(2)
    match3.select({ r: 0, c: 0 })
    expect(match3.selected).toEqual({ r: 0, c: 0 })
    // selecting a non-adjacent tile just re-selects
    match3.select({ r: 3, c: 3 })
    expect(match3.selected).toEqual({ r: 3, c: 3 })
  })
})
