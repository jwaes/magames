# 1. UI-free, immutable game engine

**Status:** Accepted (2026-07-05)

## Context

The app is a card-game collection starting with Solitaire (Patience). We need the rules to
be trustworthy (an 80-year-old will play daily and notice bugs), easy to test, and reusable
across future games (Spider, FreeCell) and across two interaction styles (tap and drag).
Coupling rules to Svelte components would make the rulebook slow to test and hard to reuse.

## Decision

Keep all game rules in a **pure, framework-free TypeScript engine** (`src/lib/engine/`) that
knows nothing about the DOM or Svelte. State transitions are **immutable**: every operation
(`deal`, `draw`, `move`, …) returns a **new** `GameState` and never mutates its input.
Shuffling takes an injectable RNG (seedable via `mulberry32`) for deterministic tests.

## Consequences

- The entire rulebook is unit-testable in milliseconds without a browser (25 Vitest tests).
- **Undo is free**: keep a stack of previous states and pop — no reverse-move logic.
- Deterministic seeds double as a product feature (`?seed=` shareable/reproducible games)
  and make gameplay E2E tests deterministic.
- Both tap-to-move and drag drive the same engine (`canMove`/`move`), so rules can't drift
  between interaction styles.
- Slight cost: immutable clones per move — negligible at 52 cards, even on an iPad 6th gen.
