import { describe, it, expect, beforeEach } from 'vitest'
import { game } from './game.svelte'
import { stats } from './stats.svelte'

// IMPORTANT: import the CANONICAL singletons (no ?query). The game store imports
// the same `stats` singleton, so mutations by the game are visible on `stats` here.
// Reset both in-memory singletons + storage before each test for isolation.
describe('game lifecycle → stats', () => {
  beforeEach(() => {
    localStorage.clear()
    stats.reset()
  })

  it('marks a day as played on the first move (drawStock)', () => {
    game.newGame(1, 1)
    expect(stats.data.currentDayStreak).toBe(0)
    game.drawStock() // first move
    expect(stats.data.currentDayStreak).toBe(1)
  })

  it('records an abandon (time only) when leaving an unfinished game', () => {
    game.newGame(1, 1)
    game.drawStock()
    game.leave()
    expect(stats.data.gamesWon).toBe(0)
    expect(stats.data.gamesLost).toBe(0)
    expect(stats.data.currentDayStreak).toBe(1) // set by the first move
  })

  it('exposes a boolean stuck flag', () => {
    game.newGame(1, 1)
    expect(typeof game.stuck).toBe('boolean')
    expect(game.stuck).toBe(false)
  })
})
