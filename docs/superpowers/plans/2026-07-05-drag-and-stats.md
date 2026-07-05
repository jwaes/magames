# Drag-and-Drop + Local Stats/Gamification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Related:** [Design spec](../specs/2026-07-05-drag-and-stats-design.md) · ADRs [0004](../../adr/0004-tap-default-hybrid-drag.md), [0005](../../adr/0005-local-stats-and-truly-stuck-loss.md)

**Execution:** TDD, one task per fresh subagent on a lesser model (Sonnet), reviewed between tasks by the orchestrator per `superpowers:subagent-driven-development`.

**Goal:** Add a tap/drag movement-style setting (drag = hybrid, iPad touch-friendly) and a local-only stats/gamification scoreboard (wins, time, streaks, day streak, personal bests) with honest "truly stuck" loss detection.

**Architecture:** Pure logic lands in the framework-free engine/stats modules with Vitest unit tests; a Svelte 5 runes store persists stats to `localStorage`; the game store fires lifecycle events (played / won / stuck-loss / abandon) into the stats store; the board component gains pointer-based dragging gated by a settings flag, and new UI (stats screen, stuck overlay, win records) reads the stores.

**Tech Stack:** Svelte 5 (runes), TypeScript (strict), Vite, Vitest (unit), Playwright (E2E on Chromium at iPad viewports), `localStorage`.

## Global Constraints

- Svelte 5 runes only (`$state`, `$derived`, `$props`); stores are classes in `*.svelte.ts` files exporting a singleton.
- TypeScript strict; `npm run check` must report 0 errors, 0 warnings.
- UI copy is **Dutch**. The game is called "Patience"/"Solitaire", never "Klondike".
- Persistence is `localStorage` only. Settings key: `magames.settings.v1`. Stats key: `magames.stats.v1`.
- No external network/font/CDN hosts (offline PWA); nothing new to fetch at runtime.
- Movement setting default is **tap**. Drag mode is **hybrid** (drag + tap both work); tap mode is pure-tap (no drag).
- Day boundaries use the **local** calendar day. Time is tracked in whole seconds via the existing per-game timer.
- Every task ends green: `npm test` (unit), `npm run test:e2e` (Playwright), `npm run check`. Commit at the end of each task.
- Existing public signatures to build on (do not rename):
  - `src/lib/engine/solitaire.ts`: `GameState`, `Source`, `Dest`, `NUM_TABLEAU`, `canMove(state,src,dest)`, `move(state,src,dest)`, `autoDest(state,src)`, `isWon(state)`, `canPlaceOnFoundation(card,pile)`, `canPlaceOnTableau(card,col)`.
  - `src/lib/engine/cards.ts`: `Card`, `Suit`, `SUITS`.
  - `src/lib/stores/game.svelte.ts`: singleton `game` with `state`, `won`, `seconds`, `hint`, `moves`, `canUndo`, `newGame(drawCount?, seed?)`, `drawStock()`, `tap(src)`, `moveTo(src,dest)`, `undo()`, private `#commit(next, sound?)`, `#onWin()`, `#startTimer()/#stopTimer()`.
  - `src/lib/stores/settings.svelte.ts`: singleton `settings` with `drawCount`, `sound`, `setDrawCount(n)`, `toggleSound()`, private `persist()`, `KEY`, `Persisted`.

## File Structure

- **Create** `src/lib/stats/stats.ts` — pure stats data model + reducers + formatters. No DOM, no runes. Unit-tested.
- **Create** `src/lib/stats/stats.test.ts` — Vitest unit tests for stats reducers.
- **Create** `src/lib/stores/stats.svelte.ts` — runes singleton `stats`, wraps `stats.ts`, persists to `localStorage`, supplies the local "today".
- **Create** `src/lib/components/StatsScreen.svelte` — the dedicated statistics screen (tiles + close).
- **Modify** `src/lib/engine/solitaire.ts` — add `isStuck(state)`.
- **Modify** `src/lib/engine/solitaire.test.ts` — add `isStuck` tests.
- **Modify** `src/lib/stores/settings.svelte.ts` — add `movement: 'tap'|'drag'` + `setMovement`.
- **Create** `src/lib/stores/settings.test.ts` — unit test for the new movement field default + persistence.
- **Modify** `src/lib/stores/game.svelte.ts` — lifecycle wiring: `stuck`, `records`, `leave()`, stats calls.
- **Modify** `src/lib/components/Card.svelte` — add `onpointerdown` prop for draggable cards.
- **Modify** `src/lib/components/Solitaire.svelte` — pointer-based drag, drop resolution, target highlight, stuck overlay, win-record text, Statistieken button + streak badge.
- **Modify** `src/lib/components/SettingsModal.svelte` — Bewegingsstijl toggle + Wis statistieken (confirm).
- **Modify** `src/App.svelte` — route to StatsScreen; call `game.leave()` on Home.
- **Modify** `tests/e2e/solitaire.spec.ts` — E2E for movement toggle, drag move, stats screen.
- **Create** `src/lib/components/Solitaire.stuck.test.ts` — component test for the stuck overlay.

---

### Task 1: Engine — `isStuck` truly-stuck detection

**Files:**
- Modify: `src/lib/engine/solitaire.ts` (append new exports near `nextAutoFinishMove`)
- Test: `src/lib/engine/solitaire.test.ts`

**Interfaces:**
- Consumes: `GameState`, `Source`, `Dest`, `NUM_TABLEAU`, `canMove`, `isWon`, `canPlaceOnFoundation`, `canPlaceOnTableau`, `SUITS`, `Card`.
- Produces: `isStuck(state: GameState): boolean` — true only when no legal board move exists AND no stock/waste card is placeable anywhere (a provably dead position; never false-positives, since any legal move — even a pointless one — returns false).

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/engine/solitaire.test.ts`:

```ts
import { isStuck } from './solitaire'

describe('isStuck', () => {
  it('is false when a tableau move exists', () => {
    const s = emptyState()
    s.tableau[0] = [card('hearts', 3)] // red 3
    s.tableau[1] = [card('spades', 4)] // black 4 — red 3 can land here
    expect(isStuck(s)).toBe(false)
  })

  it('is false when a stock card could still be played', () => {
    const s = emptyState()
    s.tableau[0] = [card('spades', 2)]
    s.tableau[1] = [card('hearts', 2)]
    s.stock = [card('clubs', 1, false)] // an Ace can always go to its foundation
    expect(isStuck(s)).toBe(true === false ? true : false) // see note below
    expect(isStuck(s)).toBe(false)
  })

  it('is true when nothing can move and nothing is playable', () => {
    const s = emptyState()
    // Two low cards that cannot stack on each other, no aces, no empty-fillable kings,
    // empty stock/waste, empty foundations.
    s.tableau[0] = [card('spades', 2)]
    s.tableau[1] = [card('hearts', 2)]
    expect(isStuck(s)).toBe(true)
  })

  it('is false for a won game', () => {
    const s = emptyState()
    s.foundations = SUITS.map((suit) =>
      Array.from({ length: 13 }, (_, i) => card(suit, (i + 1) as Rank))
    )
    expect(isStuck(s)).toBe(false)
  })
})
```

Note: the second test's odd first assertion line is a copy error — delete it, keep only `expect(isStuck(s)).toBe(false)`. (Repeated here so the implementer removes it.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/engine/solitaire.test.ts`
Expected: FAIL — `isStuck is not exported` / not a function.

- [ ] **Step 3: Implement `isStuck`**

Append to `src/lib/engine/solitaire.ts` (uses `SUITS` and `Card` — both already imported at the top of the file from `./cards`):

```ts
/** Can this single card be placed anywhere right now (foundation or tableau)? */
function placeableAnywhere(state: GameState, card: Card): boolean {
  const fIdx = SUITS.indexOf(card.suit)
  if (canPlaceOnFoundation(card, state.foundations[fIdx])) return true
  for (let q = 0; q < NUM_TABLEAU; q++) {
    if (canPlaceOnTableau(card, state.tableau[q])) return true
  }
  return false
}

/**
 * True only when the game is genuinely dead: no legal board move exists AND no
 * card still in the stock/waste could be played (the board can never change, so
 * drawing can never help). Never a false positive — if any legal move exists
 * (even a pointless one) this returns false.
 */
export function isStuck(state: GameState): boolean {
  if (isWon(state)) return false

  const wasteTop = state.waste[state.waste.length - 1]
  if (wasteTop && placeableAnywhere(state, wasteTop)) return false

  for (let p = 0; p < NUM_TABLEAU; p++) {
    const col = state.tableau[p]
    for (let i = 0; i < col.length; i++) {
      if (!col[i].faceUp) continue
      const src: Source = { type: 'tableau', pile: p, index: i }
      if (i === col.length - 1) {
        const fIdx = SUITS.indexOf(col[i].suit)
        if (canMove(state, src, { type: 'foundation', pile: fIdx })) return false
      }
      for (let q = 0; q < NUM_TABLEAU; q++) {
        if (q !== p && canMove(state, src, { type: 'tableau', pile: q })) return false
      }
    }
  }

  for (const c of [...state.stock, ...state.waste]) {
    if (placeableAnywhere(state, c)) return false
  }

  return true
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/engine/solitaire.test.ts`
Expected: PASS (all `isStuck` tests plus existing engine tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/engine/solitaire.ts src/lib/engine/solitaire.test.ts
git commit -m "feat(engine): detect truly-stuck (dead) positions"
```

---

### Task 2: Pure stats module + reducers

**Files:**
- Create: `src/lib/stats/stats.ts`
- Test: `src/lib/stats/stats.test.ts`

**Interfaces:**
- Produces:
  - `interface Stats { gamesWon; gamesLost; totalSeconds; currentWinStreak; bestWinStreak; currentDayStreak; bestDayStreak; lastPlayedDay: string | null; bestTimeSeconds: number | null; fewestMoves: number | null }` (all counts are `number`).
  - `EMPTY_STATS: Stats`
  - `interface WinRecords { newBestTime: boolean; newFewestMoves: boolean; newBestStreak: boolean }`
  - `previousDay(iso: string): string`
  - `markPlayed(stats: Stats, today: string): Stats`
  - `recordWin(stats: Stats, o: { seconds: number; moves: number }): { stats: Stats; records: WinRecords }`
  - `recordLoss(stats: Stats, o: { seconds: number }): Stats`
  - `recordAbandon(stats: Stats, o: { seconds: number }): Stats`
  - `formatDuration(totalSeconds: number): string`
  - `formatClock(seconds: number): string`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/stats/stats.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  EMPTY_STATS,
  previousDay,
  markPlayed,
  recordWin,
  recordLoss,
  recordAbandon,
  formatDuration,
  formatClock
} from './stats'

describe('previousDay', () => {
  it('returns the calendar day before, across month boundaries', () => {
    expect(previousDay('2026-07-05')).toBe('2026-07-04')
    expect(previousDay('2026-07-01')).toBe('2026-06-30')
    expect(previousDay('2026-01-01')).toBe('2025-12-31')
  })
})

describe('markPlayed (day streak)', () => {
  it('starts a streak at 1 on first play', () => {
    const s = markPlayed(EMPTY_STATS, '2026-07-05')
    expect(s.currentDayStreak).toBe(1)
    expect(s.bestDayStreak).toBe(1)
    expect(s.lastPlayedDay).toBe('2026-07-05')
  })

  it('does not double-count the same day', () => {
    let s = markPlayed(EMPTY_STATS, '2026-07-05')
    s = markPlayed(s, '2026-07-05')
    expect(s.currentDayStreak).toBe(1)
  })

  it('increments on consecutive days and updates best', () => {
    let s = markPlayed(EMPTY_STATS, '2026-07-04')
    s = markPlayed(s, '2026-07-05')
    expect(s.currentDayStreak).toBe(2)
    expect(s.bestDayStreak).toBe(2)
  })

  it('resets to 1 after a missed day', () => {
    let s = markPlayed(EMPTY_STATS, '2026-07-04')
    s = markPlayed(s, '2026-07-06') // skipped the 5th
    expect(s.currentDayStreak).toBe(1)
    expect(s.bestDayStreak).toBe(2)
  })
})

describe('recordWin', () => {
  it('counts the win, adds time, extends the win streak, sets records', () => {
    const { stats, records } = recordWin(EMPTY_STATS, { seconds: 120, moves: 90 })
    expect(stats.gamesWon).toBe(1)
    expect(stats.totalSeconds).toBe(120)
    expect(stats.currentWinStreak).toBe(1)
    expect(stats.bestWinStreak).toBe(1)
    expect(stats.bestTimeSeconds).toBe(120)
    expect(stats.fewestMoves).toBe(90)
    expect(records).toEqual({ newBestTime: true, newFewestMoves: true, newBestStreak: true })
  })

  it('only flags records that actually improve', () => {
    let { stats } = recordWin(EMPTY_STATS, { seconds: 100, moves: 80 })
    const r2 = recordWin(stats, { seconds: 200, moves: 120 })
    expect(r2.records).toEqual({ newBestTime: false, newFewestMoves: false, newBestStreak: true })
    expect(r2.stats.bestTimeSeconds).toBe(100)
    expect(r2.stats.fewestMoves).toBe(80)
    expect(r2.stats.currentWinStreak).toBe(2)
  })
})

describe('recordLoss', () => {
  it('counts a loss, adds time, and resets the win streak', () => {
    const won = recordWin(EMPTY_STATS, { seconds: 100, moves: 80 }).stats
    const s = recordLoss(won, { seconds: 60 })
    expect(s.gamesLost).toBe(1)
    expect(s.totalSeconds).toBe(160)
    expect(s.currentWinStreak).toBe(0)
    expect(s.gamesWon).toBe(1)
  })
})

describe('recordAbandon', () => {
  it('adds time only and leaves the win streak intact', () => {
    const won = recordWin(EMPTY_STATS, { seconds: 100, moves: 80 }).stats
    const s = recordAbandon(won, { seconds: 30 })
    expect(s.totalSeconds).toBe(130)
    expect(s.currentWinStreak).toBe(1)
    expect(s.gamesWon).toBe(1)
    expect(s.gamesLost).toBe(0)
  })
})

describe('formatting', () => {
  it('formats durations', () => {
    expect(formatDuration(0)).toBe('0m')
    expect(formatDuration(90)).toBe('1m')
    expect(formatDuration(3660)).toBe('1u 1m')
  })
  it('formats a clock', () => {
    expect(formatClock(5)).toBe('0:05')
    expect(formatClock(65)).toBe('1:05')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/stats/stats.test.ts`
Expected: FAIL — cannot resolve `./stats`.

- [ ] **Step 3: Implement the module**

Create `src/lib/stats/stats.ts`:

```ts
// Pure, framework-free stats model. No DOM, no runes. Fully unit-testable.
// All "today"/"day" values are local calendar-day strings 'YYYY-MM-DD',
// passed in by the caller so this stays deterministic and testable.

export interface Stats {
  gamesWon: number
  gamesLost: number // truly-stuck losses only
  totalSeconds: number
  currentWinStreak: number
  bestWinStreak: number
  currentDayStreak: number
  bestDayStreak: number
  lastPlayedDay: string | null
  bestTimeSeconds: number | null
  fewestMoves: number | null
}

export const EMPTY_STATS: Stats = {
  gamesWon: 0,
  gamesLost: 0,
  totalSeconds: 0,
  currentWinStreak: 0,
  bestWinStreak: 0,
  currentDayStreak: 0,
  bestDayStreak: 0,
  lastPlayedDay: null,
  bestTimeSeconds: null,
  fewestMoves: null
}

export interface WinRecords {
  newBestTime: boolean
  newFewestMoves: boolean
  newBestStreak: boolean
}

const pad = (n: number) => String(n).padStart(2, '0')

/** The calendar day before an ISO 'YYYY-MM-DD' (UTC math avoids DST edge cases). */
export function previousDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() - 1)
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`
}

/** Record that a game was played on `today`, updating the day streak. */
export function markPlayed(stats: Stats, today: string): Stats {
  if (stats.lastPlayedDay === today) return stats
  const continues = stats.lastPlayedDay !== null && stats.lastPlayedDay === previousDay(today)
  const currentDayStreak = continues ? stats.currentDayStreak + 1 : 1
  return {
    ...stats,
    lastPlayedDay: today,
    currentDayStreak,
    bestDayStreak: Math.max(stats.bestDayStreak, currentDayStreak)
  }
}

export function recordWin(stats: Stats, o: { seconds: number; moves: number }): { stats: Stats; records: WinRecords } {
  const currentWinStreak = stats.currentWinStreak + 1
  const newBestTime = stats.bestTimeSeconds === null || (o.seconds > 0 && o.seconds < stats.bestTimeSeconds)
  const newFewestMoves = stats.fewestMoves === null || o.moves < stats.fewestMoves
  const newBestStreak = currentWinStreak > stats.bestWinStreak
  const next: Stats = {
    ...stats,
    gamesWon: stats.gamesWon + 1,
    totalSeconds: stats.totalSeconds + o.seconds,
    currentWinStreak,
    bestWinStreak: Math.max(stats.bestWinStreak, currentWinStreak),
    bestTimeSeconds: newBestTime ? o.seconds : stats.bestTimeSeconds,
    fewestMoves: newFewestMoves ? o.moves : stats.fewestMoves
  }
  return { stats: next, records: { newBestTime, newFewestMoves, newBestStreak } }
}

export function recordLoss(stats: Stats, o: { seconds: number }): Stats {
  return {
    ...stats,
    gamesLost: stats.gamesLost + 1,
    totalSeconds: stats.totalSeconds + o.seconds,
    currentWinStreak: 0
  }
}

export function recordAbandon(stats: Stats, o: { seconds: number }): Stats {
  return { ...stats, totalSeconds: stats.totalSeconds + o.seconds }
}

/** e.g. 0 -> "0m", 90 -> "1m", 3660 -> "1u 1m" (Dutch: u = uur/hours). */
export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  return h > 0 ? `${h}u ${m}m` : `${m}m`
}

/** e.g. 65 -> "1:05". */
export function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60)
  return `${m}:${pad(seconds % 60)}`
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/stats/stats.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/stats/stats.ts src/lib/stats/stats.test.ts
git commit -m "feat(stats): pure stats model, reducers and formatters"
```

---

### Task 3: Stats runes store (persistence)

**Files:**
- Create: `src/lib/stores/stats.svelte.ts`

**Interfaces:**
- Consumes: everything from Task 2.
- Produces: singleton `stats` with `data: Stats` (reactive), `markPlayed(): void`, `recordWin(o: { seconds: number; moves: number }): WinRecords`, `recordLoss(o: { seconds: number }): void`, `recordAbandon(o: { seconds: number }): void`, `reset(): void`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/stores/stats.store.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'

describe('stats store', () => {
  beforeEach(() => localStorage.clear())

  it('persists recorded wins across reloads (module re-import)', async () => {
    const { stats } = await import('./stats.svelte?u1')
    stats.recordWin({ seconds: 100, moves: 70 })
    expect(stats.data.gamesWon).toBe(1)
    // A fresh import reads what was persisted.
    const again = await import('./stats.svelte?u2')
    expect(again.stats.data.gamesWon).toBe(1)
  })

  it('reset clears everything', async () => {
    const { stats } = await import('./stats.svelte?u3')
    stats.recordWin({ seconds: 100, moves: 70 })
    stats.reset()
    expect(stats.data.gamesWon).toBe(0)
    expect(stats.data.currentWinStreak).toBe(0)
  })
})
```

Note: the `?uN` query strings force Vite to treat each import as a distinct module instance so the "fresh reload reads localStorage" behavior can be asserted. Keep them exactly as written.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/stores/stats.store.test.ts`
Expected: FAIL — cannot resolve `./stats.svelte`.

- [ ] **Step 3: Implement the store**

Create `src/lib/stores/stats.svelte.ts`:

```ts
// Reactive, persisted wrapper around the pure stats reducers.
import {
  type Stats,
  type WinRecords,
  EMPTY_STATS,
  markPlayed,
  recordWin,
  recordLoss,
  recordAbandon
} from '../stats/stats'

const KEY = 'magames.stats.v1'
const pad = (n: number) => String(n).padStart(2, '0')

function todayLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function load(): Stats {
  if (typeof localStorage === 'undefined') return { ...EMPTY_STATS }
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...EMPTY_STATS }
    // Merge onto defaults so older/partial saves stay valid.
    return { ...EMPTY_STATS, ...(JSON.parse(raw) as Partial<Stats>) }
  } catch {
    return { ...EMPTY_STATS }
  }
}

class StatsStore {
  data = $state<Stats>(load())

  #persist() {
    if (typeof localStorage === 'undefined') return
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data))
    } catch {
      /* storage full or blocked — stats simply won't persist */
    }
  }

  markPlayed(): void {
    this.data = markPlayed(this.data, todayLocal())
    this.#persist()
  }

  recordWin(o: { seconds: number; moves: number }): WinRecords {
    const { stats, records } = recordWin(this.data, o)
    this.data = stats
    this.#persist()
    return records
  }

  recordLoss(o: { seconds: number }): void {
    this.data = recordLoss(this.data, o)
    this.#persist()
  }

  recordAbandon(o: { seconds: number }): void {
    this.data = recordAbandon(this.data, o)
    this.#persist()
  }

  reset(): void {
    this.data = { ...EMPTY_STATS }
    this.#persist()
  }
}

export const stats = new StatsStore()
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/stores/stats.store.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/stores/stats.svelte.ts src/lib/stores/stats.store.test.ts
git commit -m "feat(stats): reactive persisted stats store"
```

---

### Task 4: Settings — movement style field

**Files:**
- Modify: `src/lib/stores/settings.svelte.ts`
- Test: `src/lib/stores/settings.test.ts` (create)

**Interfaces:**
- Produces on `settings`: `movement: 'tap' | 'drag'` (reactive, default `'tap'`), `setMovement(m: 'tap' | 'drag'): void`. Also export `type Movement = 'tap' | 'drag'`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/stores/settings.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'

describe('settings.movement', () => {
  beforeEach(() => localStorage.clear())

  it('defaults to tap and persists a change', async () => {
    const { settings } = await import('./settings.svelte?s1')
    expect(settings.movement).toBe('tap')
    settings.setMovement('drag')
    expect(settings.movement).toBe('drag')
    const again = await import('./settings.svelte?s2')
    expect(again.settings.movement).toBe('drag')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/stores/settings.test.ts`
Expected: FAIL — `settings.movement` is undefined / `setMovement` missing.

- [ ] **Step 3: Implement the field**

In `src/lib/stores/settings.svelte.ts`:

Add the exported type near the top (after the imports):

```ts
export type Movement = 'tap' | 'drag'
```

Change the `Persisted` interface to:

```ts
interface Persisted {
  drawCount: DrawCount
  sound: boolean
  movement: Movement
}
```

Change the `load()` fallback + parse to include movement:

```ts
function load(): Persisted {
  const fallback: Persisted = { drawCount: 1, sound: true, movement: 'tap' }
  if (typeof localStorage === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<Persisted>
    return {
      drawCount: parsed.drawCount === 3 ? 3 : 1,
      sound: parsed.sound !== false,
      movement: parsed.movement === 'drag' ? 'drag' : 'tap'
    }
  } catch {
    return fallback
  }
}
```

In `class Settings`, add the field, constructor assignment, persist payload, and setter:

```ts
  movement = $state<Movement>('tap')
```

In the constructor add:

```ts
    this.movement = p.movement
```

In `persist()` change the data object to:

```ts
    const data: Persisted = { drawCount: this.drawCount, sound: this.sound, movement: this.movement }
```

Add the setter (next to `toggleSound`):

```ts
  setMovement(m: Movement) {
    this.movement = m
    this.persist()
  }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/stores/settings.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/stores/settings.svelte.ts src/lib/stores/settings.test.ts
git commit -m "feat(settings): movement style (tap/drag) setting"
```

---

### Task 5: Game store — lifecycle wiring (played / won / stuck-loss / abandon)

**Files:**
- Modify: `src/lib/stores/game.svelte.ts`
- Test: `src/lib/stores/game.lifecycle.test.ts` (create)

**Interfaces:**
- Consumes: `stats` store (Task 3), `isStuck` (Task 1), existing engine.
- Produces on `game`: new reactive `stuck: boolean` and `records: WinRecords | null`; new method `leave(): void` (finalizes an unfinished game as abandon/loss without dealing). Behavior: first `#commit` of a game calls `stats.markPlayed()` once; a win calls `stats.recordWin` and stores `records`; reaching a stuck position sets `stuck = true` and stops the timer (loss is recorded only when the player then abandons the dead game via `newGame()`/`leave()`); `undo()` clears `stuck`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/stores/game.lifecycle.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { game } from './game.svelte'
import { stats } from './stats.svelte'

// IMPORTANT: import the CANONICAL singletons (no ?query). The game store imports
// the same `stats` singleton, so mutations by the game are visible on `stats` here.
// Reset both in-memory singletons + storage before each test for isolation.
describe('game lifecycle → stats', () => {
  beforeEach(() => {
    localStorage.clear()
    stats.reset()
  })

  it('marks a day as played on the first move (drawStock)', () => {
    game.newGame(1, 1)
    expect(stats.data.currentDayStreak).toBe(0)
    game.drawStock() // first move
    expect(stats.data.currentDayStreak).toBe(1)
  })

  it('records an abandon (time only) when leaving an unfinished game', () => {
    game.newGame(1, 1)
    game.drawStock()
    game.leave()
    expect(stats.data.gamesWon).toBe(0)
    expect(stats.data.gamesLost).toBe(0)
    expect(stats.data.currentDayStreak).toBe(1) // set by the first move
  })

  it('exposes a boolean stuck flag', () => {
    game.newGame(1, 1)
    expect(typeof game.stuck).toBe('boolean')
    expect(game.stuck).toBe(false)
  })
})
```

Note: the third test is intentionally light — forcing a mid-game stuck through only public methods is fragile. `isStuck` itself is fully unit-tested in Task 1, and the stuck **UI** path is covered in Task 8. Keep it asserting only that `game.stuck` exists and is a boolean; do not over-fit it.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/stores/game.lifecycle.test.ts`
Expected: FAIL — `game.leave` / `game.stuck` undefined.

- [ ] **Step 3: Implement the wiring**

In `src/lib/stores/game.svelte.ts`:

Add imports (extend the existing import lines):

```ts
import {
  deal,
  draw,
  move,
  autoDest,
  isWon,
  isStuck,
  nextAutoFinishMove,
  type GameState,
  type Source,
  type Dest,
  type DrawCount
} from '../engine/solitaire'
import { settings } from './settings.svelte'
import { stats } from './stats.svelte'
import { type WinRecords } from '../stats/stats'
import { mulberry32 } from '../engine/cards'
import { play } from '../sound/sfx'
```

Add fields to `class SolitaireGame` (next to `hint`):

```ts
  stuck = $state(false)
  records = $state<WinRecords | null>(null)

  #started = false
  #finalized = false
```

Replace `newGame` with a version that finalizes the previous game first and resets the new flags:

```ts
  newGame(drawCount: DrawCount = settings.drawCount, seed?: number): void {
    this.#finalize()
    this.state = deal(drawCount, seed === undefined ? Math.random : mulberry32(seed))
    this.#history = []
    this.won = false
    this.stuck = false
    this.records = null
    this.seconds = 0
    this.#stopTimer()
    this.#running = false
    this.#started = false
    this.#finalized = false
    play('deal', settings.sound)
  }
```

Replace `#commit` so it marks the day on the first move and re-evaluates win/stuck:

```ts
  #commit(next: GameState, sound: Parameters<typeof play>[0] = 'place'): void {
    this.#history.push(this.state)
    this.state = next
    this.hint = null
    this.#startTimer()
    play(sound, settings.sound)

    if (!this.#started) {
      this.#started = true
      stats.markPlayed()
    }

    if (isWon(next)) {
      this.#onWin()
    } else if (isStuck(next)) {
      this.stuck = true
      this.#stopTimer()
    }
  }
```

Replace `#onWin` to record the win and capture records:

```ts
  #onWin(): void {
    this.won = true
    this.#stopTimer()
    if (!this.#finalized) {
      this.records = stats.recordWin({ seconds: this.seconds, moves: this.state.moves })
      this.#finalized = true
    }
    play('win', settings.sound)
  }
```

Update `undo()` to clear the stuck flag (add `this.stuck = false` next to `this.won = false`):

```ts
  undo(): void {
    const prev = this.#history.pop()
    if (!prev) return
    this.state = prev
    this.won = false
    this.stuck = false
    this.hint = null
    play('flip', settings.sound)
  }
```

Add the finalize helper and public `leave()` (place after `undo`):

```ts
  /** Finalize an unfinished game: a dead game counts as a loss, else an abandon. */
  #finalize(): void {
    if (this.#started && !this.#finalized) {
      if (this.stuck) stats.recordLoss({ seconds: this.seconds })
      else stats.recordAbandon({ seconds: this.seconds })
      this.#finalized = true
    }
  }

  /** Call when navigating away from the board (Menu) so time/losses are recorded. */
  leave(): void {
    this.#finalize()
  }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/stores/game.lifecycle.test.ts`
Expected: PASS. Also run `npx vitest run` to confirm nothing else broke.

- [ ] **Step 5: Commit**

```bash
git add src/lib/stores/game.svelte.ts src/lib/stores/game.lifecycle.test.ts
git commit -m "feat(game): wire played/won/stuck/abandon into stats"
```

---

### Task 6: Settings UI — Bewegingsstijl toggle + Wis statistieken

**Files:**
- Modify: `src/lib/components/SettingsModal.svelte`
- Modify: `tests/e2e/solitaire.spec.ts` (add a movement-persist E2E)

**Interfaces:**
- Consumes: `settings.movement` / `settings.setMovement` (Task 4), `stats.reset` (Task 3).

- [ ] **Step 1: Write the failing E2E**

Append to `tests/e2e/solitaire.spec.ts`:

```ts
test('settings: switching to drag mode persists across reload', async ({ page }) => {
  await page.getByRole('button', { name: 'Instellingen' }).click()
  await page.getByRole('button', { name: /Slepen/ }).click()
  await page.getByRole('button', { name: 'Klaar' }).click()

  await page.reload()
  await page.getByRole('button', { name: 'Instellingen' }).click()
  await expect(page.getByRole('button', { name: /Slepen/ })).toHaveClass(/selected/)
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx playwright test -g "drag mode persists"`
Expected: FAIL — no "Slepen" control yet.

- [ ] **Step 3: Implement the UI**

In `src/lib/components/SettingsModal.svelte`, add the stats import at the top of `<script>` (below the existing imports):

```ts
  import { stats } from '../stores/stats.svelte'

  let confirmingReset = $state(false)
```

Add a Bewegingsstijl section — place it right after the closing `</section>` of the "Moeilijkheid" block:

```svelte
    <section>
      <h3>Bewegingsstijl</h3>
      <p class="hint">Hoe je kaarten verplaatst.</p>
      <div class="choices">
        <button class:selected={settings.movement === 'tap'} onclick={() => settings.setMovement('tap')}>
          <strong>Tikken</strong><span>Eenvoudig</span>
        </button>
        <button class:selected={settings.movement === 'drag'} onclick={() => settings.setMovement('drag')}>
          <strong>Slepen</strong><span>Versleep de kaart</span>
        </button>
      </div>
    </section>
```

Add a "Statistieken" reset section right before the final `.actions` div:

```svelte
    <section>
      <h3>Statistieken</h3>
      {#if confirmingReset}
        <p class="hint">Weet je het zeker? Dit wist alle scores.</p>
        <div class="choices">
          <button onclick={() => (confirmingReset = false)}><strong>Nee</strong></button>
          <button
            class="danger"
            onclick={() => {
              stats.reset()
              confirmingReset = false
            }}><strong>Ja, wissen</strong></button
          >
        </div>
      {:else}
        <button class="toggle" onclick={() => (confirmingReset = true)}><span>🗑️ Wis statistieken</span></button>
      {/if}
    </section>
```

Add a `.danger` style inside the `<style>` block (next to `.choices button.selected`):

```css
  .choices button.danger {
    border-color: #c81e28;
    background: #fdecec;
    color: #c81e28;
  }
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx playwright test -g "drag mode persists"`
Expected: PASS. Then `npm run check` → 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/SettingsModal.svelte tests/e2e/solitaire.spec.ts
git commit -m "feat(settings-ui): movement toggle and stats reset"
```

---

### Task 7: Drag-and-drop on the board (hybrid)

**Files:**
- Modify: `src/lib/components/Card.svelte`
- Modify: `src/lib/components/Solitaire.svelte`
- Modify: `tests/e2e/solitaire.spec.ts` (drag E2E)

**Interfaces:**
- Consumes: `settings.movement`, `game.tap`, `game.moveTo`, `game.drawStock`, `canMove`, `Source`, `Dest`, `NUM_TABLEAU`, `SUITS`.
- Produces: draggable waste-top and tableau face-up cards. In `tap` mode: press = tap (unchanged). In `drag` mode: a press that moves >10px drags the card + its valid run, highlights legal piles, and drops via best-overlap-legal-first (`game.moveTo`), snapping back on no legal target; a press that does not move is still a tap.

- [ ] **Step 1: Write the failing E2E**

Append to `tests/e2e/solitaire.spec.ts`:

```ts
test('drag mode: dragging a card onto a legal pile moves it', async ({ page }) => {
  // Seed 1: the 4 of clubs (top of column 4) legally moves onto column 6.
  await page.goto('/?seed=1')
  await page.getByRole('button', { name: /Patience/ }).click()
  // Enable drag mode via settings.
  await page.getByRole('button', { name: 'Instellingen' }).click()
  await page.getByRole('button', { name: /Slepen/ }).click()
  await page.getByRole('button', { name: 'Klaar' }).click()

  const cols = page.getByTestId('tableau-col')
  await expect(cols.nth(5).getByRole('button', { name: '4 clubs' })).toHaveCount(0)

  const from = page.getByRole('button', { name: '4 clubs' })
  const to = cols.nth(5)
  const a = await from.boundingBox()
  const b = await to.boundingBox()
  if (!a || !b) throw new Error('missing boxes')
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
  await page.mouse.down()
  // Move in steps so pointermove fires and the threshold is crossed.
  await page.mouse.move(b.x + b.width / 2, b.y + 20, { steps: 8 })
  await page.mouse.up()

  await expect(cols.nth(5).getByRole('button', { name: '4 clubs' })).toHaveCount(1)
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx playwright test -g "dragging a card onto a legal pile"`
Expected: FAIL — dragging does nothing yet (card stays in column 4).

- [ ] **Step 3a: Give Card an `onpointerdown` prop**

In `src/lib/components/Card.svelte`, extend the props and wire pointerdown on the face button. Replace the `$props()` block and the face `<button>` open tag:

```svelte
  let {
    card,
    hinted = false,
    onpick,
    onpointerdown
  }: {
    card: Card
    hinted?: boolean
    onpick?: (e: MouseEvent) => void
    onpointerdown?: (e: PointerEvent) => void
  } = $props()
```

Change the face `<button ...>` opening tag so it forwards pointerdown (keep the existing `onclick={onpick}` for tap-only usages):

```svelte
  <button
    class="card face"
    class:hinted
    style="color: {color}"
    onclick={onpick}
    onpointerdown={onpointerdown}
    aria-label={`${rankLabel(card.rank)} ${card.suit}`}
    type="button"
  >
```

- [ ] **Step 3b: Implement drag in Solitaire.svelte**

In `src/lib/components/Solitaire.svelte` `<script>`, add imports/state. Extend the engine import and add settings/canMove:

```ts
  import { SUIT_SYMBOL, SUITS, NUM_TABLEAU, canMove, type Source, type Dest, type Card as TCard } from '../engine/cards'
```

(Leave the existing `import { SUIT_SYMBOL, SUITS, type Card as TCard } from '../engine/cards'` — replace it with the line above, but note `NUM_TABLEAU`, `canMove`, `Source`, `Dest` come from `../engine/solitaire`, not `cards`. Use two imports:)

```ts
  import { SUIT_SYMBOL, SUITS, type Card as TCard } from '../engine/cards'
  import { NUM_TABLEAU, canMove, type Source, type Dest } from '../engine/solitaire'
  import { settings } from '../stores/settings.svelte'
```

Add drag state and handlers (after the existing `firstTap` function):

```ts
  const DRAG_THRESHOLD = 10

  interface DragState {
    src: Source
    cards: TCard[]
    startX: number
    startY: number
    x: number
    y: number
    grabX: number
    grabY: number
    active: boolean
  }
  let drag = $state<DragState | null>(null)

  // Piles that the current drag can legally land on (for highlighting).
  const legalTargets = $derived.by(() => {
    const set = new Set<string>()
    if (!drag?.active) return set
    for (let f = 0; f < 4; f++) if (canMove(game.state, drag.src, { type: 'foundation', pile: f })) set.add(`f${f}`)
    for (let t = 0; t < NUM_TABLEAU; t++) if (canMove(game.state, drag.src, { type: 'tableau', pile: t })) set.add(`t${t}`)
    return set
  })

  function pickupCards(src: Source): TCard[] {
    if (src.type === 'waste') {
      const w = game.state.waste
      return w.length ? [w[w.length - 1]] : []
    }
    if (src.type === 'tableau') return game.state.tableau[src.pile].slice(src.index)
    return []
  }

  function startPress(e: PointerEvent, src: Source) {
    // Tap mode: behave as a pure tap on release; no drag bookkeeping needed.
    if (settings.movement === 'tap') {
      game.tap(src)
      return
    }
    const cards = pickupCards(src)
    if (cards.length === 0) return
    const target = e.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()
    drag = {
      src,
      cards,
      startX: e.clientX,
      startY: e.clientY,
      x: e.clientX,
      y: e.clientY,
      grabX: e.clientX - rect.left,
      grabY: e.clientY - rect.top,
      active: false
    }
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    e.preventDefault()
  }

  function onMove(e: PointerEvent) {
    if (!drag) return
    drag.x = e.clientX
    drag.y = e.clientY
    if (!drag.active) {
      const moved = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY)
      if (moved > DRAG_THRESHOLD) drag.active = true
    }
  }

  function overlapArea(
    a: { left: number; top: number; right: number; bottom: number },
    b: DOMRect
  ): number {
    const x = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
    const y = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
    return x * y
  }

  // Best-overlap, legal-first: compare the dragged top card's rect against each
  // drop pile's rect; among legal piles pick the largest overlap. `src` is passed
  // explicitly because `drag` is nulled before this runs.
  function resolveDropFor(src: Source, cardLeft: number, cardTop: number): Dest | null {
    const board = document.querySelector('[data-testid="board"]') as HTMLElement | null
    if (!board) return null
    const cs = getComputedStyle(board)
    const w = parseFloat(cs.getPropertyValue('--card-w')) || 80
    const h = parseFloat(cs.getPropertyValue('--card-h')) || 112
    const cardRect = { left: cardLeft, top: cardTop, right: cardLeft + w, bottom: cardTop + h }

    let best: { dest: Dest; area: number } | null = null
    const check = (dest: Dest, el: Element | null) => {
      if (!el) return
      if (!canMove(game.state, src, dest)) return
      const area = overlapArea(cardRect, el.getBoundingClientRect())
      if (area > 0 && (!best || area > best.area)) best = { dest, area }
    }
    board.querySelectorAll('[data-drop-foundation]').forEach((el) => {
      const pile = Number((el as HTMLElement).dataset.dropFoundation)
      check({ type: 'foundation', pile }, el)
    })
    board.querySelectorAll('[data-drop-tableau]').forEach((el) => {
      const pile = Number((el as HTMLElement).dataset.dropTableau)
      check({ type: 'tableau', pile }, el)
    })
    return best ? best.dest : null
  }

  function onUp(e: PointerEvent) {
    if (!drag) return
    const d = drag
    drag = null
    if (!d.active) {
      // No real movement → treat as a tap.
      game.tap(d.src)
      return
    }
    const dest = resolveDropFor(d.src, e.clientX - d.grabX, e.clientY - d.grabY)
    if (dest) game.moveTo(d.src, dest)
    else game.showInvalid()
  }
```

Add a tiny `showInvalid` to the game store so snap-back has audio feedback. In `src/lib/stores/game.svelte.ts` add a public method:

```ts
  showInvalid(): void {
    play('invalid', settings.sound)
  }
```

Now wire the markup in `Solitaire.svelte`:

1. Add window listeners + drop hooks. On the root `<div class="game" ...>` add pointer handlers:

```svelte
<div class="game" onpointerdowncapture={firstTap} onpointermove={onMove} onpointerup={onUp}>
```

2. Give the **waste** card a pointerdown source and make foundation slots drop targets. Replace the waste `Card` usage:

```svelte
          <Card card={top} hinted={game.hint?.type === 'waste'} onpointerdown={(e) => startPress(e, { type: 'waste' })} />
```

3. Foundation slot wrapper — add a drop hook + highlight. Replace the foundation `{#each ...}` slot `<div class="slot pile">` with:

```svelte
        <div class="slot pile" data-drop-foundation={fi} class:legal={legalTargets.has(`f${fi}`)}>
```

4. Tableau cards — pointerdown + column drop hook + highlight. Replace the tableau column `<div class="column" ...>` opening tag:

```svelte
        <div
          class="column"
          data-testid="tableau-col"
          data-drop-tableau={pile}
          class:legal={legalTargets.has(`t${pile}`)}
          style="height: calc(var(--card-h) * {l.height})"
        >
```

And replace the tableau `<Card ... />` usage so face-up cards start a press:

```svelte
              <Card
                card={placed.card}
                hinted={hintedTableau(pile, placed.index)}
                onpointerdown={placed.card.faceUp
                  ? (e) => startPress(e, { type: 'tableau', pile, index: placed.index })
                  : undefined}
              />
```

(Remove the old `onpick={...}` from the tableau and waste `Card` usages — dragging/tapping now flows through `startPress`. Leave the stock `Card` and foundation-top `Card` on their existing `onpick` click handlers, since stock is tap-only and foundation is not a drag source.)

5. Render the floating drag ghost near the end of the `.game` div (just before the win overlay `{#if game.won}`):

```svelte
  {#if drag?.active}
    <div class="drag-layer">
      {#each drag.cards as c, i (c.id)}
        <div
          class="ghost"
          style="left: {drag.x - drag.grabX}px; top: {drag.y - drag.grabY + i * 0.32 * ghostCardH}px"
        >
          <Card card={c} />
        </div>
      {/each}
    </div>
  {/if}
```

Add a derived `ghostCardH` in `<script>` for the vertical fan of the run:

```ts
  let ghostCardH = $state(0)
  $effect(() => {
    const board = document.querySelector('[data-testid="board"]') as HTMLElement | null
    if (board) ghostCardH = parseFloat(getComputedStyle(board).getPropertyValue('--card-h')) || 0
  })
```

6. Add styles (in the `<style>` block):

```css
  .legal::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: calc(var(--card-w) * 0.09);
    box-shadow: 0 0 0 4px rgba(255, 214, 10, 0.85);
    pointer-events: none;
    z-index: 40;
  }
  .drag-layer {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 300;
  }
  .ghost {
    position: fixed;
    width: var(--card-w);
    height: var(--card-h);
    transform: scale(1.04);
    filter: drop-shadow(0 8px 10px rgba(0, 0, 0, 0.35));
  }
  @media (prefers-reduced-motion: reduce) {
    .ghost {
      transform: none;
    }
  }
```

Note: `--card-w`/`--card-h` are defined on `.board`; the `.drag-layer` is fixed and outside `.board`, so set them on `.drag-layer` too by inheriting — add `--card-w`/`--card-h` reads via the ghost using inline `left/top` (already px). The `.ghost` uses `var(--card-w)`; to make that resolve, add the drag-layer under the board by giving `.drag-layer` `--card-w: inherit` won't work across the fixed boundary. Instead set explicit width/height on `.ghost` via inline style using `ghostCardH`:

Replace the `.ghost` width/height with inline style. Change the ghost element to:

```svelte
        <div
          class="ghost"
          style="left: {drag.x - drag.grabX}px; top: {drag.y - drag.grabY + i * 0.32 * ghostCardH}px; width: {ghostCardW}px; height: {ghostCardH}px"
        >
```

and add `ghostCardW` alongside `ghostCardH`:

```ts
  let ghostCardW = $state(0)
  $effect(() => {
    const board = document.querySelector('[data-testid="board"]') as HTMLElement | null
    if (!board) return
    const cs = getComputedStyle(board)
    ghostCardW = parseFloat(cs.getPropertyValue('--card-w')) || 0
    ghostCardH = parseFloat(cs.getPropertyValue('--card-h')) || 0
  })
```

Remove `width: var(--card-w); height: var(--card-h);` from the `.ghost` CSS rule (they're now inline).

- [ ] **Step 4: Run to verify it passes**

Run: `npx playwright test -g "dragging a card onto a legal pile"`
Expected: PASS — the 4 of clubs ends up in column 6.
Then run the full E2E + tap test to confirm tap still works: `npx playwright test -g "tap-to-move"` → PASS. Then `npm run check` → 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/Card.svelte src/lib/components/Solitaire.svelte src/lib/stores/game.svelte.ts tests/e2e/solitaire.spec.ts
git commit -m "feat(board): hybrid drag-and-drop with legal-target highlight"
```

---

### Task 8: Stuck overlay UI

**Files:**
- Modify: `src/lib/components/Solitaire.svelte`
- Test: `src/lib/components/Solitaire.stuck.test.ts` (create)

**Interfaces:**
- Consumes: `game.stuck`, `game.newGame`.

- [ ] **Step 1: Write the failing component test**

Create `src/lib/components/Solitaire.stuck.test.ts`:

```ts
import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, screen } from '@testing-library/svelte'
import Solitaire from './Solitaire.svelte'
import { game } from '../stores/game.svelte'

afterEach(cleanup)

describe('stuck overlay', () => {
  it('shows a "geen zetten meer" message when the game is stuck', async () => {
    game.newGame(1, 1)
    game.stuck = true
    render(Solitaire, { props: { onhome: () => {}, onsettings: () => {} } })
    expect(screen.getByText(/Geen zetten meer/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/components/Solitaire.stuck.test.ts`
Expected: FAIL — no "Geen zetten meer" text rendered.

- [ ] **Step 3: Implement the overlay**

In `src/lib/components/Solitaire.svelte`, add a stuck overlay right after the win overlay `{/if}` (mirroring the win overlay markup):

```svelte
  {#if game.stuck && !game.won}
    <div class="win" role="dialog" aria-label="Geen zetten meer">
      <div class="win-card">
        <div class="trophy">🤔</div>
        <h2>Geen zetten meer mogelijk</h2>
        <p>Dit spel zit vast. Probeer een nieuw spel.</p>
        <button class="big-btn" onclick={() => game.newGame()}>Nieuw spel</button>
      </div>
    </div>
  {/if}
```

(Reuses the existing `.win`, `.win-card`, `.trophy`, `.big-btn` styles — no new CSS.)

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/components/Solitaire.stuck.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/Solitaire.svelte src/lib/components/Solitaire.stuck.test.ts
git commit -m "feat(board): calm overlay when a game is truly stuck"
```

---

### Task 9: Stats screen + Home button + streak badge + win records

**Files:**
- Create: `src/lib/components/StatsScreen.svelte`
- Modify: `src/lib/components/Home.svelte`
- Modify: `src/lib/components/Solitaire.svelte` (win-record line)
- Modify: `src/App.svelte`
- Modify: `tests/e2e/solitaire.spec.ts`

**Interfaces:**
- Consumes: `stats.data` (Task 3), `formatDuration`, `formatClock` (Task 2), `game.records` (Task 5).
- Produces: `StatsScreen.svelte` with a prop `{ onclose: () => void }`. Home gains a prop `onstats: () => void` and a 🔥 streak badge. App routes a `'stats'` screen and calls `game.leave()` on Home navigation.

- [ ] **Step 1: Write the failing E2E**

Append to `tests/e2e/solitaire.spec.ts`:

```ts
test('stats screen opens from home and shows tiles', async ({ page }) => {
  await page.getByRole('button', { name: /Statistieken/ }).click()
  await expect(page.getByRole('heading', { name: 'Statistieken' })).toBeVisible()
  await expect(page.getByText('Gewonnen')).toBeVisible()
  await expect(page.getByText('Speeltijd')).toBeVisible()
  await page.getByRole('button', { name: 'Terug' }).click()
  await expect(page.getByRole('heading', { name: 'Kaartspellen' })).toBeVisible()
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx playwright test -g "stats screen opens from home"`
Expected: FAIL — no "Statistieken" button on Home.

- [ ] **Step 3a: Create StatsScreen.svelte**

Create `src/lib/components/StatsScreen.svelte`:

```svelte
<script lang="ts">
  import { stats } from '../stores/stats.svelte'
  import { formatDuration, formatClock } from '../stats/stats'

  let { onclose }: { onclose: () => void } = $props()

  const d = $derived(stats.data)
  const tiles = $derived([
    { label: 'Gewonnen', value: String(d.gamesWon) },
    { label: 'Speeltijd', value: formatDuration(d.totalSeconds) },
    { label: 'Dagreeks', value: `🔥 ${d.currentDayStreak}`, sub: `beste ${d.bestDayStreak}` },
    { label: 'Winreeks', value: String(d.currentWinStreak), sub: `beste ${d.bestWinStreak}` },
    { label: 'Snelste tijd', value: d.bestTimeSeconds === null ? '—' : formatClock(d.bestTimeSeconds) },
    { label: 'Minste zetten', value: d.fewestMoves === null ? '—' : String(d.fewestMoves) }
  ])
</script>

<div class="screen">
  <header>
    <button class="back" onclick={onclose} aria-label="Terug">‹ Terug</button>
    <h1>Statistieken</h1>
    <div class="spacer"></div>
  </header>

  <div class="grid">
    {#each tiles as t}
      <div class="tile">
        <span class="value">{t.value}</span>
        <span class="label">{t.label}</span>
        {#if t.sub}<span class="sub">{t.sub}</span>{/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .screen {
    display: flex;
    flex-direction: column;
    height: 100dvh;
    width: 100vw;
    padding: clamp(12px, 3vw, 36px);
    box-sizing: border-box;
    background: radial-gradient(circle at 50% 20%, #128a4c 0%, #0b6b3a 55%, #073f22 100%);
    color: #fff;
  }
  header {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  h1 {
    font-size: clamp(24px, 5vw, 44px);
    margin: 0;
  }
  .back {
    font-size: clamp(16px, 2.6vw, 22px);
    font-weight: 700;
    background: rgba(255, 255, 255, 0.15);
    border: none;
    border-radius: 12px;
    padding: 0.4em 0.8em;
    color: #fff;
    cursor: pointer;
  }
  .spacer {
    flex: 1;
  }
  .grid {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(clamp(130px, 26vw, 220px), 1fr));
    gap: clamp(10px, 2.4vw, 22px);
    align-content: center;
  }
  .tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    background: #fff;
    color: #16181d;
    border-radius: 18px;
    padding: clamp(14px, 3vw, 28px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
    aspect-ratio: 3 / 2;
  }
  .value {
    font-size: clamp(26px, 5vw, 44px);
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }
  .label {
    font-size: clamp(14px, 2.2vw, 20px);
    color: #444;
  }
  .sub {
    font-size: clamp(11px, 1.7vw, 15px);
    color: #888;
  }
</style>
```

- [ ] **Step 3b: Add the Home button + streak badge**

In `src/lib/components/Home.svelte`, add `onstats` to props and the stats import:

```ts
  import { GAMES } from '../games/registry'
  import { stats } from '../stores/stats.svelte'

  let {
    onplay,
    onsettings,
    onstats
  }: { onplay: (id: string) => void; onsettings: () => void; onstats: () => void } = $props()
```

Add a Statistieken button + streak badge in the header (replace the existing `<header>...</header>`):

```svelte
  <header>
    <h1>Kaartspellen</h1>
    <div class="header-actions">
      {#if stats.data.currentDayStreak > 0}
        <span class="streak" aria-label="Dagreeks">🔥 {stats.data.currentDayStreak}</span>
      {/if}
      <button class="gear" onclick={onstats} aria-label="Statistieken">📊</button>
      <button class="gear" onclick={onsettings} aria-label="Instellingen">⚙️</button>
    </div>
  </header>
```

Add styles (in Home's `<style>`):

```css
  .header-actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .streak {
    font-size: clamp(18px, 3vw, 28px);
    font-weight: 800;
    background: rgba(0, 0, 0, 0.2);
    padding: 0.2em 0.5em;
    border-radius: 12px;
  }
```

Note: the E2E finds the button via its accessible name "Statistieken" (the `aria-label`), so the 📊 emoji content is fine.

- [ ] **Step 3c: Route it in App.svelte and finalize on Home**

In `src/App.svelte`, add the import, extend the screen type, and pass handlers:

```svelte
<script lang="ts">
  import Home from './lib/components/Home.svelte'
  import Solitaire from './lib/components/Solitaire.svelte'
  import SettingsModal from './lib/components/SettingsModal.svelte'
  import StatsScreen from './lib/components/StatsScreen.svelte'
  import { game } from './lib/stores/game.svelte'

  type Screen = 'home' | 'solitaire' | 'stats'
  let screen = $state<Screen>('home')
  let showSettings = $state(false)

  function seedFromUrl(): number | undefined {
    if (typeof location === 'undefined') return undefined
    const raw = new URLSearchParams(location.search).get('seed')
    if (raw === null) return undefined
    const n = Number(raw)
    return Number.isFinite(n) ? n : undefined
  }

  function play(id: string) {
    if (id === 'solitaire') {
      game.newGame(undefined, seedFromUrl())
      screen = 'solitaire'
    }
  }

  function goHome() {
    game.leave()
    screen = 'home'
  }
</script>

{#if screen === 'home'}
  <Home onplay={play} onsettings={() => (showSettings = true)} onstats={() => (screen = 'stats')} />
{:else if screen === 'stats'}
  <StatsScreen onclose={() => (screen = 'home')} />
{:else}
  <Solitaire onhome={goHome} onsettings={() => (showSettings = true)} />
{/if}

{#if showSettings}
  <SettingsModal onclose={() => (showSettings = false)} />
{/if}
```

- [ ] **Step 3d: Win-record celebration line**

In `src/lib/components/Solitaire.svelte`, add a record line inside the win overlay. Replace the win-overlay `<p>` line with:

```svelte
        <p>In {mmss} met {game.moves} zetten.</p>
        {#if game.records && (game.records.newBestTime || game.records.newFewestMoves || game.records.newBestStreak)}
          <p class="record">🎉 Nieuw record!</p>
        {/if}
```

Add a `.record` style (in Solitaire's `<style>`):

```css
  .record {
    color: #0b6b3a;
    font-weight: 800;
    font-size: clamp(16px, 2.4vw, 22px);
  }
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx playwright test -g "stats screen opens from home"`
Expected: PASS.
Then run the whole suite: `npm test && npx playwright test && npm run check`
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/StatsScreen.svelte src/lib/components/Home.svelte src/lib/components/Solitaire.svelte src/App.svelte tests/e2e/solitaire.spec.ts
git commit -m "feat(stats-ui): stats screen, home streak badge, win records"
```

---

## Final verification (after all tasks)

- [ ] `npm run check` → 0 errors, 0 warnings
- [ ] `npm test` → all unit tests pass
- [ ] `npm run test:e2e` → all Playwright tests pass (landscape + portrait)
- [ ] `npm run build` → succeeds; woff2 + assets precached
- [ ] Manually: toggle Slepen, drag a run onto a legal column, confirm snap-back on an illegal drop; win a seeded game and see "Nieuw record!"; open Statistieken from Home and confirm the tiles; reset via Meer.
