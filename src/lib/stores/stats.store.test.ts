import { describe, it, expect, beforeEach } from 'vitest'

describe('stats store', () => {
  beforeEach(() => localStorage.clear())

  it('persists recorded wins across reloads (module re-import)', async () => {
    // The `?uN` suffix forces Vite to load a distinct module instance at
    // runtime so persistence-across-reload can be asserted (see brief).
    // TypeScript can't resolve a query-suffixed specifier at type-check
    // time, so the known TS2307 on each of these lines is suppressed.
    // @ts-expect-error -- query-suffixed dynamic import, see comment above
    const { stats } = await import('./stats.svelte?u1')
    stats.recordWin({ seconds: 100, moves: 70 })
    expect(stats.data.gamesWon).toBe(1)
    // A fresh import reads what was persisted.
    // @ts-expect-error -- query-suffixed dynamic import, see comment above
    const again = await import('./stats.svelte?u2')
    expect(again.stats.data.gamesWon).toBe(1)
  })

  it('reset clears everything', async () => {
    // @ts-expect-error -- query-suffixed dynamic import, see comment above
    const { stats } = await import('./stats.svelte?u3')
    stats.recordWin({ seconds: 100, moves: 70 })
    stats.reset()
    expect(stats.data.gamesWon).toBe(0)
    expect(stats.data.currentWinStreak).toBe(0)
  })
})
