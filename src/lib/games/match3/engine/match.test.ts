import { describe, it, expect } from 'vitest'
import { findMatches, isLegalSwap, hasAnyMove } from './match'
import type { Board, Kind } from './types'

// Build a board from a grid of kind digits; ids are assigned row-major.
function board(grid: number[][]): Board {
  const rows = grid.length
  const cols = grid[0].length
  let id = 1
  const cells = grid.map((row) => row.map((k) => ({ id: id++, kind: k as Kind })))
  return { rows, cols, cells, nextId: id }
}

describe('findMatches', () => {
  it('finds a horizontal run of 3', () => {
    const b = board([
      [0, 0, 0, 1],
      [2, 3, 4, 5],
      [1, 2, 3, 4],
      [5, 4, 3, 2]
    ])
    expect(findMatches(b)).toEqual([
      { r: 0, c: 0 },
      { r: 0, c: 1 },
      { r: 0, c: 2 }
    ])
  })
  it('finds a vertical run of 3', () => {
    const b = board([
      [0, 1, 2, 3],
      [0, 4, 5, 1],
      [0, 2, 3, 4],
      [5, 4, 3, 2]
    ])
    expect(findMatches(b)).toEqual([
      { r: 0, c: 0 },
      { r: 1, c: 0 },
      { r: 2, c: 0 }
    ])
  })
  it('returns [] when there is no match', () => {
    const b = board([
      [0, 1, 0, 1],
      [1, 0, 1, 0],
      [0, 1, 0, 1],
      [1, 0, 1, 0]
    ])
    expect(findMatches(b)).toEqual([])
  })
})

describe('isLegalSwap / hasAnyMove', () => {
  it('a fully alternating board has no legal move', () => {
    // Diagonal-stripe pattern (kind = (r + c) % 3): no two adjacent cells ever
    // share a kind, and any adjacent swap produces at most a run of 2 in either
    // direction, so no swap can ever create a match. (A plain 2-kind checkerboard
    // does NOT have this property: swapping interior cells there can create a
    // genuine 3-run, so it is not usable as a "no legal move" fixture.)
    const b = board([
      [0, 1, 2, 0],
      [1, 2, 0, 1],
      [2, 0, 1, 2],
      [0, 1, 2, 0]
    ])
    expect(hasAnyMove(b)).toBe(false)
  })

  it('detects a concrete legal swap and hasAnyMove', () => {
    // Row 0 is 0,0,1. Swapping (0,2)=1 with (1,2)=0 puts a 0 at (0,2) -> 0,0,0 match.
    const b = board([
      [0, 0, 1],
      [2, 3, 0],
      [4, 5, 6]
    ])
    expect(isLegalSwap(b, { r: 0, c: 2 }, { r: 1, c: 2 })).toBe(true)
    expect(hasAnyMove(b)).toBe(true)
  })

  it('rejects a non-adjacent swap', () => {
    const b = board([
      [0, 1, 2],
      [3, 4, 5],
      [0, 1, 2]
    ])
    expect(isLegalSwap(b, { r: 0, c: 0 }, { r: 2, c: 0 })).toBe(false) // not adjacent
  })
})
