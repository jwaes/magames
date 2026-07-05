import { describe, it, expect } from 'vitest'
import { emptyBoard, inBounds, at, areAdjacent, cloneBoard, spawnKind } from './board'
import { mulberry32 } from './rng'

describe('board queries', () => {
  it('emptyBoard has the given size and all-null cells', () => {
    const b = emptyBoard(7, 7)
    expect(b.rows).toBe(7)
    expect(b.cols).toBe(7)
    expect(b.cells.flat().every((c) => c === null)).toBe(true)
  })
  it('inBounds and at', () => {
    const b = emptyBoard(6, 6)
    expect(inBounds(b, { r: 0, c: 0 })).toBe(true)
    expect(inBounds(b, { r: 6, c: 0 })).toBe(false)
    expect(at(b, { r: 0, c: 0 })).toBeNull()
  })
  it('areAdjacent is true only for orthogonal neighbours', () => {
    expect(areAdjacent({ r: 1, c: 1 }, { r: 1, c: 2 })).toBe(true)
    expect(areAdjacent({ r: 1, c: 1 }, { r: 2, c: 1 })).toBe(true)
    expect(areAdjacent({ r: 1, c: 1 }, { r: 2, c: 2 })).toBe(false)
    expect(areAdjacent({ r: 1, c: 1 }, { r: 1, c: 1 })).toBe(false)
  })
  it('spawnKind returns a valid kind', () => {
    const rng = mulberry32(1)
    for (let i = 0; i < 50; i++) {
      const k = spawnKind(rng)
      expect(k).toBeGreaterThanOrEqual(0)
      expect(k).toBeLessThanOrEqual(5)
    }
  })
  it('cloneBoard is a deep copy', () => {
    const b = emptyBoard(3, 3)
    b.cells[0][0] = { id: 1, kind: 2 }
    const c = cloneBoard(b)
    c.cells[0][0]!.kind = 4
    expect(b.cells[0][0]!.kind).toBe(2)
  })
})
