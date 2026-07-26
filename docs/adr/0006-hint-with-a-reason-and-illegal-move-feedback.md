# 6. A hint that states its reason, and illegal moves you can feel

**Status:** Accepted (2026-07-26)

## Context

`findHint` (ADR 4 era, tightened in PR #6) returns `Source | null`. It deliberately hints
only *productive* moves — foundation plays, waste plays, and tableau moves that uncover a
face-down card — so it never suggests a pointless lateral shuffle. But its `null` is
overloaded: it means the same thing whether the player should **draw a card**, whether the
game is **provably dead**, or whether only lateral shuffles remain. The UI can only buzz.

The practical result for the player: pressing "Hint" on a board whose next move is simply
"tap the deck" reads as *"there are no moves"*, which is wrong and discouraging. And on a
genuinely dead board, `isStuck` (ADR 5) already knows the game is over, but the overlay it
drives is evaluated **only inside `#commit`** — i.e. only after a successful move. A player
sitting on a dead board can press Hint forever and never be told.

Separately, an illegal move is signalled by sound alone. The player is often playing muted,
and a sound gives no clue *which* card was refused.

## Decision

**Hint returns a reason, not a bare source.** `findHint(state): Hint | null` where
`Hint = {kind:'move', src} | {kind:'draw'} | {kind:'stuck'}`. Priority: foundation play →
waste play → uncovering play → **`draw`** (some stock/waste card is placeable on the current
board) → **foundation pull** → **`stuck`** (`isStuck` agrees) → `null`.

**The foundation pull is a last resort and must unblock.** Taking a card back off a
foundation is hinted only when nothing productive remains and the pull creates a productive
move for a **different** card. The different-card rule is load-bearing: without it the
"unblocking" move found is putting the same card straight back, and the hint suggests an
infinite loop.

**`stuck` is reachable from Hint.** `showHint()` sets `game.stuck`, so the existing calm
"Geen zetten meer mogelijk" overlay appears when the player asks, not only after a move.
This adds no new detection and cannot false-positive: it is the same `isStuck` predicate.

**Illegal moves get a ~250ms wiggle plus a haptic buzz.** The refused card itself shakes, so
the feedback identifies the card. `navigator.vibrate` is called through a guarded helper.

Considered and rejected: (a) always suggesting a draw whenever no board move exists — keeps
suggesting draws on a dead board, the exact frustration reported; (b) ranking the foundation
pull like any other move — it suggests undoing progress mid-game and ping-pongs; (c) a
red flash instead of motion — less instinctive than a headshake as a "no".

## Consequences

- Hint and `isStuck` now agree about what a move is; Hint is the honest oracle for "is this
  game still alive?", which is how the player actually asks the question.
- `findHint`'s signature is a breaking change, but it has only two call sites, both in-repo.
- **`navigator.vibrate` is unsupported on iOS Safari**, which is the target device. The
  buzz is therefore a no-op on the player's iPad and the wiggle carries the whole signal;
  the call is kept because it is free and works on Android.
- The wiggle respects `prefers-reduced-motion` by degrading to a brief outline flash.
- Unchanged limitation from ADR 5: a board where only lateral shuffles remain is not
  "stuck", so Hint still returns `null` there and merely buzzes. Detecting that as dead
  would require search, and a false "give up" is worse than a buzz.
