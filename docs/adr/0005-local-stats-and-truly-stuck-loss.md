# 5. Local-only stats with honest "truly stuck" loss

**Status:** Accepted (2026-07-05)

## Context

The user wants a gentle scoreboard (wins, time played, streaks, personal bests) to make
daily play rewarding for the player — all local. Solitaire has no explicit "loss": you keep
trying until you win or give up. Counting every abandoned game as a loss would produce a
discouragingly low win rate for an elderly casual player. But the user noted there **is** a
deterministic state where a game is genuinely dead.

## Decision

Track stats **locally** (`localStorage`, `magames.stats.v1`), **wins-forward** (win % not
shown prominently). A game is **started** on the first move (also advancing a **day streak**);
**won** on solve. Add engine **`isStuck(state)`** — a **thorough** deterministic check: dead
iff no legal board move exists **and** no stock/waste card is placeable anywhere (the board
can't change, so drawing can't help). It **never false-positives**. A truly-stuck game shows
a calm overlay; the **loss is booked only if the player then abandons** it (undo just
resumes). Abandoning a non-dead game adds **time only** — never a loss, streak intact.
Day streak counts calendar days with ≥1 game played; a missed day resets it.

Considered and rejected: (a) abandon-counts-as-loss (Windows-Solitaire style) — too harsh
for this player; (b) conservative stuck detection (only when stock+waste empty) — rarely
fires, misses real dead-ends with cards left in the deck.

## Consequences

- Honest, gentle stats: losses reflect only genuinely dead games, not quitting.
- `isStuck` is exact and cheap (O(52)); booking the loss on abandon means undoing out of a
  dead position is free, and since a stuck position is provably unwinnable it can never
  mis-score a win.
- Accepted limitation: may under-detect exotic draw-3 deadlocks (safe direction), and a lone
  King beside an empty column reads as "not stuck" (a pointless legal move exists).
- Pure reducers take an injected `today`, keeping day-streak logic deterministic and testable.
