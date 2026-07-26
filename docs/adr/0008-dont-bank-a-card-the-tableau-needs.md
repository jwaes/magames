# 8. Don't bank a card the tableau still needs

**Status:** Accepted (2026-07-26)

**Closes:** the "Known, not fixed here" item in [ADR 7](0007-hint-searches-before-it-gives-up.md).

## Context

ADR 6 let the hint suggest taking a card back **off** a foundation when that unblocks something.
It guarded against recommending a loop *within one search* — the follow-up move must involve a
different card — but not across two presses of the button.

A foundation move outranks everything. So the hint said "pull the red 5 back down so the black 4
can move", the player did it, and the next hint said "put the red 5 back", undoing the move it
had just recommended. A bot that always obeys the hint looped in **24 of 150** seeded games.

## Decision

A card is not banked to a foundation while **the tableau still needs it**: it is the exposed base
of its column and some other card could land on it right now in a way that makes progress. Such a
foundation move drops to the bottom of the priority chain rather than the top, so it is still
suggested when genuinely nothing else helps.

"Makes progress" here **must be the same definition the hint ranks by** — extracted as
`moveIsProductive` and shared. The first attempt narrowed the guard to uncovering and
column-emptying moves only, and the ping-pong simply relocated to the door left open: the pull
had been justified by a *waste* card wanting that base, the guard didn't count waste plays, and
the loop came straight back in 6 of 300 games. Two definitions of progress that disagree is what
lets the hint contradict itself.

Considered and rejected: the textbook safe-autoplay rule (bank rank *N* only once both
opposite-colour foundations reach *N−1*). It is a good rule for an autoplayer deciding on its
own, but as a hint it withholds obviously good moves the player can see, which reads as the hint
being broken.

## Consequences

- Following the hint blindly now solves **63 of 150** seeded games, up from 50, and loops in
  **none**, down from 24. Fewer moves are suggested overall because the churn is gone.
- Cost is a scan of the other sources per candidate foundation move; worst-case `findHint` is
  unchanged at ~20 ms, mean 0.07 ms.
- `Afmaken` is untouched: it runs off `nextAutoFinishMove`, which only fires once the stock and
  waste are empty and nothing is face-down — a state where nothing can need a base.
- The player can still bank whatever they like by tapping. This governs only what is *suggested*.
- The held-back move is returned as a last resort, and that path appears to be **unreachable
  today**: measured over 88 000 reachable positions it never fired, and the witness that held a
  move back would itself have been productive. It stays because that argument depends on the
  current tiers, and the failure it guards against — announcing the game is over while a legal
  move sits on screen — is the worst one available.
- Guarded by a property test, not just examples: a bot follows the hint across 60 seeded games in
  both draw modes and must never revisit a position. Every example test here pins one shape of
  the ping-pong; only that test pins the absence of all of them. It kills mutants that the
  example tests missed — dropping the waste or empties-column branch leaves the examples green
  but reintroduces loops.
