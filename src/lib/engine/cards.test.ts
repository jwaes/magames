import { describe, it, expect } from 'vitest'
import { createDeck, shuffle, colorOf, rankLabel, mulberry32, SUITS, RANKS } from './cards'

describe('createDeck', () => {
  it('makes 52 unique, face-down cards', () => {
    const deck = createDeck()
    expect(deck).toHaveLength(52)
    expect(new Set(deck.map((c) => c.id)).size).toBe(52)
    expect(deck.every((c) => !c.faceUp)).toBe(true)
  })

  it('covers every suit and rank', () => {
    const deck = createDeck()
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        expect(deck.some((c) => c.suit === suit && c.rank === rank)).toBe(true)
      }
    }
  })
})

describe('colorOf', () => {
  it('maps suits to colours', () => {
    expect(colorOf('hearts')).toBe('red')
    expect(colorOf('diamonds')).toBe('red')
    expect(colorOf('clubs')).toBe('black')
    expect(colorOf('spades')).toBe('black')
  })
})

describe('shuffle', () => {
  it('keeps the same 52 cards', () => {
    const shuffled = shuffle(createDeck(), mulberry32(1))
    expect(new Set(shuffled.map((c) => c.id)).size).toBe(52)
  })

  it('is deterministic for a given seed', () => {
    const a = shuffle(createDeck(), mulberry32(42)).map((c) => c.id)
    const b = shuffle(createDeck(), mulberry32(42)).map((c) => c.id)
    expect(a).toEqual(b)
  })

  it('does not mutate the input', () => {
    const deck = createDeck()
    const before = deck.map((c) => c.id)
    shuffle(deck, mulberry32(7))
    expect(deck.map((c) => c.id)).toEqual(before)
  })
})

describe('rankLabel', () => {
  it('labels face cards and aces', () => {
    expect(rankLabel(1)).toBe('A')
    expect(rankLabel(10)).toBe('10')
    expect(rankLabel(11)).toBe('J')
    expect(rankLabel(12)).toBe('Q')
    expect(rankLabel(13)).toBe('K')
  })
})
