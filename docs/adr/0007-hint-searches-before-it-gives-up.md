# 7. The hint searches before it gives up, and always says something

**Status:** Accepted (2026-07-26)

**Supersedes:** the "Consequences" limitation in [ADR 6](0006-hint-with-a-reason-and-illegal-move-feedback.md)
and extends its priority chain. Everything else in ADR 6 stands.

## Context

ADR 6 closed with a deliberate limitation:

> a board where only lateral shuffles remain is not "stuck", so Hint still returns `null` there
> and merely buzzes. Detecting that as dead would require search, and a false "give up" is worse
> than a buzz.

Within a day of shipping, the player hit exactly that state and asked: *"I click a hint and
nothing happens. No yellow suggestion border. Nothing. So what does that mean? Does it mean
it's no legal moves? I don't know."* A buzz is not better than a false give-up if the player
cannot tell the two apart — and with sound off there is no buzz either. The limitation was
wrong, and it was wrong about the cheapest thing to fix.

Investigating also exposed a real gap: `productiveSource` scored a move as progress only if it
flipped a face-down card. **Emptying a column** flips nothing, so a move that frees a slot for
a King — one of the strongest moves in Klondike — was classed as a pointless shuffle.

## Decision

**Emptying a column is progress.** A tableau move from index 0 onto a *non-empty* column ranks
just below an uncovering move. The non-empty requirement matters: shuffling a lone card between
two empty columns is net zero and would hint forever.

**Search before giving up.** `findShuffleEscape` runs a breadth-first search, capped at 60
positions, over states reachable by tableau-to-tableau moves, and hints the first move of any
path that reaches something productive.

The search is mostly insurance, because a shuffle nearly cannot unlock anything: if sliding run
`R` off card `X` exposes `X` for a blocked card `Y`, then `R` sat on `X`, so `R`'s top card
shares `Y`'s rank and colour — and `R` had to land on a pile whose top also matches `X`. `Y`
could therefore have moved *there* one move earlier, and the hint would already have found it.
The exception is emptying a column, now scored directly. But "nearly" is load-bearing and the
cost of being wrong is telling a player their live game is over, so the search stays. Measured
over 150 seeded games it keeps the hint useful for roughly six more moves per game.

**Never stay silent.** When nothing is found, `game.exhausted` drives a calm dialog — *"Ik zie
geen zet meer die helpt"* — with **Verder spelen** and **Nieuw spel**. It is deliberately not
the ADR 5 dead-game dialog and deliberately **books no loss**: the game only looks finished.
The provable dialog wins if both could apply.

Considered and rejected: (a) treating "only shuffles remain" as provably dead — the two-move
counterexample above means it isn't, and a false "give up" really would be worse; (b) hinting
the pointless shuffle in a different colour — it re-introduces the useless suggestions removed
in PR #6, and a grey-versus-yellow distinction is a poor thing to ask low vision to carry.

## Consequences

- Hint now always answers: a card, the deck, "this game is dead", or "I can't find anything
  that helps". Silence is no longer one of the outcomes.
- The search only runs on the terminal press, but it is not free: cap 60 gives outcomes
  identical to cap 400 across 60 000 positions while cutting the worst `findHint` from 85 ms to
  19 ms (mean 0.05 ms). The deck-cycle simulation is hoisted out of the loop because shuffling
  never turns the deck.
- `tableauKey` omits `faceUp` deliberately — safe only because the search runs exclusively on
  positions where no uncovering move is legal. Reordering `findHint` so the search precedes the
  uncover check would silently make that key conflate positions.
- **Since fixed — see [ADR 8](0008-dont-bank-a-card-the-tableau-needs.md).** As found here: a bot that always obeys the hint enters a foundation-pull ↔
  play-to-foundation loop in ~14% of seeded games. It predates this ADR (it arrives with the
  ADR 6 foundation pull), and neither the column rule nor the search appears in any such cycle.
  A foundation move outranks everything, so it immediately undoes the pull that was meant to
  unblock. Fixing it needs a "don't bank a card the tableau still needs" rule.
