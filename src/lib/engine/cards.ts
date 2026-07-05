// Pure card primitives — no DOM, no framework. Fully unit-testable.

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades'
export type Color = 'red' | 'black'
/** 1 = Ace ... 11 = Jack, 12 = Queen, 13 = King. */
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13

export interface Card {
  /** Stable identity, e.g. "hearts-13". Handy for animations and test assertions. */
  readonly id: string
  readonly suit: Suit
  readonly rank: Rank
  /** Whether the face (rank + suit) is visible to the player. */
  faceUp: boolean
}

export const SUITS: readonly Suit[] = ['hearts', 'diamonds', 'clubs', 'spades']
export const RANKS: readonly Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]

const RED_SUITS: ReadonlySet<Suit> = new Set<Suit>(['hearts', 'diamonds'])

export function colorOf(suit: Suit): Color {
  return RED_SUITS.has(suit) ? 'red' : 'black'
}

/** A fresh, ordered 52-card deck, all face down. */
export function createDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ id: `${suit}-${rank}`, suit, rank, faceUp: false })
    }
  }
  return deck
}

/** Deterministic PRNG (mulberry32) so shuffles can be seeded in tests. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Returns a new, shuffled copy of `cards` (Fisher–Yates).
 * Pass a seeded `rng` for reproducible results in tests; defaults to Math.random.
 */
export function shuffle(cards: readonly Card[], rng: () => number = Math.random): Card[] {
  const out = cards.map((c) => ({ ...c }))
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Short human label for a rank: A, 2–10, J, Q, K. */
export function rankLabel(rank: Rank): string {
  switch (rank) {
    case 1:
      return 'A'
    case 11:
      return 'J'
    case 12:
      return 'Q'
    case 13:
      return 'K'
    default:
      return String(rank)
  }
}

export const SUIT_SYMBOL: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠'
}

// Classic red/black display colours. The clubs/spades distinction comes from
// the SVG suit *shapes*, not colour, so both stay black as expected.
export const SUIT_COLOR: Record<Suit, string> = {
  hearts: '#c81e28',
  diamonds: '#c81e28',
  clubs: '#16181d',
  spades: '#16181d'
}
