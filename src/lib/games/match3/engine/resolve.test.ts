import { describe, it, expect } from 'vitest'
import { resolveAll, resolveSteps, fillBoard, reshuffle } from './resolve'
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

describe('resolveSteps', () => {
  it('emits a step per cascade and agrees with resolveAll on final board + score', () => {
    const b = board([
      [0, 0, 0],
      [1, 2, 3],
      [4, 5, 1]
    ])
    const viaAll = resolveAll(board(b.cells.map((row) => row.map((c) => c!.kind))), mulberry32(5))
    const stepped = resolveSteps(board(b.cells.map((row) => row.map((c) => c!.kind))), mulberry32(5))
    expect(stepped.score).toBe(viaAll.score)
    expect(stepped.board.cells.flat().map((c) => c!.kind)).toEqual(viaAll.board.cells.flat().map((c) => c!.kind))
    expect(stepped.steps.length).toBeGreaterThanOrEqual(1)
    // First step clears the top-row triple.
    expect(stepped.steps[0].cleared).toEqual([
      { r: 0, c: 0 },
      { r: 0, c: 1 },
      { r: 0, c: 2 }
    ])
  })

  it('reports the run length so 4- and 5-in-a-row can trigger bigger effects', () => {
    const b = board([
      [0, 0, 0, 0, 1],
      [2, 3, 4, 5, 2],
      [3, 4, 5, 2, 3],
      [4, 5, 2, 3, 4],
      [5, 2, 3, 4, 5]
    ])
    const { steps } = resolveSteps(b, mulberry32(1))
    expect(steps[0].runMax).toBe(4)
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
