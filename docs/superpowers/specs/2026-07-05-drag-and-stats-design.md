# Design Spec — Drag-and-Drop + Local Stats/Gamification

**Status:** Approved (grilled 2026-07-05)
**Related:** [Implementation plan](../plans/2026-07-05-drag-and-stats.md) · ADRs [0004](../../adr/0004-tap-default-hybrid-drag.md), [0005](../../adr/0005-local-stats-and-truly-stuck-loss.md)

## Purpose

Extend the ad-free, large-print Solitaire (Patience) PWA — built for an 80-year-old,
low-vision player — with two capabilities, without regressing the forgiving tap-first
experience:

1. An optional **drag-and-drop** movement style (iPad touch-friendly), selectable in
   settings; tap-to-move stays the default.
2. A **local, private scoreboard** with gentle gamification: wins, time played, streaks,
   day streak, and personal bests — plus honest loss tracking only when a game is
   genuinely dead.

Everything is local (`localStorage`); no accounts, no network, no ads.

## Scope

- **In scope:** movement-style setting; hybrid drag interaction with legal-target
  highlighting; stats model + persistence; game-lifecycle event wiring; truly-stuck
  detection; stats screen; home streak badge; win-record celebration; stats reset.
- **Out of scope:** a second game (Spider/FreeCell), cloud sync, leaderboards, achievements/
  badges beyond "new personal record", per-draw-mode stat separation (combined only).

## Feature A — Movement style (tap ↔ drag)

- Setting **"Bewegingsstijl: Tikken / Slepen"** in the ⚙️ Meer modal. Default **Tikken**.
  Takes effect immediately (no new game required).
- **Tikken** = pure tap only. No drag can start → zero accidental drags (safest for the
  primary user).
- **Slepen** = **hybrid**: both drag and tap work. A press that moves more than ~10px
  becomes a drag; a press that does not move is a tap.
- Drag picks up a face-up card **and the valid run on top of it** (mirrors the engine's
  existing run rules). Draggable sources: **waste top** and **face-up tableau cards**.
  The **stock** stays tap-only (tap = draw); foundations are not drag sources.
- Drop resolution: **best-overlap, legal-first** — among piles the dragged card overlaps,
  choose the one where the move is legal with the largest overlap. No legal overlap →
  **snap back** with the soft "invalid" sound.
- While dragging, **legal destination piles highlight** subtly (soft ring), honoring
  `prefers-reduced-motion`. Only during an active drag in Slepen mode.

Rationale and alternatives: see [ADR 0004](../../adr/0004-tap-default-hybrid-drag.md).

## Feature B — Stats & gamification

### Game lifecycle → stats events

- A game counts as **started** on the **first successful move** (`markPlayed`, which also
  advances the day streak).
- **Won** on solve → `recordWin` (adds time, extends win streak, updates personal bests,
  returns which records were beaten for the celebration).
- **Truly stuck** (engine-detected dead position) → the board shows a calm "Geen zetten
  meer mogelijk" overlay. The **loss is recorded only if the player then abandons** the
  dead game (Nieuw / Menu). Undo dismisses the overlay and resumes with no record.
- **Abandon** a started, unfinished, non-dead game (Nieuw / Menu) → **time only** is added;
  neither win nor loss; the win streak is left intact.

### Tracked stats (combined across draw modes, `localStorage` key `magames.stats.v1`)

| Field | Meaning |
|---|---|
| `gamesWon` | total wins |
| `gamesLost` | truly-stuck losses only |
| `totalSeconds` | time across every started game (win/loss/abandon) |
| `currentWinStreak` / `bestWinStreak` | consecutive wins |
| `currentDayStreak` / `bestDayStreak` | consecutive local calendar days played |
| `lastPlayedDay` | ISO `YYYY-MM-DD` (local) of last play |
| `bestTimeSeconds` | fastest win |
| `fewestMoves` | fewest moves in a win |

- **Day streak:** playing ≥1 game in a local calendar day counts; a missed day resets to 1
  on next play. Multiple games in one day don't double-count.
- **"Nieuw record!"** appears on the win screen when a personal best (fastest time, fewest
  moves, or new best win streak) is beaten.
- Presentation is **wins-forward**; the win rate percentage is not shown prominently.

### UI

- **Home:** a **📊 Statistieken** button and a small **🔥 day-streak badge**.
- **Stats screen:** tiles for Gewonnen, Speeltijd, Dagreeks (+best), Winreeks (+best),
  Snelste tijd, Minste zetten. A "Terug" control returns home.
- **Reset:** **Wis statistieken** lives in the ⚙️ Meer modal, behind a confirmation.

Rationale, the "truly stuck" definition, and alternatives:
see [ADR 0005](../../adr/0005-local-stats-and-truly-stuck-loss.md).

## Architecture

- **Pure logic, framework-free, unit-tested:** `src/lib/engine/solitaire.ts` gains
  `isStuck(state)`; `src/lib/stats/stats.ts` holds the `Stats` model + reducers
  (`markPlayed`, `recordWin`, `recordLoss`, `recordAbandon`) and formatters. These take a
  `today` string so day-streak logic is deterministic and testable.
- **Reactive stores (Svelte 5 runes, `*.svelte.ts`, `localStorage`):** a new `stats` store
  wraps the pure reducers and supplies the local "today"; `settings` gains `movement`; the
  `game` store fires the lifecycle events and exposes `stuck` and `records`.
- **UI reads stores:** the board component owns the pointer-drag interaction (gated by
  `settings.movement`); new components render the stats screen and overlays.

Foundational architecture is recorded in ADRs
[0001](../../adr/0001-ui-free-immutable-engine.md)–[0003](../../adr/0003-bundled-suit-font.md).

## Testing strategy

- **Unit (Vitest):** `isStuck`, all stats reducers (streaks, day streak, records,
  formatting), store persistence, settings default/persist, game-lifecycle→stats wiring.
- **Component (Vitest + @testing-library/svelte):** stuck overlay renders when `game.stuck`.
- **E2E (Playwright, Chromium at iPad viewports):** movement toggle persists; drag moves a
  card (seeded deal); stats screen opens from home and shows tiles.

## Non-goals / accepted limitations

- `isStuck` never false-positives but may under-detect exotic draw-3 deadlocks (safe
  direction). A lone King with an empty column is technically "not stuck" (a pointless
  legal move exists) — acceptable.
- A recorded stuck-loss is only booked on abandon, so undoing out of a dead position is
  free; a truly-stuck position is provably unwinnable, so this cannot mis-score a win.
