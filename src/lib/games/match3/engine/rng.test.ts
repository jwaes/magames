import { describe, it, expect } from 'vitest'
import { mulberry32 } from './rng'

describe('mulberry32', () => {
  it('is deterministic for a seed and yields values in [0,1)', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    const xs = Array.from({ length: 5 }, () => a())
    const ys = Array.from({ length: 5 }, () => b())
    expect(xs).toEqual(ys)
    expect(xs.every((n) => n >= 0 && n < 1)).toBe(true)
  })
})
