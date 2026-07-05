import { describe, it, expect } from 'vitest'
import { resolveAll, fillBoard, reshuffle } from './resolve'
import { findMatches, hasAnyMove } from './match'
import { mulberry32 } from './rng'
import type { Board, Kind } from './types'

function board(grid: number[][]): Board {
  const rows = grid.length
  const cols = grid[0].length
  let id = 1
  const cells = grid.map((row) => row.map((k) => ({ id: id++, kind: k as Kind })))
  return { rows, cols, cells, nextId: id }
}

describe('resolveAll', () => {
  it('clears matches, refills, and leaves a board with no matches', () => {
    const b = board([
      [0, 0, 0],
      [1, 2, 3],
      [4, 5, 1]
    ])
    const { board: out, score } = resolveAll(b, mulberry32(5))
    expect(findMatches(out)).toEqual([])
    expect(out.cells.flat().every((c) => c !== null)).toBe(true) // fully refilled
    expect(score).toBeGreaterThanOrEqual(30) // 3 cleared * 10 * 1
  })
})

describe('fillBoard', () => {
  it('produces a full board with no initial matches and at least one move', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const b = fillBoard(7, 7, mulberry32(seed))
      expect(b.cells.flat().every((c) => c !== null)).toBe(true)
      expect(findMatches(b)).toEqual([])
      expect(hasAnyMove(b)).toBe(true)
    }
  })
})

describe('reshuffle', () => {
  it('keeps the same kinds but yields a movable, match-free board', () => {
    const b = fillBoard(6, 6, mulberry32(3))
    const before = b.cells.flat().map((c) => c!.kind).sort()
    const r = reshuffle(b, mulberry32(9))
    const after = r.cells.flat().map((c) => c!.kind).sort()
    expect(after).toEqual(before)
    expect(findMatches(r)).toEqual([])
    expect(hasAnyMove(r)).toBe(true)
  })
})
