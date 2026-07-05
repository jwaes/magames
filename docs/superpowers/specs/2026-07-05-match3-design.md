# Design Spec — Match-3 ("Drie op een rij")

**Status:** Approved (brainstormed 2026-07-05)
**Related:** magames multi-game shell · reuses the accessibility playbook from the Solitaire game (ADRs [0001](../../adr/0001-ui-free-immutable-engine.md), [0002](../../adr/0002-runes-stores-localstorage.md)).

## Purpose

Add a second game to the `magames` collection — a Candy-Crush-style **Match-3** —
for the same player as the Solitaire game (an 80-year-old with low vision). The
overriding constraint is the same: **easy, very visually clear, forgiving,
relaxing**. Local-only, no ads, installable PWA. It plugs into the existing
multi-game shell alongside Solitaire.

## Scope

- **In scope:** a full Match-3 game — three play modes, a configurable board of
  six shape+colour tiles, tap-or-swipe input, matches/cascades, optional power
  tiles, gentle scoring with a local high score, hint, auto-reshuffle, settings,
  and its home-screen tile.
- **Out of scope:** online play, leaderboards, purchases/lives/energy, timed
  pressure beyond the optional Challenge mode, a shared cross-game stats screen
  (Match-3 keeps its own high score inline).

## Play modes (setting; **Ontspannen** is the default)

- **Ontspannen (Relaxed):** endless, no timer, no fail. Score accumulates. When
  no legal move remains, the board **auto-reshuffles** so the player is never stuck.
- **Doel (Goals):** identical calm play, but reaching a target score triggers a
  brief celebration and then play continues (no fail).
- **Uitdaging (Challenge):** a limited number of moves to reach a target score —
  the **only** mode with a lose state, always offering a friendly retry.

## Board & tiles (accessibility core)

- **Grid size** is configurable: **6×6 / 7×7 / 8×8**, default **7×7**. Square,
  centred, laid out to fit both landscape and portrait.
- **Six tile kinds**, each distinguished by a **bold shape AND colour together**
  (redundant coding — distinguishable by shape alone, so colour-blindness or low
  vision never blocks play): red ●, blue ■, yellow ★, green ▲, purple ◆, orange ♥.
- Tiles are large and high-contrast on a **calm neutral background** (distinct
  from the card game's green felt) so the six colours pop.

## Interaction (setting; **Tikken** is the default)

- **Tikken (tap-two):** tap a tile (it lifts/highlights), then tap an **adjacent**
  tile → they swap. Tapping a non-adjacent tile simply re-selects; nothing errors.
- **Vegen (swipe):** drag/swipe a tile toward a neighbour to swap.
- A swap that produces **no match gently slides back** — no penalty, no harsh
  feedback.

## Rules

- A match is **3 or more** of the same kind in a row or column. Matched tiles pop;
  tiles above **fall**; new tiles drop in from the top; resulting **cascades chain**
  for bonus points.
- **Power tiles** (setting **Power-tegels**, default **on**): a **4-in-a-row**
  match creates a **line-clear** tile (clears its whole row/column when next
  matched/triggered); a **5-in-a-row** creates a **color-bomb** (clears all tiles
  of one kind). Both are drawn as clearly distinct, glowing versions of the tile.
  With the setting off, only plain 3+ matches occur (pure match-3).
- **Hint:** a button highlights one available swap (mirrors Solitaire's hint), for
  when the player can't spot a move.
- **Never stuck:** if no legal move exists, the board reshuffles automatically
  (Relaxed/Goals) — the deal is guaranteed to have at least one move.

## Scoring & feedback

- Points awarded per tile cleared, with bonuses for cascades and power tiles.
- **Score** and **Beste** (a local high score, tracked **per mode**) are shown on
  the game screen. High score persists in `localStorage`.
- Gentle pop/fall animations and soft, **mutable** sound effects. Honors
  `prefers-reduced-motion` (animations reduce to instant).

## Settings (the game's ⚙️ panel)

Modus (Ontspannen/Doel/Uitdaging) · Bewegingsstijl (Tikken/Vegen) · Bordgrootte
(6/7/8) · Power-tegels (aan/uit) · Geluid (aan/uit).

## Architecture

Same proven pattern as the Solitaire game (pure engine + runes store + Svelte UI).
The alternative — coupling match logic to the component — is explicitly rejected;
keeping the engine UI-free is what makes the rules unit-testable and the board
reusable across modes.

- **Pure engine** `src/lib/games/match3/engine/` (TypeScript, no DOM, immutable
  transitions): board & tile types; seeded fill/shuffle; find-matches; is-a-swap-
  legal; resolve (pop → gravity → refill → cascade) returning the sequence of
  steps for animation; power-tile creation & triggering; scoring; has-any-move /
  reshuffle. **Fully unit-tested with Vitest.**
- **Runes store** `src/lib/stores/match3.svelte.ts`: board state, score, per-mode
  best, and the Match-3 settings — persisted to `localStorage`
  (`match3.settings.v1`, `match3.stats.v1`).
- **UI** `src/lib/components/match3/Match3.svelte` (+ a Tile component): renders the
  board, handles tap/swipe, plays the pop/fall/cascade animations.
- **Registry**: `src/lib/games/registry.ts` — mark Match-3 as an available game so
  its tile appears on the home screen.
- **Testing:** Vitest for the engine (matches, cascades, specials, scoring,
  reshuffle, seeded determinism); Playwright for the UI (a swap that matches clears
  tiles; an illegal swap reverts; the board renders at each grid size).

## Non-goals / accepted limitations

- The engine guarantees a solvable/movable board via reshuffle; it does not
  guarantee "no accidental matches on fill" beyond the initial deal being
  match-free with ≥1 legal move.
- Power-tile interactions are kept simple (line-clear, color-bomb); no combos
  between two specials in v1.
